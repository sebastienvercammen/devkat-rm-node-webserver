var utils = {
    // Log to console w/ a timestamp.
    log: function (txt) {
        var time = new Date()
            .toLocaleString('nl-BE')
            .split(' ')[1];
        console.log('[' + time + '] ' + txt);
    },

    // Generic error log & exit.
    handle_error: function (err) {
        console.error(err);
        process.exit(1);
    },

    // Readability methods.
    isUndefined: function (val) {
        return (typeof val === 'undefined');
    },

    // TODO: Figure out better name than "isEmpty".
    isEmpty: function (val) {
        return (utils.isUndefined(val) || val === null || val === '');
    },

    // Check if a string is numeric (e.g. for GET params).
    isNumeric: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
};


/*
 * Pokémon data related methods.
 */
utils.pokemon = {
    // Check if Pokémon ID is in data.
    hasPokemonData: function (pokedex, id) {
        return pokedex.hasOwnProperty(id);
    },

    // Get a Pokémon's data.
    getPokemonData: function (pokedex, id) {
        // Are we sure we have this Pokémon?
        if (!utils.pokemon.hasPokemonData(pokedex, id)) {
            return false;
        }

        return pokedex[id];
    },

    // Get a Pokémon's name.
    getPokemonName: function (pokedex, id) {
        // Are we sure we have this Pokémon?
        if (!utils.pokemon.hasPokemonData(pokedex, id)) {
            return false;
        }

        return pokedex[id].name;
    },

    // Get a Pokémon's rarity.
    getPokemonRarity: function (pokedex, id) {
        // Are we sure we have this Pokémon?
        if (!utils.pokemon.hasPokemonData(pokedex, id)) {
            return false;
        }

        return pokedex[id].rarity;
    },

    // Get a Pokémon's types.
    getPokemonTypes: function (pokedex, id) {
        // Are we sure we have this Pokémon?
        if (!utils.pokemon.hasPokemonData(pokedex, id)) {
            return false;
        }

        return pokedex[id].types;
    },
};

module.exports = utils;
