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

//rep.create_twoway_replication({
//        src_host: "basilisk",
//        src_bucket: "mt",
//        dst_host: "lunar",
//        dst_bucket: "rmt"
//    })
//    .delay(5000)
//    .then((res) => {
//        console.log(res);
//        console.log(rep.rids);
//        return rep.pause_twoway_replication({
//            src_host: "lunar",
//            src_bucket: "rmt",
//            dst_host: "basilisk",
//            dst_bucket: "mt"
//        });
//    })
//    .delay(2000)
//    .then((res) => {
//        console.log(res);
//        console.log(rep.rids);
//        return rep.resume_twoway_replication({
//            src_host: "lunar",
//            src_bucket: "rmt",
//            dst_host: "basilisk",
//            dst_bucket: "mt"
//        });
//    })
//    .then((res) => {
//        console.log(res);
//        return rep.get_replication_state({
//            src_host: "basilisk",
//            src_bucket: "mt",
//            dst_host: "lunar",
//            dst_bucket: "rmt",
//            stat_name: "rate_replication"
//        });
//    })
//    .delay(5000)
//    .then((res) => {
//        console.log(res.dhost, res.shost);
//        console.log(rep.rids);
//        return rep.remove_twoway_replication({
//            src_host: "lunar",
//            src_bucket: "rmt",
//            dst_host: "basilisk",
//            dst_bucket: "mt"
//        });
//    })
//    .then((res) => {
//        console.log(res);
//    });