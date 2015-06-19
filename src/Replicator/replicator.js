'use strict'
var Promise = require('bluebird');
var _ = require("lodash");
var qs = require("querystring");
var request = Promise.promisify(require("request"));

var Abstract = require('../Abstract/abstract.js');
var Error = require("../Error/Lapsus")("ReplicatorError");

//UTILITY

var create_replication = function (ip, sb, dhost, db, usr, pwd) {
    var postData = qs.stringify({
        fromBucket: sb,
        toCluster: dhost,
        toBucket: db,
        replicationType: "continuous"
    });
    var options = {
        uri: '/controller/createReplication',
        baseUrl: "http://" + [ip, 8091].join(":"),
        method: 'POST',
        auth: {
            user: usr,
            pass: pwd
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        },
        body: postData
    };

    return request(options);
}

var set_settings = function (ip, usr, pwd, ref = false, settings) {
    var postData = qs.stringify(settings);
    var uri = ref ? '/settings/replications/' + encodeURIComponent(ref) : '/settings/replications';
    var options = {
        uri: uri,
        baseUrl: "http://" + [ip, 8091].join(":"),
        method: 'POST',
        auth: {
            user: usr,
            pass: pwd
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        },
        body: postData
    };

    return request(options);
}

var get_settings = function (ip, usr, pwd, ref = false) {
    var uri = ref ? '/settings/replications/' + encodeURIComponent(ref) : '/settings/replications';
    var options = {
        uri: uri,
        baseUrl: "http://" + [ip, 8091].join(":"),
        method: 'GET',
        auth: {
            user: usr,
            pass: pwd
        }
    };
    return request(options);
};

var remove_replication = function (ip, ref, usr, pwd) {
    var options = {
        uri: '/controller/cancelXDCR/' + encodeURIComponent(ref),
        baseUrl: "http://" + [ip, 8091].join(":"),
        method: 'DELETE',
        auth: {
            user: usr,
            pass: pwd
        }
    };

    return request(options);
}

var get_references = function (ip, usr, pwd) {
    var options = {
        uri: '/pools/default/remoteClusters',
        baseUrl: "http://" + [ip, 8091].join(":"),
        method: 'GET',
        auth: {
            user: usr,
            pass: pwd
        }
    };

    return request(options)
        .then((res) => {
            var response = JSON.parse(res[1]);
            var cluster_ref = _.reduce(_.filter(response, {
                deleted: false
            }), (res, el) => {
                //                console.log("EL", el)
                var el_ip = el.hostname.split(":")[0];
                res[el_ip] = el.uuid;
                return res;
            }, {});
            //            console.log("CLUSTER REF", cluster_ref);
            return Promise.resolve(cluster_ref);
        });
}

var get_stats = function (ip, sbucket, usr, pwd, ref) {
    var uri = '/pools/default/buckets/' + sbucket + '/stats/' + encodeURIComponent(ref);
    var options = {
        uri: uri,
        baseUrl: "http://" + [ip, 8091].join(":"),
        method: 'GET',
        auth: {
            user: usr,
            pass: pwd
        }
    };
    return request(options);
};

var mutual_method = function (method, {
    src_host: shost,
    src_bucket: sb,
    dst_host: dhost,
    dst_bucket: db
}) {
    var bound = _.bind(method, this);
    var there = bound({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    });
    var back = bound({
        src_host: dhost,
        src_bucket: db,
        dst_host: shost,
        dst_bucket: sb
    });
    return Promise.props({
        shost: there,
        dhost: back
    });
}

//REPLICATOR

