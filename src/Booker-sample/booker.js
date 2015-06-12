'use strict'

var Abstract = require('../Abstract/abstract.js');
var _ = require("lodash");
var Error = require("../Error/Lapsus")("BookerError");
var Promise = require("bluebird");

class Booker extends Abstract {
    constructor() {
        super({
            event_group: 'booker'
        });

        this.queues_required = {
            "event-queue": false,
            "task-queue": true
        };

        this.errname = Error.name;
    }

    setChannels(options) {
        super.setChannels(options);

        return this;
    }

    init(config) {
        this.config = config || {};
        if (!this.emitter && (this.queues_required['event-queue'] || this.queues_required['task-queue'])) {
            return Promise.reject(new Error("SERVICE_ERROR", 'U should set channels before'));
        }

        this.meta_tree = config.meta_tree;
        var role = this.meta_tree._role; //metatree roles are main/replica; for booker service, master is replica
        this.main = (role == "replica") || !config.slave; //if true, service won't need a permission to work
        this.master = config.master || (this.main ? "127.0.0.1" : false);
        if (!this.master) {
            return Promise.reject(new Error("SERVICE_ERROR", "Either run this on master or specify master ip."))
        }

        if (!this.main) {
            this.addPermission("ip", this.master);
        }

        this.required_permissions.dropped(() => {
            if (this.state() === 'working') {
                console.log('Booker : waiting...');
                this.pause();
                this.state('waiting');
            }
        });

        this.required_permissions.restored(() => {
            if (this.state() === 'waiting') {
                this.start();
                console.log('Booker : starting...');
            }
        });

        var tasks = [
            {
                name: this.event_names.request,
                handler: this.request_resource
            },
            {
                name: this.event_names.pause,
                handler: this.pause
            },
            {
                name: this.event_names.resume,
                handler: this.resume
            }
        ];
        _.forEach(tasks, (task) => {
            this.emitter.listenTask(task.name, (data) => _.bind(task.handler, this)(data));
        });
        return Promise.resolve(true);
    }

    start() {
        super.start();
        this.paused = false;
        return this;
    }

    pause() {
        //@TODO: Dunno what should they do when paused or resumed
        super.pause();
        this.paused = true;

        return this;
    }

    resume() {
        //@TODO: Dunno what should they do when paused or resumed
        super.resume();
        this.paused = false;

        return this;
    }

    //API

    request_resource({
        db_id: id,
        data: data,
        action: actname
    }) {
        if (this.paused)
            return Promise.reject(new Error("SERVICE_ERROR", "Service is paused"));
        var [type, num_id] = id.split("/");
        var mo_name = _.capitalize(type);
        var mo = this.meta_tree[mo_name];
        if (!mo)
            return Promise.reject(new Error("MISCONFIGURATION", "No such class in MetaTree"));
        var res = this.meta_tree.create(mo, {
            db_id: num_id
        });
        if (!actname || !~_.indexOf(res.exposed_api, actname))
            return Promise.reject(new Error("MISSING_METHOD"));

        return res.retrieve()
            .then(() => {
                return res[actname](data);
            })
            .then((success) => {
                return Promise.resolve({
                    db_id: id,
                    data: data,
                    action: action,
                    success: success
                });
            });
    }
}

module.exports = Booker;