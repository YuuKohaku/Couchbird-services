'use strict'

var _ = require('lodash');

class Abstract_Inspector {
    constructor(params, emitters) {
        this.restore = emitters.restore;
        this.drop = emitters.drop;
        this.register = emitters.register;
        this.is_init = false;
    }
    init({
        permission_watched,
        inspector_name = 'abstract',
            key_data = 'not-required'
    }) {

        this.inspector_name = inspector_name;

        var permission = this.permission_watched = require('../../Model/Permission/' + permission_watched + '.js');

        this.permission_name = permission.getName();
        this.key = permission.makeKey(key_data);

        this.data_to_send = {
            inspector: this.inspector_name,
            name: this.permission_name,
            key: this.key
        }

        this.send('register');

        this.is_init = true;

    }
    start() {
        throw Error('abstract method');
    }
    stop() {
        throw Error('abstract method');
    }
    send(event_type, reason) {
        var data = _.clone(this.data_to_send, true);

        if (reason) data.reason = reason;

        switch (event_type) {
        case 'drop':
            var message = this.permission_watched.dropMessage(data);

            this.drop(message);
            break;
        case 'restore':
            var message = this.permission_watched.restoreMessage(data);

            this.restore(message);
            break;
        case 'register':
            this.register(data);
            break;
        }
    }
}

module.exports = Abstract_Inspector;