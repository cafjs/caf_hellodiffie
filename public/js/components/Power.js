var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;

var Power = {
    render: function() {
        return cE("div", {}, Object.keys(this.props.power) || 'nothing' );
    }
};


module.exports = React.createClass(Power);
