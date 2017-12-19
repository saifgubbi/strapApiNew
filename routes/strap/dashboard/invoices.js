var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/status', function (req, res) {
    getInvList(req, res);
});

router.get('/allInvoice', function (req, res) {
    getInvAll(req, res);
});

router.get('/history', function (req, res) {
    getInvHist(req, res);
});

router.get('/current', function (req, res) {
    getInvCur(req, res);
});

router.get('/geoLoc', function (req, res) {
    getGeoLoc(req, res);
});


module.exports = router;

function getData(req, res) {

    var partGrp = req.query.partGrp;
    var locType = req.query.locType;
    var invRes = {invSeries: []};

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
        //console.log("Getting Header");

        let selectStatement = `SELECT STATUS,
                                      COUNT(STATUS) AS COUNT 
                                 FROM INV_HDR_T A , LOCATIONS_T L 
                                WHERE (INVOICE_NUM,INV_DT) IN (SELECT INVOICE_NUM,INV_DT 
                                                                 FROM INV_LINE_T B,PARTS_T C 
                                                                WHERE B.PART_NO=C.PART_NO 
                                                                  AND C.PART_GRP='${partGrp}'
                                                                  AND B.PART_GRP =C.PART_GRP
                                                               ) 
                                  AND A.from_loc=L.LOC_ID 
                                  AND L.TYPE='${locType}' 
                                  AND A.PART_GRP='${partGrp}'
                                  AND A.STATUS <> L.CLOSE_STATUS
                                  GROUP BY STATUS`;

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
                    var invStatObj = {name: row.STATUS, items: [{value: row.COUNT, label: row.COUNT}]};
                    invRes.invSeries.push(invStatObj);
                });
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(invRes));
                cb(null, conn);
            }

        });

    }

    async.waterfall(
            [doConnect,
                getHdr
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


function getInvAll(req, res) {

    var partGrp = req.query.partGrp;
    var locType = req.query.locType;

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
        //console.log("Getting List");

        let selectStatement = `SELECT * 
                                 FROM INV_HDR_T A,
	                              INV_LINE_T B,
		                      LOCATIONS_T L  
                                WHERE A.INVOICE_NUM=B.INVOICE_NUM 
	                          AND A.INV_DT=B.INV_DT 
	                          AND PART_NO IN
                                                 (SELECT PART_NO 
				                    FROM PARTS_T 
					           WHERE PART_GRP='${partGrp}'
                                                  ) 
	                          AND A.from_loc=L.LOC_ID 
	                          AND L.TYPE='${locType}'
                                  AND B.PART_GRP='${partGrp}'
                                  AND B.PART_GRP=A.PART_GRP
	                          AND A.STATUS <> L.CLOSE_STATUS`;
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
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(result.rows));
                cb(null, conn);
            }
        });

    }

    async.waterfall(
            [doConnect,
                getHdr
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


function getInvList(req, res) {

    var partGrp = req.query.partGrp;
    var status = req.query.status;
    var locType = req.query.locType;

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
        //console.log("Getting List");

        let selectStatement = `SELECT * 
                                 FROM INV_HDR_T A,
	                              INV_LINE_T B,
		                      LOCATIONS_T L  
                                WHERE A.INVOICE_NUM=B.INVOICE_NUM 
	                          AND A.INV_DT=B.INV_DT 
	                          AND STATUS = '${status}' 
	                          AND PART_NO IN
                                                 (SELECT PART_NO 
				                    FROM PARTS_T 
					           WHERE PART_GRP='${partGrp}'
                                                  ) 
	                          AND A.from_loc=L.LOC_ID 
	                          AND L.TYPE='${locType}' 
                                  AND B.PART_GRP='${partGrp}'
                                  AND A.PART_GRP=B.PART_GRP
	                          AND A.STATUS <> L.CLOSE_STATUS`;
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
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(result.rows));
                cb(null, conn);
            }
        });

    }


    async.waterfall(
            [doConnect,
                getHdr
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



function getInvHist(req, res) {

    var partGrp = req.query.partGrp;
    var invId = req.query.invId;
    //var invDt = moment(req.query.invDt).format("DD-MMM-YYYY");
    var role = req.query.role;
    var locType = req.query.locType;
    var invRes = {inv: {}, events: []};

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
        //console.log("Getting List");
        let selectStatement = `SELECT A.* ,B.PART_NO,B.QTY
                                 FROM INV_HDR_T A,
                                      INV_LINE_T B,
		                      LOCATIONS_T L,
                                      USERS_T U 
                                WHERE A.INVOICE_NUM = '${invId}'
                                  AND A.INVOICE_NUM=B.INVOICE_NUM 
                                  AND A.INV_DT=B.INV_DT 
                                  AND L.TYPE='${locType}' 
                                  AND A.from_loc=L.LOC_ID 
                                  AND B.PART_NO IN(
                                                   SELECT PART_NO 
				                     FROM PARTS_T 
					            WHERE PART_GRP='${partGrp}'
					           )
                                  AND ((U.ROLE <>'Admin'
                                  AND L.LOC_ID=U.LOC_ID)
                                  OR (U.ROLE = 'Admin'))
                                  AND A.PART_GRP='${partGrp}'
                                  AND A.PART_GRP=B.PART_GRP
                                  AND B.PART_GRP=U.PART_GRP
                                  AND U.ROLE='${role}'`;

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
                    invRes.inv = row;
                });

                cb(null, conn);
            }
        });

    }

    function getEvents(conn, cb) {
        //console.log("Getting List");

        let selectStatement = `SELECT A.* 
                                 FROM EVENTS_T A,INV_HDR_T IH,LOCATIONS_T L
                                WHERE A.EVENT_TYPE = 'Invoice' 
                                  AND A.EVENT_ID='${invId}'
                                  AND A.EVENT_ID=IH.INVOICE_NUM
                                  AND IH.FROM_LOC = L.LOC_ID
                                  AND L.TYPE='${locType}' 
                             ORDER BY A.EVENT_TS DESC`;
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
                    var resObj = row;
                    var desc = '';
                    desc = ((row.LABEL) ? "Label :" + row.LABEL + "\n" : '')
                            + ((row.PART_NO) ? "Part :" + row.PART_NO + "\n" : '')
                            + ((row.USER_ID) ? "User :" + row.USER_ID + "\n" : '')
                            + ((row.COMMENTS) ? "Misc :" + row.COMMENTS + "\n" : '');
                    resObj.DESC = desc;
                    invRes.events.push(resObj);
                });

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(invRes));
                cb(null, conn);
            }
        });

    }

    async.waterfall(
            [doConnect,
                getHdr,
                getEvents
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


function getGeoLoc1(req, res) {
    var request = require('request');
    var partGrp = req.query.partGrp;
    var invId = req.query.invId;
    var geoRes = {inv: {}, curr: {}};
    var locType = req.query.locType;

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getInvLoc(conn, cb) {
        //console.log("Getting List");

        let selectStatement = `SELECT DEVICE_ID as "deviceID",
                                      B.LAT AS "srcLat",
                                      B.LON AS "srcLang",
	                              C.LAT AS "destLat",
                                      C.LON AS "destLang"
                                 FROM INV_HDR_T A,LOCATIONS_T B,LOCATIONS_T C 
                                WHERE A.INVOICE_NUM = '${invId}' 
                                  AND A.PART_GRP= '${partGrp}' 
                                  AND B.TYPE='${locType}' 
                                  AND A.FROM_LOC=B.LOC_ID 
                                  AND A.TO_LOC=C.LOC_ID`;
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
                    geoRes.inv = row;
                });

                cb(null, conn);
            }
        });

    }


    function getCurrentLoc(conn, cb) {
        console.log(geoRes.inv.deviceID);
        request('http://l.tigerjump.in/tjbosch/getDeviceLocation?key=15785072&deviceID=' + geoRes.inv.deviceID, function (err, response, result) {
           // console.log(result);
            if (err) {
                cb(err, conn);
            } else {
               // console.log(result);
                res.writeHead(200, {'Content-Type': 'application/json'});
                try {
                    geoRes.curr = JSON.parse(result);
                } catch (err) {
                    geoRes.curr = {};
                }
                res.end(JSON.stringify(geoRes));
                cb(null, conn);
            }
        });
    }

    async.waterfall(
            [doConnect,
                getInvLoc,
                getCurrentLoc
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

function getGeoLoc(req, res) {
    var request = require('request');
    var partGrp = req.query.partGrp;
    var invId = req.query.invId;
    var locType = req.query.locType;
    var geoRes = {inv: {}, dev: {}, cur: {}};
    var mapArr = {};

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getInvLoc(conn, cb) {
        //console.log("Getting List");

        let selectStatement = `SELECT DEVICE_ID as "deviceID",
                                      B.LAT AS "srcLat",
                                      B.LON AS "srcLang",
	                              C.LAT AS "destLat",
                                      C.LON AS "destLang"
                                 FROM INV_HDR_T A,LOCATIONS_T B,LOCATIONS_T C 
                                WHERE A.INVOICE_NUM = '${invId}' 
                                  AND A.part_grp= '${partGrp}' 
                                  AND B.TYPE='${locType}'
                                  AND A.FROM_LOC=B.LOC_ID 
                                  AND A.TO_LOC=C.LOC_ID`;
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
                    geoRes.inv = row;
                });

                cb(null, conn);
            }
        });

    }


    function getCurrentLoc(conn, cb) {
        console.log(geoRes.inv.deviceID);
        request('http://l.tigerjump.in/tjbosch/getDeviceLocation?key=15785072&deviceID=' + geoRes.inv.deviceID, function (err, response, result) {
           // console.log(result);
            if (err) {
                cb(err, conn);
            } else {
                // console.log(result);
                res.writeHead(200, {'Content-Type': 'application/json'});
                try {
                    geoRes.dev = JSON.parse(result);
                } catch (err) {
                    geoRes.dev = {};
                }
                cb(null, conn);
            }

        });
    }

    function getCurrentLoc1(conn, cb) {
       //console.log(geoRes.dev.data);
       if (geoRes.dev.data)
       {
           console.log('inside if');
                  request('https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins='
                + geoRes.dev.data.lastLat + ',' + geoRes.dev.data.lastLang +
                '&destinations=' + geoRes.inv.destLat + ',' + geoRes.inv.destLang +
                '\&key=AIzaSyA3P7PPCNhDvpgBwcmaLVZxPlnqoCVSd7M', function (err, response, result) {

                   // console.log(result);
                    if (err) {
                        cb(err, conn);
                    } else {
                        try {
                            geoRes.cur = JSON.parse(result);
                            res.end(JSON.stringify(geoRes));
                            cb(null, conn);
                        } catch (err) {
                            console.log(err);
                            geoRes.cur = {};
                            res.end(JSON.stringify(geoRes));
                            cb(null, conn);
                        }
                    }
                });
       }
       else
       {
            geoRes.cur = {};
           res.end(JSON.stringify(geoRes));
           cb(null, conn);
         //   console.log('inside else');
 
    }
    }

    async.waterfall(
            [doConnect,
                getInvLoc,
                getCurrentLoc,
                getCurrentLoc1
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(500).json({message: err});
                    conn.close();
                }
                console.log("Done Waterfall");
                if (conn)
                {
                    conn.close();
                }
            });

}


