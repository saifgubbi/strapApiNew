var express = require('express');
var router = express.Router();


router.use('/user', require('./user'));
router.use('/invoices', require('./invoices'));
router.use('/parts', require('./parts'));
router.use('/notification', require('./notification'));
router.use('/map', require('./map'));
router.use('/sched', require('./sched'));
module.exports = router;