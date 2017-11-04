/*
    Async Node.js webserver w/ restify and node-mysql for RocketMap. 
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


    Everything has been stripped out and replaced with more efficient versions
    - Added support for HTTPS.
    - Added built-in dtrace support.
    - Reworked logging. More detailed options and better configurability.
    - Added request throttling: you can configure a maximum number of requests per second per IP (rate limit), and set an optional higher limit for when users should temporarily be allowed to go over the rate limit (burst limit).
 */

// Parse config.
require('dotenv').config();

const fs = require('fs');
const debug = require('debug')('devkat:master');
const cluster = require('cluster');
const utils = require('./inc/utils.js');
const db = require('./inc/db.js');
var shuttingDown = false; // Are we shutting down?
var online_workers = {}; // Status per worker PID.


/* Readability references. */

const fixWinSIGINT = utils.fixWinSIGINT;


/* Settings. */

const SERVER_NAME = process.env.SERVER_NAME || 'devkat RM Webserver';
const SERVER_VERSION = process.env.SERVER_VERSION || '2.0.0';
const HTTPS = process.env.ENABLE_HTTPS === 'true' || false;
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH || 'privkey.pem';
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH || 'cert.pem';
const GZIP = process.env.ENABLE_GZIP === 'true' || false;
const WEB_HOST = process.env.WEB_HOST || '0.0.0.0';
const WEB_PORT = parseInt(process.env.WEB_PORT) || 3000;
const WEB_WORKERS = parseInt(process.env.WEB_WORKERS) || require('os').cpus().length;
const ENABLE_LOAD_LIMITER = process.env.ENABLE_LOAD_LIMITER !== 'false' || false;
const ENABLE_LOAD_LIMITER_LOGGING = process.env.ENABLE_LOAD_LIMITER_LOGGING !== 'false' || false;
const MAX_LAG_MS = parseInt(process.env.MAX_LAG_MS) || 75;
const LAG_INTERVAL_MS = parseInt(process.env.LAG_INTERVAL_MS) || 500;
const ENABLE_CLUSTER = process.env.ENABLE_CLUSTER !== 'false' || false;
const AUTORESTART_WORKERS = process.env.AUTORESTART_WORKERS !== 'false' || false;
const ENABLE_THROTTLE = process.env.ENABLE_THROTTLE !== 'false' || false;
const THROTTLE_RATE = parseInt(process.env.THROTTLE_RATE) || 5;
const THROTTLE_BURST = parseInt(process.env.THROTTLE_BURST) || 10;


// If we're on Windows, fix the SIGINT event.
//fixWinSIGINT();

