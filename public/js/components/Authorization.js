var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');


var isDelegate = function(principal, autho) {
    return autho.delegate[principal];
};

var isAuthorized = function(principal, autho) {
    return autho.authorized[principal];
};

var Authorization = {

    doAllow: function(ev) {
        if (this.props.principalId) {
            AppActions.authorize(this.props.principalId);
        } else {
            AppActions.setError(new Error('Missing principal name'));
        }
    },

    doDelegate: function(ev) {
        if (this.props.principalId) {
            AppActions.link(this.props.principalId);
        } else {
            AppActions.setError(new Error('Missing principal name'));
        }
    },

    doDelete: function(ev) {
        if (this.props.principalId) {
            if (isDelegate(this.props.principalId, this.props.autho)) {
                AppActions.unlink(this.props.principalId);
            } else if (isAuthorized(this.props.principalId, this.props.autho)) {
                AppActions.unauthorize(this.props.principalId);
            } else {
                AppActions.setError(new Error('Unknown principal ID' +
                                              this.props.principalId));
            }
        } else {
            AppActions.setError(new Error('Missing principal ID'));
        }
    },


    handlePrincipalId : function() {
        AppActions.setLocalState({
            principalId: this.refs.principalId.getValue()
        });
    },


    render : function() {
        var isReadOnly = (this.props.isManager ? false : true);
        var delegates =  Object.keys(this.props.autho.delegate).sort();
        var authorizes  =  Object.keys(this.props.autho.authorized)
                .filter(function(x) { return (x.indexOf('__') !== 0);})
                .sort();

        return cE(rB.Grid, null,
                  cE(rB.Row, null,
                     cE(rB.Col, {sm:6, xs:12},
                        cE(rB.Input, {
                            type: 'text',
                            ref: 'principalId',
                            value: this.props.principalId,
                            readOnly: isReadOnly,
                            onChange: this.handlePrincipalId,
                            placeholder: 'Principal name'
                        })
                       ),
                     cE(rB.Col, {sm:4, xs:12},
                        cE(rB.ButtonGroup, null,
                           cE(rB.Button, {onClick: this.doAllow, key:3989,
                                          disabled: isReadOnly}, 'Allow'),
                           cE(rB.Button, {onClick: this.doDelegate, key:3991,
                                          disabled: isReadOnly}, 'Delegate'),
                           cE(rB.Button, {onClick: this.doDelete, key:3993,
                                          bsStyle : 'danger',
                                          disabled: isReadOnly}, 'Delete')
                          )
                       )
                    ),
                  cE(rB.Row, null,
                     cE(rB.Col, {sm:12, xs:12},
                        cE(rB.Table, {striped: true, responsive: true,
                                      bordered: true, condensed: true,
                                      hover: true},
                           cE('thead', {key:0},
                              cE('tr', {key:1}, [
                                  cE('th', {key:2}, 'Principal'),
                                  cE('th', {key:3}, 'Type')
                              ])),
                           cE('tbody', {key:6},
                              authorizes.map(function(x, i) {
                                  var index = i+1;
                                  var cols = [
                                      cE('td', {key:903*index+1}, x),
                                      cE('td', {key:903*index+2}, 'ALLOW')
                                  ];
                                  return cE('tr', {key:703*index}, cols);
                              }).concat(
                                  delegates.map(function(x, i) {
                                      var index = i+1;
                                      var cols = [
                                          cE('td', {key:703*index+1}, x),
                                          cE('td', {key:703*index+2},
                                             'DELEGATE')
                                      ];
                                      return cE('tr', {key:703*index}, cols);
                                  })
                              )
                             )
                          )
                       )
                    )
                 );
    }
};


module.exports = React.createClass(Authorization);
