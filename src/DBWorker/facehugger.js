'use strict'
var Promise = require('bluebird');
var Abstract = require('../Abstract/abstract.js');
var _ = require("lodash");
var Couchbird = require("Couchbird");
var Error = require("../Error/CBError");

var DB_Face = null;

class Facehugger extends Abstract {
    constructor() {
        super({
            event_group: 'dbface'
        });

        this.queues_required = {
            "event-queue": false,
            "task-queue": true
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

        var opts = {
            server_ip: "127.0.0.1",
            n1ql: "127.0.0.1:8093",
            bucket_name: "default"
        };
        _.assign(opts, config);

        DB_Face = Couchbird({
            server_ip: opts.server_ip,
            n1ql: opts.n1ql
        });

        this._db = DB_Face.bucket(opts.bucket_name);
        this.exposed_api = _.chain(this._db)
            .functions()
            .filter((name) => {
                return !_.startsWith(name, "_");
            })
            .value();

        var request_task = this.event_names.request;
        this.emitter.listenTask(request_task, (data) => this.handle_request(data));

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

    /**
     * own API
     */

    handle_request({
        action: actname,
        params: args,
        id: mid
    }) {

        return new Promise((resolve, reject) => {
            if (!actname || !~_.indexOf(this.exposed_api, actname))
                return reject(new Error("MISSING_METHOD"));
            //Still doesn't feel secure enough
            return resolve(this._db[actname].apply(this._db, args));
        });
        //            .then((res) => {
        //                this.emitter.addTask(this.event_names.response, {
        //                    response: res,
        //                    id: mid
        //                });
        //                return Promise.resolve(res);
        //            })
        //            .catch((err) => {
        //                this.emitter.addTask(this.event_names.response, {
        //                    response: err.message,
        //                    id: mid
        //                });
        //                return Promise.resolve(false);
        //
        //            });
    }
}

module.exports = Facehugger;