// If we're the cluster master, manage our processes.
if (ENABLE_CLUSTER && cluster.isMaster) {
    debug('Master cluster setting up %s workers...', WEB_WORKERS);

    for (let i = 0; i < WEB_WORKERS; i++) {
        cluster.fork();
    }

    // Worker is online, but not yet ready to handle requests.
    cluster.on('online', function (worker) {
        debug('Worker %s (PID %s) is starting...', worker.id, worker.process.pid);
    });

    // Worker is ded :(
    cluster.on('exit', function (worker, code, signal) {
        let id = worker.id;
        let pid = worker.process.pid;

        // Don't continue if we're shutting down.
        if (shuttingDown) {
            debug('Worker %s (PID %s) has exited.', worker.id, worker.process.pid);
            return;
        }

        // If the worker wasn't online yet, something happened during startup.
        if (!online_workers.hasOwnProperty(worker.process.pid)) {
            debug('Worker %s (PID %s) encountered an error on startup. Exiting.', id, pid);
            shuttingDown = true;

            // Graceful shutdown instead of process.exit().
            process.emit('SIGINT');
            return;
        }

        debug('Worker %s died with code %s, and signal %s.', pid, code, signal);
        if (AUTORESTART_WORKERS) debug('Starting a new worker.');

        // Start new worker if autorestart is enabled.
        if (AUTORESTART_WORKERS)
            cluster.fork();
    });

    // Worker disconnected, either on graceful shutdown or kill.
    cluster.on('disconnect', (worker) => {
        debug('Worker %s (PID %s) has disconnected.', worker.id, worker.process.pid);
    });

    // Receive messages from workers.
    cluster.on('message', (worker, msg, handle) => {
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
        debug('Gracefully closing server...');

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
        function waitUntilAllWorkersDied(workers, interval_ms, callback) {
            if (!allWorkersDied(workers)) {
                setTimeout(() => {
                    waitUntilAllWorkersDied(workers, interval_ms, callback);
                }, interval_ms);
            } else {
                // All dead! Yay!
                callback();
            }
        }

        waitUntilAllWorkersDied(cluster.workers, 500, () => {
            process.exit(0);
        });
    });
} else {
    // We're a worker, prepare to handle requests.
    const toobusy = require('toobusy-js');
    const restify = require('restify');
    const errors = require('restify-errors');
    const restifyPlugins = restify.plugins;

    // Webserver settings & optional HTTPS.
    const HTTP_OPTIONS = {
        name: SERVER_NAME,
		version: SERVER_VERSION
    };

    if (HTTPS) {
        HTTP_OPTIONS.key = fs.readFileSync(HTTPS_KEY_PATH);
        HTTP_OPTIONS.certificate = fs.readFileSync(HTTPS_CERT_PATH);
    }

    // Create our server.
    const server = restify.createServer(HTTP_OPTIONS);

    // Middleware.
    server.use(restifyPlugins.jsonBodyParser({ mapParams: true }));
    server.use(restifyPlugins.acceptParser(server.acceptable));
    server.use(restifyPlugins.queryParser({ mapParams: true }));
    server.use(restifyPlugins.fullResponse());

    if (GZIP) {
        server.use(restifyPlugins.gzipResponse());
    }

    if (ENABLE_THROTTLE) {
        debug('Throttle enabled: %d requests per second, %d burst.', THROTTLE_RATE, THROTTLE_BURST);
        server.use(restifyPlugins.throttle({
            rate: THROTTLE_RATE,
            burst: THROTTLE_BURST,
            ip: true
        }));
    }

    // Middleware which blocks requests when we're too busy.
    if (ENABLE_LOAD_LIMITER) {
        toobusy.maxLag(MAX_LAG_MS);
        toobusy.interval(LAG_INTERVAL_MS);

        debug('Enabled load limiter: ' + MAX_LAG_MS + 'ms limit, ' + LAG_INTERVAL_MS + ' ms check.');

        server.use(function (req, res, next) {
            if (toobusy()) {
                return next(new errors.ServiceUnavailableError());
            } else {
                return next();
            }
        });

        toobusy.onLag((currentLag) => {
            currentLag = Math.round(currentLag);

            if (ENABLE_LOAD_LIMITER_LOGGING) {
                debug('[%s] Event loop lag detected! Latency: %sms.', process.pid, currentLag);
            }
        });
    }


    /* App. */

    // Workers can share any TCP connection.
    server.listen(WEB_PORT, WEB_HOST, () => {
        // Connect to DB.
        db.connect(() => {
            // Attach routes.
            require('./routes')(server);

            // BEEP BOOP, R O B O T  I S  S E N T I E N T.
            if (ENABLE_CLUSTER) {
                debug('Worker %s (PID %s) is listening on %s.', cluster.worker.id, process.pid, server.url);

                // We're online. Let's tell our sensei (it's a "master" joke 👀).
                process.send({
                    'status': 'ONLINE',
                    'id': cluster.worker.id,
                    'pid': process.pid
                });
            } else {
                debug('Server (PID %s) is listening on %s.', process.pid, server.url);
            }
        });
    });


    /* Graceful worker shutdown. */
    function shutdownWorker() {
        if (ENABLE_LOAD_LIMITER) {
            // Calling .shutdown allows your process to exit normally.
            toobusy.shutdown();
        }
        
        server.close();

        if (ENABLE_CLUSTER) {
            debug('Gracefully closed worker %s (PID %s).', cluster.worker.id, process.pid);
        } else {
            debug('Gracefully closed server (PID %s).', process.pid);
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
