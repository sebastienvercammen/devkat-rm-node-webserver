var utils = {
    // Log to console w/ a timestamp.
    log: function(txt) {
        var time = new Date()
            .toLocaleString('nl-BE')
            .split(' ')[1];
        console.log('[' + time + '] ' + txt);
    },

    // Generic error log & exit.
    handle_error: function(err) {
        console.error(err);
        process.exit(1);
    },
    
    // Readability methods.
    isUndefined: function(val) {
        return (typeof val === 'undefined');
    },
    
    // TODO: Figure out better name than "isEmpty".
    isEmpty: function(val) {
        return (utils.isUndefined(val) || val === null || val === '');
    },
    
    // Check if a string is numeric (e.g. for GET params).
    isNumeric: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
};

module.exports = utils;