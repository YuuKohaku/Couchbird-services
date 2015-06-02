'use strict';

var _ = require("lodash");
var Promise = require("bluebird");

var Error = require("./Error/ReplicatorError");
var Replicator = require("./Replicator/replicator");
var Queue = require('custom-queue');

var rep = new Replicator();
var ee = new Queue();

rep.hosts.add("lunar", "192.168.1.6", "Administrator:456789");
rep.hosts.add("basilisk", "192.168.1.2", "Administrator:123456");
//console.log(rep.hosts.show("lunar"), rep.hosts.show("basilisk"));

rep.setChannels({
    "queue": ee
});
var data = {
    src_host: "basilisk",
    src_bucket: "mt",
    dst_host: "lunar",
    dst_bucket: "rmt"
};
Promise.props({
        rep: rep.init()
    })
    .then(() => {
        rep.tryToStart();
    })
    .then(() => {
        var fn_to_check = [
            "replication.create.direct",
            "replication.create.bidirect",
            "replication.pause.direct",
            "replication.resume.direct",
            "replication.pause.bidirect",
            "replication.resume.bidirect",
            "replication.remove.direct",
            "replication.remove.bidirect"
        ];

        var check = Promise.coroutine(function* () {
            for (var i in fn_to_check) {
                var name = fn_to_check[i];
                console.log("Emitting ", name, "with data :", data);
                yield Promise.delay(3000);
                ee.addTask(name, data);
            }
        });
        check();
    });