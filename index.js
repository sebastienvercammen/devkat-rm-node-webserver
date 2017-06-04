/*
    Async Node.js webserver w/ Express.js, Handlebars templating and
    sequelize ORM for RocketMap. Supports gzip compression, load limiting
    w/ toobusy-js and multiprocessing with cluster.

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
var con = require('manakin').global;
con.setBright();

var cluster = require('cluster');
var shuttingDown = false; // Are we shutting down?
var online_workers = {}; // Status per worker PID.

//var pokeList = require('./inc/container.js');


/* Settings. */

const DEBUG = process.env.DEBUG || false;
const GZIP = process.env.ENABLE_GZIP || false;
const WEB_PORT = process.env.PORT || 3000;


// If we're the cluster master, manage our processes.
if (cluster.isMaster) {
    let numWorkers = require('os').cpus().length;

    if (DEBUG) {
        console.log('Master cluster setting up %s workers...', numWorkers);
    }

    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    // Worker is online, but not yet ready to handle requests.
    cluster.on('online', function(worker) {
        if (DEBUG) {
            console.success('Worker %s (PID %s) is starting...', worker.id, worker.process.pid);
        }
    });

    // Worker is ded :(
    cluster.on('exit', function(worker, code, signal) {
        let id = worker.id;
        let pid = worker.process.pid;

        // Don't continue if we're shutting down.
        if (shuttingDown) {
            console.success('Worker %s (PID %s) has exited.', worker.id, worker.process.pid);
            return;
        }

        // If the worker wasn't online yet, something happened during startup.
        if (!online_workers.hasOwnProperty(worker.process.pid)) {
            if (DEBUG) {
                console.error('Worker %s (PID %s) encountered an error on startup. Exiting.', id, pid);
            }
            shuttingDown = true;

            // Graceful shutdown instead of process.exit().
            process.emit('SIGINT');
            return;
        }

        if (DEBUG) {
            console.error('Worker %s died with code %s, and signal %s.', pid, code, signal);
            console.log('Starting a new worker.');
        }
        cluster.fork();
    });

    // Worker disconnected, either on graceful shutdown or kill.
    cluster.on('disconnect', function workerDisconnected(worker) {
        if (DEBUG) {
            console.log('Worker %s (PID %s) has disconnected.', worker.id, worker.process.pid);
        }
    });

    // Receive messages from workers.
    process.on('message', function workerMsg(msg) {
        let status = msg.status;
        let id = msg.id;
        let pid = msg.pid;

        // Worker had a successful startup.
        if (status === 'ONLINE') {
            if (DEBUG) {
                console.success('Worker %s (PID %s) is online.', id, pid);
            }

            online_workers[pid] = status;
        }
    });

    /* Graceful shutdown. */

    // If we're on Windows, fix the SIGINT event.
    if (process.platform === 'win32') {
        require('readline')
            .createInterface({
                input: process.stdin,
                output: process.stdout
            })
            .on('SIGINT', function() {
                process.emit('SIGINT');
            });
    }

    process.on('SIGINT', function graceful() {
        shuttingDown = true;
        if (DEBUG) {
            console.log('Gracefully closing server...');
        }

        // Kill all workers, but let them kill themselves because otherwise they
        // might not be ready listening, and you end up with EPIPE errors.
        for (var id in cluster.workers) {
            let worker = cluster.workers[id];

            // Disconnected workers will exit themselves.
            if (worker.isConnected()) {
                worker.send('shutdown');
                worker.disconnect();
            }
        }

        // Make sure all workers have exited.
        function allWorkersDied(workers) {
            for (var id in workers) {
                let worker = workers[id];
                if (!worker.isDead()) return false;
            }

            return true;
        }

        // Run code when all workers are dead w/o starving CPU.
        function waitUntilAllWorkersDied(workers, interval, callback) {
            if (!allWorkersDied(workers)) {
                setTimeout(function() {
                    waitUntilAllWorkersDied(workers, interval, callback);
                }, interval);
            } else {
                // All dead! Yay!
                callback();
            }
        }

        waitUntilAllWorkersDied(cluster.workers, 500, function allDead() {
            if (DEBUG) {
                console.log('All workers have exited.');
            }

            process.exit();
        });
    });
} else {
    // We're a worker, prepare to handle requests.
    let toobusy = require('toobusy-js');
    let express = require('express');
    let exphbs = require('express-handlebars');
    let compression = require('compression');
    let app = express();

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

        if (DEBUG) {
            console.error('[%s] Event loop lag detected! Latency: %sms.', process.pid, currentLag);
        }
    });

    // Routes.

    //app.use(require('./routes/general.js'));
    app.use(require('./routes/raw_data.js'));
    //app.use(require('./routes/captcha.js'));

    /* App. */

    // Workers can share any TCP connection.
    var server = app.listen(WEB_PORT, function() {
        if (DEBUG) {
            console.success('Worker %s (PID %s) is listening on port %s.', cluster.worker.id, process.pid, WEB_PORT);
        }
    });


    /* Graceful worker shutdown. */
    process.on('message', function workerMsg(msg) {
        if (msg === 'shutdown') {
            console.log('beep %s', cluster.worker.id);
            // Calling .shutdown allows your process to exit normally.
            toobusy.shutdown();
            server.close();
            process.exit(0);
        }
    });
}
