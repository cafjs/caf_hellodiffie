var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');
var BundleEditorDropdown = require('./BundleEditorDropdown');
var ArgumentsDisplay = require('./ArgumentsDisplay');
var BundleDisplay = require('./BundleDisplay');
var bundles = require('caf_iot').bundles;

var BundleEditor = {

    /*
     * bundleEditor type:
     * {id: string, content : Array.<command>, inProgress : command}
     *
     *  where command type is:
     * {after : number, method : string, args: Array.<JSONSerializable>}
     *
     * and `inProgress` is a partially edited command.
     */
    doDismissEditor: function(ev) {
        AppActions.setLocalState({
            bundleEditor : null
        });
    },

    doUpdate : function(ev) {
        var bundle = bundles.newInstance(this.props.bundleMethods);
        this.props.bundleEditor.content.forEach(function(x) {
            bundle[x.method](x.after, x.args);
        });
        var bundleStr = bundle.__iot_freeze__().__iot_serialize__();
        AppActions.addBundle(this.props.bundleEditor.id, bundleStr);
        this.doDismissEditor(ev);
    },

    doAddCommand : function(ev) {
        var editor = this.props.bundleEditor;
        if (editor && editor.inProgress &&
            (typeof editor.inProgress.after === 'number') &&
            (typeof editor.inProgress.method === 'string') &&
            (Array.isArray(editor.inProgress.args)) &&
            (editor.inProgress.args.length === this.props
             .bundleMethods[editor.inProgress.method].length)) {
            var newContent = (editor.content || []).concat(editor.inProgress);
            AppActions.setLocalState({
                bundleEditor : {
                    content: newContent,
                    id: editor.id,
                    inProgress : null
                }
            });
        } else {
            console.log('Invalid command');
            AppActions.setError(new Error('Invalid command'));
        }
    },

    handleSelect : function(ev, eventKey) {
        if (typeof eventKey === 'string') {
            var bundleMethods = this.props.bundleMethods || {};
            var args = bundleMethods[eventKey];
            if (args) {
                AppActions.setLocalState({
                    bundleEditor : {
                        content: this.props.bundleEditor.content,
                        id: this.props.bundleEditor.id,
                        inProgress : {
                            after: null,
                            method : eventKey,
                            args: []
                        }
                    }
                });
            } else {
                var msg = 'Invalid bundle method for ' + eventKey;
                console.log(msg);
                AppActions.setError(new Error(msg));
            }            
        } else {
            var errMsg = 'Invalid eventKey:' + eventKey;
            console.log(errMsg);
            AppActions.setError(new Error(errMsg));
        }
    },

    handleCommandDelay : function(ev) {
        var editor = this.props.bundleEditor;
        var delay = parseInt(this.refs.commandDelay.getValue());
        if (!isNaN(delay)) {
            var inProgress = editor.inProgress || {};
            inProgress.after = delay;
            AppActions.setLocalState({
                bundleEditor : {
                    content: editor.content,
                    id: editor.id,
                    inProgress : inProgress
                }
            });
        } else {
            var errMsg = 'Invalid delay:' + this.refs.commandDelay.getValue();
            console.log(errMsg);
            AppActions.setError(new Error(errMsg));
        }
    },

    handleArgument: function(index, value) {
        var editor = this.props.bundleEditor;
        var inProgress = editor.inProgress || {};
        inProgress.args =  inProgress.args || [];
        inProgress.args[index] = value;
        AppActions.setLocalState({
            bundleEditor : {
                content: editor.content,
                id: editor.id,
                inProgress : inProgress
            }
        });
    },
    
    render : function() {
        var editor = this.props.bundleEditor;
        return cE(rB.Modal,{show: editor && true,
                            onHide: this.doDismissEditor,
                            animation: false},
                  cE(rB.Modal.Header, {
                      className : "bg-warning text-warning",
                      closeButton: true},
                     cE(rB.Modal.Title, null, "Editing bundle " +
                        (editor && editor.id || ''))
                    ),
                  cE(rB.ModalBody, null,
                     cE(rB.Row, null,
                        cE(rB.Col, {sm:4, xs:6},
                           cE(BundleEditorDropdown, {
                               bundleMethods: this.props.bundleMethods,
                               onSelect: this.handleSelect
                           }))
                       ),
                     cE(rB.Row, null,
                        cE(ArgumentsDisplay, {
                            onArgumentChange: this.handleArgument,
                            inProgress: editor && editor.inProgress,
                            bundleMethods: this.props.bundleMethods
                        })
                       ),
                     cE(rB.Row, null,
                        cE(rB.Col, {sm:4, xs: 12},
                           cE(rB.Input, {
                               type: 'text',
                               ref: 'commandDelay',
                               //  label: 'Delay-msec',
                               value: editor && editor.inProgress &&
                                   editor.inProgress.after,
                               onChange: this.handleCommandDelay,
                               placeholder: 'Delay-msec'
                           })
                          ),
                        cE(rB.Col, {sm:4, xs:6},
                           cE(rB.Button, {onClick: this.doAddCommand}, "Add")
                          )                        
                       ),
                     cE(BundleDisplay, {
                         id :  editor && editor.id || null,
                         content :  editor && editor.content || [],
                         bundleMethods: this.props.bundleMethods
                     })                    
                    ),
                  cE(rB.Modal.Footer, null,
                     cE(rB.Button, {onClick: this.doUpdate}, "Done"),
                     cE(rB.Button, {onClick: this.doDismissEditor}, "Cancel")
                    )
                 );
    }
};

module.exports = React.createClass(BundleEditor);
