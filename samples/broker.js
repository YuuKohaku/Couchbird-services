'use strict'

var Promise = require('bluebird');
var _ = require("lodash");
var path = require("path");

var Broker = require('./Broker/index');
var Booker = require('./Booker/index');
var Facehugger = require('./Facehugger/index');
var Replicator = require("./Replicator/index");
var Arbiter = require("./Arbiter/index");
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

var replica = "192.168.1.3";
var replica_b = "rmt";
var main = "192.168.1.2";
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


//INTEROP DATA
var attempts = 7;
//var requested = [];
var data = {
    src_host: "basilisk",
    src_bucket: "mt",
    dst_host: "lunar",
    dst_bucket: "rmt"
};
var timeo = 2000;
var book_timeo = 2000;

//to imitate
ee.on('permission.dropped.ip.192.168.1.3', d => {
    console.log('dropped:', d);
    ee.addTask(rep.event_names.pause('bidirect'), data);
})

ee.on('permission.restored.ip.192.168.1.3', d => {
    console.log('restored:', d);
    ee.addTask(rep.event_names.resume('bidirect'), data);
});


//ee.listenTask('dbface.request', d => console.log("REQUEST", d));
//ee.listenTask('dbface.response', d => console.log("RESPONSE", d));
var free = function (res) {

}

var act = function (requested, num, action) {
    if (!requested || _.isEmpty(requested) || !requested[0] || !requested[1]) {
        console.log("Resource info not provided");
        return Promise.resolve(false);
    }
    if (num == 0) {
        console.log("Max attempts num reached");
        return Promise.resolve(false);
    }
    console.log("Trying to ", action, " resource ", requested, ", attempt", num);
    return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: action
        })
        .then((res) => {
            if (res.success === true) {
                console.log("Success", action);
                return Promise.resolve(res);
            }
        })
        .catch((res) => {
            console.log("Error while trying to request the resource");
            if (res.name == "CBirdError") {
                console.log("Unable to", action, "this resource");
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
                    return act(requested, (num - 1), action);
                });
        });

}

var init = Promise.coroutine(function* () {
    yield meta_tree.initModel(path.resolve(__dirname, "Model/MetaTree"));
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
    }).delay(timeo)
    .then(function () {
        alien.tryToStart();
        broker.tryToStart();
        booker.tryToStart();
        rep.tryToStart();
        arbiter.tryToStart();
    })
    //    .then(() => {
    //        return ee.addTask(booker.event_names.patch, {
    //            resource: 'resource/8',
    //            patch: {
    //                state: "reserved",
    //                owner: "replica"
    //            }
    //        })
    //    })
    //    .then((res) => {
    //        console.log("PATCH RESPONSE :", res);
    //    })
    //    .delay(timeo * 5)
    //    .then(() => {
    //        return ee.addTask(rep.event_names.create('bidirect'), data);
    //    })
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
    //    .then((res) => {
    //        return ee.addTask(broker.event_names.resources, {
    //            start: 1,
    //            end: 8
    //        });
    //    })
    .delay(timeo)
    .then((range) => {
        console.log("RESPONDED WITH", range);
        var requested = _.sample(_.pairs(_.reduce(range, (res, val, key) => {
            if (val.value.state == "idle") {
                res[key] = val;
            }
            return res;
        }, {})));
        console.log("TAKING", requested);
        return act(requested, attempts, "book");
    })
    .delay(timeo)
    .then((res) => {
        console.log("BOOK RESPONSE :", res);
        return act([res.db_id, res.data], attempts, "free");
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
        var requested = _.sample(_.pairs(_.reduce(range, (res, val, key) => {
            if (val.value.state == "idle") {
                res[key] = val;
            }
            return res;
        }, {})));
        console.log("TAKING", requested);
        return act(requested, attempts, "book");
    })
    .delay(timeo)
    .then((res) => {
        console.log("BOOK RESPONSE :", res);
        return act([res.db_id, res.data], attempts, "free");
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
        var requested = _.sample(_.pairs(_.reduce(range, (res, val, key) => {
            if (val.value.state == "idle") {
                res[key] = val;
            }
            return res;
        }, {})));
        console.log("TAKING", requested);
        return act(requested, attempts, "book");
    })
    .delay(timeo)
    .then((res) => {
        console.log("BOOK RESPONSE :", res);
        return act([res.db_id, res.data], attempts, "free");
    })
    .delay(timeo)
    .then((res) => {
        console.log("FREE RESPONSE:", res);
    })
    .catch((err) => {
        console.log("ERRORRR", err.stack)
    })
    //    .delay(timeo)
    //    .then(() => {
    //        return ee.addTask(rep.event_names.pause('bidirect'), data);
    //    })
    //    .then((res) => {
    //        console.log("REP PAUSE:", res);
    //    });