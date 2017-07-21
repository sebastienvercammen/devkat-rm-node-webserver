'use strict';

// Parse config.
require('dotenv').config();


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var GymMember = sequelize.define('GymMember', {
        gym_id: {
            type: DataTypes.STRING(50),
            references: {
                model: sequelize.models.Gym,
                key: 'gym_id'
            }
        },
        pokemon_uid: {
            type: DataTypes.STRING,
            allowNull: true
        },
        last_scanned: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        },
        deployment_time: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        },
        cp_decayed: {
            type: 'SMALLINT',
            allowNull: true,
            defaultValue: null
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'gymmember'
    });

    GymMember.associate = function (models) {
        GymMember.belongsTo(models.Gym, {
            foreignKey: 'gym_id',
            targetKey: 'gym_id'
        });
    };

    return GymMember;
};
