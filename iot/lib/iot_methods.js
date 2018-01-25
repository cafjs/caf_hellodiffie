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
var caf_iot = require('caf_iot');
var caf_comp = caf_iot.caf_components;
var myUtils = caf_comp.myUtils;
var async = caf_comp.async;
var json_rpc = caf_iot.caf_transport.json_rpc;
var blue = require('./blue');

var pubToStr = function(pubKeys) {
    var replacer = function(key, value) {
        if (key === 'key') {
            return value.slice(0, 8) + '...';
        } else {
            return value;
        }
    };
    return JSON.stringify(pubKeys, replacer);
};

exports.methods = {
    '__iot_setup__': function(cb) {
        var self = this;
        this.$.log && this.$.log.debug('Setup: device# ' +
                                       this.$.props.bluetoothDevice);
        this.state.blue = blue.newInstance(this.$.props.btmgmt,
                                           this.$.props.bluetoothDevice,
                                           this.$.props.bluetoothTimeout);
        var name = json_rpc.joinName(this.__ca_getAppName__(),
                                     this.__ca_getName__());
        this.state.prefix = json_rpc.joinName(this.__ca_getAppName__(), '');
        // type for scanned is {name : string(address) }
        this.state.scanned = {};
        // type for bindings is {name: true}
        this.state.bindings = {};
        // type for pendingBinding is  {name: string, nTries: number,
        //                              info : {key: string, address: string}};
        this.state.pendingBinding = null;

        this.state.blue.setup(this.$.log);

        async.series([
            function(cb1) {
                self.state.blue.init(name, cb1);
            },
            function(cb1) {
                var pubKey = self.$.cloud.cli.getCrypto().getPublicKey();
                var address = self.state.blue.getAddress();
                self.$.cloud.cli.newClientInfo({key: pubKey, address: address},
                                               cb1);
            }
        ], function(err) {
            if (err) {
                cb(err);
            } else {
                self.$.cron.addCron('scanCron', 'scan', [],
                                    self.$.props.scanInterval);
                self.$.cron.addCron('connCron', 'connections', [],
                                    self.$.props.connInterval);
                self.$.cron.addCron('gcPairingsCron', 'gcPairings', [],
                                    self.$.props.gcPairingsInterval);

                cb(null);
            }
        });
    },

    '__iot_loop__': function(cb) {
        var self = this;
        this.$.log && this.$.log.debug('Calling loop');

        var otherPrincipals = this.fromCloud.get('otherPrincipals') || {};
        this.$.log && this.$.log.debug(JSON.stringify(otherPrincipals));

        var nextTarget = function() {
            var result = null;
            Object.keys(self.state.scanned).some(function(x) {
                if (otherPrincipals[x] && (!self.state.bindings[x]) &&
                    (self.__ca_getName__() < x)) { // deterministic active role
                    result = {
                        name: x,
                        info: otherPrincipals[x],
                        nTries: self.$.props.pairingRetries
                    };
                    return true;
                } else {
                    return false;
                }
            });
            return result;
        };

        // Array with names of discovered devices with missing pub keys
        this.toCloud.set('pendingPrincipals', Object.keys(this.state.scanned));

        this.toCloud.set('deviceInfo', myUtils.deepClone({
            // Binding being negotiated {name: string, info : {key: string,
            //                                                address: string}};
            pendingBinding: this.state.pendingBinding,
            // Results of last bluetooth (filtered) scan.
            //   Type Object<name:string, address:string>
            scanned: this.state.scanned,
            // Map with succesfull bluetooth pairings.
            //    Type Object<name:string,true>
            bindings: this.state.bindings,
            // Object.<address:string, true>
            connections: Object.keys(this.state.connections || {})
        }));


        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' loop:' +
                                       pubToStr(otherPrincipals));

        if (this.state.pendingBinding) {
            this.$.log && this.$.log.debug('Waiting for ' +
                                           this.state.pendingBinding.name +
                                           ' #' + this.state.pendingBinding
                                           .nTries);
            this.state.pendingBinding.nTries =
                this.state.pendingBinding.nTries - 1;
            if (this.state.pendingBinding.nTries === 0) {
                this.state.pendingBinding = null;
            }
            cb(null);
        } else {
            this.state.pendingBinding = nextTarget();
            if (this.state.pendingBinding) {
                async.waterfall([
                    function(cb1) {
                        self.state.blue.readOOB(cb1);
                    },
                    function(localOOB, cb1) {
                        self.state.nonce = myUtils.uniqueId();
                        localOOB.nonce = self.state.nonce;
                        var cry = self.$.cloud.cli.getCrypto();
                        cry.setOtherPublicKey(self.state.pendingBinding
                                              .info.key);
                        var enc = cry.encryptAndMAC(JSON.stringify(localOOB));
                        self.$.cloud.cli.requestPairing(self.state
                                                        .pendingBinding
                                                        .name, enc, cb1);
                    }
                ], cb);
            } else {
                cb(null);
            }
        }
    },

    'pairActive': function(name, encRes, cb) {
        this.$.log && this.$.log.debug('Pair active, name:' + name +
                                       ' enc: ' + encRes);
        var self = this;
        if (this.state.pendingBinding &&
            (this.state.pendingBinding.name === name)) {
            var remoteOOBData = null;
            async.series([
                function(cb1) {
                    try {
                        var cry = self.$.cloud.cli.getCrypto();
                        cry.setOtherPublicKey(self.state.pendingBinding
                                              .info.key);
                        var msg = cry.authAndDecrypt(encRes);
                        remoteOOBData = JSON.parse(msg);
                        if (remoteOOBData.nonce === self.state.nonce) {
                            self.state.blue.remoteOOB(remoteOOBData, cb1);
                        } else {
                            var error = new Error('Nonce does not match');
                            error.old = self.state.nonce;
                            error.new = remoteOOBData.nonce;
                            cb1(error);
                        }
                    } catch (error) {
                        cb1(error);
                    }
                },
                function(cb1) {
                    self.$.log && self.$.log.debug('Pair active: unpair');
                    self.state.blue.unpair(remoteOOBData.address, cb1);
                },
                function(cb1) {
                    self.$.log && self.$.log.debug('Pair active: pairing...');
                    self.state.blue.pair(remoteOOBData.address, cb1);
                }
            ], function(err) {
                self.state.pendingBinding = null;
                if (err) {
                    self.$.log && self.$.log.debug('Pair active, error:' +
                                                   myUtils.errToPrettyStr(err));
                    cb(null); // do not propagate to avoid shutdown
                } else {
                    self.$.log && self.$.log.debug('Pair OK, remote address:' +
                                                   remoteOOBData.address);
                    self.state.bindings[name] = true;
                    cb(null);
                }
            });
        } else {
            this.$.log && this.$.log.debug('Ignoring ' + name +
                                           ' in pairActive');
            cb(null);
        }
    },

    // clientInfo type is  {key: string, address: string}
    'pairPassive': function(name, clientInfo, encData, cb) {
        this.$.log && this.$.log.debug('Pair passive, name:' + name +
                                       ' key:' + clientInfo.key.slice(0, 5) +
                                       ' enc: ' + encData);
        var self = this;
        if (this.state.pendingBinding) {
            this.$.log && this.$.log.debug('Ignoring ' +
                                           this.state.pendingBinding.name +
                                           ' in pairPassive');
            // give priority to active, name ordering avoids deadlocks
            delete this.state.pendingBinding;
        }
        var localOOBData = null;

        var cry = this.$.cloud.cli.getCrypto();
        cry.setOtherPublicKey(clientInfo.key);
        var remoteOOBData = null;

        async.series([
            function(cb1) {
                self.state.blue.readOOB(function(err, data) {
                    if (err) {
                        cb1(err);
                    } else {
                        localOOBData = data;
                        cb1(null);
                    }
                });
            },
            function(cb1) {
                try {
                    var msg = cry.authAndDecrypt(encData);
                    remoteOOBData = JSON.parse(msg);
                    localOOBData.nonce = remoteOOBData.nonce;
                    self.state.blue.remoteOOB(remoteOOBData, cb1);
                } catch (error) {
                    cb1(error);
                }
            },
            function(cb1) {
                self.$.log && self.$.log.debug('Pair passive: unpair');
                self.state.blue.unpair(remoteOOBData.address, cb1);
            },
            function(cb1) {
                self.$.log && self.$.log.debug('Pair passive: ack');
                var enc = cry.encryptAndMAC(JSON.stringify(localOOBData));
                self.$.cloud.cli.ackPairing(name, enc, cb1);
            }
        ], function(err) {
            if (err) {
                self.$.log && self.$.log.debug('Pair passive, error:' +
                                               myUtils.errToPrettyStr(err));
                cb(null); // do not propagate to avoid shutdown
            } else {
                self.$.log && self.$.log.debug('Pair passive OK, address:' +
                                               remoteOOBData.address);
                cb(null);
            }
        });
    },

    'gcPairings': function(cb) {
        var self = this;
        Object.keys(this.state.bindings).forEach(function(x) {
            var addr = self.state.scanned[x];
            if (!addr || !self.state.connections[addr]) {
                delete self.state.bindings[x];
            }
        });
        cb(null);
    },

    'connections': function(cb) {
        var self = this;
        var now = (new Date()).getTime();
        this.state.blue.connections(function(err, conn) {
            if (err) {
                cb(err);
            } else {
                self.state.connections = conn;
                Object.keys(self.state.bindings).forEach(function(x) {
                    var addr = self.state.scanned[x];
                    if (addr && !conn[addr]) {
                        self.$.log && self.$.log.debug('Reconnecting ' + addr);
                        self.state.blue.connect(addr, self.$.log);
                    }
                });
                self.$.log && self.$.log.debug(now + ' Done connections:' +
                                               JSON.stringify(self.state
                                                              .connections));
                cb(null);
            }
        });
    },

    'scan': function(cb) {
        var self = this;
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' Start scanning, prefix=' +
                                       this.state.prefix);
        this.state.blue.find(this.state.prefix, function(err, data) {
            if (err) {
                self.$.log && self.$.log.debug('Error scanning' +
                                               myUtils.errToPrettyStr(err));
                cb(err);
            } else {
                self.state.scanned = {};
                console.log(data);
                data = data || [];
                data.forEach(function(x) {
                    var name = x.name.slice(self.state.prefix.length);
                    self.state.scanned[name] = x.address;
                });
                self.$.log && self.$.log.debug(now + ' Done scanning:' +
                                               JSON.stringify(self.state
                                                              .scanned));
                cb(err, data);
            }
        });
    }

};

caf_iot.init(module);
