'use strict';

var AbstractError = require("./AbstractError");

class ArbiterError extends AbstractError {
    constructor(info, message) {
        super("ArbiterError", info, message);
    }
}

module.exports = ArbiterError;