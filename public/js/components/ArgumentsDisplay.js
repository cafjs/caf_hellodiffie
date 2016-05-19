var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;

var fromJSONString = function(raw) {
    try {
        return JSON.parse(raw);
    } catch(err) {
        // assumed an unquoted  string
        return raw;
    }
};

var toJSONString = function(value) {
    if (typeof value === 'string') {
        return value; 
    } else {
        try {
            return JSON.stringify(value);
        } catch (ex) {
            // undefined
            return value;
        }
    }
};

var ArgumentsDisplay = {
    render: function() {
        var self = this;
        var result = [];
        if (this.props.inProgress && this.props.inProgress.method) {
            var args = this.props.inProgress.args || [];
            var argsNames  =
                    this.props.bundleMethods[this.props.inProgress.method];
            if (Array.isArray(argsNames)) {
                result = argsNames.map(function(x, i) {
                    var handleArgument = function() {
                        var raw = self.refs['args_'+i].getValue();
                        self.props.onArgumentChange(i, fromJSONString(raw));
                    };
                    return cE(rB.Col, {sm:4, xs: 12, key: 993493 + i},
                              cE(rB.Input, {
                                  type: 'text',
                                  ref: 'args_' + i,
                                  label: x,
                                  value: toJSONString(args[i]),
                                  onChange: handleArgument
                              })
                             );
                });
            }
        }
        return  cE("div", null, result);
    }
};

module.exports = React.createClass(ArgumentsDisplay);
