'use strict'

var Abstract = require('../Abstract/abstract.js');
var Promise = require('bluebird');
var AbstractList = require('./lists/abstract.js');
/*utility function*/
var modules = {};

//@TODO: that pattern may be useful in other cases
var discover = function (module_name) {
    var module = {};

    try {
        module = require('./lists/' + module_name + '-list.js');
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            throw e;
        }
        module = AbstractList;
    }

    return module;
}

var getPermissionList = function (module_name) {
    //coz cashing is slightly faster
    if (modules.hasOwnProperty(module_name)) {
        return modules[module_name];
    }

    modules[module_name] = discover(module_name);

    return modules[module_name];
}

/*--------------------*/

/**
 * Internal service for Auth service, but emits events on Q
 */
class PermissionHolder extends Abstract {
    constructor() {
        super({
            event_group: 'permission'
        });
        this.permissions = {};
        this.doctor_events = this.getEvents('doctor');
    }
    init() {
        if (!this.emitter) return Promise.reject('U should set channels before');

        this.emitter.on(this.doctor_events.unhealthy, data => this.drop(data));

        this.emitter.on(this.doctor_events.healthy, data => this.restore(data));

        this.emitter.on(this.doctor_events.register, data => this.addPermission(data));

        return Promise.resolve(true);
    };

    /**
     * Own API starts here
     */

    addPermission(data) {
        var name = data.name;
        var p = {};

        if (!this.permissions.hasOwnProperty(name)) {
            var PModel = getPermissionList(name);
            this.permissions[name] = new PModel(data);
            return true;
        }

        p = this.permissions[name];
        p.add(data);
        return true;

    }
    restore(data) {
        var name = data.name;
        var changed = this.getPermission(name).restore(data);
        if (changed) {
            this.emitter.emit(this.event_names.restored(data.name, data.key), {
                permission: data
            });
        }
    }
    drop(data) {
        var name = data.name;
        var changed = this.getPermission(name).drop(data);

        if (changed) {
            this.emitter.emit(this.event_names.dropped(data.name, data.key), {
                permission: data
            });
        }
    }
    getPermission(name) {
        return this.permissions[name];
    }
    exists(name, key) {
        var p = this.getPermission(name);
        if (typeof p === "undefined")
            return false;

        if (typeof key === "undefined") return true;

        return p.exists(key);

    }
    isDropped(name, key) {

        var permission = this.getPermission(name);

        return permission ? permission.isDropped(key) : false;
    }
}


module.exports = PermissionHolder;