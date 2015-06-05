'use strict';

var Historified = require("MetaTree").Historified;
var path = require("path");
var Promise = require("bluebird");
var _ = require("lodash");


class Resource extends Historified {
    constructor() {
        super();
        this.exposed_api = ["book", "postpone", "reserve", "progress", "idle", "free", "available", "unavailable"];
    }

    retrieve() {
        return super.retrieve().then((res) => {
            this.owner = this.role;
            return Promise.resolve(res);
        });
    }

    //need to retrieve() before use this
    book() {
        this.set('busy', true);
        this.set('state', 'reserved');
        return this.save();
    }

    //only for busy state
    postpone() {
        return this.set('state', 'postponed', true);
    }

    progress() {
        return this.set('state', 'progress', true);
    }

    reserve() {
        return this.set('state', 'reserved', true);
    }

    free() {
        this.set('state', 'idle');
        this.set('busy', false);
        return this.save();
    }

    //for any state

    unavailable() {
        return this.set('available', false, true);
    }

    available() {
        return this.set('available', true, true);
    }

    //historified setters
    setBusy(val) {
        this.busy = val ? true : false;
    }

    setState(val) {
        this.state = val || this.state;
    }
}

module.exports = Resource;