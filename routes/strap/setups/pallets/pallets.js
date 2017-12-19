var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');


router.get('/', function (req, res) {
    getData(req, res);
});
router.post('/', function (req, res) {
    addData(req, res);
});

router.delete('/', function (req, res) {
    removeData(req, res);
});

router.put('/', function (req, res) {
    updateData(req, res);
});

module.exports = router;


function getData(req, res) {
    var palletId = (req.query.palletId || '%') + '%';
    var locId = (req.query.locId || '%') + '%';
    var owner = (req.query.owner || '%') + '%';
    var status = (req.query.status || '%') + '%';
    var invoice = '';
    var part = '';
    var partGrp = '';

    if (req.query.invoice) {
        invoice = ` AND INVOICE LIKE '${req.query.invoice}%' `;
    }

    if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    var sqlStatement = `SELECT * FROM PALLETS_T WHERE PALLET_ID LIKE '${palletId}' AND FROM_LOC LIKE '${locId}' AND OWNER LIKE '${owner}' AND STATUS LIKE '${status}' ${partGrp} ${invoice} ${part}`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function addData(req, res) {
  //  console.log('Post');
    var sqlStatement = "INSERT INTO PALLETS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13)";
    var bindVars = [req.body.palletId, req.body.status, new Date(), req.body.locId, req.body.label, req.body.invoice, req.body.state, req.body.partNo, req.body.qty || 0, req.body.owner, req.body.seq || 0, req.body.partGrp,'Y'];
   // console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function removeData(req, res) {
    //console.log('Pallet '+req.query.palletId);
    var sqlStatement = "DELETE FROM PALLETS_T WHERE PALLET_ID = (:1)";
    var bindVars = [req.query.palletId];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function updateData(req, res) {
    var sqlStatement = `UPDATE PALLETS_T
                SET STATE = :1 WHERE PALLET_ID=:2`;
   // console.log(sqlStatement);
    var bindVars = [req.body.state, req.body.palletId];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
