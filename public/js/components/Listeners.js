var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var ListenerEditor = require('./ListenerEditor');
var ListenersTable = require('./ListenersTable');
var AppActions = require('../actions/AppActions');


var Listeners = {

    doEdit: function(ev) {
        if (this.props.listenerId) {
            AppActions.setLocalState({
                listenerEditor : {
                }
            });
        } else {
            AppActions.setError(new Error('Invalid listener ID'));
        }
    },

    doDelete: function(ev) {
        if (this.props.listenerId) {
            AppActions.removeListener(this.props.listenerId);
        } else {
            AppActions.setError(new Error('Invalid listener ID'));
        }
    },

    handleListenerId : function() {
        AppActions.setLocalState({
            listenerId: this.refs.listenerId.getValue()
        });
    },

    launchEditor : function(ev) {
        if (ev.key === 'Enter') {
            this.handleListenerId();
            this.doEdit();
        }
    },
    
    render: function() {
        var self = this;
        return cE("div", {className: "container-fluid"},
                  cE(ListenerEditor, {
                      listenerEditor: this.props.listenerEditor,
                      listenerId: this.props.listenerId,
                      bundles: this.props.bundles
                  }),
                  cE(rB.Grid, null,
                     cE(rB.Row, null,
                        cE(rB.Col, {sm:4, xs:12},
                           cE(rB.Input, {
                               type: 'text',
                               ref: 'listenerId',
                               value: this.props.listenerId,
                               onChange: this.handleListenerId,
                               onKeyDown: this.launchEditor,
                               placeholder: 'Listener Id'
                           })
                          ),
                        cE(rB.Col, {sm:4, xs:12},
                           cE(rB.ButtonGroup, null,
                              cE(rB.Button, {onClick: this.doEdit, key:989},
                                 'Edit'),
                              cE(rB.Button, {onClick: this.doDelete, key:991,
                                             bsStyle : 'danger'}, 'Delete'))
                          )
                       ),
                     cE(rB.Row, null,
                        cE(rB.Col, {sm:12, xs:12},
                           cE(ListenersTable, {
                               listeners: this.props.listeners
                           })
                          )
                       )
                    )
                 );
    }
};


module.exports = React.createClass(Listeners);