class Replicator extends Abstract {
    constructor() {
        super({
            event_group: 'replication'
        });

        this.queues_required = {
            "event-queue": false,
            "task-queue": true
        };
        this.rids = {};
        this.refs = {};
        this.errname = Error.name;

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

        var events = this.event_names;
        var ways = {
            one: 'direct',
            two: 'bidirect'
        };
        var tasks = [
            {
                name: events.create(ways.one),
                handler: this.create_oneway_replication
            },
            {
                name: events.create(ways.two),
                handler: this.create_twoway_replication
            },
            {
                name: events.remove(ways.one),
                handler: this.remove_oneway_replication
            },
            {
                name: events.remove(ways.two),
                handler: this.remove_twoway_replication
            },
            {
                name: events.pause(ways.one),
                handler: this.pause_oneway_replication
            },
            {
                name: events.pause(ways.two),
                handler: this.pause_twoway_replication
            },
            {
                name: events.resume(ways.one),
                handler: this.resume_oneway_replication
            }, {
                name: events.resume(ways.two),
                handler: this.resume_twoway_replication
            }, {
                name: events.settings,
                handler: this.settings
            },
            {
                name: events.stats,
                handler: this.get_replication_state
            }
        ];
        _.forEach(tasks, (task) => {
            this.emitter.listenTask(task.name, (data) => _.bind(task.handler, this)(data));
        });
        this.hosts = config.hosts || {};
        var promises = [];
        this.hosts.forEach((val, key) => {
            var ip = val.ip;
            var usr = val.usr;
            var pwd = val.pwd;
            var drop = this.getEvents("permission").dropped("ip", ip);
            var rest = this.getEvents("permission").restored("ip", ip);
            //            console.log("Replicator: Now watching host ", ip);
            this.emitter.on(drop, _.bind(this.inactive, this));
            this.emitter.on(rest, _.bind(this.active, this));
            promises.push(get_references(ip, usr, pwd)
                .then((res) => {
                    //                    console.log("RES INIT", res);
                    this.refs[ip] = res;
                    return Promise.resolve(true);
                })
            );
            //leaving this for a better time
            //            this.addPermission("ip", ip);
        });

        //        this.required_permissions.dropped((data) => {
        //            console.log("DROPPED:", data);
        //        });
        //        this.required_permissions.restored((data) => {
        //            console.log("RESTORED:", data);
        //        });

        return Promise.all(promises).then((res) => {
            return Promise.resolve(true);
        });
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

    inactive(data) {
        this.hosts.lapse(data.permission.key);
    }

    active(data) {
        this.hosts.lapse(data.permission.key, true);
    }

    get_reference(ip, dip, sb, db) {
        //        console.log("GET REFERENCE ", ip, dip, sb, db, this.refs);
        var ref = this.refs[ip][dip];
        var rid = [ref, sb, db].join("/");
        this.rids[[ip, sb, dip, db].join(":")] = rid;
        //        console.log("GETREF", ref, rid);
        return rid;
    }

    get_replication_state({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db,
        stat_name: stat
    }) {
        var src = this.hosts.show(shost);
        var dst = this.hosts.show(dhost);
        if (!src) {
            return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }
//        if (!src.active || !dst.active) {
//            return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
//        }
        var key = [src.ip, sb, dst.ip, db].join(":");
        return new Promise((resolve, reject) => {
                return resolve(this.rids[key] || this.get_reference(src.ip, dst.ip, sb, db));
            })
            .then((ref) => {
                var refstat = [ref, stat].join("/");
                return get_stats(src.ip, sb, src.usr, src.pwd, refstat)
                    .then((res) => {
                        var response = JSON.parse(res[1]);
                        return Promise.resolve(response);
                    });
            });
    }

    settings({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db,
        settings: settings
    }) {
        var src = this.hosts.show(shost);
        var dst = this.hosts.show(dhost);
        if (!src) {
            return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }
//        if (!src.active || !dst.active) {
//            return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
//        }


        var key = [src.ip, sb, dst.ip, db].join(":");
        return new Promise((resolve, reject) => {
                return resolve(this.rids[key] || this.get_reference(src.ip, dst.ip, sb, db));
            })
            .then((ref) => {
                var promise = (_.isObject(settings)) ?
                    set_settings(src.ip, src.usr, src.pwd, ref, settings) :
                    get_settings(src.ip, src.usr, src.pwd, ref);

                return promise
                    .then((res) => {
                        //                        console.log("PARSING", res[1]);
                        var response = JSON.parse(res[1]);
                        return Promise.resolve(response);
                    });
            });

    }

    create_oneway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        var src = this.hosts.show(shost);
        var dst = this.hosts.show(dhost);
        if (!src) {
            return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }
        if (!src.active || !dst.active) {
            return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
        }

        return create_replication(src.ip, sb, dhost, db, src.usr, src.pwd)
            .then((res) => {
                var response = JSON.parse(res[1]);
                if (!response.errors)
                    this.rids[[src.ip, sb, dst.ip, db].join(":")] = response.id;
                return Promise.resolve(response);
            });
    }

    remove_oneway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        var src = this.hosts.show(shost);
        var dst = this.hosts.show(dhost);
        if (!src) {
            return Promise.reject(new Error("MISCONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }
        if (!src.active || !dst.active) {
            return Promise.reject(new Error("SERVICE_ERROR", "At least one of provided hosts is unreachable."));
        }

        var key = [src.ip, sb, dst.ip, db].join(":");
        return new Promise((resolve, reject) => {
                return resolve(this.rids[key] || this.get_reference(src.ip, dst.ip, sb, db));
            })
            .then((ref) => {
                return remove_replication(src.ip, ref, src.usr, src.pwd)
                    .then((res) => {
                        var response = JSON.parse(res[1]);
                        delete this.rids[key];
                        return Promise.resolve(response);
                    });
            });
    }

    pause_oneway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        return this.settings({
            src_host: shost,
            src_bucket: sb,
            dst_host: dhost,
            dst_bucket: db,
            settings: {
                pauseRequested: true
            }
        });
    }

    resume_oneway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        return this.settings({
            src_host: shost,
            src_bucket: sb,
            dst_host: dhost,
            dst_bucket: db,
            settings: {
                pauseRequested: false
            }
        });
    }

    create_twoway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        return _.bind(mutual_method, this)(this.create_oneway_replication, {
            src_host: dhost,
            src_bucket: db,
            dst_host: shost,
            dst_bucket: sb
        });
    }

    remove_twoway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        return _.bind(mutual_method, this)(this.remove_oneway_replication, {
            src_host: dhost,
            src_bucket: db,
            dst_host: shost,
            dst_bucket: sb
        });
    }

    pause_twoway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        return _.bind(mutual_method, this)(this.pause_oneway_replication, {
            src_host: dhost,
            src_bucket: db,
            dst_host: shost,
            dst_bucket: sb
        });
    }
    resume_twoway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        return _.bind(mutual_method, this)(this.resume_oneway_replication, {
            src_host: dhost,
            src_bucket: db,
            dst_host: shost,
            dst_bucket: sb
        });
    }
}

module.exports = Replicator;