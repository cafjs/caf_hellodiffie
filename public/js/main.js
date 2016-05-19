if (typeof window !== 'undefined') {
    var app = require('./app');
    // use app.js directly for server side rendering
    app.main();
};
