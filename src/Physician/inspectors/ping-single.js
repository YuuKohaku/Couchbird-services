'use strict'

var Abstract = require('./abstract.js');
var Promise = require('bluebird');
var http = require("http");

var ping = function (url, port) {
    var promise = new Promise(function (resolve, reject) {
        var result;
        var options = {
            host: url,
            port: port || 80,
            path: '/'
        };
        var start = Date.now();
        var pingRequest = http.request(options, function () {
            result = Date.now() - start;
            resolve(result);
            pingRequest.abort();
        });
        pingRequest.on("error", function () {
            result = -1;
            reject(result);
            pingRequest.abort();
        });
        pingRequest.write("");
        pingRequest.end();
    });

    return promise;
};

class Single extends Abstract {
    constructor(params, emitters) {
        super(params, emitters);

        this.init({
            permission_watched: 'ip',
            inspector_name: 'ip/ping',
            key_data: params.key_data
        });

        this.interval = params.interval;
        this.timeout = params.less_then;
        this.selected_ip = params.key_data;

    }

    ping() {

        var self = this;

        var interval = this.interval;
        var timeout = this.timeout;
        var selected_ip = this.selected_ip;

        var forever_ping = Promise.coroutine(function* () {
            while (!self.stop) {
                yield Promise.delay(interval)

                yield ping(selected_ip)
                    .timeout(timeout, 'timeout')
                    .then(function (time) {
                        self.send('restore', 'online');
                    })
                    .catch(function (data) {
                        var is_timeout = data.hasOwnProperty("message") && data.message === 'timeout';

                        self.send('drop', is_timeout ? 'low-latency' : 'ping-error');
                    });
            }
        });

        forever_ping();
    }

    start() {
        this.stop = false;
        this.ping();
    }

    stop() {
        this.stop = true;
    }
}

module.exports = Single;