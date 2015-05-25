'use strict'

var events = {
    dbface: {
        request: 'dbface.request'
    }
};

function getEvent(service, name) {
    if (!name) {
        return events[service];
    }
    return events[service][name];
};

module.exports = getEvent;