var React = require('react');
var rB = require('react-bootstrap');
var cE = React.createElement;
var AppActions = require('../actions/AppActions');

var ListenerEditor = {
    cloneProps: function() {
        var editor = this.props.listenerEditor;
        return {
            listenerEditor : {
                topic: editor.topic,
                delay : editor.delay,
                bundle : editor.bundle
                
            }
        };
    },
    
    handleTopic: function() {
        var newEditor = this.cloneProps();
        newEditor.listenerEditor.topic = this.refs.topic.getValue();
        AppActions.setLocalState(newEditor);        
    },
    
    handleDelay: function() {
        var newEditor = this.cloneProps();
        newEditor.listenerEditor.delay = this.refs.delay.getValue();
        AppActions.setLocalState(newEditor);        
    },
    
    handleBundle: function() {
        var newEditor = this.cloneProps();
        newEditor.listenerEditor.bundle = this.refs.bundle.getValue();
        AppActions.setLocalState(newEditor);        
    },

    doDismissEditor: function(ev) {
        AppActions.setLocalState({
            listenerEditor : null
        });
    },

    doUpdate : function(ev) {
        var editor = this.props.listenerEditor;
        if (!editor.topic) {
            AppActions.setError(new Error('Missing topic'));
            return;
        }

        var delay = parseInt(editor.delay);
        if (isNaN(delay)) {
            AppActions.setError(new Error('Invalid delay ' + editor.delay));
            return;
        }

        if (editor.bundle && this.props.bundles[editor.bundle]) {
            AppActions.addListener(this.props.listenerId, editor.topic,
                                   editor.bundle, delay);
            this.doDismissEditor(ev);
        } else {
            AppActions.setError(new Error('Invalid bundle ' + editor.bundle));
        }
    },

    render : function() {
        var editor = this.props.listenerEditor;
        return cE(rB.Modal,{show: editor && true,
                            onHide: this.doDismissEditor,
                            animation: false},
                  cE(rB.Modal.Header, {
                      className : "bg-warning text-warning",
                      closeButton: true},
                     cE(rB.Modal.Title, null, "Editing listener " +
                        (editor && this.props.listenerId || ''))
                    ),
                  cE(rB.ModalBody, null,
                     cE(rB.Row, null,
                        cE(rB.Col, {sm:4, xs: 12},
                           cE(rB.Input, {
                               type: 'text',
                               ref: 'topic',
                               value: editor && editor.topic,
                               onChange: this.handleTopic,
                               placeholder: 'Event topic'
                           })
                          ),
                        cE(rB.Col, {sm:4, xs: 12},
                           cE(rB.Input, {
                               type: 'text',
                               ref: 'delay',
                               value: editor && editor.delay,
                               onChange: this.handleDelay,
                               placeholder: '-1 or Delay-msec'
                           })
                          ),
                        cE(rB.Col, {sm:4, xs: 12},
                           cE(rB.Input, {
                               type: 'text',
                               ref: 'bundle',
                               value: editor && editor.bundle,
                               onChange: this.handleBundle,
                               placeholder: 'Bundle ID'
                           })
                          )
                       )
                    ),
                  cE(rB.Modal.Footer, null,
                     cE(rB.Button, {onClick: this.doUpdate}, "Done"),
                     cE(rB.Button, {onClick: this.doDismissEditor}, "Cancel")
                    )
                 );
    }
};

module.exports = React.createClass(ListenerEditor);
