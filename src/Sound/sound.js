'use strict'

var Abstract = require('../Abstract/abstract.js');
var _ = require("lodash");
var Error = require("../Error/Lapsus")("SoundServiceError");
var sound_util = require("sound-conjunct");

class Sound extends Abstract {
    constructor() {
        super({
            event_group: 'sound'
        });

        this.queues_required = {
            "event-queue": false,
            "task-queue": true
        };
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

        var tasks = [
            {
                name: this.event_names.compose,
                handler: this.compose
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

    request_handler({
        files: files,
        outname: out,
        options: opts
    }) {
        if (this.paused)
            return Promise.reject(new Error("SERVICE_ERROR", "Service is paused"));

    }
}

module.exports = Broker;