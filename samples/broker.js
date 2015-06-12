'use strict'

var Promise = require('bluebird');
var _ = require("lodash");
var path = require("path");

var Broker = require('./Broker-sample/broker');
var Booker = require('./Booker-sample/booker');
var Facehugger = require('./DBWorker/facehugger');
var Replicator = require("./Replicator/replicator");
var Arbiter = require("./Arbiter/arbiter");
var Doctor = require('./Physician/physician.js');
var Auth = require('./Auth/auth.js');
var Queue = require('custom-queue');

var config = require('./const/config');
var iconfig = require('../inspectors-config.json');

var MetaTree = require("MetaTree").MetaTree;

var meta_tree = new MetaTree({
    server_ip: "127.0.0.1",
    n1ql: "127.0.0.1:8093",
    bucket_name: "mt",
    role: config.name
});

var doctor = new Doctor();
var alien = new Facehugger();
var broker = new Broker();
var booker = new Booker();
var arbiter = new Arbiter();
var rep = new Replicator();
var auth = new Auth();

var replica = "192.168.1.2";
var main = "192.168.1.3";

rep.hosts.add("lunar", replica, "Administrator:456789");
rep.hosts.add("basilisk", main, "Administrator:123456");

var ee = new Queue();


alien.setChannels({
    "queue": ee
});
rep.setChannels({
    "queue": ee
});
arbiter.setChannels({
    "queue": ee
});
broker.setChannels({
    "queue": ee
});
booker.setChannels({
    "queue": ee
});
doctor.setChannels({
    "event-queue": ee
});
auth.setChannels({
    "queue": ee
});

ee.on('permission.dropped.ip.192.168.1.2', d => console.log('dropped:', d));
ee.on('permission.restored.ip.192.168.1.2', d => console.log('restored:', d));

//INTEROP DATA
var attempts = 5;
//var requested = [];
var data = {
    src_host: "basilisk",
    src_bucket: "mt",
    dst_host: "lunar",
    dst_bucket: "rmt",
    ts: _.now() / 1000
};
var timeo = 2000;
var book_timeo = 2000;


//ee.listenTask('dbface.request', d => console.log("REQUEST", d));
//ee.listenTask('dbface.response', d => console.log("RESPONSE", d));
var book = Promise.coroutine(function* (requested) {
    for (var i = 0; i < attempts; i++) {
        console.log("retrying...");
        var res =
            yield ee.addTask(booker.event_names.request, {
                db_id: requested[0],
                data: requested[1],
                action: 'book'
            }).catch((err) => {
                return Promise.resolve(err);
            });
        if (res === true) {
            console.log("Successfully booked");
            break;
        }
        if (res.name == "CBirdError") {
            console.log("Unable to book this resource, please choose another one");
            break;
        }
        if (res.name == booker.errname) {
            console.log("Booker service error, retrying...");
        }
        if (res.name == alien.errname) {
            console.log("DBWorker service error, retrying...");
        }
        yield Promise.delay(book_timeo);
    }
    if (res instanceof Error) {
        console.log("Finished with errors");
        return Promise.reject(res);
    }
    return Promise.resolve(res);
})

var init = Promise.coroutine(function* () {
    yield meta_tree.initModel(path.resolve(__dirname, "MTModel"));
    yield auth.init();
    yield doctor.init(iconfig);
    yield alien.init({
        server_ip: config.db.server_ip,
        n1ql: config.db.n1ql,
        bucket_name: config.db.bucket_name
    });
    yield broker.init({
        meta_tree: meta_tree
    });
    yield booker.init({
        meta_tree: meta_tree,
        master: replica
    });
    yield rep.init();
    yield arbiter.init({
        hosts: rep.hosts
    });
});

init()
    .then(function () {
        auth.tryToStart();
        doctor.tryToStart();
        alien.tryToStart();
        broker.tryToStart();
        booker.tryToStart();
        rep.tryToStart();
        arbiter.tryToStart();
    })
    .then(() => {
        return ee.addTask(rep.event_names.create('bidirect'), data);
    })
    .delay(timeo * 3)
    .then((res) => {
        //                console.log("SETTINGS", res);
        var evdata = _.clone(data);
        evdata.settings = {
            docBatchSizeKb: 512,
            checkpointInterval: 10 //please, do not use this in production until you're all sure about your hardware
        };
        return ee.addTask(rep.event_names.settings, evdata);
    })
    .delay(timeo)
    .then((res) => {
        return ee.addTask(broker.event_names.resources, {
            start: 1,
            end: 1
        });
    })
    .delay(timeo)
    .then((range) => {
        console.log("RESPONDED WITH", range);
        var requested = _.sample(_.pairs(range));
        console.log("TAKING", requested);
        return book(requested);
    })
    .delay(timeo)
    .then((res) => {
        //        return ee.addTask(booker.event_names.request, {
        //            db_id: requested[0],
        //            data: requested[1],
        //            action: 'postpone'
        //        });
        //    })
        //    .delay(timeo)
        //    .then((res) => {
        //        console.log("POSTPONE RESPONSE:", res);
        //        return ee.addTask(booker.event_names.request, {
        //            db_id: requested[0],
        //            data: requested[1],
        //            action: 'reserve'
        //        });
        //    })
        //    .delay(timeo)
        //    .then((res) => {
        //        console.log("RESERVE RESPONSE:", res);
        //        return ee.addTask(booker.event_names.request, {
        //            db_id: requested[0],
        //            data: requested[1],
        //            action: 'progress'
        //        });
        //    })
        //    .delay(timeo)
        //    .then((res) => {
        //        console.log("PROGRESS RESPONSE:", res);
        console.log("BOOK RESPONSE :", res);
        return ee.addTask(booker.event_names.request, {
            db_id: res.db_id,
            data: res.data,
            action: 'free'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("FREE RESPONSE:", res);
    })
    .delay(timeo)
    .then((res) => {
        //        data.ts = _.now() / 1000 - 100;
        //        ee.emit(arbiter.event_names.getup, data);
        return res;
    })
    .delay(timeo)
    .then(() => {
        return ee.addTask(rep.event_names.remove('bidirect'), data);
    });