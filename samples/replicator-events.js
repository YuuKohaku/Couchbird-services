'use strict';

var Error = require("./Error/ReplicatorError");
var Replicator = require("./Replicator/replicator");

var rep = new Replicator();
rep.hosts.add("lunar", "192.168.1.6", "Administrator:456789");
rep.hosts.add("basilisk", "192.168.1.2", "Administrator:123456");
//console.log(rep.hosts.show("lunar"), rep.hosts.show("basilisk"));

rep.create_twoway_replication({
        src_host: "basilisk",
        src_bucket: "mt",
        dst_host: "lunar",
        dst_bucket: "rmt"
    })
    .delay(5000)
    .then((res) => {
        console.log(res);
        console.log(rep.rids);
        return rep.pause_twoway_replication({
            src_host: "lunar",
            src_bucket: "rmt",
            dst_host: "basilisk",
            dst_bucket: "mt"
        });
    })
    .delay(2000)
    .then((res) => {
        console.log(res);
        console.log(rep.rids);
        return rep.resume_twoway_replication({
            src_host: "lunar",
            src_bucket: "rmt",
            dst_host: "basilisk",
            dst_bucket: "mt"
        });
    })
    .then((res) => {
        console.log(res);
        return rep.get_replication_state({
            src_host: "basilisk",
            src_bucket: "mt",
            dst_host: "lunar",
            dst_bucket: "rmt",
            stat_name: "rate_replication"
        });
    })
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
    .then((res) => {
        console.log(res);
    });