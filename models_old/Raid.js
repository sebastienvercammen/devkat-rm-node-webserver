'use strict';

// Parse config.
require('dotenv').config();

const utils = require('../inc/utils.js');
const pokedex = require('../data/pokedex/pokemon.json');


/* Readability references. */

const getPokemonName = utils.pokemon.getPokemonName;
const getPokemonTypes = utils.pokemon.getPokemonTypes;


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var Raid = sequelize.define('Raid', {
        gym_id: {
            type: DataTypes.STRING(50),
            references: {
                model: sequelize.models.Gym,
                key: 'gym_id'
            }
        },
        level: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        spawn: {
            type: DataTypes.DATE,
            allowNull: false,
            get() {
                var date = new Date(this.getDataValue('spawn'));
                return date.getTime();
            }
        },
        start: {
            type: DataTypes.DATE,
            allowNull: false,
            get() {
                var date = new Date(this.getDataValue('start'));
                return date.getTime();
            }
        },
        end: {
            type: DataTypes.DATE,
            allowNull: false,
            get() {
                var date = new Date(this.getDataValue('end'));
                return date.getTime();
            }
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
            defaultValue: null,
            get() {
                var last_scanned = this.getDataValue('last_scanned');

                if (last_scanned !== null) {
                    const date = new Date(last_scanned);
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
        tableName: 'raid'
    });

    Raid.associate = function (models) {
        Raid.belongsTo(models.Gym, {
            foreignKey: 'gym_id',
            targetKey: 'gym_id'
        });
    };

    return Raid;
};
