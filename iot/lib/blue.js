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
var caf_comp = caf_iot.caf_components;
var myUtils = caf_comp.myUtils;
var child_process = require('child_process');
var path = require('path');

var CONNECT_EXE='connect.sh';
var SETUP_EXE='setup.sh';
var BTMGMT='/usr/bin/btmgmt';

var nexpect = require('nexpect');

var RAW_ADDR = /[A-F\d][A-F\d]:[A-F\d][A-F\d]:[A-F\d][A-F\d]:[A-F\d][A-F\d]:[A-F\d][A-F\d]:[A-F\d][A-F\d]/g;

var REG_ADDR = /dev_found:\s[A-F\d]?[A-F\d]?:[A-F\d]?[A-F\d]?:[A-F\d]?[A-F\d]?:[A-F\d]?[A-F\d]?:[A-F\d]?[A-F\d]?:[A-F\d]?[A-F\d]?/g;

var REG_NAME= /name\s[^#]+###/g; //end of the line matched
var SUCCEED= /succeeded/;
var LINE_SEP='###';

var PREFIX_NAME='name ';
var PREFIX_ADDR='dev_found: ';

var REG_OOB=/192:\s[a-f\d]+/g;
var PREFIX_OOB='192: ';

var REG_FAIL=/\sfailed/;

var REG_BUSY=/\sBusy/;

var REG_ALREADY_PAIRED=/Already\sPaired/;

var REG_CONNECTION_ERROR=/Can't connect/;

var removeDuplicates = function(all) {
    var seen = {};
    return all.filter(function(x) {
        if (seen[x]) {
            return false;
        } else {
            seen[x] = true;
            return true;
        }
    });
};


var parseLocal = function(out) {
    out = out.join(LINE_SEP);
    var oob = out.match(REG_OOB) || [];
    oob = oob.map(function(x) {
        return x.slice(PREFIX_OOB.length);
    });
    return {hash:oob[0], rand: oob[1]};
};

var filterFinder = function(prefix, out) {
    out = out.join(LINE_SEP);
    var addr = out.match(REG_ADDR) || [];
    addr = removeDuplicates(addr.map(function(x) {
        return x.slice(PREFIX_ADDR.length);
    }));

    var names = out.match(REG_NAME) || [];
    names = names.filter(function(x) {
        // hack to parse the output
        return (x.match(SUCCEED) === null);
    });
    names = removeDuplicates(names.map(function(x) {
        return x.slice(PREFIX_NAME.length, -LINE_SEP.length);
    }));

    if (names.length !== addr.length) {
        throw new Error('Error parsing names:' + JSON.stringify(names) +
                        ' addresses:' + JSON.stringify(addr));
    } else {
        return names.map(function(x, i) {
            if (prefix) {
                if (x.indexOf(prefix) === 0) {
                    return {address: addr[i], name: x};
                } else {
                    return null;
                }
            } else {
                return {address: addr[i], name: x};
            }
        }).filter(function(x) { return x !== null;});
    }
};

var parseConnections =  function(out) {
    out = out.join(LINE_SEP);
    var resultArray = out.match(RAW_ADDR)|| [];
    var res = {};
    resultArray.forEach(function(x) {
        res[x] = true;
    });
    return res;
};

exports.newInstance = function(btmgmt, deviceIndex, timeoutMsec) {
    btmgmt = btmgmt || BTMGMT;
    deviceIndex = deviceIndex || 0;

    var command = btmgmt + ' --index ' + deviceIndex;
    var localOOB = null;
    var prompt = '[hci'+deviceIndex + ']';
    var myAddr = null;

    var killAfterTimeout =  function(child, myId) {
        return setTimeout(function() {
            try {
                delete myId.id;
                console.log('Killing child process ' + child.pid);
                process.kill(child.pid, 'SIGKILL');
            } catch (ex) {
                console.log('>>><<<<>> got exception:' + ex);
                // Ignore missing process
            }
        }, timeoutMsec);
    };

    return {

        init : function(name, cb) {
            var control = {};
            var child = nexpect.spawn(command, {verbose: true})
                    .wait(prompt)
                    .sendline('info')
                    .wait(prompt)
                    .sendline('power off')
                    .wait('Set Powered')
                    .sendline('name ' + name)
                    .wait(prompt)
                    .sendline('le off')
                    .wait(prompt)
                    .sendline('bredr on')
                    .wait(prompt)
                    .sendline('linksec on')
                    .wait(prompt)
                    .sendline('ssp on')
                    .wait(prompt)
                    .sendline('connectable on')
                    .wait(prompt)
                    .sendline('bondable on')
                    .wait(prompt)
                    .sendline('discov on')
                    .wait(prompt)
                    .sendline('power on')
                    .wait('Set Powered')
                    .sendline('info')
                    .wait(prompt)
                    .sendline('quit')
                    .run(function (err, out) {
                        control.id && clearTimeout(control.id);
                        if (err) {
                            cb(err);
                        } else {
                            myAddr = out.join().split('addr ')[1].split(' ')[0];
                            cb(err, out);
                        }
                    });
            control.id = killAfterTimeout(child, control);
        },

        setup: function(log) {
            var setup = child_process.spawn(path.resolve(__dirname, SETUP_EXE),
                                            []);
            setup.stdout.on('data', function(data) {
                if (Buffer.isBuffer(data)) {
                    data = data.toString();
                }
                log && log.debug(data);
            });

            setup.stderr.on('data', function(data) {
                if (Buffer.isBuffer(data)) {
                    data = data.toString();
                }
                log && log.warn(data);
            });

            setup.on('close', function(code) {
                if (code != 0) {
                    log && log.error('setup.sh failed with error code ' + code);
                } else {
                    log && log.debug('setup.sh exited');
                }
            });
        },

        connect: function(address, log) {
            var self = this;
            var connectImpl = function() {
                var stderrStr = '';
                var stdoutStr = '';
                var conn = child_process
                        .spawn(path.resolve(__dirname, CONNECT_EXE), [address]);

                conn.stdout.on('data', function(data) {
                    if (Buffer.isBuffer(data)) {
                        data = data.toString();
                    }
                    stdoutStr = stdoutStr + data;
                    log && log.debug(data);
                });

                conn.stderr.on('data', function(data) {
                    if (Buffer.isBuffer(data)) {
                        data = data.toString();
                    }
                    stderrStr = stderrStr + data;
                    log && log.warn(data);
                });

                conn.on('close', function(code) {
                    if (stderrStr.match(REG_CONNECTION_ERROR) ||
                        (code != 0) ||
                        stdoutStr.match(REG_CONNECTION_ERROR)) {
                        log && log.error('connect.sh failed with code ' +
                                         code);
                    } else {
                        log && log.debug('connect.sh exited OK');
                    }
                });
            };

            connectImpl();
        },

        /*
         * returns in callback (err, data) where 'data' type is:
         *  Array.<{address: string, name: string}>
         */
        find : function(prefix, cb) {
            var cb1 = myUtils.callJustOnce(null, cb);
            try {
                var control = {};
                var child = nexpect.spawn(command, {verbose: true})
                        .wait(prompt)
                        .sendline('find -b')
                        .wait('discovering off')
                        .sendline('quit')
                        .run(function(err, out) {
                            control.id && clearTimeout(control.id);
                            if (err) {
                                cb1(err);
                            } else {
                                try {
                                    cb1(err, filterFinder(prefix, out));
                                } catch(error) {
                                    cb1(error);
                                }
                            }
                        });
                control.id = killAfterTimeout(child, control);
            } catch(err) {
                cb1(err);
            }
        },

        getAddress: function() {
            return myAddr;
        },

        getLocalOOB: function() {
            return localOOB;
        },

        readOOB: function(cb) {
            var cb1 = myUtils.callJustOnce(function(err, data) {
                if (err) {
                    console.log('Called twice: Error: ' +
                                myUtils.errToPrettyStr(err));
                } else {
                    console.log('Called twice: Data: ' + data);
                }
            }, cb);
            var control = {};
            var child = nexpect.spawn(command, {verbose: true})
                    .wait(prompt)
                    .sendline('bredr-oob')
                    .wait('SSP Rand')
                    .sendline('quit')
                    .run(function(err, out) {
                        control.id && clearTimeout(control.id);
                        if (err) {
                            cb1(err);
                        } else {
                            try {
                                localOOB = parseLocal(out);
                                localOOB.address = myAddr;
                                cb1(err, localOOB);
                            } catch(error) {
                                cb1(error);
                            }
                        }
                    });
            control.id = killAfterTimeout(child, control);
        },

        remoteOOB: function(remoteOOB, cb) {
            var cb1 = myUtils.callJustOnce(function(err, data) {
                if (err) {
                    console.log('Called twice: Error: ' +
                                myUtils.errToPrettyStr(err));
                } else {
                    console.log('Called twice: Data: ' + data);
                }
            }, cb);
            var cmdRemote = 'remote-oob -h ' + remoteOOB.hash  + ' -r ' +
                    remoteOOB.rand + ' ' + remoteOOB.address;
            var control = {};
            var child = nexpect.spawn(command, {verbose: true})
                    .wait(prompt)
                    .sendline(cmdRemote)
                    .wait('data added')
                    .sendline('quit')
                    .run(function(err, out) {
                        control.id && clearTimeout(control.id);
                        cb1(err,out);
                    });
            control.id = killAfterTimeout(child, control);
        },

        pair: function(addr, cb) {
            var control = {};
            var child = nexpect.spawn(command, {stream : 'all', verbose: true})
                    .wait(prompt)
                    .sendline('pair ' + addr)
                    .wait('type BR/EDR')
                    .sendline('quit')
                    .run(function(err, out) {
                        control.id && clearTimeout(control.id);
                        if (err) {
                            cb(err);
                        } else {
                            out = out.join();
                            if (out.match(REG_FAIL)) {
                                if (out.match(REG_ALREADY_PAIRED)) {
                                    cb(err, out); // make idempotent
                                } else {
                                    var error = new Error('Cannot pair');
                                    error.out = out;
                                    if (out.match(REG_BUSY)) {
                                        error.retry = true;
                                    }
                                    cb(error);
                                }
                            } else {
                                cb(err,out);
                            }
                        }
                    });
            control.id = killAfterTimeout(child, control);
        },

        unpair: function(addr, cb) {
            var control = {};
            var child = nexpect.spawn(command, {stream : 'all', verbose: true})
                    .wait(prompt)
                    .sendline('unpair ' + addr)
                    .wait(prompt)
                    .sendline('quit')
                    .run(function(err, out) {
                        control.id && clearTimeout(control.id);
                        cb(err,out);
                    });
            control.id = killAfterTimeout(child, control);
        },

        connections: function(cb) {
            var control = {};
            var child = nexpect.spawn(command, {verbose: true})
                    .wait(prompt)
                    .sendline('con')
                    .wait(prompt)
                    .sendline('quit')
                    .run(function(err, out) {
                        control.id && clearTimeout(control.id);
                        if (err) {
                            cb(err);
                        } else {
                            var conn = parseConnections(out);
                            cb(err, conn);
                        }
                    });
            control.id = killAfterTimeout(child, control);
        }
    };
};
