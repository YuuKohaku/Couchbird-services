'use strict'

var Promise = require('bluebird');
var _ = require("lodash");
var qs = require("querystring");
var request = Promise.promisify(require("request"));

var Abstract = require('../Abstract/abstract.js');
var Error = require("../Error/Lapsus")("ArbiterError");

//UTILITY

var get_history = function (ip, sb, since) {
    var uri = sb + '/_design/history_ts/_view/history_ts?stale=false&startkey=' + since;
    var options = {
        uri: uri,
        baseUrl: "http://" + [ip, 8092].join(":"),
        method: 'GET'
    };

    return request(options)
        .then((res) => {
            var response = JSON.parse(res[1]);
            return Promise.resolve(response);
        });
}

var compare = function (hst1 = {}, hst2 = {}) {

}


class Arbiter extends Abstract {
    constructor() {
        super({
            event_group: 'arbiter'
        });

        this.queues_required = {
            "event-queue": true,
            "task-queue": false
        };

    }

    setChannels(options) {
        super.setChannels(options);

        return this;
    }

    init(config) {
        this.config = config || {};
        if (!this.emitter && (this.queues_required['event-queue'] || this.queues_required['task-queue'])) {
            return Promise.reject(new Error("SERVICE_ERROR", 'U should set channels before'));
        }

        this.hosts = config.hosts || {};
        this.timeout = config.timeout || 500;
        var tasks = [
            {
                name: this.event_names.getup,
                handler: this.getup
            }
        ];
        _.forEach(tasks, (task) => {
            this.emitter.on(task.name, (data) => _.bind(task.handler, this)(data));
        });
        return Promise.resolve(true);
    }

    start() {
        super.start();
        this.paused = false;

        return this;
    }

    pause() {
        //@TODO: Dunno what should they do when paused or resumed
        super.pause();
        this.paused = true;

        return this;
    }

    resume() {
        //@TODO: Dunno what should they do when paused or resumed
        super.resume();
        this.paused = false;

        return this;
    }

    //API

    getup({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db,
        ts: ts
    }) {
        var src = this.hosts.show(shost);
        var dst = this.hosts.show(dhost);
        if (!src || !dst) {
            return Promise.reject(new Error("MISCONFIGURATION", "Configure source and destination hosts before you ask it for anything, dammit."));
        }
        return this.emitter.addTask(this.getEvents('replication').pause('bidirect'), {
                src_host: shost,
                src_bucket: sb,
                dst_host: dhost,
                dst_bucket: db
            })
            .delay(this.timeout)
            .then(() => {
                return Promise.all([get_history(src.ip, sb, ts), get_history(dst.ip, db, ts)]);
            })
            .then((res) => {
                console.log("HISTORY", res.rows);
            });
    }
}

module.exports = Arbiter;