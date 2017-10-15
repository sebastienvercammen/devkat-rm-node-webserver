'use strict';

// Parse config.
require('dotenv').config();


/* Includes. */

const db = require('../inc/db.js').pool;
const utils = require('../inc/utils.js');


/* Readability references. */

const getPokemonName = utils.pokemon.getPokemonName;
const getPokemonTypes = utils.pokemon.getPokemonTypes;


/* Helpers. */

function prepareRaidPromise(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results, fields) => {
            if (err) {
                reject(err);
            } else {
                // Empty list or single raid.
                resolve((results.length > 0) ? results[0] : []);
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
    const query = 'SELECT * FROM ' + tablename + ' WHERE gym_id IN ?';
    const params = [ ids ];

    // Return promise.
    return prepareRaidPromise(query, params);
};


module.exports = Raid;