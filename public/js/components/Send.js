var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');

var Send = {

    handleToId: function() {
        AppActions.setLocalState({
            toId: this.refs.toId.getValue()
        });
    },

    handleMsg: function() {
        AppActions.setLocalState({
            msg: this.refs.msg.getValue()
        });
    },

    msgKeyDown: function(ev) {
        if (ev.key === 'Enter') {
            this.doEncrypt();
        }
    },

    doEncrypt: function() {
        if (this.props.toId && this.props.msg) {
            AppActions.encrypt(this.props.toId, this.props.msg);
        } else {
            AppActions.setError(new Error('Missing ID or message'));
        }
    },

    doSend: function() {
        if (this.props.toId && this.props.msgEnc) {
            AppActions.newMsg(this.props.toId, this.props.msgEnc);
        } else {
            AppActions.setError(new Error('Missing ID or encrypted message'));
        }
    },

    doCancel: function() {
        AppActions.setLocalState({
            toId: null,
            msgEnc: null,
            msg: null
        });
    },

    render : function() {
        return cE(rB.Grid, null,
                  cE(rB.Row, null,
                     cE(rB.Col, {sm:6, xs:12},
                        cE(rB.Input, {
                            type: 'text',
                            ref: 'toId',
                            value: this.props.toId,
                            onChange: this.handleToId,
                            placeholder: 'To'
                        })),
                      cE(rB.Col, {sm:6, xs:12},
                         cE(rB.ButtonGroup, null,
                            cE(rB.Button, {onClick: this.doEncrypt,
                                           key:319879},'Encrypt'),
                            cE(rB.Button, {onClick: this.doSend, key:39879},
                               'Send'),
                            cE(rB.Button, {onClick: this.doCancel,
                                           bsStyle: 'danger', key:39079},
                               'Cancel')
                           )
                        )
                    ),
                  cE(rB.Row, null,
                     cE(rB.Col, {sm:6, xs:12},
                        cE(rB.Input, {
                            type: 'textarea',
                            ref: 'msg',
                            value: this.props.msg,
                            onChange: this.handleMsg,
                            onKeyDown: this.msgKeyDown,
                            placeholder: 'Message to send'
                        })
                       ),
                     cE(rB.Col, {sm:6, xs:12},
                        cE(rB.Input, {
                            type: 'textarea',
                            ref: 'msgEnc',
                            readOnly: true,
                            value: this.props.msgEnc,
                            placeholder: 'Encrypted message'
                        })
                       )
                    )
                 );
    }
};



module.exports = React.createClass(Send);
