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
var caf_iot = require('caf_iot');

exports.methods = {
    '__iot_setup__' : function(cb) {
        // value of 'index' from last run downloaded from the cloud
        var lastIndex = this.toCloud.get('index');
        this.state.index = (lastIndex ? lastIndex : 0);
        cb(null);
    },

    '__iot_loop__' : function(cb) {
        this.$.log && this.$.log.debug('Time offset ' + this.$.cloud.cli
                                       .getEstimatedTimeOffset());
        this.$.log && this.$.log.debug(JSON.stringify(this
                                                      .fromCloud.get('meta')));
        this.$.gpio.setPinConfig(this.fromCloud.get('meta') || {});
        this.$.log && this.$.log.debug(JSON.stringify(this
                                                      .fromCloud.get('out')));
        this.$.gpio.writeMany(this.fromCloud.get('out') || {});
        this.toCloud.set('in', this.$.gpio.readAll());
 
        this.toCloud.set('index', this.state.index);
        this.state.index = this.state.index  + 1;
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' loop:' + this.state.index);

        cb(null);
    },

    'setPin' : function(pin, value, cb) {
        var now = (new Date()).getTime();
        this.$.log && this.$.log.debug(now + ' setPin:' + pin + ' value:' +
                                       value);
        var pins = {};
        pins[pin] = value;
        this.$.gpio.writeMany(pins);
        cb(null);
    },

    'haltAndRestart' : function(afterSec, cb) {
        this.$.nap.haltAndRestart(afterSec);
        cb(null);
    }
};

caf_iot.init(module);
