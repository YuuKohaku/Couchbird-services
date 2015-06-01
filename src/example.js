'use strict'

/* test */

var iconfig = require('../inspectors-config.json');
var Promise = require('bluebird');

/* services */

var Doctor = require('./Physician/physician.js');
var Auth = require('./Auth/auth.js');
var MessageHub = require('./MessageHub/messagehub.js');
var Sample = require('./SampleService/sampleservice.js');

var Queue = require('custom-queue');

var doctor = new Doctor();
var auth = new Auth();
var sample = new Sample();
var hub = new MessageHub();
//var ee = new EventEmitter2({
//    wildcard: false,
//    newListener: false,
//    maxListeners: 10
//});

var ee = new Queue();

doctor.setChannels({
    "event-queue": ee
});

auth.setChannels({
    "queue": ee
});

hub.setChannels({
    "queue": ee
});

sample.setChannels({
    "queue": ee
});

Promise.props({
    auth: auth.init(),
    doctor: doctor.init(iconfig),
    sample: sample.init(),
    hub: hub.init({
        port: 3000
    }),
}).then(function () {
    auth.tryToStart();
    doctor.tryToStart();
    sample.tryToStart();
    hub.tryToStart();
});

/* this will be cooler next time */

ee.on('permission.dropped', d => console.log(d));
ee.on('permission.restored', d => console.log('restored:', d));

/*Test part, ya.ru should be always up*/

/*
setTimeout(function () {
    check();
}, 4000);

var Ip_Model = require('./Model/Permission/ip.js');


var check = function () {
    ee.addTask('permission.request', [
        new Ip_Model('ya.ru').requestMessage(),
        new Ip_Model('127.1.1.1').requestMessage(),
        new Ip_Model('192.168.43.74').requestMessage()
    ]).then(v => console.log(v));
};

check();
*/