var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

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

router.get('/checkBins', function (req, res) {
    doChkBins(req, res);
});
module.exports = router;

function getData(req, res) {

    /*Get the Search Parameters*/
    var binId = (req.query.binId || '%') ;
    var locId = (req.query.locId || '%') ;
    var status = (req.query.status || '%') ;
    var owner = (req.query.owner || '%') ;
    
    var invoice = '';
    var part = '';
    var pallet = '';
    var partGrp = '';


    if (req.query.invoice) {
        invoice = ` AND INVOICE LIKE '${req.query.invoice}%' `;
    }

    if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.pallet) {
        part = ` AND PALLET_ID LIKE '${req.query.pallet}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

     
    var sqlStatement = `SELECT * FROM BINS_T WHERE BIN_ID LIKE '${binId}' AND FROM_LOC LIKE '${locId}' AND STATUS LIKE '${status}' AND OWNER LIKE '${owner}' ${partGrp} ${invoice} ${part} ${pallet} AND ROWNUM<200`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function addData(req, res) {
    var sqlStatement = "INSERT INTO BINS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14) ";
    var bindVars = [req.body.binId, req.body.status, new Date(), req.body.locId, req.body.palletId, req.body.label, req.body.invoice, req.body.state, req.body.partNo, req.body.qty || 0, req.body.owner, req.body.seq || 0, req.body.partGrp,''];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function removeData(req, res) {
   // console.log('Request'+req.query.binId);
    var sqlStatement = "DELETE FROM BINS_T WHERE BIN_ID = (:1)";
    var bindVars = [req.query.binId];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function doChkBins(req, res) {
    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        binId = req.query.binId;
        partGrp = req.query.partGrp;
        let sqlStatement = `SELECT * FROM BINS_T WHERE BIN_ID='${binId}' AND PART_GRP='${partGrp}'`;
        let bindVars = [];
        //  console.log(bindVars.join());
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
               // console.log(sqlStatement);
                if (result.rows.length === 0) {
                    res.status(200).send({binId:false});
                    cb(null, conn);

                } else {
                    res.status(200).send({binId:true});
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
};

function updateData(req, res) {
    var sqlStatement = `UPDATE BINS_T
                SET STATE = :1 WHERE BIN_ID=:2`;
    var bindVars = [req.body.state, req.body.binId];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
