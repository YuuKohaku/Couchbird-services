'use strict'

var Promise = require('bluebird');

/*utility function*/
var getEvents = require('../const/events.js');

var modules = [];
var getPermissionModel = function (module_name) {
    //coz cashing is slightly faster
    if (modules.hasOwnProperty(module_name)) {
        return modules[module_name];
    }

    modules[module_name] = require('../Model/Permission/' + module_name + '.js');

    return modules[module_name];
}

/**
 * Abstract service
 */
class Abstrasct_Service {
    constructor({
        event_group: event_group
    }) {
        this.paused = true;

        this.event_names = event_group ? this.getEvents(event_group) : {};
        this.queues_required = {
            "event-queue": true,
            "task-queue": false
        };

        this.required_permissions = [];
    }
    getEvents(event_group) {
        return getEvents(event_group);
    }
    addPermission(name, params) {
        var model = getPermissionModel(name);
        var permission = new model(params);
        this.required_permissions.push(permission);

        return this;
    }
    requestPermission() {
        if (!this.required_permissions.length) return
        var p = new Promise().resolve(true);
        return p;
    }
    setChannels(options) {
        if (!options.hasOwnProperty('queue')) {

            if (this.queues_required['event-queue'] && this.queues_required['task-queue']) {
                throw new Error('Complex queue required');
            }

            if (this.queues_required['event-queue'] && !options.hasOwnProperty('event-queue')) {
                throw new Error('Event queue or complex queue required');
            }

            if (this.queues_required['task-queue'] && !options.hasOwnProperty('task-queue')) {
                throw new Error('Task queue or complex queue required');
            }

        }

        //@TODO: this should be much better. If EQ and TQ specified they should be combined in complex emitter

        this.emitter = options.queue || options['event-queue'] || options['task-queue'];

        return this;
    }

    init(config) {
        this.config = config || {};

        if (!this.emitter && (this.queues_required['event-queue'] || this.queues_required['task-queue'])) {
            return Promise.reject('U should set channels before');
        }

        return Promise.resolve(true);
    }

    start() {
        //@TODO: What should it do in current context?
        //@TODO: requesPermissions() here

        this.paused = false;

        return this;
    }

    pause() {
        //@TODO: What should it do in current context?
        this.paused = true;

        return this;
    }

    resume() {
        //@TODO: What should it do in current context?
        this.paused = false;

        return this;
    }
}

module.exports = Abstrasct_Service;