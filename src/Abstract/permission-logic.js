'use strict'
var Promise = require('bluebird');
var _ = require('lodash');
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

class ServicePermissionUtils {
    constructor(queue) {
        this.emitter = queue;

        this.service_permissions = [];
    }
    add(name, data) {
        var model = getPermissionModel(name);
        var permission = new model(data);
        this.service_permissions.push(permission);
    }
    setChannels(options) {
        if (!options.hasOwnProperty('event-queue') && !options.hasOwnProperty('queue')) {
            throw new Error('Event queue or complex queue required');
        }

        this.emitter = options.queue || options['event-queue'];
    }
    request() {
        if (!this.service_permissions.length) return Promise.resolve(true);

        var messages = [];

        _(this.service_permissions).forEach(permission => {
            var request_message = permission.requestMessage();
            messages.push(request_message);
        }).value();

        var request_permission_task = getEvents('permission').request;

        var p = this.emitter
            .addTask(request_permission_task, messages)
            .then((result) => {
                if (result === true || result.valid === true) {
                    return true;
                } else {
                    var details = result.details;

                    for (var i = 0; i < details.length; i += 1) {
                        if (!details[i].valid) {
                            this.service_permissions[i].drop();
                        }
                    }

                    return false;
                }
            })
            .catch(() => {
                throw new Error('Auth error');
            });

        return p;
    }
    dropped(callback) {
        if (!this.service_permissions.length) return;


        _(this.service_permissions).forEach(permission => {

            permission.onDrop(this.emitter, (d) => {
                console.log('Oh no its dropped, should shutdown everything', d);
                callback.call(null);
            });
        }).value();

    }
    restored(callback) {
        if (!this.service_permissions.length) return;


        _(this.service_permissions).forEach(permission => {

            permission.onRestore(this.emitter, (d) => {

                if (this.isAllUp()) {
                    callback.call(null);
                } else {
                    //pessimistic permission cheking
                    //we can lose some events (or can not?)
                    this.request().then((result) => {
                        if (result === true) {
                            callback.call(null);
                        } else {
                            //silence
                        }
                    });
                }
            });

        }).value();

    }
    isAllUp() {
        for (var i = 0; i < this.service_permissions.length; i += 1) {
            if (this.service_permissions[i].isDropped()) return false;
        }
        return true;
    }



}

module.exports = ServicePermissionUtils;