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
var Constellation = require("./Constellation/constellation");

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
var replica_b = "rmt";
var main = "192.168.1.3";
var main_b = "mt";

var hosts = new Constellation();
hosts.add("lunar", replica, "Administrator:456789");
hosts.add("basilisk", main, "Administrator:123456");

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
var attempts = 7;
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
var book = function (requested, num) {
    if (!requested || _.isEmpty(requested)) {
        console.log("Resource info not provided");
        return Promise.resolve(false);
    }
    if (num == 0) {
        console.log("Max attempts num reached");
        return Promise.resolve(false);
    }
    console.log("Trying to book resource ", requested, ", attempt", num);
    return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'book'
        })
        .then((res) => {
            if (res.success === true) {
                console.log("Successfully booked");
                return Promise.resolve(res);
            }
        })
        .catch((res) => {
            console.log("Error while trying to request the resource");
            if (res.name == "CBirdError") {
                console.log("Unable to book this resource, please choose another one");
                return Promise.resolve(res);
            }
            if (res.name == booker.errname) {
                console.log("Booker service error, retrying...");
            }
            if (res.name == alien.errname) {
                console.log("DBWorker service error, retrying...");
            }
            return Promise.delay(book_timeo)
                .then(() => {
                    return book(requested, (num - 1));
                });
        });

}

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
        meta_tree: meta_tree,
        hosts: hosts
    });
    yield booker.init({
        meta_tree: meta_tree,
        hosts: hosts,
        master: "lunar",
        master_bucket: replica_b,
        slave: "basilisk",
        slave_bucket: main_b
    });
    yield rep.init({
        hosts: hosts
    });
    yield arbiter.init({
        hosts: hosts
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
    .delay(timeo * 5)
    .then(() => {
        return ee.addTask(rep.event_names.create('bidirect'), data);
    })
    //    .then((res) => {
    //        //                console.log("SETTINGS", res);
    //        var evdata = _.clone(data);
    //        evdata.settings = {
    //            docBatchSizeKb: 512,
    //            checkpointInterval: 10 //please, do not use this in production until you're all sure about your hardware
    //        };
    //        return ee.addTask(rep.event_names.settings, evdata);
    //    })
    //    .delay(timeo)
    //    .then((res) => {
    //        var evdata = _.clone(data);
    //        evdata.stat_name = "percent_completeness";
    //        return ee.addTask(rep.event_names.stats, evdata);
    //    })
    //    .delay(timeo)
    .then((res) => {
        return ee.addTask(broker.event_names.resources, {
            start: 1,
            end: 8
        });
    })
    .delay(timeo)
    .then((range) => {
        console.log("RESPONDED WITH", range);
        var requested = _.sample(_.pairs(range));
        console.log("TAKING", requested);
        return book(requested, attempts);
    })
    .delay(timeo)
    .then((res) => {
        console.log("BOOK RESPONSE :", res);
        return !res ? false : ee.addTask(booker.event_names.request, {
            db_id: res.db_id,
            data: res.data,
            action: 'free'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("FREE RESPONSE:", res);
    })
    .then((res) => {
        return ee.addTask(broker.event_names.resources, {
            start: 1,
            end: 8
        });
    })
    .delay(timeo)
    .then((range) => {
        console.log("RESPONDED WITH", range);
        var requested = _.sample(_.pairs(range));
        console.log("TAKING", requested);
        return book(requested, attempts);
    })
    .delay(timeo)
    .then((res) => {
        console.log("BOOK RESPONSE :", res);
        return !res ? false : ee.addTask(booker.event_names.request, {
            db_id: res.db_id,
            data: res.data,
            action: 'free'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("FREE RESPONSE:", res);
    })
    .then((res) => {
        return ee.addTask(broker.event_names.resources, {
            start: 1,
            end: 8
        });
    })
    .delay(timeo)
    .then((range) => {
        console.log("RESPONDED WITH", range);
        var requested = _.sample(_.pairs(range));
        console.log("TAKING", requested);
        return book(requested, attempts);
    })
    .delay(timeo)
    .then((res) => {
        console.log("BOOK RESPONSE :", res);
        return !res ? false : ee.addTask(booker.event_names.request, {
            db_id: res.db_id,
            data: res.data,
            action: 'free'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("FREE RESPONSE:", res);
    })
    .catch((err) => {
        console.log("ERROR", err)
    });
//    .delay(timeo)
//    .then(() => {
//        return ee.addTask(rep.event_names.remove('bidirect'), data);
//    });