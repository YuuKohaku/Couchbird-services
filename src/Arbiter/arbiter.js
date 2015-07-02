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
            var response = JSON.parse(res[0].toJSON().body);
            return Promise.resolve(response);
        })
        .catch((err) => {
            console.log("Arbiter: history request error");
            return Promise.resolve(false);
        });
}


var compare = function (hst_m, hst_s) {
    var conflict = {};
    var index_m = _.indexBy(hst_m, "id");
    var ids_m = _.keys(index_m, "id");
    var index_s = _.indexBy(hst_s, "id");
    var ids_s = _.keys(index_s, "id");
    var diff_m = _.difference(ids_m, ids_s); //ids that are present only on master
    var diff_s = _.difference(ids_s, ids_m); //ids that are present only on slave

    var rec_m = _.chain(index_m)
        .pick(diff_m)
        .values()
        .value();

    var rec_s = _.chain(index_s)
        .pick(diff_s)
        .values()
        .value();
    //    console.log("HISTORY: ", rec_m, rec_s);

    //if master did something, do nothing
    if (diff_m.length > 0) {
        //  console.log("HISTORY: master did something:", rec_m);
    }
    //if slave did something, panic
    if (diff_s.length > 0) {
        _.forEach(rec_s, function (el) {
            var res_id = el.value.resource;
            var related = _.find(rec_m, {
                value: {
                    resource: res_id
                }
            });
            console.log("HISTORY: related:", related);
            if (related) {
                conflict[el.value.resource] = conflict[el.value.resource] || [];
                conflict[el.value.resource].push(el);
            }
        });
        //     console.log("HISTORY: slave did something:", rec_s);
    }
    return conflict;
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
                //                 console.log("HISTORY", res);
                var promises = [];
                var conflict = compare(res.mst.rows, res.slv.rows);
                _.forEach(conflict, (el, key) => {
                    _.forEach(el, (record) => {
                        var new_rec = record.value;
                        new_rec.invalid = true;
                        var promise = this.emitter.addTask(this.getEvents('dbface').request, {
                            action: 'upsert',
                            params: [record.id, new_rec],
                            id: false
                        });
                        promises.push(promise);
                        return Promise.all(promises);
                    });
                });
            })
            .then((res) => {
                return this.emitter.addTask(this.getEvents('replication').resume('bidirect'), {
                    src_host: shost,
                    src_bucket: sb,
                    dst_host: mhost,
                    dst_bucket: mb
                })
            })
            .catch((err) => {
                console.log("ARB ERROR", err.stack);
                return Promise.resolve(false)
            });;
    }
}

module.exports = Arbiter;