var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');

var Receive = {

    render : function() {
        return cE(rB.Grid, null,
                  cE(rB.Row, null,
                      cE(rB.Col, {sm:6, xs:12},
                        cE(rB.Input, {
                            type: 'text',
                            value: this.props.msgFromRecv,
                            readOnly: 'true',
                            placeholder: 'From'
                        }))
                    ),
                  cE(rB.Row, null,
                     cE(rB.Col, {sm:6, xs:12},
                        cE(rB.Input, {
                            type: 'textarea',
                            readOnly: 'true',
                            value: this.props.msgEncRecv,
                            placeholder: 'Received message'
                        })
                       ),
                     cE(rB.Col, {sm:6, xs:12},
                        cE(rB.Input, {
                            type: 'textarea',
                            readOnly: 'true',
                            value: this.props.msgRecv,
                            placeholder: 'Decrypted message'
                        })
                       )
                    )
                 );
    }
};

module.exports = React.createClass(Receive);
