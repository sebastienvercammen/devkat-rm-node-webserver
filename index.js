/*
    Async Node.js webserver w/ Express.js, Handlebars templating and
    sequelize ORM for RocketMap. Supports gzip compression and load limiting
    w/ toobusy-js.
    
    TODO:
        - /raw_data.
        - Move existing RM templates to Handlebars.
        - Global blacklist.
        - Stats & mobile pages.
        - Search control.
        - Gym data.
        - Manual captcha solving.
 */

require('dotenv').config();

var toobusy = require('toobusy-js');
var express = require('express');
var exphbs = require('express-handlebars');
var compression = require('compression');
var app = express();


/* Settings. */

const DEBUG = process.env.DEBUG || false;
const GZIP = process.env.ENABLE_GZIP || false;


/* Routing. */

// Express.js.
app.use(express.static('public'));
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');
app.enable('view cache');

// Optionally enable gzip compression.
if (GZIP) {
    app.use(compression());
}

// Middleware which blocks requests when we're too busy.
app.use(function (req, res, next) {
    if (toobusy()) {
        res.sendStatus(503);
    } else {
        next();
    }
});

toobusy.onLag(function (currentLag) {
    console.log('Event loop lag detected! Latency: ' + currentLag + 'ms');
});

// Routes.
app.use(require('./routes/general.js'));
app.use(require('./routes/raw_data.js'));
app.use(require('./routes/captcha.js'));


/* App. */

var server = app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});


/* Graceful shutdown. */

process.on('SIGINT', function () {
    server.close();
    // Calling .shutdown allows your process to exit normally.
    toobusy.shutdown();
    process.exit();
});
