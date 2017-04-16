var express = require('express');
var router = express.Router();

router.get('/raw_data', function (req, res) {
    /* Parse GET params. */
    
    // Show/hide.
    const show_pokemon = convertGetParam(req.query.pokemon, true);
    const show_pokestops = convertGetParam(req.query.pokestops, true);
    const show_gyms = convertGetParam(req.query.gyms, true);
    
    // Previous switch settings.
    const last_gyms = convertGetParam(req.query.lastgyms, true);
    const last_pokestops = convertGetParam(req.query.lastpokestops, true);
    const last_pokemon = convertGetParam(req.query.lastpokemon, true);
    const last_slocs = convertGetParam(req.query.lastslocs, true);
    const last_spawns = convertGetParam(req.query.lastspawns, false);
    
    // General/optional.
    // TODO: Check if "lured_only" is proper var name.
    const lured_only = convertGetParam(req.query.luredonly, true);
    
    
    /* Prepare response. */
    var response = {};
    
    // Values for next request.
    response.lastgyms = last_gyms;
    response.lastpokestops = last_pokestops;
    response.lastpokemon = last_pokemon;
    response.lastslocs = last_slocs;
    response.lastspawns = last_spawns;
    
    // Handle Pokémon.
    if (show_pokemon) {}
    
    // Handle Pokéstops.
    if (show_pokestops) {}
    
    // Handle gyms.
    if (show_gyms) {}
    
    res.send('Not implemented yet.');
});

// Helpers.
function convertGetParam(param, defaultVal) {
    // Undefined?
    if (typeof param === 'undefined')
        return defaultVal;
    
    // Ok, we have a value.
    var val = param;
    
    // Truthy/falsy strings?
    if (val === 'true')
        return true;
    else if (val === 'false')
        return false;
    
    // Rest is good to go.
    return val;
}

// Node.js.
module.exports = router;
