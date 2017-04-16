"use strict";

module.exports = function (sequelize, DataTypes) {
    var Pokemon = sequelize.define('Brand', {
        name: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        status: {
            type: DataTypes.INTEGER,
            unique: false,
            allowNull: true
        }
    });

    return Pokemon;
};
