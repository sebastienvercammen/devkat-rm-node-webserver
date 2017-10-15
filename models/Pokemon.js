'use strict';

// Parse config.
require('dotenv').config();


/* Includes. */

const db = require('../inc/db.js').pool;
const utils = require('../inc/utils.js');
const pokedex = require('../data/pokedex/pokemon.json');


/* Readability references. */

const isEmpty = utils.isEmpty;
const getPokemonName = utils.pokemon.getPokemonName;
const getPokemonRarity = utils.pokemon.getPokemonRarity;
const getPokemonTypes = utils.pokemon.getPokemonTypes;


/* Settings. */

const POKEMON_LIMIT_PER_QUERY = parseInt(process.env.POKEMON_LIMIT_PER_QUERY) || 50000;


/* Helpers. */

function prepareQuery(options) {
    // Parse options.
    var whitelist = options.whitelist || [];
    var blacklist = options.blacklist || [];
    var swLat = options.swLat;
    var swLng = options.swLng;
    var neLat = options.neLat;
    var neLng = options.neLng;
    var oSwLat = options.oSwLat;
    var oSwLng = options.oSwLng;
    var oNeLat = options.oNeLat;
    var oNeLng = options.oNeLng;
    var timestamp = options.timestamp || false;

    // Query options.
    var query_where = [
        [
            'disappear_time > FROM_UNIXTIME(?)',
            [ Math.round(Date.now() / 1000) ]
        ]
    ];

    // Optional viewport.
    if (!isEmpty(swLat) && !isEmpty(swLng) && !isEmpty(neLat) && !isEmpty(neLng)) {
        query_where.push(
            [
                'latitude >= ? AND latitude <= ?',
                [swLat, neLat]
            ]
        );
        query_where.push(
            [
                'longitude >= ? AND longitude <= ?',
                [swLng, neLng]
            ]
        );


        /*
         * TODO: If we have a viewport, use distance ordering?
         */

        // Center of viewport.
        /*var viewport_width = neLng - swLng;
        var viewport_height = neLat - swLat;
        var middle_point_lat = neLat - (viewport_height / 2);
        var middle_point_lng = neLng - (viewport_width / 2);

        poke_options.attributes.include = [
            [
                // Calculate distance from middle point in viewport w/ MySQL.
                Sequelize.literal(`
                    3959 * 
                    acos(cos(radians(` + middle_point_lat + `)) * 
                    cos(radians(\`latitude\`)) * 
                    cos(radians(\`longitude\`) - 
                    radians(` + middle_point_lng + `)) + 
                    sin(radians(` + middle_point_lat + `)) * 
                    sin(radians(\`latitude\`)))
                    `),
                'distance'
            ]
        ];

        poke_options.order.push(Sequelize.literal('`distance` ASC'));*/
    }

    if (whitelist.length > 0) {
        query_where.push(
            [
                'pokemon_id IN ?',
                [whitelist]
            ]
        );
    }

    if (blacklist.length > 0) {
        query_where.push(
            [
                'pokemon_id NOT IN ?',
                [blacklist]
            ]
        );
    }

    // If timestamp is known, only load modified Pokemon.
    if (timestamp !== false) {
        // Change POSIX timestamp to UTC time.
        timestamp = new Date(timestamp).getTime();

        query_where.push(
            [
                'last_modified > FROM_UNIXTIME(?)',
                [Math.round(timestamp / 1000)]
            ]
        );
    }

    // Send Pokémon in view but exclude those within old boundaries.
    if (!isEmpty(oSwLat) && !isEmpty(oSwLng) && !isEmpty(oNeLat) && !isEmpty(oNeLng)) {
        query_where.push(
            [
                'latitude < ? AND latitude > ? AND longitude < ? AND longitude > ?',
                [oSwLat, oNeLat, oSwLng, oNeLng]
            ]
        );
    }

    // Prepare query.
    let query = ' WHERE ';
    let partials = [];
    let values = []; // Unnamed query params.

    // Add individual options.
    for (var i = 0; i < query_where.length; i++) {
        let w = query_where[i];
        // w = [ 'query ?', [opt1] ]
        partials.push(w[0]);
        values = values.concat(w[1]);
    }
    query += partials.join(' AND ');

    // Set limit.
    query += ' LIMIT ' + POKEMON_LIMIT_PER_QUERY;

    return [ query, values ];
}

function preparePokemonPromise(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results, fields) => {
            if (err) {
                reject(err);
            } else {
                // Manipulate response.
                for (var i = 0; i < results.length; i++) {
                    let poke = results[i];
                    let pokemon_id = poke.pokemon_id;

                    // Add name/rarity/types and transform times. Destructive.
                    poke.disappear_time = (new Date(poke.disappear_time)).getTime();
                    poke.last_modified = (new Date(poke.last_modified)).getTime();
                    poke.pokemon_name = getPokemonName(pokedex, pokemon_id) || '';
                    poke.pokemon_rarity = getPokemonRarity(pokedex, pokemon_id) || null;
                    poke.pokemon_types = getPokemonTypes(pokedex, pokemon_id) || [];
                }

                resolve(results);
            }
        });
    });
}


/* Model. */

const tablename = 'pokemon';
const Pokemon = {};

Pokemon.get_active = (excluded, swLat, swLng, neLat, neLng, timestamp, oSwLat, oSwLng, oNeLat, oNeLng) => {
    // Prepare query.
    const query_where = prepareQuery({
        'blacklist': excluded,
        'swLat': swLat,
        'swLng': swLng,
        'neLat': neLat,
        'neLng': neLng,
        'oSwLat': oSwLat,
        'oSwLng': oSwLng,
        'oNeLat': oNeLat,
        'oNeLng': oNeLng,
        'timestamp': timestamp
    });

    const query = 'SELECT * FROM ' + tablename + query_where[0];
    const params = query_where[1];

    // Return promise.
    return preparePokemonPromise(query, params);
};

Pokemon.get_active_by_ids = (ids, excluded, swLat, swLng, neLat, neLng) => {
    // Query options.
    const query_where = prepareQuery({
        'whitelist': ids,
        'blacklist': excluded,
        'swLat': swLat,
        'swLng': swLng,
        'neLat': neLat,
        'neLng': neLng
    });

    const query = 'SELECT * FROM ' + tablename + query_where[0];
    const params = query_where[1];

    // Return promise.
    return preparePokemonPromise(query, params);
};

module.exports = Pokemon;
