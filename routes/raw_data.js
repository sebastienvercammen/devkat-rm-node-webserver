require('dotenv').config();

var utils = require('../inc/utils.js');
var express = require('express');
var router = express.Router();

var db = require('../inc/database.js').getInstance();
var Pokemon = db.import('../models/Pokemon.js');


/* Readability. */
var isEmpty = utils.isEmpty;


/* Settings. */
const POKEMON_LIMIT_PER_QUERY = parseInt(process.env.POKEMON_LIMIT_PER_QUERY) || 1000;

// Routing.
const ROUTE_RAW_DATA = process.env.ROUTE_RAW_DATA || '/raw_data';

/* Route. */
router.get(ROUTE_RAW_DATA, function(req, res) {
    var query = req.query;


    /* Verify request. */
    
    // Make sure we have all required parameters for a correct request.
    const required = [
        'swLat', 'swLng', 'neLat', 'neLng',
        'oSwLat', 'oSwLng', 'oNeLat', 'oNeLng'
    ];
    
    // Bad request.
    if (!queryHasRequiredParams(query, required))
        return res.sendStatus(400);


    /* Parse GET params. */
    
    // Show/hide.
    const no_pokemon = parseGetParam(query.no_pokemon, false);
    const no_pokestops = parseGetParam(query.no_pokestops, false);
    const no_gyms = parseGetParam(query.no_gyms, false);
    
    const show_pokemon = parseGetParam(query.pokemon, true) && !no_pokemon;
    const show_pokestops = parseGetParam(query.pokestops, true) && !no_pokestops;
    const show_gyms = parseGetParam(query.gyms, true) && !no_gyms;

    // Previous switch settings.
    const last_gyms = parseGetParam(query.lastgyms, false);
    const last_pokestops = parseGetParam(query.lastpokestops, false);
    const last_pokemon = parseGetParam(query.lastpokemon, false);
    const last_slocs = parseGetParam(query.lastslocs, false);
    const last_spawns = parseGetParam(query.lastspawns, false);

    // Locations.
    const swLat = parseGetParam(query.swLat, undefined);
    const swLng = parseGetParam(query.swLng, undefined);
    const neLat = parseGetParam(query.neLat, undefined);
    const neLng = parseGetParam(query.neLng, undefined);
    const oSwLat = parseGetParam(query.oSwLat, undefined);
    const oSwLng = parseGetParam(query.oSwLng, undefined);
    const oNeLat = parseGetParam(query.oNeLat, undefined);
    const oNeLng = parseGetParam(query.oNeLng, undefined);
    
    // TODO: Reject requests for all data?
    // TODO: Check distance in locations. If it exceeds a certain distance,
    // refuse the query.
    
    // Other.
    const scanned = parseGetParam(query.scanned, false);
    const spawnpoints = parseGetParam(query.spawnpoints, false);
    var timestamp = parseGetParam(query.timestamp, undefined);
    
    // Convert to usable date object.
    if (!isEmpty(timestamp))
        timestamp = new Date(timestamp);
    
    // Query response is a combination of Pokémon + Pokéstops + Gyms, so
    // we have to wait until the necessary Promises have completed.
    var completed_pokemon = !show_pokemon;
    var completed_pokestops = !show_pokestops;
    var completed_gyms = !show_gyms;

    // General/optional.
    // TODO: Check if "lured_only" is proper var name.
    const lured_only = parseGetParam(query.luredonly, true);

    var new_area = false; // Did we zoom in/out?

    // We zoomed in, no new area uncovered.
    if (oSwLng < swLng && oSwLat < swLat && oNeLat > neLat && oNeLng > neLng)
        new_area = false;
    else if (!(oSwLat === swLat && oSwLng === swLng && oNeLat === neLat && oNeLng === neLng))
        new_area = true; // We moved.


    /* Prepare response. */
    var response = {};
    
    // UTC timestamp.
    response.timestamp = new Date().getTime();

    // Values for next request.
    response.lastgyms = show_gyms;
    response.lastpokestops = show_pokestops;
    response.lastpokemon = show_pokemon;
    response.lastslocs = scanned;
    response.lastspawns = spawnpoints;

    // Pass current coords as old coords.
    response.oSwLat = swLat;
    response.oSwLng = swLng;
    response.oNeLat = neLat;
    response.oNeLng = neLng;

    // Handle Pokémon.
    if (show_pokemon) {
        // Pokémon IDs, whitelist or blacklist.
        let ids = [];
        let excluded = [];
        
        if (!isEmpty(query.ids))
            ids = parseGetParam(query.ids.split(','), []);
        if (!isEmpty(query.eids))
            excluded = parseGetParam(query.eids.split(','), []);
        if (!isEmpty(query.reids)) {
            // TODO: Check this implementation of reids. In original, it's
            // separate to other query types.
            let reids = parseGetParam(query.reids.split(','), []);
            ids += reids;
            response.reids = reids;
        }
        
        // TODO: Change .then() below w/ custom "completed" flags into proper
        // Promise queue.
        
        // Completion handler.
        let foundMons = function(pokes) {
            response.pokemons = pokes;
            completed_pokemon = true;
            
            return partialCompleted(completed_pokemon, completed_pokestops, completed_gyms, res, response);
        };
        
        // TODO: Rewrite below workflow. We reimplemented the old Python code,
        // but it's kinda ugly.
        
        // Whitelist query?
        if (ids.length > 0) {
            // Run query async.
            Pokemon.get_active_by_ids(ids, excluded, swLat, swLng, neLat, neLng).then(foundMons).catch(utils.handle_error);
        } else if (!last_pokemon) {
            // First query from client?
            Pokemon.get_active(null, swLat, swLng, neLat, neLng).then(foundMons).catch(utils.handle_error);
        } else {
            // If map is already populated only request modified Pokemon
            // since last request time.
            Pokemon.get_active(excluded, swLat, swLng, neLat, neLng, timestamp).then(function(pokes) {
                // If screen is moved add newly uncovered Pokemon to the
                // ones that were modified since last request time.
                if (new_area) {
                    Pokemon.get_active(excluded, swLat, swLng, neLat, neLng, timestamp, oSwLat, oSwLng, oNeLat, oNeLng).then(function(new_pokes) {
                        return foundMons(pokes.concat(new_pokes));
                    }).catch(utils.handle_error);
                } else {
                    return foundMons(pokes);
                }
            }).catch(utils.handle_error);
        }

        // TODO: On first visit, send in-memory data for viewport.
    }

    // Handle Pokéstops.
    if (show_pokestops) {}

    // Handle gyms.
    if (show_gyms) {}
    
    // A request for nothing?
    if (!show_pokemon && !show_pokestops && !show_gyms)
        return res.sendStatus(400);
});