function getInvCur(req, res) {

    var partGrp = req.query.partGrp;
    var invId = req.query.invId;
    var locType = req.query.locType;
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
       // console.log("Getting List");

        let selectStatement = `SELECT EVENT_ID,CREATION_DT,EVENT_NAME,CURR_LOC,FROM_LOC,TO_LOC,PERCENTAGE, EXPECTED_DT
                               FROM(
                                     SELECT EVENT_ID,(SELECT INV_DT FROM INV_HDR_T WHERE INVOICE_NUM=E.EVENT_ID AND FROM_LOC=L.LOC_ID) CREATION_DT,
                                                     DECODE(EVENT_NAME,'Received',(SELECT STATUS_DT FROM INV_HDR_T WHERE INVOICE_NUM=E.EVENT_ID AND FROM_LOC=L.LOC_ID),
                                                                       'Reached',(SELECT STATUS_DT FROM INV_HDR_T WHERE INVOICE_NUM=E.EVENT_ID AND FROM_LOC=L.LOC_ID),
                                                                        (SELECT STATUS_DT+1 FROM INV_HDR_T WHERE INVOICE_NUM=E.EVENT_ID AND FROM_LOC=L.LOC_ID)) EXPECTED_DT, 
                                                     E.EVENT_NAME,E.FROM_LOC CURR_LOC,
                                                     (SELECT IH.FROM_LOC FROM INV_HDR_T WHERE INVOICE_NUM=E.EVENT_ID AND FROM_LOC=L.LOC_ID) FROM_LOC,
                                                     (SELECT IH.TO_LOC FROM INV_HDR_T WHERE INVOICE_NUM=E.EVENT_ID AND FROM_LOC=L.LOC_ID) TO_LOC,
                                           CASE WHEN E.FROM_LOC= '1760' AND EVENT_NAME='Add' THEN 0 
                                                WHEN E.FROM_LOC= 'W720' AND EVENT_NAME='Add' THEN 0
                                                WHEN E.FROM_LOC= '1760' THEN 10 
                                                WHEN E.FROM_LOC= 'BOMM' THEN 20
                                                WHEN E.FROM_LOC= 'HOSUR' THEN 30
                                                WHEN E.FROM_LOC= 'KGIRI' THEN 50
                                                WHEN E.FROM_LOC= 'VLLR' THEN 70
                                                WHEN E.FROM_LOC= 'W720'  AND EVENT_NAME='Reached' THEN 90
                                                WHEN E.FROM_LOC= 'HMIL'  AND EVENT_NAME='Reached' THEN 100
                                                WHEN E.FROM_LOC= 'W720'  AND EVENT_NAME='Received' THEN 100
                                                WHEN E.FROM_LOC= 'HMIL'  AND EVENT_NAME='Received' THEN 100
                                            END PERCENTAGE,EVENT_DATE                   
                                       FROM EVENTS_T E,INV_HDR_T IH,LOCATIONS_T L 
                                      WHERE E.EVENT_ID='${invId}'
                                        AND E.EVENT_ID=IH.INVOICE_NUM
                                        AND IH.FROM_LOC = L.LOC_ID
                                        AND L.TYPE='${locType}' 
                                        AND E.PART_GRP= '${partGrp}' 
                                        AND E.PART_GRP=IH.PART_GRP
                                    order by EVENT_TS DESC
                                    )
                                WHERE ROWNUM=1`;
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
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(result.rows));
                cb(null, conn);
            }
        });

    }

    async.waterfall(
            [doConnect,
                getHdr
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