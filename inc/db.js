// Parse config.
require('dotenv').config();

const debug = require('debug')('devkat:db');
const mysql = require('mysql');
const utils = require('./utils.js');


/* Settings. */

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_DATABASE = process.env.DB_DATABASE || 'database';

const DB_POOL_MAX_SIZE = process.env.DB_POOL_MAX_SIZE || 10;


/* DB. */

const pool = mysql.createPool({
    'host': DB_HOST,
    'port': DB_PORT,
    'user': DB_USER,
    'password': DB_PASS,
    'database': DB_DATABASE,
    'connectionLimit': DB_POOL_MAX_SIZE,
    'timezone': '+00:00'
});


/**
 * Connection to the local MySQL database.
 * 
 * @param {function} callback Gets called with the error and DB pool as parameters.
 * Error parameter is null if the connection succeeded.
 */
function connect(callback) {
    debug('[%s] Connecting to db on %s:%s...', process.pid, DB_HOST, DB_PORT);

    pool.getConnection(function (err, connection) {
        // Something happened.
        if (err) {
            debug('[%s] Error connecting to db on %s:%s.', process.pid, DB_HOST, DB_PORT, err);
            return callback(err, null);
        }

        // Connected!
        debug('[%s] Connected to db on %s:%s...', process.pid, DB_HOST, DB_PORT);
        connection.release();
        return callback(null, pool);
    });
}

module.exports = {
    'pool': pool,
    'connect': connect
};