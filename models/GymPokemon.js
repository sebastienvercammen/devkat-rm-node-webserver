'use strict';

// Parse config.
require('dotenv').config();


/* Includes. */

const db = require('../inc/db.js').pool;


/* Helpers. */

// Make sure SQL uses proper timezone.
const FROM_UNIXTIME = "CONVERT_TZ(FROM_UNIXTIME(?), @@session.time_zone, '+00:00')";

function prepareGymPokemonPromise(query, params) {
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

const tablename = 'gympokemon';
const GymPokemon = {};

// Get gym member by gym ID.
GymPokemon.from_gym_id = (id) => {
    // This is a simple one.
    const query = 'SELECT * FROM ' + tablename + ' WHERE gym_id = ?';
    const params = [ id ];

    // Return promise.
    return prepareGymPokemonPromise(query, params);
};

// Get gym members by gym IDs.
GymPokemon.from_gym_ids = (ids) => {
    // This is another simple one.
    const query = 'SELECT * FROM ' + tablename + ' WHERE gym_id IN (?)';
    const params = [ ids ];

    // Return promise.
    return prepareGymPokemonPromise(query, params);
};


module.exports = GymPokemon;