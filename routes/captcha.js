var express = require('express');
var router = express.Router();

router.get('/bookmarklet', function (req, res) {
    res.send('Not implemented yet.');
});

router.get('/inject.js', function (req, res) {
    res.send('Not implemented yet.');
});

router.get('/submit_token', function (req, res) {
    res.send('Not implemented yet.');
});

module.exports = router;