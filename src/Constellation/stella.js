'use strict';
/*
 * Stella class to represent CB host data.
 */

var validate = require("validator");
var _ = require('lodash');

var Error = require("../Error/Lapsus")("ConstellationError");

class Stella {
    constructor(ip, hostname, credentials) {
        if (!validate.isIP(ip))
            throw new Error("INVALID_ARGUMENT", "Invalid ip address");
        var creds = credentials.split(":");
        if (creds.length < 2 || _.isEmpty(creds[0]) || _.isEmpty(creds[1]))
            throw new Error("INVALID_ARGUMENT", "Invalid credentials");

        this.ip = ip;
        this.name = hostname;
        this.auth = credentials;
        this.usr = creds[0];
        this.pwd = creds[1];
        this.active = true;
    }
}

module.exports = Stella;