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
        })
        .catch((err) => {
            console.log("Arbiter: history request error");
            return Promise.resolve(false);
        });
}

var diff_history = function (array, values) {
    var length = array ? array.length : 0;
    var result = [];

    if (!length) {
        return result;
    }
    var index = -1,
        vlen = values.length;

    outer:
        while (++index < length) {
            var value = array[index];
            var vindex = vlen;
            while (vindex--) {
                if (_.isEqual(values[vindex], value)) {
                    continue outer;
                }
                result.push(value);
            }
        }
    return result;
}

var compare = function (hst_m = {}, hst_s = {}) {
    //var diff = diff_history(hst1, hst2);
    var ids_m = _.pluck(hst_m, "id");
    var ids_s = _.pluck(hst_s, "id");
    var diff_m = _.difference(ids_m, ids_s); //ids that are present only on master
    var diff_s = _.difference(ids_s, ids_m); //ids that are present only on slave
    console.log("DIFF_M", diff_m);
    console.log("DIFF_S", diff_s);
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
            this.emitter.listenTask(task.name, (data) => _.bind(task.handler, this)(data));
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
        master: mhost,
        master_bucket: mb,
        slave: shost,
        slave_bucket: sb,
        ts: ts
    }) {
        var mst = this.hosts.show(mhost);
        var slv = this.hosts.show(shost);
        if (!slv || !mst) {
            return Promise.reject(new Error("MISCONFIGURATION", "Configure source and destination hosts before you ask it for anything, dammit."));
        }
        if (!mst.active || !slv.active) {
            return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
        }

        return this.emitter.addTask(this.getEvents('replication').pause('bidirect'), {
                src_host: shost,
                src_bucket: sb,
                dst_host: mhost,
                dst_bucket: mb
            })
            .delay(this.timeout)
            .then(() => {
                return Promise.props({
                    slv: get_history(slv.ip, sb, ts),
                    mst: get_history(mst.ip, mb, ts)
                });
            })
            .then((res) => {
                //                console.log("HISTORY", res);
                compare(res.mst.rows, res.slv.rows);
            })
            .then((res) => {
                return this.emitter.addTask(this.getEvents('replication').resume('bidirect'), {
                    src_host: shost,
                    src_bucket: sb,
                    dst_host: mhost,
                    dst_bucket: mb
                })
            })
            //            .catch(err => console.log("ARB ERROR", err, err.stack));;
    }
}

module.exports = Arbiter;