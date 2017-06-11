'use strict';

// Parse config.
require('dotenv').config();

var utils = require('../inc/utils.js');


/* Readability references. */
var isEmpty = utils.isEmpty;


/* Settings. */
const GYM_LIMIT_PER_QUERY = parseInt(process.env.GYM_LIMIT_PER_QUERY) || 5000;


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

    // Query options.
    var gym_options = {
        limit: GYM_LIMIT_PER_QUERY
    };

    // If no viewport, defaults.
    if (isEmpty(swLat) || isEmpty(swLng) || isEmpty(neLat) || isEmpty(neLng)) {
        return gym_options;
    }

    // After this point, viewport is always defined.
    gym_options.where = {
        latitude: {
            $gte: swLat,
            $lte: neLat
        },
        longitude: {
            $gte: swLng,
            $lte: neLng
        }
    };

    // If timestamp is known, only load updated Gyms.
    if (timestamp !== false) {
        // Change POSIX timestamp to UTC time.
        timestamp = new Date(timestamp).getTime();

        gym_options.where.last_scanned = {
            $gt: timestamp
        };

        return gym_options;
    }

    // Send Gyms in view but exclude those within old boundaries.
    if (!isEmpty(oSwLat) && !isEmpty(oSwLng) && !isEmpty(oNeLat) && !isEmpty(oNeLng)) {
        gym_options.where = {
            $and: [
                gym_options.where,
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

    return gym_options;
}


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var Gym = sequelize.define('Gym', {
        gym_id: {
            type: DataTypes.STRING(50),
            primaryKey: true
        },
        team_id: {
            type: 'SMALLINT',
            allowNull: false
        },
        guard_pokemon_id: {
            type: 'SMALLINT',
            allowNull: false
        },
        gym_points: {
            type: DataTypes.INTEGER,
            allowNull: false
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
        last_scanned: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'gym',
        indexes: [{
                name: 'gym_last_modified',
                method: 'BTREE',
                fields: ['last_modified']
            },
            {
                name: 'gym_last_scanned',
                method: 'BTREE',
                fields: ['last_scanned']
            },
            {
                name: 'gym_latitude_longitude',
                method: 'BTREE',
                fields: ['latitude', 'longitude']
            }
        ]
    });

    /* Methods. */

    // Get active Gyms by coords or timestamp.
    Gym.get_gyms = function (swLat, swLng, neLat, neLng, timestamp, oSwLat, oSwLng, oNeLat, oNeLng) {
        // Prepare query.
        var gym_options = prepareQueryOptions({
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

        // Return promise.
        return Gym.findAll(gym_options);
    };

    return Gym;
};
