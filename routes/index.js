var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
  res.redirect('/bbs');
});

module.exports = router;
