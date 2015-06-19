var _ = require("lodash");

var hst1 = {
    "total_rows": 50,
    "rows": [
        {
            "id": "history/replica/resource/2/1434387618",
            "key": 1434387618,
            "value": {
                "resource": "resource/8",
                "ts": "Mon, 15 Jun 2015 17:00:18 GMT",
                "owner": "replica",
                "changes": {
                    "owner": "replica",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/replica/resource/2/1434387619",
            "key": 1434387619,
            "value": {
                "resource": "resource/8",
                "ts": "Mon, 15 Jun 2015 17:00:18 GMT",
                "owner": "replica",
                "changes": {
                    "state": "postponed"
                }
            }
        },
        {
            "id": "history/replica/resource/4/1434387624",
            "key": 1434387624,
            "value": {
                "resource": "resource/4",
                "ts": "Mon, 15 Jun 2015 17:00:24 GMT",
                "owner": "replica",
                "changes": {
                    "owner": "replica",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/replica/resource/4/1434387626",
            "key": 1434387626,
            "value": {
                "resource": "resource/4",
                "ts": "Mon, 15 Jun 2015 17:00:26 GMT",
                "owner": "replica",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/replica/resource/3/1434387630",
            "key": 1434387630,
            "value": {
                "resource": "resource/3",
                "ts": "Mon, 15 Jun 2015 17:00:30 GMT",
                "owner": "replica",
                "changes": {
                    "owner": "replica",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/replica/resource/3/1434387632",
            "key": 1434387632,
            "value": {
                "resource": "resource/3",
                "ts": "Mon, 15 Jun 2015 17:00:32 GMT",
                "owner": "replica",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/main/resource/8/1434387639",
            "key": 1434387639,
            "value": {
                "resource": "resource/8",
                "ts": "Mon, 15 Jun 2015 17:00:39 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        }
]
}
var hst2 = {
    "total_rows": 50,
    "rows": [
        {
            "id": "history/replica/resource/4/1434387624",
            "key": 1434387624,
            "value": {
                "resource": "resource/4",
                "ts": "Mon, 15 Jun 2015 17:00:24 GMT",
                "owner": "replica",
                "changes": {
                    "owner": "replica",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/replica/resource/4/1434387626",
            "key": 1434387626,
            "value": {
                "resource": "resource/4",
                "ts": "Mon, 15 Jun 2015 17:00:26 GMT",
                "owner": "replica",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/replica/resource/3/1434387630",
            "key": 1434387630,
            "value": {
                "resource": "resource/3",
                "ts": "Mon, 15 Jun 2015 17:00:30 GMT",
                "owner": "replica",
                "changes": {
                    "owner": "replica",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/replica/resource/3/1434387632",
            "key": 1434387632,
            "value": {
                "resource": "resource/3",
                "ts": "Mon, 15 Jun 2015 17:00:32 GMT",
                "owner": "replica",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/main/resource/8/1434387639",
            "key": 1434387639,
            "value": {
                "resource": "resource/8",
                "ts": "Mon, 15 Jun 2015 17:00:39 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/main/resource/8/1434387641",
            "key": 1434387641,
            "value": {
                "resource": "resource/8",
                "ts": "Mon, 15 Jun 2015 17:00:41 GMT",
                "owner": "main",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/main/resource/8/1434390789",
            "key": 1434390789,
            "value": {
                "resource": "resource/8",
                "ts": "Mon, 15 Jun 2015 17:53:09 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        }
]
}

var compare = function (hst_m, hst_s) {
    var index_m = _.indexBy(hst_m, "id");
    var ids_m = _.keys(index_m, "id");
    var index_s = _.indexBy(hst_s, "id");
    var ids_s = _.keys(index_s, "id");
    var diff_m = _.difference(ids_m, ids_s); //ids that are present only on master
    var diff_s = _.difference(ids_s, ids_m); //ids that are present only on slave

    var rec_m = _.chain(index_m)
        .pick(diff_m)
        .values()
        .value();

    var rec_s = _.chain(index_s)
        .pick(diff_s)
        .values()
        .value();
    //    console.log("HISTORY: ", rec_m, rec_s);

    //if master did something, do nothing
    if (diff_m.length > 0) {
        //  console.log("HISTORY: master did something:", rec_m);
    }
    //if slave did something, panic
    if (diff_s.length > 0) {
        _.forEach(rec_s, function (el) {
            var res_id = el.value.resource;
            var related = _.find(rec_m, {
                value: {
                    resource: res_id
                }
            });
            console.log("HISTORY: related:", related);

        });
        //     console.log("HISTORY: slave did something:", rec_s);
    }
}

compare(hst1.rows, hst2.rows)