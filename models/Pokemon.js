'use strict';

// Parse config.
require('dotenv').config();

const Sequelize = require('sequelize');
const utils = require('../inc/utils.js');
const pokedex = require('../data/pokedex/pokemon.json');


/* Readability references. */
const isEmpty = utils.isEmpty;
const getPokemonData = utils.pokemon.getPokemonData;
const getPokemonName = utils.pokemon.getPokemonName;
const getPokemonRarity = utils.pokemon.getPokemonRarity;
const getPokemonTypes = utils.pokemon.getPokemonTypes;


/* Settings. */
const POKEMON_LIMIT_PER_QUERY = parseInt(process.env.POKEMON_LIMIT_PER_QUERY) || 5000;


/* Helpers. */
function prepareQueryOptions(options) {
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
    var poke_options = {
        attributes: {},
        limit: POKEMON_LIMIT_PER_QUERY,
        where: {
            disappear_time: {
                $gt: new Date().getTime()
            }
        },
        order: []
    };

    // Optional viewport.
    if (!isEmpty(swLat) && !isEmpty(swLng) && !isEmpty(neLat) && !isEmpty(neLng)) {
        poke_options.where.latitude = {
            $gte: swLat,
            $lte: neLat
        };
        poke_options.where.longitude = {
            $gte: swLng,
            $lte: neLng
        };


        /*
         * If we have a viewport, use distance ordering.
         */

        // Center of viewport.
        var viewport_width = neLng - swLng;
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

        poke_options.order.push(Sequelize.literal('`distance` ASC'));
    }

    // Avoid Sequelize translating an empty list to "NOT IN (NULL)".
    if (whitelist.length > 0) {
        poke_options.where.pokemon_id = {
            $in: whitelist
        };
    }

    if (blacklist.length > 0) {
        poke_options.where.pokemon_id = {
            $notIn: blacklist
        };
    }

    // If timestamp is known, only load modified Pokemon.
    if (timestamp !== false) {
        // Change POSIX timestamp to UTC time.
        timestamp = new Date(timestamp).getTime();

        poke_options.where.last_modified = {
            $gt: timestamp
        };
    }

    // Send Pokémon in view but exclude those within old boundaries.
    if (!isEmpty(oSwLat) && !isEmpty(oSwLng) && !isEmpty(oNeLat) && !isEmpty(oNeLng)) {
        poke_options.where = {
            $and: [
                poke_options.where,
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

    return poke_options;
}


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var Pokemon = sequelize.define('Pokemon', {
        encounter_id: {
            type: DataTypes.STRING(50),
            primaryKey: true
        },
        spawnpoint_id: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        pokemon_id: {
            type: 'SMALLINT',
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
        disappear_time: {
            type: DataTypes.DATE,
            allowNull: false,
            get() {
                let date = new Date(this.getDataValue('disappear_time'));
                return date.getTime();
            }
        },
        individual_attack: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        individual_defense: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        individual_stamina: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        move_1: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        move_2: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        weight: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: null
        },
        height: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: null
        },
        gender: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        form: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        cp: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        cp_multiplier: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: null
        },
        last_modified: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null,
            get() {
                var last_modified = this.getDataValue('last_modified');
                
                if (last_modified !== null) {
                    let date = new Date(last_modified);
                    return date.getTime();
                }
                
                return null;
            }
        },
        // TODO: Move this from RM stock backend to frontend.
        // These are unnecessary VIRTUAL fields.
        pokemon_name: {
            type: DataTypes.VIRTUAL,
            defaultValue: '',
            get() {
                return getPokemonName(pokedex, this.getDataValue('pokemon_id'));
            }
        },
        pokemon_rarity: {
            type: DataTypes.VIRTUAL,
            allowNull: true,
            defaultValue: null,
            get() {
                return getPokemonRarity(pokedex, this.getDataValue('pokemon_id'));
            }
        },
        pokemon_types: {
            type: DataTypes.VIRTUAL,
            defaultValue: [],
            get() {
                return getPokemonTypes(pokedex, this.getDataValue('pokemon_id'));
            }
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'pokemon',
        indexes: [{
                name: 'pokemon_spawnpoint_id',
                method: 'BTREE',
                fields: ['spawnpoint_id']
            },
            {
                name: 'pokemon_pokemon_id',
                method: 'BTREE',
                fields: ['pokemon_id']
            },
            {
                name: 'pokemon_disappear_time',
                method: 'BTREE',
                fields: ['disappear_time']
            },
            {
                name: 'pokemon_last_modified',
                method: 'BTREE',
                fields: ['last_modified']
            },
            {
                name: 'pokemon_latitude_longitude',
                method: 'BTREE',
                fields: ['latitude', 'longitude']
            }
        ]
    });

    /* Methods. */

    // Get active Pokémon by coords or timestamp.
    Pokemon.get_active = function (excluded, swLat, swLng, neLat, neLng, timestamp, oSwLat, oSwLng, oNeLat, oNeLng) {
        // Prepare query.
        var poke_options = prepareQueryOptions({
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

        // Return promise.
        return Pokemon.findAll(poke_options);
    };

    // Get active Pokémon by coords & Pokémon IDs.
    Pokemon.get_active_by_ids = function (ids, excluded, swLat, swLng, neLat, neLng) {
        // Query options.
        var poke_options = prepareQueryOptions({
            'whitelist': ids,
            'blacklist': excluded,
            'swLat': swLat,
            'swLng': swLng,
            'neLat': neLat,
            'neLng': neLng
        });

        // Return promise.
        return Pokemon.findAll(poke_options);
    };

    return Pokemon;
};
