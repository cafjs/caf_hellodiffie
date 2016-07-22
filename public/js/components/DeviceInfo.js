var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;

 //  'scanned'  type Object<name:string, address:string>
var scannedTable = function(scanned) {
    var cols = [ cE('th', {key:9992}, 'Name'),
                 cE('th', {key:9993}, 'Address')];
    var renderRows = function() {
        var all = Object.keys(scanned).sort();
        return all.map(function(x, i) {
            var innerCols = [
                cE('td', {key:100*(i+1) + 1}, x),
                cE('td', {key:100*(i+1) + 2}, scanned[x])
            ];
            return cE('tr', {key:100*(i+1)}, innerCols);
        });
    };

    return  cE(rB.Panel, {header: "Devices"},
               cE(rB.Table, {striped: true, responsive: true,
                             bordered: true,
                             condensed: true, hover: true},
                  cE('thead', {key:9990}, cE('tr', {key:9991}, cols)),
                  cE('tbody', {key:9994}, renderRows())
                 )
              );
};

//   'bindings' type Object<name:string,true>
var bindingsTable = function(bindings) {
    var cols = [ cE('th', {key:2}, 'Name'),
                 cE('th', {key:3}, 'Status')];
    var renderRows = function() {
        var all = Object.keys(bindings).sort();

        return all.map(function(x, i) {
            var innerCols = [
                cE('td', {key:10*(i+1) + 1}, x),
                cE('td', {key:10*(i+1) + 2}, cE(rB.Glyphicon, {
                    glyph: 'check',
                    className:'text-success'
                }))
            ];
            return cE('tr', {key:10*(i+1) }, innerCols);
        });
    };

    return  cE(rB.Panel, {header: "Pairings"},
               cE(rB.Table, {striped: true, responsive: true,
                             bordered: true,
                             condensed: true, hover: true},
                  cE('thead', {key:0}, cE('tr', {key:1}, cols)),
                  cE('tbody', {key:4}, renderRows())
                 )
              );
};

// 'connections' type is Array.<string>
var connectionsTable = function(connections) {
    var cols = [ cE('th', {key:2}, 'Address'),
                 cE('th', {key:3}, 'Status')];
    var renderRows = function() {
        var all = connections.sort();
        return all.map(function(x, i) {
            var innerCols = [
                cE('td', {key:10*(i+1) + 1}, x),
                cE('td', {key:10*(i+1) + 2}, cE(rB.Glyphicon, {
                    glyph: 'check',
                    className:'text-success'
                }))
            ];
            return cE('tr', {key:10*(i+1) }, innerCols);
        });
    };

    return  cE(rB.Panel, {header: "Connections"},
               cE(rB.Table, {striped: true, responsive: true,
                             bordered: true,
                             condensed: true, hover: true},
                  cE('thead', {key:0}, cE('tr', {key:1}, cols)),
                  cE('tbody', {key:4}, renderRows())
                 )
              );

};


var DeviceInfo = {
    // props.deviceInfo.pendingBinding: {name: string, info : {key: string,
    //                                                address: string}}
    render : function() {
        return  (this.props.isManager ?
                 cE('div', null) :
                 cE(rB.Panel, {header: "Bluetooth"},
                    (this.props.deviceInfo.pendingBinding ?
                     cE(rB.Panel, {header: "Pending binding with " +
                                   this.props.deviceInfo.pendingBinding.name},
                        this.props.deviceInfo.pendingBinding
                        .info.key.slice(0, 8) + '...') :
                     cE('div', null)
                    ),
                    scannedTable(this.props.deviceInfo.scanned || {}),
                    bindingsTable(this.props.deviceInfo.bindings || {}),
                    connectionsTable(this.props.deviceInfo.connections || [])
                   )
                );
    }
};

module.exports = React.createClass(DeviceInfo);
