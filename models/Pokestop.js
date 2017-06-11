'use strict';

// Parse config.
require('dotenv').config();

const Sequelize = require('sequelize');
const utils = require('../inc/utils.js');


/* Readability references. */
var isEmpty = utils.isEmpty;


/* Settings. */
const POKESTOP_LIMIT_PER_QUERY = parseInt(process.env.POKESTOP_LIMIT_PER_QUERY) || 5000;


/* Helpers. */
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
    var pokestop_options = {
        attributes: {
            include: [
                'active_fort_modifier',
                'enabled',
                'latitude',
                'longitude',
                'last_modified',
                'lure_expiration',
                'pokestop_id'
            ]
        },
        limit: POKESTOP_LIMIT_PER_QUERY,
        order: []
    };

    // If no viewport, defaults.
    if (isEmpty(swLat) || isEmpty(swLng) || isEmpty(neLat) || isEmpty(neLng)) {
        return pokestop_options;
    }

    // After this point, viewport is always defined.
    pokestop_options.where = {
        latitude: {
            $gte: swLat,
            $lte: neLat
        },
        longitude: {
            $gte: swLng,
            $lte: neLng
        }
    };

    /*
     * If we have a viewport, use distance ordering.
     */

    // Center of viewport.
    var viewport_width = neLng - swLng;
    var viewport_height = neLat - swLat;
    var middle_point_lat = neLat - (viewport_height / 2);
    var middle_point_lng = neLng - (viewport_width / 2);

    pokestop_options.attributes.include.push([
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
    ]);

    pokestop_options.order.push(Sequelize.literal('`distance` ASC'));

    // If timestamp is known, only load modified Pokéstops.
    if (timestamp !== false) {
        // Change POSIX timestamp to UTC time.
        timestamp = new Date(timestamp).getTime();

        pokestop_options.where.last_updated = {
            $gt: timestamp
        };

        return pokestop_options;
    }

    // Lured stops.
    if (lured) {
        pokestop_options.where.active_fort_modifier = {
            $ne: null
        };
    }

    // Send Pokéstops in view but exclude those within old boundaries.
    if (!isEmpty(oSwLat) && !isEmpty(oSwLng) && !isEmpty(oNeLat) && !isEmpty(oNeLng)) {
        pokestop_options.where = {
            $and: [
                pokestop_options.where,
                {
                    $not: {
                        latitude: {
                            $gte: oSwLat,
                            $lte: oNeLat
                        },
                        longitude: {
                            $gte: oSwLng,
                            $lte: oNeLng
                        }
                    }
                }
            ]
        };
    }

    return pokestop_options;
}


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var Pokestop = sequelize.define('Pokestop', {
        pokestop_id: {
            type: DataTypes.STRING(50),
            primaryKey: true
        },
        enabled: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        latitude: {
            type: DataTypes.DOUBLE,
            allowNull: false
        },
        longitude: {
            type: DataTypes.DOUBLE,
            allowNull: false
        },
        last_modified: {
            type: DataTypes.DATE,
            allowNull: false
        },
        lure_expiration: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        },
        active_fort_modifier: {
            type: DataTypes.STRING(50),
            allowNull: true,
            defaultValue: null
        },
        last_updated: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'pokestop',
        indexes: [{
                name: 'pokestop_last_modified',
                method: 'BTREE',
                fields: ['last_modified']
            },
            {
                name: 'pokestop_lure_expiration',
                method: 'BTREE',
                fields: ['lure_expiration']
            },
            {
                name: 'pokestop_active_fort_modifier',
                method: 'BTREE',
                fields: ['active_fort_modifier']
            },
            {
                name: 'pokestop_last_updated',
                method: 'BTREE',
                fields: ['last_updated']
            },
            {
                name: 'pokestop_latitude_longitude',
                method: 'BTREE',
                fields: ['latitude', 'longitude']
            }
        ]
    });

    /* Methods. */

    // Get active Pokéstops by coords or timestamp.
    Pokestop.get_stops = function (swLat, swLng, neLat, neLng, lured, timestamp, oSwLat, oSwLng, oNeLat, oNeLng) {
        // Prepare query.
        var pokestop_options = prepareQueryOptions({
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

        // Return promise.
        return Pokestop.findAll(pokestop_options);
    };

    return Pokestop;
};
