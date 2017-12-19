var express = require('express');
var router = express.Router();


router.use('/parts', require('./parts'));
router.use('/invoices', require('./invoices'));
router.use('/bins', require('./bins'));
router.use('/sched', require('./sched'));
router.use('/aging', require('./aging'));



module.exports = router;