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


function addData1(req, res) {
    var sqlStatement = "INSERT INTO BINS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14) ";
    var bindVars = [req.body.binId, req.body.status, new Date(), req.body.locId, req.body.palletId, req.body.label, req.body.invoice, req.body.state, req.body.partNo, req.body.qty || 0, req.body.owner, req.body.seq || 0, req.body.partGrp,''];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

//function addData2(req, res) {
//    let userId = req.body.userId;
//    let partGrp = req.body.partGrp;
//    let ts = new Date().getTime();
//
//    //let bindArr = [];
//    let sqlStatement = "INSERT INTO BINS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14)";
//
//   // req.body.invArr.forEach(function (obj) {
//        var bindArr = [req.body.binId, req.body.status, new Date(), req.body.locId, req.body.palletId, req.body.label, req.body.invoice, req.body.state, req.body.partNo, req.body.qty || 0, req.body.owner, req.body.seq || 0, req.body.partGrp,''];
//   //     bindArr.push(binVars);
//   // });
//    insertEvents(req, res, sqlStatement, bindArr);
//}
//
//function insertEvents(req, res, sqlStatement, bindArr) {
//
//    let errArray = [];
//    let doneArray = [];
//
//    var doConnect = function (cb) {
//        op.doConnectCB(function (err, conn) {
//            cb(null, conn);
//        });
//    };
//
//    function doInsert(conn, cb) {
//        let arrayCount = 1;
//        async.eachSeries(bindArr, function (data, callback) {
//            arrayCount++;
//            let insertStatement = sqlStatement;
//            let bindVars = data;
//            conn.execute(insertStatement
//                    , bindVars, {
//                        autoCommit: true// Override the default non-autocommit behavior
//                    }, function (err, result)
//            {
//                if (err) {
//                    console.log("Error Occured: ", err);
//                    errArray.push({row: arrayCount, err: err});
//                    callback();
//                } else {
//                    console.log("Rows inserted: " + result.rowsAffected); // 1
//                    doneArray.push({row: arrayCount});
//                    callback();
//                }
//            });
//        }, function (err) {
//            if (err) {
//                console.log("Event Insert Error");
//                res.writeHead(500, {'Content-Type': 'application/json'});
//                errArray.push({row: 0, err: err});
//                res.end(`errorMsg:${err}}`);
//            } else {
//                res.writeHead(200);
//                res.end(`{total : ${bindArr.length},success:${doneArray.length},error:${errArray.length},errorMsg:${errArray}}`);
//            }
//            cb(null, conn);
//        }
//        );
//    }
//
//    async.waterfall(
//            [doConnect,
//                doInsert
//            ],
//            function (err, conn) {
//                if (err) {
//                    console.error("In waterfall error cb: ==>", err, "<==");
//                    res.status(500).json({message: err});
//                }
//                console.log("Done Waterfall");
//                if (conn)
//                    conn.close();
//            });
//}

//function addData(req, res) {
//
//    var doconnect = function (cb) {
//        op.doConnectCB(cb);
//    };
//
//    var dorelease = function (conn) {
//        conn.close();
//    };
//    
//    var chkBin =
//    var doSelect = function (conn, cb) {       
//
//            let sqlStatement = `SELECT * FROM ${table} WHERE ${idLabel}='${req.query.id}'`;
//            //console.log(sqlStatement);
//            conn.execute(sqlStatement
//                    , [], {
//                outFormat: oracledb.OBJECT
//            }, function (err, result)
//            {
//                if (err) {
//                    cb(err, conn);
//                } else {
//                    if (result.rows.length === 0) {
//                        res.status(401).send({'err': 'ID not found in ' + table});//Added for response set
//                        cb(null, conn);
//                    } else {
//                        let idDet = {};
//                        result.rows.forEach(function (row) {
//                            idDet.id = row.BIN_ID || row.PALLET_ID;
//                            idDet.status = row.STATUS;
//                            idDet.partNo = row.PART_NO||'NULL';
//                            idDet.fromLoc = row.FROM_LOC;
//                            idDet.type = type;
//                            idDet.qty = row.QTY || 0;
//                            idDet.owner = row.OWNER;
//                            idDet.invoice = row.INVOICE_NUM||'NULL';
//                            idDet.partGrp = row.PART_GROUP;
//                            if (type === 'Bin')
//                            {
//                            idDet.palletId = row.PALLET_ID||'NULL';
//                             }
//                        });
//                        res.writeHead(200, {'Content-Type': 'application/json'});
//                        res.end(JSON.stringify(idDet).replace(null, '"NULL"'));
//                        cb(null, conn);
//                    }
//                }
//            });
//        }
//    };
//
//    async.waterfall(
//            [
//                doconnect,
//                doSelect
//            ],
//            function (err, conn) {
//                if (err) {
//                    console.error("In waterfall error cb: ==>", err, "<==");
//                    res.writeHead(400, {'Content-Type': 'application/json'});
//                    res.end(JSON.stringify(err));
//                    if (conn)
//                    {
//                        dorelease(conn);
//                    }
//                }
//                if (conn)
//                {
//                    dorelease(conn);
//                }
//            });
//
//}

function removeData(req, res) {
   // console.log('Request'+req.query.binId);
    var sqlStatement = "DELETE FROM BINS_T WHERE BIN_ID = (:1)";
    var bindVars = [req.query.binId];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function updateData(req, res) {
    var sqlStatement = `UPDATE BINS_T
                SET STATE = :1 WHERE BIN_ID=:2`;
    var bindVars = [req.body.state, req.body.binId];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