/* Helpers. */

// Query is a combination of partials. When all completed, return response.
function partialCompleted(pokemon, pokestops, gyms, res, response) {
    if (true || pokemon && pokestops && gyms)
        return res.json(response);
}

function queryHasRequiredParams(query, requiredParams) {
    for (let i = 0; i < requiredParams.length; i++) {
        let item = requiredParams[i];
        
        // Missing or empty parameter, bad request.
        if (!query.hasOwnProperty(item) || item === null)
            return false;
        
        // Can't be empty strings, we need values.
        if (typeof query[item] === 'string' && query[item].length === 0)
            return false;
    }
    
    return true;
}

function parseGetParam(param, defaultVal) {
    // Undefined?
    if (isUndefined(param))
        return defaultVal;

    // Ok, we have a value.
    var val = param;

    // Truthy/falsy strings?
    if (val === 'true')
        return true;
    else if (val === 'false')
        return false;

    // Make sure single values adhere to defaultVal type.
    if (defaultVal instanceof Array && typeof val === 'string')
        val = [ val ];
    
    // No empty values should be left over.
    if (val instanceof Array) {
        for (let i = 0; i < val.length; i++) {
            let item = val[i];
            
            // Remove empty item.
            if (item.length === 0)
                val = val.splice(i, 1);
        }
    }
    
    // Numbers should be converted back to numeric types.
    // Don't use parseInt() for numeric checking, use parseFloat() instead.
    if (utils.isNumeric(val))
        val = parseFloat(val);

    // Rest is good to go.
    return val;
}

// Node.js.
module.exports = router;
