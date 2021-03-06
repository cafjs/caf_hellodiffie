var AppDispatcher = require('../dispatcher/AppDispatcher');
var AppConstants = require('../constants/AppConstants');
var AppSession = require('../session/AppSession');
var json_rpc = require('caf_transport').json_rpc;
var caf_cli =  require('caf_cli');
var caf_comp = require('caf_components');
var myUtils = caf_comp.myUtils;
var async = caf_comp.async;

var MAX_RETRIES = 10;
var MAX_RETRY_DELAY=1000;

var OP_NEW_MESSAGE = 'newMessage';

var updateF = function(state) {
    var d = {
        actionType: AppConstants.APP_UPDATE,
        state: state
    };
    AppDispatcher.dispatch(d);
};


var errorF =  function(err) {
    var d = {
        actionType: AppConstants.APP_ERROR,
        error: err
    };
    AppDispatcher.dispatch(d);
};

var getNotifData = function(msg) {
    return json_rpc.getMethodArgs(msg)[0];
};

var notifyF = function(message) {
    var d = {
        actionType: AppConstants.APP_NOTIFICATION,
        state: getNotifData(message)
    };
    AppDispatcher.dispatch(d);
};

var wsStatusF =  function(isClosed) {
    var d = {
        actionType: AppConstants.WS_STATUS,
        isClosed: isClosed
    };
    AppDispatcher.dispatch(d);
};

var AppActions = {
    initServer: function(initialData) {
        updateF(initialData);
    },
    init: function(cb) {
        AppSession.hello(AppSession.getCacheKey(),
                         caf_cli.extractTokenFromURL(window.location.href),
                         AppSession.getCrypto().getPublicKey(),
                         function(err, data) {
                             if (err) {
                                 errorF(err);
                             } else {
                                 updateF(data);
                             }
                             cb(err, data);
                         });
    },
    encrypt: function(id, msg) {
        var encryptImpl = function(cb) {
            async.waterfall([
                function(cb1) {
                    var cb2 = function(err, res) {
                        if (err) {
                            cb1(err);
                        } else if (!res) {
                            cb1(new Error('Retrying to obtain pub key'));
                        } else {
                            cb1(err, res);
                        }
                    };
                    AppSession.getClientInfo(id, cb2);
                },
                function(otherPubKey, cb1) {
                    var cryp = AppSession.getCrypto();
                    cryp.setOtherPublicKey(otherPubKey.key);
                    cb1(null, {msgEnc : cryp.encryptAndMAC(msg)});
                }
            ], cb);
        };
        myUtils.retryWithDelay(encryptImpl, MAX_RETRIES, MAX_RETRY_DELAY,
                               function(err, data) {
                                   if (err) {
                                       errorF(err);
                                   } else {
                                       updateF({state: data});
                                   }
                               });
    },
    setLocalState: function(data) {
        updateF({state: data});
    },
    resetError: function() {
        errorF(null);
    },
    setError: function(err) {
        errorF(err);
    }
};

['authorize', 'unauthorize', 'link', 'unlink', 'newMsg', 'getState']
    .forEach(function(x) {
        AppActions[x] = async function() {
            var args = Array.prototype.slice.call(arguments);
            try {
                var data = await AppSession[x].apply(AppSession, args)
                        .getPromise();
                updateF(data);
            } catch (err) {
                errorF(err);
            }
        };
    });


AppSession.onmessage = function(data) {
    console.log('message:' + JSON.stringify(data));

    data = json_rpc.getMethodArgs(data)[0];
    var decryptImpl = function(cb) {
        async.waterfall([
            function(cb1) {
                var cb2 = function(err, res) {
                    if (err) {
                        cb1(err);
                    } else if (!res) {
                        cb1(new Error('Retrying to obtain pub key'));
                    } else {
                        cb1(err, res);
                    }
                };
                AppSession.getClientInfo(data.from, cb2);
            },
            function(otherPubKey, cb1) {
                var cryp = AppSession.getCrypto();
                cryp.setOtherPublicKey(otherPubKey.key);
                cb1(null, cryp.authAndDecrypt(data.msg));
            }
        ], cb);
    };

    if (data.op === OP_NEW_MESSAGE) {
        myUtils.retryWithDelay(decryptImpl, MAX_RETRIES, MAX_RETRY_DELAY,
                               function(err, msg) {
                                   if (err) {
                                       errorF(err);
                                   } else {
                                       updateF({state : {
                                           msgRecv: msg,
                                           msgEncRecv: data.msg,
                                           msgFromRecv: data.from
                                       }});
                                   }
                               });
    } else {
        AppActions.getState();
    }
};

AppSession.onclose = function(err) {
    console.log('Closing:' + JSON.stringify(err));
    wsStatusF(true);
};


module.exports = AppActions;
