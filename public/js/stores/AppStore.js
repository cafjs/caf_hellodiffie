var AppDispatcher = require('../dispatcher/AppDispatcher');
var AppConstants = require('../constants/AppConstants');
var EventEmitter2 = require('eventemitter2').EventEmitter2;

var CHANGE_EVENT = 'change';
var LINK_KEY = '__link_key__';

var newAppStore = function() {

    var server = new EventEmitter2();

    var state = {autho: {delegate: {}, authorized: {}}, isClosed: false};

    var that = {};

    var emitChange = function() {
        server.emit(CHANGE_EVENT);
    };

    that.addChangeListener = function(callback) {
        server.on(CHANGE_EVENT, callback);
    };

    that.removeChangeListener = function(callback) {
        server.removeListener(CHANGE_EVENT, callback);
    };

    that.getState = function() {
        return state;
    };

    var mixinState = function(newState) {
        newState = newState || {};
        Object.keys(newState)
            .forEach(function(key) { state[key] = newState[key]; });
    };

    var mixinAutho = function(autho) {
        autho = autho || {};
        var computeAutho = function() {
            var res =  {delegate: {}, authorized: {}};
            Object.keys(autho).forEach(function(x) {
                if (x ===  LINK_KEY) {
                    var links = autho[x] || [];
                    links.forEach(function(y) {
                        res.delegate[y] = true;
                    });
                } else {
                    res.authorized[x] = true;
                }
            });
            return res;
        };
        state.autho = computeAutho();
    };

    var f = function(action) {
        switch(action.actionType) {
        case AppConstants.APP_UPDATE:
            mixinState(action.state.state);
            mixinAutho(action.state.autho);
            emitChange();
            break;
        case AppConstants.APP_NOTIFICATION:
            mixinState(action.state.state);
            mixinAutho(action.state.autho);
            emitChange();
            break;
        case AppConstants.APP_ERROR:
            state.error = action.error;
            console.log('Error:' + action.error);
            emitChange();
            break;
        case AppConstants.WS_STATUS:
            state.isClosed = action.isClosed;
            emitChange();
            break;
        default:
            console.log('Ignoring '+ JSON.stringify(action));
        }
    };

    AppDispatcher.register(f);
    return that;
};

module.exports = newAppStore();
