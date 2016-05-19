/*!
Copyright 2013 Hewlett-Packard Development Company, L.P.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

"use strict";
var assert = require('assert');
var caf = require('caf_core');
var app = require('../public/js/app.js');
var caf_comp = caf.caf_components;
var myUtils = caf_comp.myUtils;
var async = caf_comp.async;
var json_rpc = caf.caf_transport.json_rpc;
var APP_SESSION = 'default';
var IOT_SESSION = 'iot';
var MANAGER = 'manager';
var PUBKEYS_MAP = 'pubkeys';
var AUTHORIZED_MAP = 'authorized';
var NO_METHOD = 'noSuchMethod';
var LINK_KEY = '__link_key__';
var NEW_KEY_SUFFIX = '-newKey';
var NEW_MSG_SUFFIX = '-newMsg';

var notifyIoT = function(self, from, msg) {
    var $$ = self.$.sharing.$;
    var notif = {from: from, msg: msg, fromCloud:  $$.fromCloud.dump()};
    self.$.session.notify([notif], IOT_SESSION);
};

var notifyWebApp = function(self, from, msg) {
    self.$.session.notify([{from: from, msg: msg}], APP_SESSION);
};

var ownerMap = function(owner, map) {
    try {
        owner = json_rpc.splitName(owner)[0];
    } catch (err) {
        // already just the owner part
    }
    return json_rpc.joinName(owner, MANAGER, map);
};

var managerMap = function(self, mapName) {
    var name = self.__ca_getName__();
    return ownerMap(name, mapName);
};

var ownerAuthoMap = function(owner) {
    return ownerMap(owner, AUTHORIZED_MAP);
};

var ownerPubKeysMap = function(owner) {
    return ownerMap(owner, PUBKEYS_MAP);
};

var toObject = function(arr) {
    var res = {};
    arr.forEach(function(x) { res[x] = true;});
    return res;
};


var checkManager = function(self) {
    if (!self.state.isManager) {
        var error = new Error('Cannot change ACL, not a manager');
        error.caName = self.__ca_getName__();
        throw error;
    }
};

exports.methods = {

    // Called by the framework

    '__ca_init__' : function(cb) {
        this.state.iotMethodsMeta = this.$.iot.iotMethodsMeta();
        this.$.session.limitQueue(1, APP_SESSION); // only the last notification
        this.$.session.limitQueue(1, IOT_SESSION); // only the last notification
        this.state.fullName = this.__ca_getAppName__() + '#' +
            this.__ca_getName__();
        this.state.trace__iot_sync__ = 'traceSync';
        this.state.trace__iot_resume__ = 'traceResume';
        this.state.owner = json_rpc.splitName(this.__ca_getName__())[0];
        var caLocalName = json_rpc.splitName(this.__ca_getName__())[1];
        this.state.isManager = (caLocalName === MANAGER);
        if (this.state.isManager) {
            // Devices with the same owner can register and lookup keys
            var rule = this.$.security.newSimpleRule('handleNewKey',
                                                     this.state.owner);
            this.$.security.addRule(rule);
            rule = this.$.security.newSimpleRule(NO_METHOD,
                                                 this.state.owner);
            this.$.security.addRule(rule);

            // The manager tracks the keys of all devices with the same owner
            this.$.pubsub.subscribe(this.$.pubsub.FORUM_PREFIX +
                                    this.__ca_getName__() + NEW_KEY_SUFFIX,
                                    'handleNewKey');
            this.$.sharing.addWritableMap('pubKeysMaster', PUBKEYS_MAP);
            this.$.sharing.addWritableMap('authoMaster', AUTHORIZED_MAP);
        }

        // Organize keys in multiple SharedMaps indexed by owner
        this.$.sharing.addReadOnlyMap(this.state.owner,
                                      managerMap(this, PUBKEYS_MAP));

        this.$.sharing.addReadOnlyMap('autho',
                                      managerMap(this, AUTHORIZED_MAP));
        this.$.sharing.addReadOnlyMap('authoAgg',
                                      managerMap(this, AUTHORIZED_MAP),
                                      {isAggregate: true, linkKey: LINK_KEY});

        /* Outbound policy enforced by checking the NO_METHOD acl,
         * inbound policy based on the `handleNewMessage` method acl,
         * both policies are symmetric, and set by the manager CA using the
         * `autho` aggregate. */
        var ruleAgg = this.$.security
                .newAggregateRule([NO_METHOD, 'handleNewMessage'], 'authoAgg');
        this.$.security.addRule(ruleAgg);

        this.$.pubsub.subscribe(this.$.pubsub.FORUM_PREFIX +
                                this.__ca_getName__() + NEW_MSG_SUFFIX,
                                'handleNewMessage');
        cb(null);
    },
    '__ca_resume__' : function(cp, cb) {
        // need to recreate, in case the IoT  device implementation changed.
        this.state.iotMethodsMeta = this.$.iot.iotMethodsMeta();
        cb(null);
    },
    '__ca_pulse__' : function(cb) {
        this.$._.$.log && this.$._.$.log.debug('calling PULSE!!!');
        this.$.react.render(app.main, [this.state]);
        cb(null, null);
    },

    // Called by the web app

    'hello' : function(key, tokenStr, webPubKey, cb) {
        this.$.react.setCacheKey(key);
        if (!this.state.isManager) {
            this.$.iot.registerToken(tokenStr);
        }
        this.newPubKey(webPubKey, cb);
    },

    /* @param{string} principal can be an owner or a CA*/
    'authorize' : function(principal, cb) {
        checkManager(this);
        var $$ =  this.$.sharing.$;
        $$.authoMaster.set(principal, true);
        this.getState(cb);
    },

    'unauthorize' : function(principal, cb) {
        checkManager(this);
        var $$ =  this.$.sharing.$;
        $$.authoMaster.delete(principal);
        this.getState(cb);
    },

    'link' : function(owner, cb) {
        var addLink = function(x, links) {
            links = links || [];
            return (toObject(links)[x] ? links : links.concat(x));
        };

        checkManager(this);
        var $$ =  this.$.sharing.$;
        var allLinks = $$.authoMaster.get(LINK_KEY);
        var ownerTable = ownerAuthoMap(owner);
        $$.authoMaster.set(LINK_KEY, addLink(ownerTable, allLinks));
        this.getState(cb);
    },

    'unlink' : function(owner, cb) {
        var removeLink = function(x, links) {
            var obj = toObject(links || []);
            delete obj[x];
            return Object.keys(obj);
        };

        checkManager(this);
        var $$ =  this.$.sharing.$;
        var allLinks = $$.authoMaster.get(LINK_KEY);
        var ownerTable = ownerAuthoMap(owner);
        $$.authoMaster.set(LINK_KEY, removeLink(ownerTable, allLinks));
        this.getState(cb);
    },

    'newPubKey' : function(pubKey, cb) {
        var topic = this.$.pubsub.FORUM_PREFIX +
                json_rpc.joinName(this.state.owner, MANAGER) + NEW_KEY_SUFFIX;
        this.$.pubsub.publish(topic, pubKey);
        this.state.pubKey = pubKey;
        this.getState(cb);
    },

    'newMsg' : function(to, msg, cb) {
        if (this.$.security.isAuthorized(to, NO_METHOD)) {
            var topic = this.$.pubsub.FORUM_PREFIX + to + NEW_MSG_SUFFIX;
            this.$.pubsub.publish(topic, msg);
            this.getState(cb);
        } else {
            var error = new Error('Unauthorized destination');
            error.to = to;
            cb(error);
        }
    },

    'getPubKey' : function(name, cb) {
        if (this.$.security.isAuthorized(name, NO_METHOD)) {
            var $$ =  this.$.sharing.$;
            var owner = json_rpc.splitName(name)[0];
            if ($$[owner]) {
                cb(null, $$[owner].get(name));
            } else {
                this.$.sharing.addReadOnlyMap(owner, ownerPubKeysMap(owner));
                cb(null, null); // Client should retry
            }
        } else {
            var error = new Error('Unauthorized key');
            error.name = name;
            cb(error);
        }
    },

    'getState' : function(cb) {
        var $$ = this.$.sharing.$;
        console.log('>>>>>>>>>>>>>>>>>>>>>>><<<<<<<<<<<<<<<');
        console.log(Object.keys($$.autho || {}));
        var obj = ($$.autho && $$.autho.toObject()) || {};
        this.$.react.coin();
        cb(null, {state: this.state, autho: obj});
    },

    //Called by the pubsub plugin

    'handleNewKey' : function(topic, pubKey, cb) {
        var caller = this.$.security.getCallerFrom();
        var callerOwner = json_rpc.splitName(caller)[0];
        if ((!this.state.isManager) ||
            (this.state.owner !== callerOwner) ||
            (topic !== (this.$.pubsub.FORUM_PREFIX + this.__ca_getName__() +
                       NEW_KEY_SUFFIX))) {
            var error = new Error('Cannot handle public key');
            error.topic = topic;
            error.caName = this.__ca_getName__();
            cb(error);
        } else {
            var $$ =  this.$.sharing.$;
            $$.pubKeysMaster.set(caller, pubKey);
            cb(null);
        }
    },

    'handleNewMessage' : function(topic, msg, cb) {
        var from = this.$.security.getCallerFrom();
        if (this.state.manager) {
            notifyWebApp(this, from, msg);
        } else {
            notifyIoT(this, from, msg);
        }
        cb(null);
    },

    // Called by the IoT device

    'traceSync' : function(cb) {
        var $$ = this.$.sharing.$;
        var now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName + ':Syncing!!:' + now);
        this.state.pinInputsValue =  myUtils.deepClone($$.toCloud.get('in'));
        notifyWebApp(this, 'New inputs');
        cb(null);
    },
    'traceResume' : function(cb) {
        var now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName + ':Resuming!!:' + now);
        cb(null);
    }
};


caf.init(module);
