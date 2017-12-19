var express = require('express');
var router = express.Router();

router.use('/invoice', require('./invoice'));
router.use('/serial', require('./serial'));
router.use('/summary', require('./summary'));
module.exports = router;