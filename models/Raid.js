'use strict';

// Parse config.
require('dotenv').config();


/* Includes. */

const db = require('../inc/db.js').pool;


/* Helpers. */

// Make sure SQL uses proper timezone.
const FROM_UNIXTIME = "CONVERT_TZ(FROM_UNIXTIME(?), @@session.time_zone, '+00:00')";

function prepareRaidPromise(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results, fields) => {
            if (err) {
                return reject(err);
            } else {
                return resolve(results);
            }
        });
    });
}


/* Model. */

const tablename = 'raid';
const Raid = {};

// Get raid by gym ID.
Raid.from_gym_id = (id) => {
    // This is a simple one.
    const query = 'SELECT * FROM ' + tablename + ' WHERE gym_id = ? LIMIT 1';
    const params = [ id ];

    // Return promise.
    return prepareRaidPromise(query, params);
};

// Get raids by gym IDs.
Raid.from_gym_ids = (ids) => {
    // This is another simple one.
    const query = 'SELECT * FROM ' + tablename + ' WHERE gym_id IN (?)';
    const params = [ ids ];

    // Return promise.
    return prepareRaidPromise(query, params);
};


module.exports = Raid;