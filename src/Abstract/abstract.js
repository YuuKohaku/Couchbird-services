'use strict'

var Promise = require('bluebird');
var _ = require('lodash');

var getEvents = require('../const/events.js');
var PermissionLogic = require('./permission-logic.js');

/*utility function*/

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
        event_group = ''
    }) {

        this.event_names = event_group ? this.getEvents(event_group) : {};
        this.queues_required = {
            "event-queue": true,
            "task-queue": false
        };

        this.state('created');
        this.required_permissions = new PermissionLogic();
    }
    state(name) {
        if (!name) return this.state_id;

        this.state_id = name.toLowerCase();

        switch (this.state_id) {
        case 'created':
            break;
        case 'init':
            break;
        case 'waiting':
            break;
        case 'working':
            break;
        case 'paused':
            break;
        default:
            throw new Error('unknown state');
            break;
        }

        return this;
    }
    getEvents(event_group) {
        return getEvents(event_group);
    }
    addPermission(name, params) {
        this.required_permissions.add(name, params);
    }

    tryToStart() {
        this.required_permissions.request().then((result) => {
            this.state('waiting');

            if (result === true) {
                console.log('Abstract: can start now');
                this.start();
            } else {
                console.log('Abstract: some permissions dropped, start is delayed');
            }
        }).catch(() => console.log('couldnt get permissions for servcise,everything is realy bad'));

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

        this.required_permissions.setChannels(options)

        //@TODO: this should be much better. If EQ and TQ specified they should be combined in complex emitter
        this.emitter = options.queue || options['event-queue'] || options['task-queue'];

    }

    init(config) {
        this.config = config || {};

        if (!this.emitter && (this.queues_required['event-queue'] || this.queues_required['task-queue'])) {
            return Promise.reject('U should set channels before');
        }

        this.required_permissions.dropped(() => {
            if (this.state() === 'working') {
                console.log('Abstract : oh no, so bad');
                this.pause();
                this.state('waiting');
            }
        });

        this.required_permissions.restored(() => {
            if (this.state() === 'waiting') {
                this.start();
                console.log('Abstract : excelent...');
            }
        });

        this.state('init');

        return Promise.resolve(true);
    }

    start() {
        //@TODO: What should it do in current context?
        //@TODO: requesPermissions() here
        if (this.state() === 'working') throw new Error('Running already!');

        this.state('working');

        return this;
    }

    pause() {
        //@TODO: What should it do in current context?
        this.state('paused');

        return this;
    }

    resume() {
        //@TODO: What should it do in current context?
        //this.state('waiting');
        //set waiting, call permissions, get 
        return this;
    }
}

module.exports = Abstrasct_Service;