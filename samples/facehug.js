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

//ee.listenTask('dbface.request', d => console.log("REQUEST", d));
ee.listenTask('dbface.response', d => console.log("RESPONSE", d));

Promise.props({
        alien: alien.init({
            server_ip: config.db.server_ip,
            n1ql: config.db.n1ql,
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
        var check = Promise.coroutine(function* () {
            for (var i in fn_to_check) {
                var evdata = fn_to_check[i];
                console.log("Emitting request with data :", evdata);
                yield Promise.delay(1000);
                ee.addTask('dbface.request', evdata)
                    .then((res) => {
                        console.log("RES", res);
                    })
                    .catch((err) => {
                        console.log("ERR", err.message)
                    });
            }
        });
        check();
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