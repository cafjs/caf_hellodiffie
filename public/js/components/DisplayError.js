var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');

var DisplayError = {

    doDismissError: function(ev) {
        AppActions.resetError();
    },

    render: function() {
        return cE(rB.Modal,{show: (this.props.error ? true : false),
                            onHide: this.doDismissError,
                            animation: false},
                  cE(rB.Modal.Header, {
                      className : "bg-warning text-warning",
                      closeButton: true},
                     cE(rB.Modal.Title, null, "Error")
                    ),
                  cE(rB.ModalBody, null,
                     cE('p', null, 'Message:'),
                     cE(rB.Alert, {bsStyle: 'danger'},
                        this.props.error && this.props.error.message)
                    ),
                  cE(rB.Modal.Footer, null,
                     cE(rB.Button, {onClick: this.doDismissError}, "Continue")
                    )
                 );
    }
};

module.exports = React.createClass(DisplayError);
