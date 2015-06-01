'use strict'

var Abstract = require('../Abstract/abstract.js');
var http = require('http');
var socketio = require('socket.io');

const DEFAULT_PORT = 80;

class MessageHub extends Abstract {
    constructor() {
        super({});
        this.queues_required = {
            "event-queue": true,
            "task-queue": true
        };
    }
    init(options) {
        super.init(options);
        var port = options.port || DEFAULT_PORT;
        this.io = socketio(port);
        console.log(port);
        var io = this.io;
        io.on('connection', function (socket) {
            io.emit('news', {
                hello: 'be received by everyone'
            });

            socket.on('my other event', function (from, msg) {
                console.log('I received a private message by ', from, ' saying ', msg);
            });

            socket.on('disconnect', function (reason) {
                console.log('user left', reason);
            });
        });
    }
    start() {
        super.start();
    }
    pause() {
        super.pause();
    }
}







module.exports = MessageHub;