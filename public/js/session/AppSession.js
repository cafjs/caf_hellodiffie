var cli = require('caf_cli');
if (typeof window === 'undefined') {
    // server side rendering
    module.exports = {};
} else {
    module.exports = new cli.Session(window.location.href);
}
