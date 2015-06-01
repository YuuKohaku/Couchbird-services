'use strict'

var util = require('util');
var Abstract = require('./abstract.js');

const NAME = 'ip';
/**
 * Abstract permision, just for lulz
 * @param {Object} params permision specific params
 */
class Ip extends Abstract {
    constructor(ip) {
        super();
        this.ip = ip;
        this.is_dropped = true;

    }
    static keyToString(key_obj) {
        return key_obj.toString();
    }
    static getName() {
        return NAME;
    }
    requestMessage() {
        return {
            key: this.ip,
            permission: NAME
        };
    }
    keyToString() {
        return this.ip;
    }
    getName() {
        return Ip.getName();
    }
}

module.exports = Ip;