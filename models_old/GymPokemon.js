'use strict';

// Parse config.
require('dotenv').config();


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var GymPokemon = sequelize.define('GymPokemon', {
        pokemon_uid: {
            type: DataTypes.STRING,
            allowNull: true
        },
        pokemon_id: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        cp: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        trainer_name: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        num_upgrades: {
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
        height: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: null
        },
        weight: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: null
        },
        stamina: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        stamina_max: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        cp_multiplier: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: null
        },
        additional_cp_multiplier: {
            type: DataTypes.FLOAT,
            allowNull: true,
            defaultValue: null
        },
        iv_defense: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        iv_stamina: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        iv_attack: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        },
        last_seen: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'gymmember'
    });

    GymPokemon.associate = function (models) {
        GymPokemon.belongsTo(models.Gym, {
            foreignKey: 'gym_id',
            targetKey: 'gym_id'
        });
    };

    return GymPokemon;
};
