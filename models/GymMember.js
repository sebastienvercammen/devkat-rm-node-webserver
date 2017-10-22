'use strict';

// Parse config.
require('dotenv').config();


/* Includes. */

const db = require('../inc/db.js').pool;


/* Helpers. */

// Make sure SQL uses proper timezone.
const FROM_UNIXTIME = "CONVERT_TZ(FROM_UNIXTIME(?), @@session.time_zone, '+00:00')";

function prepareGymMemberPromise(query, params) {
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

const tablename = 'gymmember';
const GymMember = {};

// Get gym member by gym ID.
GymMember.from_gym_id = (id) => {
    // This is a simple one.
    const query = 'SELECT * FROM ' + tablename + ' WHERE gym_id = ?';
    const params = [ id ];

    // Return promise.
    return prepareGymMemberPromise(query, params);
};

// Get gym members by gym IDs.
GymMember.from_gym_ids = (ids) => {
    // This is another simple one.
    const query = 'SELECT * FROM ' + tablename + ' WHERE gym_id IN (?)';
    const params = [ ids ];

    // Return promise.
    return prepareGymMemberPromise(query, params);
};


module.exports = GymMember;