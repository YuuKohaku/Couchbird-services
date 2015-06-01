'use strict';

var AbstractError = require("./AbstractError");

class CBError extends AbstractError {
    constructor(info, message) {
        super("CBError", info, message);
    }
}

module.exports = CBError;