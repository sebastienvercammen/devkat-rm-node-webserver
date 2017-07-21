// Parse config.
require('dotenv').config();

// Imports.
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const utils = require('../inc/utils.js');

// Log coloring.
var con = require('manakin').global;
con.setBright();


/* Settings. */

const VERBOSE = process.env.VERBOSE === 'true' || false;

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

var db = {};

console.log('[%s] Connecting to database on %s:%s...', process.pid, DB_HOST, DB_PORT);

var sequelize = new Sequelize(DB_DATABASE, DB_USER, DB_PASS, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: DB_TYPE,
    logging: (VERBOSE) ? console.log : false,

    pool: {
        min: DB_POOL_MIN_SIZE,
        max: DB_POOL_MAX_SIZE,
        idle: DB_MAX_IDLE_TIME
    },

    // SQLite only.
    storage: DB_FILE_PATH
});

console.log('[%s] Testing database connection...', process.pid);
sequelize.authenticate().catch(utils.handle_error);


/* Model imports & associations. */
fs.readdirSync(__dirname)
    .filter(function (file) {
        return (file.indexOf(".") !== 0) && (file !== "index.js");
    })
    .forEach(function (file) {
        var model = sequelize.import(path.join(__dirname, file));
        db[model.name] = model;
    });

Object.keys(db).forEach(function (modelName) {
    if (db[modelName].hasOwnProperty('associate')) {
        db[modelName].associate(db);
    }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;


/* Exports. */

module.exports = db;
