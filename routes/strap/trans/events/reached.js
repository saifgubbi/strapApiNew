var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

router.get('/lr', function (req, res) {
    getPendingLR(req, res);
});

router.post('/lrReached', function (req, res) {
    reached(req, res);
});

router.post('/geoReached', function (req, res) {
    geoReached(req, res);
});

module.exports = router;


function getPendingLR(req, res) {
    var locId = req.query.locId;
    var partGrp = req.query.partGrp;

    var sqlStatement = `SELECT LR_NO,DEVICE_ID,COUNT(*) COUNT,FROM_LOC,TO_LOC FROM INV_HDR_T WHERE STATUS='Dispatched' AND PART_GRP = '${partGrp}' AND TO_LOC='${locId}' GROUP BY LR_NO,DEVICE_ID,FROM_LOC,TO_LOC`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function reached(req, res) {

    let errArray = [];
    let doneArray = [];
    let sqlStatement;
    let bindArr = [];
    let lr = req.body.lr;
    let locId = req.body.locId;
    let userId = req.body.userId;
    let ts = new Date().getTime();
    let deviceId = req.body.deviceId;
    let partGrp = req.body.partGrp;


    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    var getInvoices = function (conn, cb) {
        let getInvSQL = `SELECT * FROM INV_HDR_T WHERE LR_NO = '${lr}' AND PART_GRP='${partGrp}' AND STATUS ='Dispatched'`;
        sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

        let bindVars = [];
        conn.execute(getInvSQL, bindVars, {
            autoCommit: true// Override the default non-autocommit behavior,
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                result.rows.forEach(function (row) {
                 //   console.log(row);
                    let binVars = [row[0], 'Invoice', 'Reached', new Date(), locId, '', '', '', 0, row[0], userId, '', 0, ts, null, null, partGrp, lr, deviceId, null];
                    bindArr.push(binVars);
                });
                cb(null, conn);
            }
        });
    };

    function doInsert(conn, cb) {
        //console.log("In  doInsert");
        let arrayCount = 1;
        async.eachSeries(bindArr, function (data, callback) {
            arrayCount++;
            //console.log("Inserting :", JSON.stringify(data));
            let insertStatement = sqlStatement;
            let bindVars = data;
            //  console.log(bindVars.join());
            conn.execute(insertStatement
                    , bindVars, {
                        autoCommit: true// Override the default non-autocommit behavior
                    }, function (err, result)
            {
                if (err) {
                    console.log("Error Occured: ", err);
                    errArray.push({row: arrayCount, err: err});
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected); // 1
                    doneArray.push({row: arrayCount});
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
                res.writeHead(500, {'Content-Type': 'application/json'});
                errArray.push({row: 0, err: err});
                res.end(`errorMsg:${err}}`);
            } else {
                res.writeHead(200);
                res.end(`{total : ${bindArr.length},success:${doneArray.length},error:${errArray.length},errorMsg:${errArray}}`);
            }
            cb(null, conn);
        }
        );
    }

    async.waterfall(
            [doConnect,
                getInvoices,
                doInsert
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(500).json({message: err});
                }
                console.log("Done Waterfall");
                if (conn)
                    conn.close();
            });
}




function geoReached(req, res) {

    let errArray = [];
    let doneArray = [];
    let sqlStatement;
    let bindArr = [];
    let lr = req.body.lr;
    let locId = req.body.locId;
    let userId = req.body.userId;
    let ts = new Date().getTime();
    let deviceId = req.body.deviceId;
    let partGrp = req.body.partGrp;

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    var getInvoices = function (conn, cb) {
        let getInvSQL = `SELECT * FROM INV_HDR_T WHERE LR_NO = '${lr}' AND PART_GRP='${partGrp}' AND STATUS ='Dispatched'`;
        sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

        let bindVars = [];
        conn.execute(getInvSQL, bindVars, {
            autoCommit: true// Override the default non-autocommit behavior
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                result.rows.forEach(function (row) {
                    let binVars = [row[0], 'Invoice', 'Reached', new Date(), locId, '', '', '', 0, row[0], userId, '', 0, ts, null, null, partGrp, lr, deviceId, null];
                    bindArr.push(binVars);
                });
                cb(null, conn);
            }
        });
    };

    function doInsert(conn, cb) {
        //console.log("In  doInsert");
        let arrayCount = 1;
        async.eachSeries(bindArr, function (data, callback) {
            arrayCount++;
        //    console.log("Inserting :", JSON.stringify(data));
            let insertStatement = sqlStatement;
            let bindVars = data;
            //  console.log(bindVars.join());
            conn.execute(insertStatement
                    , bindVars, {
                        autoCommit: true// Override the default non-autocommit behavior
                    }, function (err, result)
            {
                if (err) {
                    console.log("Error Occured: ", err);
                    errArray.push({row: arrayCount, err: err});
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected); // 1
                    doneArray.push({row: arrayCount});
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
                res.writeHead(500, {'Content-Type': 'application/json'});
                errArray.push({row: 0, err: err});
                res.end(`errorMsg:${err}}`);
            } else {
                res.writeHead(200);
                res.end(`{total : ${bindArr.length},success:${doneArray.length},error:${errArray.length},errorMsg:${errArray}}`);
            }
            cb(null, conn);
        }
        );
    }

    async.waterfall(
            [doConnect,
                getInvoices,
                doInsert
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(500).json({message: err});
                }
                console.log("Done Waterfall");
                if (conn)
                    conn.close();
            });
}