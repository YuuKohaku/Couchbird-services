'use strict'
var Promise = require('bluebird');
var _ = require("lodash");
var qs = require("querystring");
var request = Promise.promisify(require("request"));

var Abstract = require('../Abstract/abstract.js');
var Error = require("../Error/ReplicatorError");
var Constellation = require("./hosts/constellation");

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

var toggle_replication = function (ip, usr, pwd, ref = false, on = true) {
    var postData = qs.stringify({
        pauseRequested: on
    });
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

var get_reference = function (ip, sb, dhost, db, usr, pwd) {
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
            var cluster_ref = _.filter(response, {
                name: dhost
            });
            if (cluster_ref.length != 1)
                return Promise.reject(res);
            var ref = [cluster_ref[0].uuid, sb, db].join("/");
            return Promise.resolve(ref);
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
        this.hosts = new Constellation();
        this.rids = {};
    }

    setChannels(options) {
        super.setChannels(options);

        return this;
    }

    init(config) {
        this.config = config || {};
        if (!this.emitter && (this.queues_required['event-queue'] || this.queues_required['task-queue'])) {
            return Promise.reject('U should set channels before');
        }

        var events = this.getEvents('replication');
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
            },
            {
                name: events.resume(ways.two),
                handler: this.resume_twoway_replication
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

    get_replication_state({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db,
        stat_name: stat
    }) {
        var src = this.hosts.show(shost);
        if (!src) {
            return Promise.reject(new Error("CONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }
        var key = [shost, sb, dhost, db].join(":");
        return new Promise((resolve, reject) => {
                return resolve(this.rids[key] || get_reference(src.ip, sb, dhost, db, src.usr, src.pwd));
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

    create_oneway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        var src = this.hosts.show(shost);
        if (!src) {
            return Promise.reject(new Error("CONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }

        return create_replication(src.ip, sb, dhost, db, src.usr, src.pwd)
            .then((res) => {
                var response = JSON.parse(res[1]);
                if (!response.errors)
                    this.rids[[shost, sb, dhost, db].join(":")] = response.id;
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
        if (!src) {
            return Promise.reject(new Error("CONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }
        var key = [shost, sb, dhost, db].join(":");
        return new Promise((resolve, reject) => {
                return resolve(this.rids[key] || get_reference(src.ip, sb, dhost, db, src.usr, src.pwd));
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
        var src = this.hosts.show(shost);
        if (!src) {
            return Promise.reject(new Error("CONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }

        var key = [shost, sb, dhost, db].join(":");
        return new Promise((resolve, reject) => {
                return resolve(this.rids[key] || get_reference(src.ip, sb, dhost, db, src.usr, src.pwd));
            })
            .then((ref) => {
                return toggle_replication(src.ip, src.usr, src.pwd, ref, true)
                    .then((res) => {
                        var response = JSON.parse(res[1]);
                        return Promise.resolve(response);
                    });
            });
    }

    resume_oneway_replication({
        src_host: shost,
        src_bucket: sb,
        dst_host: dhost,
        dst_bucket: db
    }) {
        var src = this.hosts.show(shost);
        if (!src) {
            return Promise.reject(new Error("CONFIGURATION", "Configure source host before you ask it for anything, dammit."));
        }

        var key = [shost, sb, dhost, db].join(":");
        return new Promise((resolve, reject) => {
                return resolve(this.rids[key] || get_reference(src.ip, sb, dhost, db, src.usr, src.pwd));
            })
            .then((ref) => {
                return toggle_replication(src.ip, src.usr, src.pwd, ref, false)
                    .then((res) => {
                        var response = JSON.parse(res[1]);
                        return Promise.resolve(response);
                    });
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