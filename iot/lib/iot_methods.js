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
    async __iot_setup__() {
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

        try {
            await this.state.blue.init(name);
            var pubKey = this.$.cloud.cli.getCrypto().getPublicKey();
            var address = this.state.blue.getAddress();

            await this.$.cloud.cli.newClientInfo({
                key: pubKey, address: address
            }).getPromise();

            this.$.cron.addCron('scanCron', 'scan', [],
                                this.$.props.scanInterval);
            this.$.cron.addCron('connCron', 'connections', [],
                                this.$.props.connInterval);
            this.$.cron.addCron('gcPairingsCron', 'gcPairings', [],
                                this.$.props.gcPairingsInterval);
            return [];
        } catch (err) {
            return [err];
        }
    },

    async __iot_loop__() {
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
            return [];
        } else {
            this.state.pendingBinding = nextTarget();
            if (this.state.pendingBinding) {
                try {
                    var localOOB = await this.state.blue.readOOB();
                    this.state.nonce = myUtils.uniqueId();
                    localOOB.nonce = this.state.nonce;
                    var cry = this.$.cloud.cli.getCrypto();
                    cry.setOtherPublicKey(this.state.pendingBinding.info.key);
                    var enc = cry.encryptAndMAC(JSON.stringify(localOOB));
                    var data = await this.$.cloud.cli
                            .requestPairing(this.state.pendingBinding.name,
                                            enc)
                            .getPromise();
                    return [null, data];
                } catch (err) {
                    return [err];
                }
            } else {
                return [];
            }
        }
    },

    async pairActive(name, encRes) {
        this.$.log && this.$.log.debug('Pair active, name:' + name +
                                       ' enc: ' + encRes);
        if (this.state.pendingBinding &&
            (this.state.pendingBinding.name === name)) {
            var remoteOOBData = null;
            try {
                var cry = this.$.cloud.cli.getCrypto();
                cry.setOtherPublicKey(this.state.pendingBinding.info.key);
                var msg = cry.authAndDecrypt(encRes);
                remoteOOBData = JSON.parse(msg);
                if (remoteOOBData.nonce === this.state.nonce) {
                    await this.state.blue.remoteOOB(remoteOOBData);
                } else {
                    var error = new Error('Nonce does not match');
                    error.old = this.state.nonce;
                    error.new = remoteOOBData.nonce;
                   throw error;
                }

                this.$.log && this.$.log.debug('Pair active: unpair');
                await this.state.blue.unpair(remoteOOBData.address);
                this.$.log && this.$.log.debug('Pair active: pairing...');
                await this.state.blue.pair(remoteOOBData.address);
                this.state.pendingBinding = null;
                this.$.log && this.$.log.debug('Pair OK, remote address:' +
                                               remoteOOBData.address);
                this.state.bindings[name] = true;
                return [];
            } catch (err) {
                this.state.pendingBinding = null;
                this.$.log && this.$.log.debug('Pair active, error:' +
                                               myUtils.errToPrettyStr(err));
                return []; // do not propagate to avoid shutdown
            }
        } else {
            this.$.log && this.$.log.debug('Ignoring ' + name +
                                           ' in pairActive');
            return [];
        }
    },

    // clientInfo type is  {key: string, address: string}
    async pairPassive(name, clientInfo, encData) {
        this.$.log && this.$.log.debug('Pair passive, name:' + name +
                                       ' key:' + clientInfo.key.slice(0, 5) +
                                       ' enc: ' + encData);
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
        try {
            var data = await this.state.blue.readOOB();
            localOOBData = data;
            var msg = cry.authAndDecrypt(encData);
            remoteOOBData = JSON.parse(msg);
            localOOBData.nonce = remoteOOBData.nonce;
            await this.state.blue.remoteOOB(remoteOOBData);

            this.$.log && this.$.log.debug('Pair passive: unpair');
            await this.state.blue.unpair(remoteOOBData.address);

            this.$.log && this.$.log.debug('Pair passive: ack');
            var enc = cry.encryptAndMAC(JSON.stringify(localOOBData));
            await this.$.cloud.cli.ackPairing(name, enc).getPromise();
            this.$.log && this.$.log.debug('Pair passive OK, address:' +
                                           remoteOOBData.address);
            return [];
        } catch (err) {
            this.$.log && this.$.log.debug('Pair passive, error:' +
                                           myUtils.errToPrettyStr(err));
            return []; // do not propagate to avoid shutdown
        }
    },

    async gcPairings() {
        for (let x of Object.keys(this.state.bindings)) {
            var addr = this.state.scanned[x];
            if (!addr || !this.state.connections[addr]) {
                delete this.state.bindings[x];
            }
        };
        return [];
    },

    async connections() {
        var now = (new Date()).getTime();
        try {
            var conn = await this.state.blue.connections();
            this.state.connections = conn;
            for (let x of Object.keys(this.state.bindings)) {
                var addr = this.state.scanned[x];
                if (addr && !conn[addr]) {
                    this.$.log && this.$.log.debug('Reconnecting ' + addr);
                    this.state.blue.connect(addr, this.$.log);
                }
            };
            this.$.log && this.$.log.debug(now + ' Done connections:' +
                                           JSON.stringify(this.state
                                                          .connections));
            return [];
        } catch (err) {
            return [err];
        }
    },

    async scan() {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' Start scanning, prefix=' +
                                       this.state.prefix);
        try {
            var data = await this.state.blue.find(this.state.prefix);
            this.state.scanned = {};
            console.log(data);
            data = data || [];
            for (let x of data) {
                var name = x.name.slice(this.state.prefix.length);
                this.state.scanned[name] = x.address;
            };
            this.$.log && this.$.log.debug(now + ' Done scanning:' +
                                           JSON.stringify(this.state.scanned));
            return [null, data];
        } catch(err) {
            this.$.log && this.$.log.debug('Error scanning' +
                                           myUtils.errToPrettyStr(err));
            return [err];
        }
    }
};

caf_iot.init(module);
