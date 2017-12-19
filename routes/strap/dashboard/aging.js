var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');



router.get('/', function (req, res) {
    getChart(req, res);
});


module.exports = router;


function getChart(req, res) {

    var partGrp = req.query.partGrp;
    var locType = req.query.locType;
    var parts = {partsSeries: [], partsGroups: []};

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };


    function getHdr(conn, cb) {

        let selectStatement = `SELECT AGE,PART_NO,SUM(QTY) QTY
                                FROM(
                                     SELECT CASE WHEN AGE<= 7 THEN 1 
                                              WHEN AGE>7 and AGE <=14 THEN 2 
                                           WHEN AGE>14 and AGE <=21 THEN 3 
                                           WHEN AGE>21 and AGE <=28 THEN 4 
                                           WHEN AGE>28 and AGE <=35 THEN 5 
                                           WHEN AGE>35 and AGE <=42 THEN 6 
                                           WHEN AGE>42 and AGE <=49 THEN 7
                                           WHEN AGE>49 and AGE <=56 THEN 8
                                           WHEN AGE>56 and AGE <=63 THEN 9
                                           WHEN AGE>63 THEN 10
                                       END AGE, AGE as age1,
                                       PART_NO,QTY
                          FROM(SELECT ROUND(SYSDATE-STATUS_DT) AS AGE,
                                      A.PART_NO,
                                      SUM(QTY) AS QTY 
                                 FROM BINS_T A,
                                      PARTS_T B,
                                      LOCATIONS_T C 
                                WHERE QTY<>0 
                                  AND A.FROM_LOC=C.LOC_ID 
                                  AND C.TYPE= '${locType}' 
                                  AND A.PART_NO=B.PART_NO 
                                  AND B.PART_GRP = '${partGrp}'
                                  AND B.PART_GRP =A.PART_GRP        
                                  AND A.STATUS NOT IN ('Dispatched','Reached')
                             GROUP BY ROUND(SYSDATE-STATUS_DT),A.PART_NO ORDER BY 1)
                                  )
                             GROUP BY AGE,PART_NO`;


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
                    let partFound = false;
                    parts.partsSeries.forEach(function (part) {
                        if (part.name === row.PART_NO) {
                            part.items[parseInt(row.AGE) ] = row.QTY;
                            partFound = true;
                        }
                    });
                    if (!partFound) {
                        var seriesObj = {name: row.PART_NO, items: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]};
                        seriesObj.items[parseInt(row.AGE)] = row.QTY;
                        parts.partsSeries.push(seriesObj);
                    }

                });

                parts.partsGroups = [1, 2, 3, 4, 5, 6, 7, 8, 9, '>9'];
                // console.log(parts);

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(parts));

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
