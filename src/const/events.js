'use strict'

var events = {
    doctor: {
        healthy: 'now.healthy',
        unhealthy: 'now.unhealthy',
        register: 'inspector.register'
    },
    dbface: {
        request: 'dbface.request',
        response: 'dbface.response'

    },
    booker: {
        request: "booker.request"
    },
    broker: {
        resources: "broker.list.resources"
    },
    arbiter: {},
    replication: {
        create: function (way) {
            return 'replication.create.' + way;
        },
        remove: function (way) {
            return 'replication.remove.' + way;
        },
        pause: function (way) {
            return 'replication.pause.' + way;
        },
        resume: function (way) {
            return 'replication.resume.' + way;
        }
    },
    permission: {
        dropped: function (name, key) {
            return 'permission.dropped.' + name + '.' + key;
        },
        restored: function (name, key) {
            return 'permission.restored.' + name + '.' + key;
        },
        request: 'permission.request'
    }
};

function getEvent(service, name) {
    if (!name) {
        return events[service];
    }
    return events[service][name];
};

module.exports = getEvent;