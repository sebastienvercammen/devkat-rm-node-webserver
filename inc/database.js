// Parse config.
require('dotenv').config();

// Log coloring.
require('manakin').global;

var Sequelize = require('sequelize');
var utils = require('./utils.js');


/* Settings. */

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_DATABASE = process.env.DB_DATABASE || 'db_name';

const DB_POOL_MIN_SIZE = process.env.DB_POOL_MIN_SIZE || 0;
const DB_POOL_MAX_SIZE = process.env.DB_POOL_MAX_SIZE || 5;

const DB_MAX_IDLE_TIME = process.env.DB_MAX_IDLE_TIME || 10000;
const DB_FILE_PATH = process.env.DB_FILE_PATH || 'pogom.db';


/* App. */

console.log('Connecting to database on ' + DB_HOST + ': ' + DB_PORT + '...');

var sequelize = new Sequelize(DB_DATABASE, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_TYPE,

    pool: {
        min: DB_POOL_MIN_SIZE,
        max: DB_POOL_MAX_SIZE,
        idle: DB_MAX_IDLE_TIME
    },

    // SQLite only.
    storage: DB_FILE_PATH
});

console.log('Testing database connection...');

sequelize.authenticate().catch(utils.handle_error);


/* Exports. */

module.exports.getInstance = function() {
    return sequelize;
};
