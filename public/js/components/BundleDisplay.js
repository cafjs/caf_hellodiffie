var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;


var BundleDisplay = {
    maxColumns : function() {
        var n = 0;
        this.props.content.forEach(function(x) {
            if (Array.isArray(x.args)) {
                n = (x.args.length > n ? x.args.length : n);
            }
        });
        return n;
    },

    renderRows : function() {
        var maxCol = this.maxColumns();
        var renderOneRow = function(index, command) {
            var cols = [cE('td', {key:100*index+1}, command.after),
                        cE('td', {key:100*index+2}, command.method)];
            for (var i=0; i<maxCol; i++) {
                if (i < command.args.length) {
                    cols.push(cE('td', {key:100*index+3+i},
                                 JSON.stringify(command.args[i])));
                } else {
                    cols.push(cE('td', {key:100*index+3+i}, '_'));
                }
            }
            return cE('tr', {key:10*index}, cols);
        };

        return this.props.content.map(function(x, i) {
            return renderOneRow(i+1, x);
        });
    },
    
    render: function() {
        if (this.props.content.length === 0) {
            return cE('div', null);
        } else {
            var maxCol = this.maxColumns();
            var cols = [ cE('th', {key:2}, 'Delay'),
                         cE('th', {key:3}, 'Method')];
            for (var i=0; i<maxCol; i++ ) {
                cols.push(cE('th', {key:4+i}, 'Arg_' + i));
            }
        
            return cE(rB.Table, {striped: true, responsive: true,
                                 bordered: true,
                                 condensed: true, hover: true},
                      cE('thead', {key:0}, cE('tr', {key:1}, cols)),
                      cE('tbody', {key:4+maxCol}, this.renderRows())
                     );
        }
    }
};


module.exports = React.createClass(BundleDisplay);
