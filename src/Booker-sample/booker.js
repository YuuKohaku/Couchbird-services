'use strict'

var Abstract = require('../Abstract/abstract.js');
var _ = require("lodash");
var Error = require("../Error/CBError");
var Promise = require("bluebird");

class Booker extends Abstract {
    constructor() {
        super({
            event_group: 'booker'
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

        this.meta_tree = config.meta_tree;

        var events = this.getEvents('booker');
        var tasks = [
            {
                name: events.request,
                handler: this.request_resource
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

    request_resource({
        db_id: id,
        data: data,
        action: actname
    }) {
        var [type, num_id] = id.split("/");
        var Resource = this.meta_tree.Resource;
        if (!Resource)
            return Promise.reject(new Error("MISCONFIGURATION", "No such class in MetaTree"));
        var res = Resource.spawn({
            db_id: num_id
        });
        if (!actname || !~_.indexOf(res.exposed_api, actname))
            return Promise.reject(new Error("MISSING_METHOD"));

        return res.retrieve()
            .then(() => {
                return res[actname]()
            })
            .then(() => {
                return res.save();
            });
    }
}

module.exports = Booker;