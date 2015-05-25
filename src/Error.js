'use strict';
var errors = require("./const/errors");

function MetaTreeError(info, message) {
    var msg = message ? (" : " + message) : "";
    this.message = errors[info] + msg;
    this.name = "MetaTreeError";
    Error.call(this);
    Error.captureStackTrace(this, MetaTreeError);
}

MetaTreeError.prototype = Object.create(Error.prototype);
MetaTreeError.prototype.constructor = MetaTreeError;

module.exports = MetaTreeError;