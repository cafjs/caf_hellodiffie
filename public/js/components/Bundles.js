var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var BundleEditor = require('./BundleEditor');
var AppActions = require('../actions/AppActions');


var Bundles = {

    doEdit: function(ev) {
        if (this.props.bundleId) {
            AppActions.setLocalState({
                bundleEditor : {
                    id: this.props.bundleId,
                    content: []
                }
            });
        } else {
            AppActions.setError(new Error('Invalid bundle ID'));
        }
    },

    doDelete: function(ev) {
        AppActions.removeBundle(this.props.bundleId);
    },

    handleBundleId : function() {
        AppActions.setLocalState({
            bundleId: this.refs.bundleId.getValue()
        });
    },

    launchEditor : function(ev) {
        if (ev.key === 'Enter') {
            this.handleBundleId();
            this.doEdit();
        }
    },
    
    render: function() {
        var self = this;
        var bundleIds = Object.keys(this.props.bundles).sort();
        return cE("div", {className: "container-fluid"},
                  cE(BundleEditor, {
                      bundleMethods: this.props.bundleMethods,
                      bundleEditor: this.props.bundleEditor,
                      bundles: this.props.bundles
                  }),
                  cE(rB.Grid, null,
                     cE(rB.Row, null,
                        cE(rB.Col, {sm:4, xs:12},
                           cE(rB.Input, {
                               type: 'text',
                               ref: 'bundleId',
//                               label: 'Bundle Id',
                               value: this.props.bundleId,
                               onChange: this.handleBundleId,
                               onKeyDown: this.launchEditor,
                               placeholder: 'Bundle Id'
                           })
                          ),
                        cE(rB.Col, {sm:4, xs:12},
                           cE(rB.ButtonGroup, null,
                              cE(rB.Button, {onClick: this.doEdit, key:9989},
                                 'Edit'),
                              cE(rB.Button, {onClick: this.doDelete, key:9991,
                                             bsStyle : 'danger'}, 'Delete'))
                          )
                       ),
                     cE(rB.Row, null,
                        cE(rB.Col, {sm:12, xs:12},
                            cE(rB.Table, {striped: true, responsive: true,
                                          bordered: true,
                                          condensed: true, hover: true},
                               cE('thead', {key:0},
                                  cE('tr', {key:1}, [
                                      cE('th', {key:2}, 'Id'),
                                      cE('th', {key:3}, 'Commands')])),
                               cE('tbody', {key:4},
                                  bundleIds.map(function(x, i) {
                                      var b = JSON.parse(self.props.bundles[x]);
                                      var com = JSON.stringify(b.commands);
                                      var cols = [cE('td', {key:103*i+1}, x),
                                                  cE('td', {key:103*i+2}, com)];
                                      return cE('tr', {key:103*i}, cols);
                                  })
                                 )
                              )
                          )
                       )
                    )
                 );
    }
};


module.exports = React.createClass(Bundles);
