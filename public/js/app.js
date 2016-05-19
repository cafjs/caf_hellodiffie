var React = require('react');
var ReactDOM = require('react-dom');
var ReactServer = require('react-dom/server');
var AppSession = require('./session/AppSession');
var MyApp = require('./components/MyApp');
var AppActions = require('./actions/AppActions');

var cE = React.createElement;

AppSession.onopen = function() {
    console.log('open session');
    AppActions.init(function(err) {
        console.log('Cannot connect:' + err);
        // render error or real data
        ReactDOM.render(
            cE(MyApp, null),
            document.getElementById('content')
        );
    });
};


var main = exports.main = function(data) {
    if (typeof window === 'undefined') {
        // server side rendering
        AppActions.initServer(data);
        return ReactServer.renderToString(cE(MyApp, null));
    } else {
        console.log('Hello');
        return null;
    }
};
