var data = {
    "total_rows": 12,
    "rows": [
        {
            "id": "history/main/resource/2/1434173438",
            "key": 1434173438,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 05:30:38 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/main/resource/2/1434173440",
            "key": 1434173440,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 05:30:40 GMT",
                "owner": "main",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/main/resource/2/1434173542",
            "key": 1434173542,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 05:32:22 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/main/resource/2/1434173544",
            "key": 1434173544,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 05:32:24 GMT",
                "owner": "main",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/main/resource/2/1434173620",
            "key": 1434173620,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 05:33:40 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/main/resource/2/1434173622",
            "key": 1434173622,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 05:33:42 GMT",
                "owner": "main",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/main/resource/2/1434174196",
            "key": 1434174196,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 05:43:16 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/main/resource/2/1434174198",
            "key": 1434174198,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 05:43:18 GMT",
                "owner": "main",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/main/resource/2/1434176347",
            "key": 1434176347,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 06:19:07 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/main/resource/2/1434176349",
            "key": 1434176349,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 06:19:09 GMT",
                "owner": "main",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        },
        {
            "id": "history/main/resource/2/1434176706",
            "key": 1434176706,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 06:25:06 GMT",
                "owner": "main",
                "changes": {
                    "owner": "main",
                    "busy": true,
                    "state": "reserved"
                }
            }
        },
        {
            "id": "history/main/resource/2/1434176708",
            "key": 1434176708,
            "value": {
                "resource": "resource/2",
                "ts": "Sat, 13 Jun 2015 06:25:08 GMT",
                "owner": "main",
                "changes": {
                    "owner": null,
                    "state": "idle",
                    "busy": false
                }
            }
        }
]
};

var rows = data.rows;
var _ = require("lodash");
var ids = _.pluck(rows, "id");
var cb = require("Couchbird")();
var db = cb.bucket("mt");

_.forEach(ids, function (id) {
    db.remove(id).then(function (res) {
        console.log(res)
    });
})