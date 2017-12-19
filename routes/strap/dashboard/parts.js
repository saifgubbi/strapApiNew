var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/partsDet', function (req, res) {
    getPartsDet(req, res);
});

router.get('/searchPart', function (req, res) {
    searchPart(req, res);
});

router.get('/chart', function (req, res) {
    getChart(req, res);
});


module.exports = router;

function getData(req, res) {

    var partGrp = req.query.partGrp;
    var locType = req.query.locType;
    //var partNo = req.query.partNo;
    //var parts = {};

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
       // console.log("Getting Header");

        let selectStatement = `SELECT A.STATUS,
                                      B.LOC_ID,
		                      B.DESCRIPTION,
		                      B.TYPE,
		                      SUM(A.QTY) QTY  
                                 FROM BINS_T A ,
                                      LOCATIONS_T B 
                                WHERE A.FROM_LOC=B.LOC_ID 
	                          AND A.QTY <>0  
	                          AND B.TYPE like '${locType}%'
                                  AND A.PART_NO IN (
	                                            SELECT PART_NO 
						      FROM PARTS_T
						     WHERE PART_GRP = '${partGrp}'
						   )
                                  AND A.PART_GRP='${partGrp}'
                             GROUP BY A.STATUS,B.LOC_ID,B.DESCRIPTION,B.TYPE`;
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



function searchPart(req, res) {

    var partGrp = req.query.partGrp;
    var partNo = req.query.partNo;
    var locType = req.query.locType;
    
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
       // console.log("Getting Header");

        let selectStatement = `SELECT A.STATUS,
	                              B.LOC_ID,
		                      B.DESCRIPTION,
		                      B.TYPE,
		                      SUM(A.QTY) QTY  ,
		                      COUNT(*) AS BINS
                                 FROM BINS_T A , 
	                              LOCATIONS_T B 
                                 WHERE A.FROM_LOC=B.LOC_ID 
	                           AND A.QTY <>0  
		                   AND A.PART_NO='${partNo}'
                                   AND B.TYPE like '${locType}%'
                                   AND A.PART_GRP='${partGrp}'
		                   AND EXISTS (SELECT 1 
		                                 FROM PARTS_T
					        WHERE PART_GRP = '${partGrp}'
					          AND PART_NO=A.PART_NO)
                              GROUP BY A.STATUS,B.LOC_ID,B.DESCRIPTION,B.TYPE`;
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


function getChart(req, res) {

    var partGrp = req.query.partGrp;
    var status = req.query.status;
    var locID = req.query.locId;
    var locType = req.query.locType;
    var parts = {partsSeries: [], partsGroups: [], invCount: 0, binCount: 0, palletCount: 0};

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
        //console.log("Getting Header");

        let selectStatement = `SELECT C.PART_NO,
		                      SUM(A.QTY) QTY  
                                 FROM BINS_T A ,
        	                      LOCATIONS_T B ,
			              PARTS_T C
                                WHERE A.FROM_LOC=B.LOC_ID 
		                  AND A.QTY <>0 
			          AND C.PART_GRP = '${partGrp}' 
                                  AND A.PART_GRP=C.PART_GRP
			          AND A.PART_NO=C.PART_NO 
			          AND B.TYPE='${locType}'
                                  AND A.STATUS LIKE '${status}' 
			          AND A.FROM_LOC LIKE '${locID}'
                             GROUP BY C.PART_NO`;
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
                    var seriesObj = {name: row.PART_NO, items: [row.QTY]};
                    parts.partsSeries.push(seriesObj);
                });

                parts.partsGroups.push("Status : " + status + ", Location : " + locID);

                cb(null, conn);
            }

        });

    }

    function getCounts(conn, cb) {
       // console.log("Getting Counts");

        let selectStatement = `SELECT COUNT(DISTINCT A.BIN_ID) AS BINS,
	                              COUNT(DISTINCT A.PALLET_ID) AS PALLETS,
			              COUNT(DISTINCT INVOICE_NUM) AS INVOICE
                                 FROM BINS_T A ,
                                      LOCATIONS_T B ,
			              PARTS_T C
                                WHERE A.FROM_LOC=B.LOC_ID 
		                  AND A.QTY <>0 
		                  AND C.PART_GRP = '${partGrp}' 
                                  AND C.PART_GRP=A.PART_GRP
		                  AND A.PART_NO=C.PART_NO  
		                  AND B.TYPE='${locType}'
                                  AND A.STATUS LIKE '${status}'
		                  AND A.FROM_LOC LIKE '${locID}'`;

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
                    parts.invCount = row.INVOICE;
                    parts.binCount = row.BINS;
                    parts.palletCount = row.PALLETS;
                });

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(parts));
                cb(null, conn);
            }

        });

    }

    async.waterfall(
            [doConnect,
                getHdr,
                getCounts
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

function getPartsDet(req, res) {
    var locId = req.query.locId;
    var status = req.query.status;
    var partGrp = req.query.partGrp;
        var sqlStatement = `SELECT PART_NO,
                                   COUNT(*) AS BINS,
                                   SUM(QTY) as QTY,
                                   INVOICE_NUM
                              FROM BINS_T 
                             WHERE STATUS='${status}' 
                               AND FROM_LOC='${locId}'
                               AND PART_GRP='${partGrp}'
                          GROUP BY PART_NO,INVOICE_NUM`;

    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}