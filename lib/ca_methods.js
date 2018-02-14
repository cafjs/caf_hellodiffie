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

'use strict';
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
var NEW_INFO_SUFFIX = '-newInfo';
var NEW_MSG_SUFFIX = '-newMsg';
var NEW_PAIRING_REQUEST = '-newPairingRequest';
var NEW_PAIRING_ACK = '-newPairingAck';

var OP_STATE_CHANGE = 'stateChange';
var OP_NEW_MESSAGE = 'newMessage';

var notifyIoT = function(self, op, from, msg) {
    var $$ = self.$.sharing.$;
    var notif = {op: op, from: from, msg: msg, fromCloud: $$.fromCloud.dump()};
    self.$.session.notify([notif], IOT_SESSION);
};

var notifyWebApp = function(self, op, from, msg) {
    self.$.session.notify([{op: op, from: from, msg: msg}], APP_SESSION);
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

    async __ca_init__() {
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
        this.scratch.otherPubKeys = {}; //cache of tracked keys
        if (this.state.isManager) {
            // Devices with the same owner can register and lookup keys
            var rule = this.$.security.newSimpleRule('handleNewClientInfo',
                                                     this.state.owner);
            this.$.security.addRule(rule);
            rule = this.$.security.newSimpleRule(NO_METHOD,
                                                 this.state.owner);
            this.$.security.addRule(rule);

            // The manager tracks the keys of all devices with the same owner
            this.$.pubsub.subscribe(this.$.pubsub.FORUM_PREFIX +
                                    this.__ca_getName__() + NEW_INFO_SUFFIX,
                                    'handleNewClientInfo');
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
         * `authoAgg` aggregate. */
        var ruleAgg = this.$.security
                .newAggregateRule([
                    NO_METHOD, 'handleNewMessage',
                    'handlePairingRequest', 'handlePairingAck'
                ], 'authoAgg');
        this.$.security.addRule(ruleAgg);

        this.$.pubsub.subscribe(this.$.pubsub.FORUM_PREFIX +
                                this.__ca_getName__() + NEW_MSG_SUFFIX,
                                'handleNewMessage');

        this.$.pubsub.subscribe(this.$.pubsub.FORUM_PREFIX +
                                this.__ca_getName__() + NEW_PAIRING_REQUEST,
                                'handlePairingRequest');

        this.$.pubsub.subscribe(this.$.pubsub.FORUM_PREFIX +
                                this.__ca_getName__() + NEW_PAIRING_ACK,
                                'handlePairingAck');

        return [];
    },
    async __ca_resume__(cp) {
        // need to recreate, in case the IoT  device implementation changed.
        this.state.iotMethodsMeta = this.$.iot.iotMethodsMeta();
        return [];
    },
    async __ca_pulse__() {
        this.$._.$.log && this.$._.$.log.debug('calling PULSE!!!');
        try {
            var data = myUtils.extractData(await this.getState());
            this.$.react.render(app.main, [data]);
            return this.checkClientInfo();
        } catch (err) {
            return [err];
        }
    },

    // Called by the web app

    async hello(key, tokenStr, webPubKey) {
        this.$.react.setCacheKey(key);
        if (this.state.isManager) {
            return this.newClientInfo({key: webPubKey});
        } else {
            // devices call newPubKey() directly and never call 'hello'
            this.$.iot.registerToken(tokenStr);
            return this.getState();
        }
    },

    /* @param{string} principal can be an owner or a CA*/
    async authorize(principal) {
        checkManager(this);
        var $$ = this.$.sharing.$;
        $$.authoMaster.set(principal, true);
        return this.getState();
    },

    async unauthorize(principal) {
        checkManager(this);
        var $$ = this.$.sharing.$;
        $$.authoMaster.delete(principal);
        return this.getState();
    },

    async link(owner) {
        var addLink = function(x, links) {
            links = links || [];
            return (toObject(links)[x] ? links : links.concat(x));
        };

        checkManager(this);
        var $$ = this.$.sharing.$;
        var allLinks = $$.authoMaster.get(LINK_KEY);
        var ownerTable = ownerAuthoMap(owner);
        $$.authoMaster.set(LINK_KEY, addLink(ownerTable, allLinks));
        return this.getState();
    },

    async unlink(owner) {
        var removeLink = function(x, links) {
            var obj = toObject(links || []);
            delete obj[x];
            return Object.keys(obj);
        };

        checkManager(this);
        var $$ = this.$.sharing.$;
        var allLinks = $$.authoMaster.get(LINK_KEY);
        var ownerTable = ownerAuthoMap(owner);
        $$.authoMaster.set(LINK_KEY, removeLink(ownerTable, allLinks));
        return this.getState();
    },

    // info is of type {key: string, address: string=}
    async newClientInfo(info) {
        var topic = this.$.pubsub.FORUM_PREFIX +
                json_rpc.joinName(this.state.owner, MANAGER) + NEW_INFO_SUFFIX;
        this.$.pubsub.publish(topic, JSON.stringify(info));
        this.state.clientInfo = info;
        if (!this.state.isManager) {
            notifyWebApp(this, OP_STATE_CHANGE, null, 'New client info');
        }
        return this.getState();
    },

    async checkClientInfo() {
        try {
            var info = await this.getClientInfo(this.__ca_getName__());
            info = myUtils.extractData(info);
            if (!this.state.clientInfo ||
                (myUtils.deepEqual(info, this.state.clientInfo))) {
                return [];
            } else {
                this.$._.$.log &&
                    this.$._.$.log.debug('checkClientInfo: Retrying: ' +
                                         ' current: ' + JSON.stringify(info) +
                                         ' desired: '+
                                         JSON.stringify(this.state.clientInfo));
                return this.newClientInfo(this.state.clientInfo);
            }
        } catch (err) {
            return [err];
        }
    },

    async newMsg(to, msg) {
        if (this.$.security.isAuthorized(to, NO_METHOD)) {
            var topic = this.$.pubsub.FORUM_PREFIX + to + NEW_MSG_SUFFIX;
            this.$.pubsub.publish(topic, msg);
            return this.getState();
        } else {
            var error = new Error('Unauthorized destination');
            error.to = to;
            return [error];
        }
    },

    // info is of type {key: string, address: string=}
    async getClientInfo(name) {
        if (this.$.security.isAuthorized(name, NO_METHOD)) {
            var $$ = this.$.sharing.$;
            var owner = json_rpc.splitName(name)[0];
            if ($$[owner]) {
                return [null, $$[owner].get(name)];
            } else {
                this.$.sharing.addReadOnlyMap(owner, ownerPubKeysMap(owner));
                return []; // Client should retry
            }
        } else {
            var error = new Error('Unauthorized key');
            error.name = name;
            return [error];
        }
    },

    async getState() {
        var $$ = this.$.sharing.$;
        var obj = {};
        if (this.state.isManager) {
            obj = $$.authoMaster && $$.authoMaster.toObject();
        } else {
            obj = $$.autho && $$.autho.toObject();
        }
        this.$.react.coin();
        return [null, {state: this.state, autho: obj}];
    },

    //Called by the pubsub plugin

    // topic is this.$.pubsub.FORUM_PREFIX + me + NEW_INFO_SUFFIX;
    // info is of type {key: string, address: string=} after parsing string
    async handleNewClientInfo(topic, info) {
        var caller = this.$.security.getCallerFrom();
        var callerOwner = json_rpc.splitName(caller)[0];
        if ((!this.state.isManager) ||
            (this.state.owner !== callerOwner) ||
            (topic !== (this.$.pubsub.FORUM_PREFIX + this.__ca_getName__() +
                       NEW_INFO_SUFFIX))) {
            var error = new Error('Cannot handle client info');
            error.topic = topic;
            error.caName = this.__ca_getName__();
            return [error];
        } else {
            var $$ = this.$.sharing.$;
            $$.pubKeysMaster.set(caller, JSON.parse(info));
            return [];
        }
    },

    // topic is this.$.pubsub.FORUM_PREFIX + me + NEW_MSG_SUFFIX;
    async handleNewMessage(topic, msg) {
        var from = this.$.security.getCallerFrom();
        if (this.state.isManager) {
            notifyWebApp(this, OP_NEW_MESSAGE, from, msg);
        } else {
            notifyIoT(this, OP_NEW_MESSAGE, from, msg);
        }
        return [];
    },

    // topic is  this.$.pubsub.FORUM_PREFIX + me + NEW_PAIRING_REQUEST
    async handlePairingRequest(topic, msg) {
        var from = this.$.security.getCallerFrom();
        var msgObj = JSON.parse(msg);
        // type of msgObj {clientInfo: {key: string, address: string},
        //                 msg: string}
        this.$.iot.iotApply('pairPassive', [
            from, msgObj.clientInfo, msgObj.msg
        ]);
        return [];
    },

    // topic is this.$.pubsub.FORUM_PREFIX + me + NEW_PAIRING_ACK
    async handlePairingAck(topic, msg) {
        var from = this.$.security.getCallerFrom();
        this.$.iot.iotApply('pairActive', [from, msg]);
        return [];
    },

    // Called by the IoT device

    async requestPairing(to, encMsg) {
        var msg = JSON.stringify({
            clientInfo: this.state.clientInfo,
            msg: encMsg
        });
        var topic = this.$.pubsub.FORUM_PREFIX + to + NEW_PAIRING_REQUEST;
        this.$.pubsub.publish(topic, msg);
        return this.getState();
    },

    async ackPairing(to, encMsg) {
        var topic = this.$.pubsub.FORUM_PREFIX + to + NEW_PAIRING_ACK;
        this.$.pubsub.publish(topic, encMsg);
        return this.getState();
    },

    async traceSync() {
        var $$ = this.$.sharing.$;
        var now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName + ':Syncing!!:' + now);

        this.scratch.otherPrincipals = this.scratch.otherPrincipals || {};

        this.state.deviceInfo = myUtils.deepClone($$.toCloud.get('deviceInfo'));

        notifyWebApp(this, OP_STATE_CHANGE, null, 'New inputs');

        var pendingPrincipals = $$.toCloud.get('pendingPrincipals') || [];
        for (let x of pendingPrincipals) {
            this.scratch.otherPrincipals[x] = true;
        };

        var allPrincipals = {};
        pendingPrincipals = Object.keys(this.scratch.otherPrincipals);
        for (let name of pendingPrincipals) {
            try {
                var info = myUtils.extractData(await this.getClientInfo(name));
                if (info !== null) {
                    // locally available, null otherwise
                    allPrincipals[name] = info;
                }
            } catch (err) {
                 // not authorized
                allPrincipals[name] = null;
            }
        }

        $$.fromCloud.set('otherPrincipals', allPrincipals);
        return [];
    },
    async traceResume() {
        var now = (new Date()).getTime();
        this.$.log.debug(this.state.fullName + ':Resuming!!:' + now);
        return [];
    }
};

caf.init(module);
