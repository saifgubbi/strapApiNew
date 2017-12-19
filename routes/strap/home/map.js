var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getGeoLoc(req, res);
});


module.exports = router;

function getGeoLoc(req, res) {
    var request = require('request');
    var geoRes = {loc: [], dev: []};
    let devArr = [];

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getLoc(conn, cb) {
       // console.log("Getting List");

        let selectStatement = `SELECT LOC_ID,TYPE,LAT,LON FROM LOCATIONS_T`;
        //console.log(selectStatement);

        let bindVars = [];

        conn.execute(selectStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT, // Return the result as Object
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.log("Error Occured: ", err);
                cb(err, conn);
            } else {
                result.rows.forEach(function (row) {
                    geoRes.loc.push(row);
                });

                cb(null, conn);
            }
        });

    }

    function getDev(conn, cb) {
       // console.log("Getting List");

        let selectStatement = `SELECT DISTINCT DEVICE_ID as "deviceID",count(1) INV_COUNT FROM INV_HDR_T where status in ('Dispatched') group by DEVICE_ID`;
       // console.log(selectStatement);

        let bindVars = [];

        conn.execute(selectStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT, // Return the result as Object
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.log("Error Occured: ", err);
                cb(err, conn);
            } else {
                devArr = result.rows;
                console.log(devArr);
            };

            cb(null, conn);
        });

    }
    ;


    function getDevLoc(conn, cb) {
        console.log(devArr.deviceID);
         async.eachSeries(devArr, function (data, callback) {
            request('http://l.tigerjump.in/tjbosch/getDeviceLocation?key=15785072&deviceID=' + data.deviceID, function (err, response, result) {
            //    console.log(result);
                if (err) {
                    callback();
                } else {
             //       console.log(result);
                    try {
                        let apiResp = JSON.parse(result);
                        apiResp.data.count = data.INV_COUNT;
                        geoRes.dev.push(apiResp);
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
                console.log(geoRes);
                res.end(JSON.stringify(geoRes));
            }
            cb(null, conn);
        }
        );
        }  

    async.waterfall(
            [doConnect,
                getLoc,
                getDev,
                getDevLoc
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
