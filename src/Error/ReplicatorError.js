'use strict';

var AbstractError = require("./AbstractError");

class ReplicatorError extends AbstractError {
    constructor(info, message) {
        super("ReplicatorError", info, message);
    }
}

module.exports = ReplicatorError;