'use strict';

var Historified = require("MetaTree").Historified;
var Error = require("../../Error/Lapsus")("MetaTree_Resource_Error");
var path = require("path");
var Promise = require("bluebird");
var _ = require("lodash");


class Resource extends Historified {
    constructor() {
        super();
        this.exposed_api = ["book", "postpone", "reserve", "progress", "idle", "free", "available", "unavailable"];
    }

    retrieve() {
        return super.retrieve()
            .then((res) => {
                this.set("owner", this.role);
                return Promise.resolve(res);
            });
    }

    //need to retrieve() before use this
    book(opts) {
        if (!opts.cas) return Promise.reject(new Error("INVALID_ARGUMENT", "Specify cas to use booking."));
        this.set('busy', true);
        this.set('state', 'reserved');
        return this.save({
            cas: opts.cas
        });
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
        this.set('owner', null);
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

    setOwner(val) {
        this.owner = val;
    }
}

module.exports = Resource;