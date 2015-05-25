'use strict';
//DB promisifying proto

var Couchbase = require("couchbase");
var Error = require("../Error");
var Promise = require("bluebird");

var DB_Bucket = function (cluster, bucket_name, params) {
    this._cluster = cluster;
    this.bucket_name = bucket_name;
    this._n1ql = [params.n1ql];
    this._bucket = cluster.openBucket(this.bucket_name,
        function (err, res) {
            if (err) {
                throw new Error("DATABASE_ERROR", err);
            }
        });
}

//INIT
DB_Bucket.prototype._promisifyMethod = function (method, options) {
    return function promisified() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i) {
            args[i] = arguments[i];
        }
        var self = this;
        var optErr = (options && options.error) ? options.error : '';
        return new Promise(function (resolve, reject) {
            var nodeCallback = function (err, res) {
                if (err) {
                    reject(new Error("DATABASE_ERROR", err + optErr));
                } else {
                    resolve(res);
                }
            }
            args.push(nodeCallback);
            method.apply(self, args);
        });
    };
}

DB_Bucket.prototype.enableN1ql = function () {
    this._bucket.enableN1ql(this._n1ql);
}

//DOCUMENTS
DB_Bucket.prototype.insert = function (key, value, options) {
    return this._promisifyMethod(this._bucket.insert)
        .apply(this._bucket, arguments);
};

DB_Bucket.prototype.upsert = function (key, value, options) {
    return this._promisifyMethod(this._bucket.upsert)
        .apply(this._bucket, arguments);
};

DB_Bucket.prototype.get = function (key, options) {
    return this._promisifyMethod(this._bucket.get)
        .apply(this._bucket, arguments);
};

DB_Bucket.prototype.getAndLock = function (key, options) {
    return this._promisifyMethod(this._bucket.getAndLock)
        .apply(this._bucket, arguments);
};

DB_Bucket.prototype.unlock = function (key, cas, options) {
    return this._promisifyMethod(this._bucket.unlock)
        .apply(this._bucket, arguments);
};

DB_Bucket.prototype.getAndTouch = function (key, expiry, options) {
    return this._promisifyMethod(this._bucket.getAndTouch)
        .apply(this._bucket, arguments);
};

DB_Bucket.prototype.setExpiration = function (key, expiry, options) {
    return this._promisifyMethod(this._bucket.touch)
        .apply(this._bucket, arguments);
};

//does not make sense at all since it is a set of single gets in couchnode
DB_Bucket.prototype.getMulti = function (keys) {
    return this._promisifyMethod(this._bucket.getMulti, {
        error: " documents were not found"
    }).call(this._bucket, keys);
};

DB_Bucket.prototype.remove = function (key, options) {
    return this._promisifyMethod(this._bucket.remove)
        .apply(this._bucket, arguments);
};

DB_Bucket.prototype.replace = function (key, value, options) {
    return this._promisifyMethod(this._bucket.replace)
        .apply(this._bucket, arguments);
};

//RAW DATA
//DO NOT apply this to json data. Only appending strings appear to be correct
DB_Bucket.prototype.append = function (key, value, options) {
    return this._promisifyMethod(this._bucket.append)
        .apply(this._bucket, arguments);
};

//DO NOT apply this to json data. Only prepending strings appear to be correct
DB_Bucket.prototype.prepend = function (key, value, options) {
    return this._promisifyMethod(this._bucket.prepend)
        .apply(this._bucket, arguments);
};


//COUNTERS
//is there a need to create separate counterAdd and counterRemove with native callbacks?
DB_Bucket.prototype.counter = function (key, delta, options) {
    return this._promisifyMethod(this._bucket.counter)
        .apply(this._bucket, arguments);
};

//ok, let it be
DB_Bucket.prototype.counterInsert = function (cKey, cOptions, dKey, dValue, dOptions) {
    var bucket = this._bucket;
    var self = this;
    return new Promise(function (resolve, reject) {
        bucket.counter(cKey, 1, cOptions, function (err, res) {
            if (err) {
                reject(new Error("DATABASE_ERROR", err));
            } else {
                //temporary, TODO: pass func or format string to form new id? 
                var id = [dKey, res.value].join("/");
                resolve(self.insert(id, dValue, dOptions));
            }
        });
    });
}

DB_Bucket.prototype.counterRemove = function (cKey, dKey) {
    var bucket = this._bucket;
    var self = this;
    return new Promise(function (resolve, reject) {
        bucket.counter(cKey, -1, function (err, res) {
            if (err) {
                reject(new Error("DATABASE_ERROR", err));
            } else {
                //temporary, TODO: pass func or format string to form new id? 
                var id = [dKey, res.value + 1].join("/");
                resolve(self.remove(id));
            }
        });
    });
}

//VIEWS AND N1QL
DB_Bucket.prototype._query = function (query) {
    return this._promisifyMethod(this._bucket.query)
        .apply(this._bucket, arguments);
}

//query need to be Couchbase.ViewQuery
DB_Bucket.prototype.view = function (query) {
    if (!query instanceof Couchbase.ViewQuery) {
        throw new Error("INVALID_ARGUMENT", "Query need to be Couchbase ViewQuery");
    }
    return this._query(query);
}

DB_Bucket.prototype.N1QL = function (query) {
    if (!query instanceof Couchbase.N1qlQuery) {
        throw new Error("INVALID_ARGUMENT", "Query need to be Couchbase N1qlQuery");
    }
    return this._query(query);
}

//TIMEOUTS

//Don't use it directly
DB_Bucket.prototype._setTimeout = function (property, timeout) {
    if (typeof timeout != "number") {
        throw new Error("INVALID_ARGUMENT", "Number is required");
    }
    if (!(this._bucket[property])) {
        throw new Error("INVALID_ARGUMENT", "Not existing property " + property);
    }
    this._bucket[property] = timeout;
    return Promise.resolve(true);
}

DB_Bucket.prototype.setOperationTimeout = function (timeout) {
    return this._setTimeout('operationTimeout', timeout);
}

DB_Bucket.prototype.setViewTimeout = function (timeout) {
    return this._setTimeout('viewTimeout', timeout);
}

DB_Bucket.prototype.setConnectionTimeout = function (timeout) {
    return this._setTimeout('connectionTimeout ', timeout);
}
module.exports = DB_Bucket;