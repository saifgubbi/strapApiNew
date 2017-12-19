var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var moment = require('moment');

router.get('/', function (req, res) {
    getData(req, res);
});

router.delete('/', function (req, res) {
    removeData(req, res);
});

//router.post('/', function (req, res) {
//    addData(req, res);
//});
module.exports = router;


function getData(req, res) {
    var asnId = (req.query.asnId || '%') + '%';
    var invId = (req.query.invId || '%') + '%';
    var partNo = (req.query.partNo || '%') + '%';
    var partGrp = req.query.partGrp;
    var asnDt = '';

    if (req.query.asnDt) {
        asnDt = `AND ASN_DATE = '${moment(req.query.asnDt).format("DD-MMM-YYYY")}'`;
    }

    var sqlStatement = `SELECT * FROM ASN_T WHERE ASN_ID LIKE '${asnId}' ${asnDt} AND INVOICE_NUM LIKE '${invId}' AND (PART_NO LIKE '${partNo}' OR CUST_PART_NO LIKE '${partNo}') AND PART_GRP='${partGrp}' ORDER BY ASN_DATE DESC`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function removeData(req, res) {
    let ts = new Date().getTime();
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    let bindVars = [req.query.invId, 'Invoice', 'ASN Delete', new Date(), req.query.locId, '', '', '', '', req.query.invId, req.query.userId, '', 0, ts, '', req.query.asnId, req.query.partGrp, '', '',''];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

//function addData(req, res) {
//     let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
//     let bindVars = [req.query.invId, 'Invoice', 'ASN Assigned', new Date(), req.query.fromLoc, req.query.toLoc, '', req.query.partNo, req.query.qty, req.query.invId, req.body.query, 1, 0,  new Date().getTime(), '', '', req.query.partGrp, '', '',''];
//     console.log("Inserting :", bindVars.join());
//     op.singleSQL(sqlStatement, bindVars, req, res);
//    };