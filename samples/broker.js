'use strict'

var Promise = require('bluebird');
var _ = require("lodash");
var path = require("path");

var Broker = require('./Broker-sample/broker');
var Booker = require('./Booker-sample/booker');
var Facehugger = require('./DBWorker/facehugger');
var Queue = require('custom-queue');

var config = require('./const/config');

var MetaTree = require("MetaTree").MetaTree;

var meta_tree = new MetaTree({
    server_ip: "192.168.1.3",
    n1ql: "192.168.1.3:8093",
    bucket_name: "mt",
    role: config.name
});

var alien = new Facehugger();
var broker = new Broker();
var booker = new Booker();

var ee = new Queue();


alien.setChannels({
    "queue": ee
});
broker.setChannels({
    "queue": ee
});
booker.setChannels({
    "queue": ee
});

var requested = [];

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
});

init()
    .then(function () {
        alien.tryToStart();
        broker.tryToStart();
        booker.tryToStart();
    })
    .then(() => {
        return ee.addTask(broker.event_names.resources, {
            start: 1,
            end: 4
        });
    })
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
    .delay(1500)
    .then((res) => {
        console.log("BOOK RESPONSE:", res);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'postpone'
        });
    })
    .delay(1500)
    .then((res) => {
        console.log("POSTPONE RESPONSE:", res);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'reserve'
        });
    })
    .delay(1500)
    .then((res) => {
        console.log("RESERVE RESPONSE:", res);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'progress'
        });
    })
    .delay(1500)
    .then((res) => {
        console.log("PROGRESS RESPONSE:", res);
        return ee.addTask(booker.event_names.request, {
            db_id: requested[0],
            data: requested[1],
            action: 'free'
        });
    })
    .delay(1500)
    .then((res) => {
        console.log("FREE RESPONSE:", res);
    });