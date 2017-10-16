'use strict';

// Parse config.
require('dotenv').config();


/* Includes. */

const db = require('../inc/db.js').pool;
const utils = require('../inc/utils.js');

const Raid = require('./Raid');

/* Readability references. */

const isEmpty = utils.isEmpty;


/* Settings. */

const GYM_LIMIT_PER_QUERY = parseInt(process.env.GYM_LIMIT_PER_QUERY) || 50000;


/* Helpers. */

// Make sure SQL uses proper timezone.
const FROM_UNIXTIME = "CONVERT_TZ(FROM_UNIXTIME(?), @@session.time_zone, '+00:00')";

function prepareQuery(options) {
    // Parse options.
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
    var query_where = [];

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
    }

    if (timestamp !== false) {
        // Change POSIX timestamp to UTC time.
        timestamp = new Date(timestamp).getTime();

        query_where.push(
            [
                'last_scanned > ' + FROM_UNIXTIME,
                [Math.round(timestamp / 1000)]
            ]
        );
    }

    // Send Gyms in view but exclude those within old boundaries.
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
    query += ' LIMIT ' + GYM_LIMIT_PER_QUERY;

    return [ query, values ];
}

function prepareGymPromise(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results, fields) => {
            if (err) {
                return reject(err);
            } else {
                // If there are no gyms, let's just go. 👀
                if (results.length == 0) {
                    return resolve([]);
                }

                // Gym references.
                const gym_refs = {};


                /* Add raids. */

                // One query to rule them all.
                for (var i = 0; i < results.length; i++) {
                    let gym = results[i];
                    gym_refs['' + gym.gym_id] = gym;
                }

                // Lesgo.
                Raid.from_gym_ids(Object.keys(gym_refs))
                .then((raids) => {
                    // Attach raids to gyms.
                    for (var i = 0; i < raids.length; i++) {
                        let raid = raids[i];
                        gym_refs['' + raid.gym_id].raid = raid;
                    }

                    return resolve(Object.values(gym_refs));
                }).catch(utils.handle_error);


                /* Add gym members. */
                // TODO
            }
        });
    });
}


/* Model. */

const tablename = 'gym';
const Gym = {};

// Get active Gyms by coords or timestamp.
Gym.get_gyms = (swLat, swLng, neLat, neLng, timestamp, oSwLat, oSwLng, oNeLat, oNeLng) => {
    // Prepare query.
    const query_where = prepareQuery({
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
    return prepareGymPromise(query, params);
};

// Get single Gym + Pokémon in Gym by ID.
Gym.get_gym = (id) => {
    // This is a simple one.
    const query = 'SELECT * FROM ' + tablename + ' WHERE gym_id = ? LIMIT 1';
    const params = [ id ];

    // Return promise.
    return prepareGymPromise(query, params);
};


module.exports = Gym;
