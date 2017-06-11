/*
    Async Node.js webserver w/ Express.js, sequelize ORM for RocketMap. 
    Supports gzip compression, load limiting w/ toobusy-js and multiprocessing
    with cluster.

    TODO:
        - /raw_data.
            - Send scanned location data.
            - Store initial viewpoint in memory.
            - Stream results in chunks. Needs frontend JS rework.
        - Global blacklist.
        - Search control.
        - Manual captcha solving.
 */

// Parse config.
require('dotenv').config();

// Log coloring.
var con = require('manakin').global;
con.setBright();

var cluster = require('cluster');
var utils = require('./inc/utils.js');
var shuttingDown = false; // Are we shutting down?
var online_workers = {}; // Status per worker PID.


/* Readability references. */
const fixWinSIGINT = utils.fixWinSIGINT;


/* Settings. */

const DEBUG = process.env.DEBUG === 'true' || false;
const GZIP = process.env.ENABLE_GZIP === 'true' || false;
const WEB_HOST = process.env.WEB_HOST || '0.0.0.0';
const WEB_PORT = parseInt(process.env.WEB_PORT) || 3000;
const WEB_WORKERS = parseInt(process.env.WEB_WORKERS) || require('os').cpus().length;
const ENABLE_CLUSTER = process.env.ENABLE_CLUSTER !== 'false' || false;
const AUTORESTART_WORKERS = process.env.AUTORESTART_WORKERS !== 'false' || false;


// If we're on Windows, fix the SIGINT event.
fixWinSIGINT();

// If we're the cluster master, manage our processes.
if (ENABLE_CLUSTER && cluster.isMaster) {
    if (DEBUG) {
        console.log('Master cluster setting up %s workers...', WEB_WORKERS);
    }

    for (let i = 0; i < WEB_WORKERS; i++) {
        cluster.fork();
    }

    // Worker is online, but not yet ready to handle requests.
    cluster.on('online', function(worker) {
        if (DEBUG) {
            console.log('Worker %s (PID %s) is starting...', worker.id, worker.process.pid);
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
            
            if (AUTORESTART_WORKERS)
                console.log('Starting a new worker.');
        }
        
        // Start new worker if autorestart is enabled.
        if (AUTORESTART_WORKERS)
            cluster.fork();
    });

    // Worker disconnected, either on graceful shutdown or kill.
    cluster.on('disconnect', function workerDisconnected(worker) {
        if (DEBUG) {
            console.log('Worker %s (PID %s) has disconnected.', worker.id, worker.process.pid);
        }
    });

    // Receive messages from workers.
    cluster.on('message', function workerMsg(worker, msg, handle) {
        var status = msg.status;
        var id = msg.id;
        var pid = msg.pid;

        // Worker had a successful startup.
        if (status === 'ONLINE') {
            online_workers[pid] = status;
        }
    });

    /* Graceful shutdown. */

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
            process.exit(0);
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

    app.use(require('./routes/raw_data.js'));
    //app.use(require('./routes/captcha.js'));

    /* App. */

    // Workers can share any TCP connection.
    var server = app.listen(WEB_PORT, WEB_HOST, function() {
        if (DEBUG) {
            if (ENABLE_CLUSTER) {
                console.success('Worker %s (PID %s) is listening on %s:%s.', cluster.worker.id, process.pid, WEB_HOST, WEB_PORT);
            } else {
                console.success('Server (PID %s) is listening on %s:%s.', process.pid, WEB_HOST, WEB_PORT);
            }
        }
        
        if (ENABLE_CLUSTER) {
            // We're online. Let's tell our master.
            process.send({
                'status': 'ONLINE',
                'id': cluster.worker.id,
                'pid': process.pid
            });
        }
    });


    /* Graceful worker shutdown. */
    function shutdownWorker() {
        // Calling .shutdown allows your process to exit normally.
        toobusy.shutdown();
        server.close();
        
        if (ENABLE_CLUSTER) {
            console.success('Gracefully closed worker %s (PID %s).', cluster.worker.id, process.pid);
        } else {
            console.success('Gracefully closed server (PID %s).', process.pid);
        }
        
        process.exit(0);
    }
    
    process.on('message', function workerMsg(msg) {
        if (msg === 'shutdown') {
            shutdownWorker();
        }
    });
    
    // Handle graceful shutdown if we're not using cluster/process management.
    process.on('SIGINT', function gracefulWorker() {
        shutdownWorker();
    });
}
