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
        request: "booker.request",
        pause: "booker.pause",
        resume: "booker.resume"
    },
    broker: {
        resources: "broker.list.resources"
    },
    arbiter: {
        getup: "arbiter.wake"
    },
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
        },
        settings: "replication.settings",
        stats: "replication.statistics"
    },
    permission: {
        dropped: function (name, key) {
            return 'permission.dropped.' + name + '.' + key;
        },
        restored: function (name, key) {
            return 'permission.restored.' + name + '.' + key;
        },
        request: 'permission.request'
    },
    sound: {
        compose: "sound.compose"
    }
};

function getEvent(service, name) {
    if (!name) {
        return events[service];
    }
    return events[service][name];
};

module.exports = getEvent;