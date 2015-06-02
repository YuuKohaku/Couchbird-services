'use strict'

var Abstract = require('../Abstract/abstract.js');

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
            return Promise.reject('U should set channels before');
        }

        var events = this.getEvents('replication');
        var ways = {
            one: 'direct',
            two: 'bidirect'
        };
        var tasks = [

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

    resolve() {

    }
}

module.exports = Booker;