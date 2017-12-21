var express = require('express');
var router = express.Router();

/*Track Routes*/
router.use('/test', require('./test'));

router.use('/bins', require('./setups/bins/bins'));
router.use('/binsUpload', require('./setups/bins/binsUpload'));

router.use('/pallets', require('./setups/pallets/pallets'));
router.use('/palletsUpload', require('./setups/pallets/palletsUpload'));

router.use('/partGrps', require('./setups/parts/partGrps'));
router.use('/parts', require('./setups/parts/parts'));
router.use('/partsUpload', require('./setups/parts/partsUpload'));

router.use('/locations', require('./setups/locations/locations'));
router.use('/users', require('./setups/users/users'));

router.use('/invoiceUpload', require('./trans/invoice/invUpload'));
router.use('/invoicePallet', require('./trans/invoice/invPallet'));
router.use('/invoiceList', require('./trans/invoice/invList'));
router.use('/invoicePickList', require('./trans/invoice/invPicklist'));
router.use('/invoiceLR', require('./trans/invoice/invLR'));
router.use('/invoiceAdd', require('./trans/invoice/invAdd'));

router.use('/asnUpload', require('./trans/asn/asnUpload'));
router.use('/asnList', require('./trans/asn/asnList'));
router.use('/asnAdd', require('./trans/asn/asnAdd'));

router.use('/schedUpload', require('./trans/sched/schedUpload'));
router.use('/schedList', require('./trans/sched/schedList'));

router.use('/serialUpload', require('./trans/serial/serialUpload'));
router.use('/serialList', require('./trans/serial/serialList'));

router.use('/palletize', require('./trans/palletize/palletize'));
router.use('/palletizeList', require('./trans/palletize/palletizeList'));

router.use('/events/release', require('./trans/events/release'));
router.use('/events/dispatch', require('./trans/events/dispatch'));
router.use('/events/reached', require('./trans/events/reached'));
router.use('/events/receive', require('./trans/events/receive'));
router.use('/events/picked_qty', require('./trans/events/picked_qty'));
router.use('/events/picked_ser', require('./trans/events/picked_ser'));
router.use('/events/assignASN', require('./trans/events/assignASN'));
router.use('/events/transfer', require('./trans/events/transfer'));

router.use('/pickListAdd', require('./trans/pickList/pickListAdd'));
router.use('/pickList', require('./trans/pickList/pickList'));

router.use('/dashboard', require('./dashboard'));
router.use('/inquiry', require('./inquiry'));
router.use('/home', require('./home'));

router.get('/', function (req, res) {
    res.send('Welcome to  Shipment Tracking Apis!');
});

module.exports = router;