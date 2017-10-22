'use strict';

// Parse config.
require('dotenv').config();


/* Includes. */

const db = require('../inc/db.js').pool;
const utils = require('../inc/utils.js');


/* Readability references. */

var isEmpty = utils.isEmpty;


/* Settings. */

const POKESTOP_LIMIT_PER_QUERY = parseInt(process.env.POKESTOP_LIMIT_PER_QUERY) || 50000;


/* Helpers. */

// Make sure SQL uses proper timezone.
//const FROM_UNIXTIME = "CONVERT_TZ(FROM_UNIXTIME(?), @@session.time_zone, '+00:00')";
const FROM_UNIXTIME = 'FROM_UNIXTIME(?)';

function prepareQueryOptions(options) {
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
    var lured = options.lured || false;

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
                'last_updated > ' + FROM_UNIXTIME,
                [Math.round(timestamp / 1000)]
            ]
        );
    }

    // Lured stops.
    if (lured) {
        query_where.push(
            [
                'active_fort_modifier IS NOT NULL',
                []
            ]
        );
    }

    // Send Pokéstops in view but exclude those within old boundaries.
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
    query += ' LIMIT ' + POKESTOP_LIMIT_PER_QUERY;

    return [ query, values ];
}

function preparePokestopPromise(query, params) {
    return new Promise((resolve, reject) => {
        db.query(query, params, (err, results, fields) => {
            if (err) {
                reject(err);
            } else {
                // If there are no pokéstops, let's just go. 👀
                if (results.length == 0) {
                    return resolve(results);
                }

                // Manipulate pokéstops, destructive operations.
                for (var i = 0; i < results.length; i++) {
                    let pokestop = results[i];

                    // Convert datetime to UNIX timestamp.
                    pokestop.last_modified = Date.parse(pokestop.last_modified) || 0;
                    pokestop.last_updated = Date.parse(pokestop.last_updated) || 0;
                    pokestop.lure_expiration = Date.parse(pokestop.lure_expiration) || 0;
                }

                return resolve(results);
            }
        });
    });
}


/* Model. */

const tablename = 'pokestop';
const Pokestop = {};

// Get active Pokéstops by coords or timestamp.
Pokestop.get_stops = (swLat, swLng, neLat, neLng, lured, timestamp, oSwLat, oSwLng, oNeLat, oNeLng) => {
    // Prepare query.
    var query_where = prepareQueryOptions({
        'swLat': swLat,
        'swLng': swLng,
        'neLat': neLat,
        'neLng': neLng,
        'oSwLat': oSwLat,
        'oSwLng': oSwLng,
        'oNeLat': oNeLat,
        'oNeLng': oNeLng,
        'lured': lured,
        'timestamp': timestamp
    });

    const query = 'SELECT * FROM ' + tablename + query_where[0];
    const params = query_where[1];

    // Return promise.
    return preparePokestopPromise(query, params);
};

module.exports = Pokestop;