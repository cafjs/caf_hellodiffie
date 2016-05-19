var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;

var BundleEditorDropdown = {
    render: function() {
        var self = this;
        var bundleMethodsKeys = Object.keys(this.props.bundleMethods || {});
        return cE(rB.DropdownButton, {
            id : 'action-dropdown-bundle',
            key: 323232,
            title: 'Actions'            
        }, bundleMethodsKeys.map(function(x, i) {
            return cE(rB.MenuItem, {
                onSelect: self.props.onSelect,
                key:i*232131,
                eventKey: x
            }, cE('p', null, x));
        }));
    }
};

module.exports = React.createClass(BundleEditorDropdown);
