/*
    Async Node.js webserver w/ Express.js, Handlebars templating and
    sequelize ORM for RocketMap. Supports gzip compression and load limiting
    w/ toobusy-js.

    TODO:
        - /raw_data.
            - Order sent items by distance to center of viewport, so even with
              a query limit, the client gets the items closest to its center.
            - Store initial viewpoint in memory.
        - Move existing RM templates to Handlebars.
        - Global blacklist.
        - Stats & mobile pages.
        - Search control.
        - Gym data.
        - Manual captcha solving.
 */

// Parse config.
require('dotenv').config();

// Log coloring.
require('manakin').global;

var toobusy = require('toobusy-js');
var express = require('express');
var exphbs = require('express-handlebars');
var compression = require('compression');
var app = express();

//var pokeList = require('./inc/container.js');


/* Settings. */

const DEBUG = process.env.DEBUG || false;
const GZIP = process.env.ENABLE_GZIP || false;
const WEB_PORT = process.env.PORT || 3000;


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
app.use(function(req, res, next) {
    if (toobusy()) {
        res.sendStatus(503);
    } else {
        next();
    }
});

toobusy.onLag(function(currentLag) {
    currentLag = Math.round(currentLag);
    console.error('Event loop lag detected! Latency: ' + currentLag + 'ms.');
});

// Routes.
//app.use(require('./routes/general.js'));
app.use(require('./routes/raw_data.js'));
//app.use(require('./routes/captcha.js'));


/* App. */

var server = app.listen(WEB_PORT, function() {
    console.success('Webserver listening on port ' + WEB_PORT + '!');
});


/* Graceful shutdown. */

process.on('SIGINT', function() {
    console.log('Gracefully closing server...');
    server.close();
    // Calling .shutdown allows your process to exit normally.
    toobusy.shutdown();
    process.exit();
});
