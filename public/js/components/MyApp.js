var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppStore = require('../stores/AppStore');
var AppActions = require('../actions/AppActions');
var Authorization = require('./Authorization');
var Send = require('./Send');
var Receive = require('./Receive');
var AppStatus = require('./AppStatus');
var DisplayError = require('./DisplayError');

var MyApp = {
    getInitialState: function() {
        return AppStore.getState();
    },
    componentDidMount: function() {
        AppStore.addChangeListener(this._onChange);
    },
    componentWillUnmount: function() {
        AppStore.removeChangeListener(this._onChange);
    },
    _onChange : function(ev) {
        this.setState(AppStore.getState());
    },
    render: function() {
        var pubKey = (this.state.pubKey ?  this.state.pubKey.slice(0, 8) +
                      '...' : "");
        return cE("div", {className: "container-fluid"},
                  cE(DisplayError, {
                      error: this.state.error
                  }),
                  cE(rB.Panel, {
                      header: cE(rB.Grid, null,
                                 cE(rB.Row, null,
                                    cE(rB.Col, {sm:1, xs:1},
                                       cE(AppStatus, {
                                           isClosed: this.state.isClosed
                                       })
                                      ),
                                    cE(rB.Col, {
                                        sm: 5,
                                        xs:10,
                                        className: 'text-right'
                                    }, "Diffie Example"),
                                    cE(rB.Col, {
                                        sm: 5,
                                        xs:11,
                                        className: 'text-right'
                                    }, this.state.fullName)
                                   )
                                )
                  },
                     cE(rB.Panel, {header: "Authorization for " + pubKey},
                        cE(Authorization, {
                            principalId: this.state.principalId,
                            isManager: this.state.isManager,
                            autho: this.state.autho
                        })),
                     cE(rB.Panel, {header: "Send Message"},
                        cE(Send, {
                            msg : this.state.msg,
                            msgEnc : this.state.msgEnc,
                            toId : this.state.toId
                        })),
                     cE(rB.Panel, {header: "Last Received Message"},
                        cE(Receive, {
                            msgRecv: this.state.msgRecv,
                            msgEncRecv: this.state.msgEncRecv,
                            msgFromRecv: this.state.msgFromRecv
                        }))
                    )
                 );
    }
};

module.exports = React.createClass(MyApp);
