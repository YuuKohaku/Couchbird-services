'use strict'

var Promise = require('bluebird');
var _ = require("lodash");

var Facehugger = require('./DBWorker/facehugger');
var Queue = require('custom-queue');

var config = require('./const/config');

var alien = new Facehugger();

//var ee = new EventEmitter2({
//    wildcard: false,
//    newListener: false,
//    maxListeners: 10
//});

var ee = new Queue();


alien.setChannels({
    "queue": ee
});

ee.listenTask('dbface.response', d => console.log("RESPONSE", d));

Promise.props({
        alien: alien.init({
            bucket_name: config.db.bucket_name
        })
    }).then(function () {
        alien.tryToStart();
    })
    .then(() => {
        var fn_to_check = [
            {
                action: "nonexistent",
                params: ["who does care at all?"],
                id: "0"
            },
            {
                action: "getMulti",
                params: [["operator/1", "operator/2"]],
                id: "1"
            },
            {
                action: "remove",
                params: ["something/1"],
                id: "10"
            },
            {
                action: "insert",
                params: ["something/1", 42],
                id: "11"
            },
            {
                action: "upsert",
                params: ["something/1", 24],
                id: "100"
            },
            {
                action: "get",
                params: ["something/1"],
                id: "101"
            }
        ];

        _.forEach(fn_to_check, function (evdata, n) {
            ee.addTask('dbface.request', evdata);
        });
    });


//ee.on('dbface.request', (args) => {
//    alien.handle_request(args)
//        .then((res) => {
//            ee.emit('dbface.response', {
//                response: res,
//                id: args.id
//            });
//        })
//        .catch((err) => {
//            ee.emit('dbface.response', {
//                response: err.message,
//                id: args.id
//            });
//        });
//});
//
//ee.on('dbface.response', (data) => {
//    console.log("DB responded with: ", data);
//});

//var tm = setInterval(() => {
//    ee.emit('dbface.request', {
//        action: "get",
//        params: ["operator/1"]
//    });
//}, 1000);
//
//process.on("exit", (code) => {
//    clearInterval(tm);
//})