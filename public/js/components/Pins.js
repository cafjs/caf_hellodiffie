var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');


var renderInputs = function(pinMode, pinInputsValue) {
    var sortedKeys = Object.keys(pinMode)
            .filter(function(x) {
                return pinMode[x].input;
            })
            .sort(function(a, b) {
                return a - b;
            });
    return cE(rB.ButtonGroup, null, sortedKeys.map(function(x, i) {
        var color =  (typeof pinInputsValue[x] === 'boolean' ?
                      (pinInputsValue[x] ? 'danger' : 'primary') : 'default');
        return cE(rB.Button, {bsStyle : color, disabled: true, key: 9888*(i+1)},
                  x);
    }));
};

var renderOutputs = function(pinMode, pinOutputsValue) {
    var sortedKeys = Object.keys(pinMode)
            .filter(function(x) {
                return !pinMode[x].input && pinMode[x].initialState;
            })
            .sort(function(a, b) {
                return a - b;
            });
    return cE(rB.ButtonGroup, null, sortedKeys.map(function(x, j) {
        var onSelect = function(ev, selectedKey) {
            if (selectedKey === 'HIGH') {
                AppActions.changePinValue(x, true);
            } else if (selectedKey === 'LOW') {
                AppActions.changePinValue(x, false);
            } else {
                throw new Error('Bug: Invalid Key' + selectedKey);
            }            
        };
        var color = (typeof pinOutputsValue[x] === 'boolean' ?
                     (pinOutputsValue[x] ? 'danger': 'primary') :
                     (pinMode[x].initialState.high ? 'danger': 'primary'));

        return cE(rB.DropdownButton, {
            onSelect: onSelect, bsStyle : color, title: x, id: 'dropdown-' + x,
            key:1212177*(j+1)
        }, ['HIGH', 'LOW'].map(function(value, i) {
            return cE(rB.MenuItem, {
                key:i*232131 + j*17,
                eventKey: value,
                href: null,
                target: value
            }, value);
        }));
    }));
};       

var renderFloating =  function(pinMode) {
    var sortedKeys = Object.keys(pinMode)
            .filter(function(x) {
                return (!pinMode[x].input && !pinMode[x].initialState); 
            }).sort(function(a, b) {
                return a - b;
            });
    return cE(rB.ButtonGroup, null, sortedKeys.map(function(x) {
        return cE(rB.Button, {disabled: true}, x);
    }));
};

var Pins = {
    handlePinNumber: function() {
        AppActions.setLocalState({
            pinNumber: this.refs.pinNumber.getValue()
        });
    },
    doPinMode : function(input, floating) {
        var pin = parseInt(this.refs.pinNumber.getValue());
        if (isNaN(pin)) {
            AppActions.setError(new Error('Invalid Pin Number:' +
                                          this.refs.pinNumber.getValue()));
        } else {
            AppActions.changePinMode(pin, input, floating || false);
        }
    },
    doInput: function() {
        this.doPinMode(true);
    },
    doOutput: function() {
        this.doPinMode(false, false);
    },
    doFloating: function() {
        this.doPinMode(false, true);
    },
    doDelete: function() {
        var pin = parseInt(this.refs.pinNumber.getValue());
        if (isNaN(pin)) {
            AppActions.setError(new Error('Invalid Pin Number:' +
                                          this.refs.pinNumber.getValue()));
        } else {
            AppActions.deletePin(pin);
        }
    },
    render: function() {
        return cE(rB.Grid, null,
                  cE(rB.Row, null,
                     cE(rB.Col, {sm:4, xs:4},
                        cE(rB.Input, {
                            type: 'text',
                            ref: 'pinNumber',
                            value: this.props.pinNumber,
                            onChange: this.handlePinNumber,
                            placeholder: 'Pin#'
                        })
                       ),
                     cE(rB.Col, {sm:8, xs:9},
                        cE(rB.ButtonGroup, null,
                           cE(rB.Button, {onClick: this.doInput},'Input'),
                              cE(rB.Button, {onClick: this.doOutput}, 'Output'),
                              cE(rB.Button, {onClick: this.doFloating},
                                 'Floating'),
                              cE(rB.Button, {onClick: this.doDelete,
                                             bsStyle: 'danger'}, 'Delete'))
                          )
                    ),
                   cE(rB.Row, null,
                      cE(rB.Col, {sm:4, xs:4}, 'Inputs'),
                      cE(rB.Col, {sm:8, xs:9},
                         renderInputs(this.props.pinMode,
                                      this.props.pinInputsValue))
                     ),
                   cE(rB.Row, null,
                      cE(rB.Col, {sm:4, xs:4}, 'Outputs'),
                      cE(rB.Col, {sm:8, xs:9},
                           renderOutputs(this.props.pinMode,
                                   this.props.pinOutputsValue))
                     ),
                   cE(rB.Row, null,
                      cE(rB.Col, {sm:4, xs:4}, 'Floating Outputs'),
                      cE(rB.Col, {sm:8, xs:9},
                         renderFloating(this.props.pinMode))
                     )
                 );
    }
};


module.exports = React.createClass(Pins);
