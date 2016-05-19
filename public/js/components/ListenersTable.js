var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;


var ListenersTable = {
    render: function() {
        var self = this;
        var listenerIds = Object.keys(this.props.listeners).sort();

        return cE(rB.Table, {striped: true, responsive: true,
                             bordered: true, condensed: true, hover: true},
                  cE('thead', {key:0},
                     cE('tr', {key:1}, [
                         cE('th', {key:2}, 'Id'),
                         cE('th', {key:3}, 'Topic'),
                         cE('th', {key:4}, 'Bundle'),
                         cE('th', {key:5}, 'Delay')
                     ])),
                  cE('tbody', {key:6},
                     listenerIds.map(function(x, i) {
                         // {topic:string, bundleName:string, offset:number}
                         var l = self.props.listeners[x];
                         var index = i+1;
                         var cols = [
                             cE('td', {key:403*index+1}, x),
                             cE('td', {key:403*index+2}, l.topic),
                             cE('td', {key:403*index+3}, l.bundleName),
                             cE('td', {key:403*index+4}, l.offset)
                         ];
                         return cE('tr', {key:403*index}, cols);
                     })
                    )
                 );
    }
};

module.exports = React.createClass(ListenersTable);
