'use strict';

var Historified = require("MetaTree").Historified;
var path = require("path");
var Promise = require("bluebird");
var _ = require("lodash");


class Resource extends Historified {
    constructor() {
        super();
        this.exposed_api = ["book"];
    }

    set_type(type) {
        this.type = type || "resource";
        return this;
    }

    book() {
        return this.set('info', {
            busy: true
        }, true);
    }

    setInfo(val) {
        _.merge(this.info, val);
    }

}

module.exports = Resource;