var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.get('/', function (req, res) {
    pickListInfo(req, res);
});

router.delete('/', function (req, res) {
    removeData(req, res);
});

module.exports = router;


function pickListInfo(req, res) {

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let partGrp = req.query.partGrp;
        var pickList = '';
     
    if (req.query.picklistNo) {
        pickList = `AND PICK_LIST='${req.query.picklistNo}'`;
    }
        var sqlStatement = `SELECT * FROM PICK_LIST_T WHERE PART_GRP='${partGrp}' ${pickList}`;
       // console.log(sqlStatement);
        conn.execute(sqlStatement
                , [], {
            outFormat: oracledb.OBJECT
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                if (result.rows.length === 0) {
                    //cb({err: 'No Active Picklist found for this Part Group'}, conn);
                    res.status(401).send({err: 'No Active Picklist found for this Part Group'});//Added for response set
                    cb(null, conn);
                } else {
                    let objArr = [];
                    result.rows.forEach(function (row) {
                        let obj = {};
                        obj.pickList = row.PICK_LIST;
                        obj.pickDate = row.PICK_DATE;
                        obj.invId = row.INVOICE_NUM;
                        obj.partNo = row.PART_NO;
                        obj.qty = row.QTY||0;
                        objArr.push(obj);
                    });
                    res.writeHead(200, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(objArr).replace(null, '"NULL"'));
                    cb(null, conn);
                }
            }
        });
    };

    async.waterfall(
            [
                doconnect,
                doSelect
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.writeHead(400, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(err));
                }
                if (conn)
                    dorelease(conn);
            });

}

function removeData(req, res) {
    let ts = new Date().getTime();
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    let bindVars = [req.query.pickListNo, 'Pick List', 'Delete', new Date(), req.query.locId, '', '', '', '', '', req.query.userId, '', 0, ts, '', '', req.query.partGrp, '', '',''];
    op.singleSQL(sqlStatement, bindVars, req, res);
}