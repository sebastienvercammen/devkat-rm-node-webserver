'use strict';

// Parse config.
require('dotenv').config();


/* Includes. */

const db = require('../inc/db.js').pool;


/* Helpers. */

// Make sure SQL uses proper timezone.
const FROM_UNIXTIME = "CONVERT_TZ(FROM_UNIXTIME(?), @@session.time_zone, '+00:00')";

function prepareGymPokemonPromise(query, params, map_object) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results, fields) => {
            if (err) {
                return reject(err);
            } else {
                return resolve({
                    'map': map_object,
                    'pokemon': results
                });
            }
        });
    });
}


/* Model. */

const tablename = 'gympokemon';
const GymPokemon = {};

// Get gym Pokémon by Pokémon uIDs.
GymPokemon.from_pokemon_uids_map = (pokemon_uids_obj) => {
    // This is another simple one.
    const query = 'SELECT * FROM ' + tablename + ' WHERE pokemon_uid IN (?)';
    const params = [ Object.keys(pokemon_uids_obj) ];

    // Return promise.
    return prepareGymPokemonPromise(query, params, pokemon_uids_obj);
};


module.exports = GymPokemon;