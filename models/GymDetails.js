'use strict';

// Parse config.
require('dotenv').config();


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var GymDetails = sequelize.define('GymDetails', {
        gym_id: {
            type: DataTypes.STRING(50),
            references: {
                model: sequelize.models.Gym,
                key: 'gym_id'
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            defaultValue: null
        },
        url: {
            type: DataTypes.STRING,
            allowNull: true,
            defaultValue: null
        },
        last_scanned: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'gymdetails'
    });

    GymDetails.associate = function (models) {
        GymDetails.belongsTo(models.Gym, {
            foreignKey: 'gym_id',
            targetKey: 'gym_id'
        });
    };

    return GymDetails;
};
