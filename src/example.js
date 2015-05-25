'use strict'

var Promise = require('bluebird');
var EventEmitter2 = require('eventemitter2').EventEmitter2;

var Facehugger = require('./DBWorker/facehugger');
var Queue = require('custom-queue');

var config = require('./const/config');

var alien = new Facehugger();

var ee = new EventEmitter2({
    wildcard: false,
    newListener: false,
    maxListeners: 10
});

//var ee = new Queue();

alien.setChannels({
    "queue": ee
});

Promise.props({
    alien: alien.init({
        bucket_name: config.db.bucket_name
    })
}).then(function () {
    alien.start();
});

ee.on('dbface.request', (args) => {
    alien.handle_request(args)
        .then((res) => {
            ee.emit('dbface.response', res);
        })
        .catch((err) => {
            ee.emit('dbface.response', err);
        });
});

ee.on('dbface.response', (data) => {
    console.log("DB responded with: ", data);
});

var tm = setInterval(() => {
    ee.emit('dbface.request', {
        action: "get",
        params: {}
    });
}, 1000);

process.on("exit", (code) => {
    clearInterval(tm);
})