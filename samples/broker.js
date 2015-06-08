'use strict'

var Promise = require('bluebird');
var _ = require("lodash");
var path = require("path");

var Broker = require('./Broker-sample/broker');
var Booker = require('./Booker-sample/booker');
var Facehugger = require('./DBWorker/facehugger');
var Replicator = require("./Replicator/replicator");
var Arbiter = require("./Arbiter/arbiter");
var Queue = require('custom-queue');

var config = require('./const/config');

var MetaTree = require("MetaTree").MetaTree;

var meta_tree = new MetaTree({
    server_ip: "127.0.0.1",
    n1ql: "127.0.0.1:8093",
    bucket_name: "mt",
    role: config.name
});

var alien = new Facehugger();
var broker = new Broker();
var booker = new Booker();
var arbiter = new Arbiter();
var rep = new Replicator();

rep.hosts.add("lunar", "192.168.1.4", "Administrator:456789");
rep.hosts.add("basilisk", "192.168.1.3", "Administrator:123456");

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

var requested = [];
var data = {
    src_host: "basilisk",
    src_bucket: "mt",
    dst_host: "lunar",
    dst_bucket: "rmt",
    ts: _.now()
};
var timeo = 3000;
//ee.listenTask('dbface.request', d => console.log("REQUEST", d));
//ee.listenTask('dbface.response', d => console.log("RESPONSE", d));

var init = Promise.coroutine(function* () {
    yield meta_tree.initModel(path.resolve(__dirname, "MTModel"));
    //    console.log("METATREE", meta_tree);
    yield alien.init({
        server_ip: config.db.server_ip,
        n1ql: config.db.n1ql,
        bucket_name: config.db.bucket_name
    });
    yield broker.init({
        meta_tree: meta_tree
    });
    yield booker.init({
        meta_tree: meta_tree
    });
    yield rep.init();
    yield arbiter.init({
        hosts: rep.hosts
    });
});

init()
    .then(function () {
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
    .then(() => {
        data.ts = _.now() / 1000 - 500;
        return ee.emit(arbiter.event_names.getup, data);
    })
    .delay(timeo)
    .then(() => {
        return ee.addTask(broker.event_names.resources, {
            start: 1,
            end: 4
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("RESPONDED WITH", res);
        requested = _.sample(_.pairs(res));
        console.log("TAKING", requested);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'book'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("BOOK RESPONSE:", res);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'postpone'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("POSTPONE RESPONSE:", res);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'reserve'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("RESERVE RESPONSE:", res);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'progress'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("PROGRESS RESPONSE:", res);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'free'
        });
    })
    .delay(timeo)
    .then((res) => {
        console.log("FREE RESPONSE:", res);
    })
    .then(() => {
        return ee.addTask(rep.event_names.remove('bidirect'), data);
    });