var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var moment = require('moment');

router.get('/', function (req, res) {
    getData(req, res);
});

router.delete('/', function (req, res) {
    removeInv(req, res);
});

router.post('/', function (req, res) {
    addData(req, res);
});

router.put('/', function (req, res) {
    updateData(req, res);
});

module.exports = router;

function getData(req, res) {
    var invId = (req.query.invId || '%') + '%';
    var fromLoc = (req.query.fromLoc || '%') + '%';
    var toLoc = (req.query.toLoc || '%') + '%';
    var status = (req.query.status || '%') + '%';
    var partNo = (req.query.partNo || '%') + '%';
    //var invDt = (req.query.invDt);
    var partGrp = req.query.partGrp;

    var lr = '';
    if (req.query.lr) {
        lr = ` AND LR_NO LIKE '${req.query.lr}%' `;
    }
    var invDt = '';

    if (req.query.invDt) {
        invDt = `AND TRUNC(A.INV_DT)= '${moment(req.query.invDt).format("DD-MMM-YYYY")}'`;
    }
    var sqlStatement = `SELECT * FROM INV_HDR_T A,INV_LINE_T B  WHERE A.INVOICE_NUM LIKE '${invId}' ${invDt}  AND A.FROM_LOC LIKE '${fromLoc}' AND A.TO_LOC LIKE '${toLoc}' AND A.STATUS LIKE '${status}' AND                         
                        A.INVOICE_NUM=B.INVOICE_NUM AND A.INV_DT=B.INV_DT AND B.PART_NO LIKE '${partNo}' AND A.PART_GRP = '${partGrp}'${lr} `;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function removeInv(req, res) {
    let invId = req.query.invId;
    let partGrp = req.query.partGrp;
    let userId = req.query.userId;
     let locId = req.query.locId;
    let ts = new Date().getTime();
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    let bindVars = [invId, 'Invoice', 'Delete', new Date(), locId, '', '', '', '', invId, userId, '', 0, ts, '', '', partGrp, '', '',''];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function addData(req, res) {
     let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
      let bindVars = [req.body.invId, 'Invoice', 'Add', new Date(), req.body.fromLoc, req.body.toLoc, '', req.body.partNo, req.body.qty, req.body.invId, req.body.userId, 1, 0,  new Date().getTime(), '', '', req.body.partGrp, '', '',''];
     op.singleSQL(sqlStatement, bindVars, req, res);
    };

function updateData(req, res) {
    var sqlStatement = `UPDATE INV_HDR_T IH
                           SET IH.FROM_LOC =:1,
                               IH.TO_LOC =:2
                          WHERE IH.STATUS='New'
                            AND IH.INVOICE_NUM=:3
                            AND IH.PART_GRP=:4`;
    
    var sqlStatement1 = `UPDATE INV_LINE_T IL
                           SET  IL.PART_NO=:1,
                                IL.QTY=:2
                          WHERE IL.INVOICE_NUM=:3
                            AND IL.PART_GRP=:4
                            AND EXISTS(SELECT 1 FROM INV_HDR_T
                                        WHERE INVOICE_NUM=IL.INVOICE_NUM
                                          AND STATUS='New')`;
    var bindVars = [req.body.fromLoc, req.body.toLoc,req.body.invId,req.body.partGrp];
    var bindVars1 = [req.body.partNo,req.body.qty,req.body.invId,req.body.partGrp];
    op.singleSQL(sqlStatement, bindVars, req, res);
    op.singleSQL(sqlStatement1, bindVars1, req, res);
}