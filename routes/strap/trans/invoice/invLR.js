var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');
var moment = require('moment');

router.put('/', function (req, res) {
    updateLR(req, res);
});

router.get('/', function (req, res) {
    getInvList(req, res);
});

router.get('/device', function (req, res) {
    getDeviceStatus(req, res);
});

router.get('/devList', function (req, res) {
    getDevList(req, res);
});

module.exports = router;

function updateLR(req, res) {
    var invId = req.body.invId;
    var locId = req.body.locId;
    var userId = req.body.userId;
    var partGrp = req.body.partGrp;
    var lr = req.body.lr;
    var deviceId = req.body.deviceId;
    let ts = new Date().getTime();

    let bindArr = [];
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    //console.log(req.body.invArray);
    req.body.invArray.forEach(function (obj) {
        //console.log(obj);
        let bindVars = [obj, 'Invoice', 'LR Assigned', new Date(), locId, '', '', '', '', invId, userId, '', 0, ts, '', '', partGrp, lr, deviceId, null];
        bindArr.push(bindVars);
    });
    insertEvents(req, res, sqlStatement, bindArr);
}



function insertEvents(req, res, sqlStatement, bindArr) {

    let errArray = [];
    let doneArray = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };

    function doUpdate(conn, cb) {
        //console.log("In  doUpdate");
        async.eachSeries(bindArr, function (data, callback) {
            let updateStatement = `UPDATE INV_HDR_T
                                      SET STATUS=:3,
                                          LR_NO =:18,
                                          DEVICE_ID =:19,
		                          STATUS_DT=:4
                                    WHERE INVOICE_NUM=:NEW.EVENT_ID`;
            let bindVars = data;
            conn.execute(updateStatement
                    , bindVars, {
                        autoCommit: true// Override the default non-autocommit behavior
                    }, function (err, result)
            {
                if (err) {
                    console.log("Error Occured: ", err);
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected);
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
            } else {
                // res.writeHead(200);
                // res.end(`{total : ${bindArr.length},success:${doneArray.length},error:${errArray.length},errorMsg:${errArray}}`);
            }
            cb(null, conn);
        }
        );
    }

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

function  getInvList(req, res) {
    var invId = (req.query.invId || '%') + '%';
    var fromLoc = (req.query.fromLoc || '%') + '%';
    var toLoc = (req.query.toLoc || '%') + '%';
    var status = (req.query.status || '%') + '%';
    var partNo = (req.query.partNo || '%') + '%';
    var partGrp = req.query.partGrp;
    var invDt = '';
    var lr = '';

    if (req.query.invDt) {
        invDt = `AND TRUNC(A.INV_DT) = '${moment(req.query.invDt).format("DD-MMM-YYYY")}'`;
    }

    if (req.query.lr) {
        lr = ` AND LR LIKE '${req.query.lr}%' `;
    }
    var sqlStatement = `SELECT * FROM INV_HDR_T A,INV_LINE_T B  WHERE A.INVOICE_NUM LIKE '${invId}' AND A.FROM_LOC LIKE '${fromLoc}' AND A.TO_LOC LIKE '${toLoc}' AND A.STATUS LIKE '${status}' AND                         
                        A.INVOICE_NUM=B.INVOICE_NUM AND A.INV_DT=B.INV_DT AND B.PART_NO LIKE '${partNo}' AND A.PART_GRP = '${partGrp}'  ${lr} ${invDt}`;
    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getDeviceStatus(req, res) {
    var devId = req.query.devId;
    var request = require('request');
    let ts = new Date().getTime();
    let devArr = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getDevLoc(conn, cb) {
        devArr = [];
        var devID = [devId];
        async.each(devID, function (data, callback) {
            request('http://l.tigerjump.in/tjbosch/getDeviceLocation?key=15785072&deviceID=' + data, function (err, response, result) {
                console.log(data);
                if (err) {
                    callback();
                } else {
                    try {
                        var apiResp = JSON.parse(result);
                        let devTime = apiResp.data.lastGpsTimeInMs * 1000;
                        let diffTime = ts - devTime;
                        let vArr = {};
                        if (diffTime <= 180000)
                        {
                            vArr.status = 'Active';
                            vArr.lastGpsTimeInMs = apiResp.data.lastGpsTimeInMs * 1000;
                            vArr.batteryLevel = apiResp.data.batteryLevel;
                        } else
                        {
                            vArr.status = 'Inactive';
                            vArr.lastGpsTimeInMs = apiResp.data.lastGpsTimeInMs * 1000;
                            vArr.batteryLevel = apiResp.data.batteryLevel;
                        }

                        devArr.push(vArr);
                    } catch (err) {
                        console.log(err);
                    }
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("API Error");
                res.writeHead(500, {'Content-Type': 'application/json'});
                res.end(err);
            } else {
                res.writeHead(200, {'Content-Type': 'application/json'});
                console.log(devArr);
                res.end(JSON.stringify(devArr));
            }
            cb(null, conn);
        });
    }

    async.waterfall(
            [doConnect,
                getDevLoc
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(500).json({message: err});
                }
                console.log("Done Waterfall");
                if (conn)
                {
                    conn.close();
                }
            });

}

function  getDevList(req, res) {
    
    var partGrp = req.query.partGrp;

   
    var sqlStatement = `SELECT device_no FROM DEVICE_T WHERE PART_GRP = '${partGrp}' AND ACTIVE='Y'`;
    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}