/*
    Blacklist fingerprinting methods. They receive the restify request object as
    argument and return true when a blacklisted fingerprint matches.
*/

const blacklist = {};

// No referrer = request w/o being on a website.
blacklist.no_referrer = (req) => {
    return req.header('Referer', false) === false;
};

// iPokeGo.
blacklist.iPokeGo = (req) => {
    const agent = req.header('User-Agent', '');
    return agent.toLowerCase().indexOf('ipokego') > -1;
};

module.exports = blacklist;
