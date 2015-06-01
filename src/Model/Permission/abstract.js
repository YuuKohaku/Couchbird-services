'use strict'

var getEvents = require('../../const/events.js');
/**
 * Abstract permision, just for lulz
 * @param {Object} params permision specific params
 */
class Permission_Abstract {
    constructor() {}
    static keyToString(key_obj) {
        throw new Error('abstract method call');
    }
    static makeKey(key_data) {
        return key_data;
    }
    static getName() {
        throw new Error('abstract method call');
    }
    static dropMessage(params) {
        return params;
    }
    static restoreMessage(params) {
        return params;
    }
    requestMessage(params) {
        var message = {};
        return message;
    }
    drop() {
        this.is_dropped = true;
    }
    restore() {
        this.is_dropped = false;
    }
    isDropped() {
        return this.is_dropped;
    }
    onRestore(queue, callback) {
        var event_name = this.getEventName('restored');

        queue.on(event_name, (d) => {
            this.restore();
            callback.call(null, d);
        });
    }
    onDrop(queue, callback) {
        var event_name = this.getEventName('dropped');

        queue.on(event_name, (d) => {
            this.drop();
            callback.call(null, d);
        });
    }
    getEventName(type) {
        if (type !== 'dropped' && type !== 'restored') throw new Error('unknown event: ' + type);
        var permission_events = getEvents('permission');
        var event_name = permission_events[type](this.getName(), this.keyToString());
        return event_name;
    }
}

module.exports = Permission_Abstract;