'use strict'
var Promise = require('bluebird');
var Abstract = require('../Abstract/abstract.js');
var util = require('util');
var _ = require("lodash");
var DB_Face = require("../db/DB_Face");
var Error = require("../Error");

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
            return Promise.reject('U should set channels before');
        }

        var opts = {
            bucket_name: "default"
        };
        _.assign(opts, config);
        this._db = DB_Face.bucket(opts.bucket_name);
        this.exposed_api = _.chain(this._db)
            .functions()
            .filter((name) => {
                return !_.startsWith(name, "_");
            })
            .value();
        return Promise.resolve(true);
    }

    start() {
        this.paused = false;

        return this;
    }

    pause() {
        //@TODO: Dunno what should they do when paused or resumed
        this.paused = true;

        return this;
    }
    resume() {
            //@TODO: Dunno what should they do when paused or resumed
            this.paused = false;

            return this;
        }
        /**
         * own API
         */
    handle_request(request) {
        console.log("Handling request...", request);
        if (!request.action || !_.has(this.exposed_api, request.action))
            return Promise.reject(new Error("MISSING_METHOD"));
        return Promise.resolve(true);
    }
}

module.exports = Facehugger;