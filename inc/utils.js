var utils = {
    // Generic error log & exit.
    handle_error: (err) => {
        console.error(err);
        process.exit(1);
    },

    // Fix SIGINT on Windows systems.
    fixWinSIGINT: () => {
        if (process.platform === 'win32') {
            require('readline')
                .createInterface({
                    input: process.stdin,
                    output: process.stdout
                })
                .on('SIGINT', function () {
                    process.emit('SIGINT');
                });
        }
    },

    // Readability methods.
    isUndefined: (val) => {
        return (typeof val === 'undefined');
    },

    // TODO: Figure out better name than "isEmpty".
    isEmpty: (val) => {
        return (utils.isUndefined(val) || val === null || val === '');
    },

    // Check if a string is numeric (e.g. for GET params).
    isNumeric: (n) => {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
};


/*
 * Pokémon data related methods.
 */
utils.pokemon = {
    // Check if Pokémon ID is in data.
    hasPokemonData: (pokedex, id) => {
        return pokedex.hasOwnProperty(id);
    },

    // Get a Pokémon's data.
    getPokemonData: (pokedex, id) => {
        // Are we sure we have this Pokémon?
        if (!utils.pokemon.hasPokemonData(pokedex, id)) {
            return false;
        }

        return pokedex[id];
    },

    // Get a Pokémon's name.
    getPokemonName: (pokedex, id) => {
        // Are we sure we have this Pokémon?
        if (!utils.pokemon.hasPokemonData(pokedex, id)) {
            return null;
        }

        return pokedex[id].name;
    },

    // Get a Pokémon's types.
    getPokemonTypes: (pokedex, id) => {
        // Are we sure we have this Pokémon?
        if (!utils.pokemon.hasPokemonData(pokedex, id)) {
            return null;
        }

        return pokedex[id].types;
    }
};

module.exports = utils;
