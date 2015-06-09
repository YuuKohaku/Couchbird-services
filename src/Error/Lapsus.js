'use strict'

var makeError = require('make-error');
var BaseError = makeError.BaseError;
var errors = require("./errors");

class Lapsus extends BaseError {
    constructor(info, message) {
        var msg = errors[info] + (message ? (" : " + message) : "");
        super(msg);
    }
}

module.exports = function (name) {
    return makeError(name, Lapsus);
}