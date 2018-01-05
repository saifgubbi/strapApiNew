var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});


module.exports = router;

function getData(req, res) {

    var partGrp = req.query.partGrp;


    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getHdr(conn, cb) {
        //console.log("Getting Header");

        let selectStatement = `   SELECT TYPE as "loc",SUM(free) as "free",Sum(inuse) as "inUse"
                                   FROM(
                                       SELECT TYPE ,DECODE(status,'Free',sum(bins),0) as free,DECODE(status,'In Use',sum(bins),0) as inUse
                                         FROM(
                                        SELECT DECODE(A.QTY,0,'Free','In Use') STATUS,
                                               B.TYPE,
                                               COUNT(*) AS bins 
                                          FROM BINS_T A ,
                                               LOCATIONS_T B
                                         WHERE A.FROM_LOC=B.LOC_ID                                           
                                           AND A.PART_GRP='${partGrp}'
                                      GROUP BY B.TYPE,A.STATUS,A.QTY
                                      ) GROUP BY STATUS,TYPE UNION SELECT 'Customer' as TYPE,0 as free,0 as "inUse" from dual)group by type`;


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
                
                
                var binResult = result.rows;
                    console.log(binResult);
                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(binResult));
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

