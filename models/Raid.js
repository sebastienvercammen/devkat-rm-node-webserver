'use strict';

// Parse config.
require('dotenv').config();

const Sequelize = require('sequelize');
const utils = require('../inc/utils.js');


/* Readability references. */
const isEmpty = utils.isEmpty;


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
    var raid_options = {
        attributes: {},
        order: []
    };

    // If no viewport, defaults.
    if (isEmpty(swLat) || isEmpty(swLng) || isEmpty(neLat) || isEmpty(neLng)) {
        return raid_options;
    }

    // After this point, viewport is always defined.
    raid_options.where = {
        latitude: {
            $gte: swLat,
            $lte: neLat
        },
        longitude: {
            $gte: swLng,
            $lte: neLng
        }
    };

    // If timestamp is known, only load updated Raids.
    if (timestamp !== false) {
        // Change POSIX timestamp to UTC time.
        timestamp = new Date(timestamp).getTime();

        raid_options.where.last_scanned = {
            $gt: timestamp
        };
    }

    // Send Raids in view but exclude those within old boundaries.
    if (!isEmpty(oSwLat) && !isEmpty(oSwLng) && !isEmpty(oNeLat) && !isEmpty(oNeLng)) {
        raid_options.where = {
            $and: [
                raid_options.where,
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

    return raid_options;
}


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var Raid = sequelize.define('Raid', {
        gym_id: {
            type: DataTypes.STRING(50),
            primaryKey: true
        },
        level: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        spawn: {
            type: DataTypes.DATE,
            allowNull: false
        },
        start: {
            type: DataTypes.DATE,
            allowNull: false
        },
        end: {
            type: DataTypes.DATE,
            allowNull: false
        },
        pokemon_id: {
            type: 'SMALLINT',
            allowNull: true
        },
        cp: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        move_1: {
            type: 'SMALLINT',
            allowNull: true
        },
        move_2: {
            type: 'SMALLINT',
            allowNull: true
        },
        last_scanned: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'raid',
        indexes: [{
                name: 'raid_level',
                method: 'BTREE',
                fields: ['level']
            },
            {
                name: 'raid_spawn',
                method: 'BTREE',
                fields: ['spawn']
            },
            {
                name: 'raid_start',
                method: 'BTREE',
                fields: ['start']
            },
            {
                name: 'raid_end',
                method: 'BTREE',
                fields: ['end']
            },
            {
                name: 'raid_last_scanned',
                method: 'BTREE',
                fields: ['last_scanned']
            }
        ]
    });

    return Raid;
};
