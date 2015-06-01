'use strict'

var Abstract = require('../Abstract/abstract.js');

class SampleService extends Abstract {
    constructor() {
        super({});
        this.addPermission('ip', 'ya.ru');

    }
    start() {
        super.start();
        console.log('SampleService: Started!');
    }
    pause() {
        super.pause();
        console.log('SampleService: Paused!');
    }
}

module.exports = SampleService;