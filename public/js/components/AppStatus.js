var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;

var AppStatus = {
    render : function() {
        var color = (this.props.isClosed ? 'text-danger' : 'text-success');
        return cE(rB.Glyphicon, {glyph: 'heart', className: color});
    }
};

module.exports = React.createClass(AppStatus);
