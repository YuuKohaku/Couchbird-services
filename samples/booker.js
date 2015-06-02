'use strict'

var Promise = require('bluebird');
var _ = require("lodash");

var Booker = require('./Booker/booker');
var config = require('./const/config');

var MetaTree = require("MetaTree");
var Couchbird = require("Couchbird");

var meta_tree = new MetaTree({
    server_ip: "192.168.1.2",
    n1ql: "192.168.1.2:8093",
    bucket_name: "mt"
});

var db = Couchbird({
    server_ip: "192.168.1.2",
    n1ql: "192.168.1.2:8093"
});

console.log(meta_tree.cl === db);