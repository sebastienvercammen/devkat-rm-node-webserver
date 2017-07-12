'use strict';

// Parse config.
require('dotenv').config();

const Sequelize = require('sequelize');
const utils = require('../inc/utils.js');
const pokedex = require('../data/pokedex/pokemon.json');


/* Readability references. */
const isEmpty = utils.isEmpty;
const getPokemonName = utils.pokemon.getPokemonName;
const getPokemonTypes = utils.pokemon.getPokemonTypes;


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var Raid = sequelize.define('Raid', {
        gym_id: {
            type: DataTypes.STRING(50),
            primaryKey: true,
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
    
    Raid.associate = function (models) {
        Raid.belongsTo(models.Gym, {
            foreignKey: 'gym_id',
            targetKey: 'gym_id'
        });
    };

    return Raid;
};
