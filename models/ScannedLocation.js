'use strict';

// Parse config.
require('dotenv').config();


/* Model. */

module.exports = function (sequelize, DataTypes) {
    // Sequelize model definition.
    var ScannedLocation = sequelize.define('ScannedLocation', {
        cellid: {
            type: DataTypes.STRING(50),
            primaryKey: true
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
            allowNull: true,
            defaultValue: null
        },
        done: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        band1: {
            type: 'SMALLINT',
            allowNull: false,
            defaultValue: -1
        },
        band2: {
            type: 'SMALLINT',
            allowNull: false,
            defaultValue: -1
        },
        band3: {
            type: 'SMALLINT',
            allowNull: false,
            defaultValue: -1
        },
        band4: {
            type: 'SMALLINT',
            allowNull: false,
            defaultValue: -1
        },
        band5: {
            type: 'SMALLINT',
            allowNull: false,
            defaultValue: -1
        },
        midpoint: {
            type: 'SMALLINT',
            allowNull: false,
            defaultValue: 0
        },
        width: {
            type: 'SMALLINT',
            allowNull: false,
            defaultValue: 0
        }
    }, {
        timestamps: false,
        freezeTableName: true,
        tableName: 'scannedlocation'
    });

    ScannedLocation.associate = function (models) {};

    return ScannedLocation;
};
