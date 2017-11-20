/*
    Blacklist fingerprinting methods. They receive the restify request object as
    argument and return true when a blacklisted fingerprint matches.
*/

const blacklist = {};

// No referrer = request w/o being on a website.
blacklist.no_referrer = (req) => {};

// iPokeGo.
blacklist.iPokeGo = (req) => {

};

module.exports = blacklist;
