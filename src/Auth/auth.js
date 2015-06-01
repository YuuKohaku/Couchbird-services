'use strict'

var Abstract = require('../Abstract/abstract.js');
var util = require('util');
var Promise = require('bluebird');
var PermissionList = require('../PermissionHolder/permission-holder.js');

class Auth extends Abstract {
    constructor() {
        super({
            event_group: 'doctor'
        });

        this.queues_required = {
            "event-queue": true,
            "task-queue": true
        };
        this.list = new PermissionList();
    }
    setChannels(options) {
        super.setChannels(options);

        this.list.setChannels(options);

        return this;
    }

    init(config) {
        this.config = config || {};
        if (!this.emitter) return Promise.reject('U should set channels before');

        var request_task = this.getEvents('permission').request;

        this.emitter.listenTask(request_task, data => this.check(data));

        return this.list.init();
    }

    start() {
        super.start();

        this.paused = false;
        this.list.start();

        return this;
    }

    pause() {
        //@TODO: Dunno what should they do when paused or resumed
        super.pause();
        
        this.paused = true;
        this.list.pause();

        return this;
    }

    /**
     * own API
     */
    check(asked_permissions) {
        asked_permissions = util.isArray(asked_permissions) ? asked_permissions : [asked_permissions];

        if (asked_permissions.length === 0) {}
        var valid = true;
        var confirmation_list = {
            valid: true,
            details: []
        };

        var len = asked_permissions.length;
        for (var i = 0; i < len; i += 1) {
            var name = asked_permissions[i].permission;
            var key = asked_permissions[i].key;
            var info = {
                name: name,
                key: key,
                valid: true
            };

            if (!this.list.exists(name, key)) {
                valid = false;
                info.reason = 'not-exists';
                info.valid = false;
            } else
            if (this.list.isDropped(name, key)) {
                valid = false;
                info.reason = 'dropped';
                info.valid = false;
            }

            confirmation_list.details.push(info);
        }
        confirmation_list.valid = valid;
        return confirmation_list;
    }
}

module.exports = Auth;