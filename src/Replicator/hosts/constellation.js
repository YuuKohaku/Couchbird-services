'use strict';

/*
 * Constellation class.
 * Implied to be a dynamic hosts config cos' I'm not going to
 * store server IPs and admin passwords "as is" in static form.
 */

var _ = require('lodash');
var Stella = require("./stella");

class Constellation {
    constructor() {
        Object.defineProperties(this, {
            "list": {
                value: (new Map()),
                writable: true,
                enumerable: false,
                configurable: false
            }
        });
    }

    show(hostname) {
        return this.list.get(hostname);
    }

    add(hostname, ip, credentials) {
        var stella = new Stella(ip, hostname, credentials);
        this.list.set(hostname, stella);
        return this;
    }

    remove(hostname) {
        this.list.delete(hostname);
        return this;
    }

    update_credentials(hostname, ip, credentials) {
        this.list.delete(hostname);
        var stella = new Stella(ip, hostname, credentials);
        this.list.set(hostname, stella);
        return this;
    }
}

module.exports = Constellation;