var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
//var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/data', function (req, res) {
    getData(req, res);
});

router.get('/', function (req, res) {
    getParts(req, res);
});

router.get('/hourly', function (req, res) {
    getSched(req, res);
});

router.get('/hourly1', function (req, res) {
    getSched1(req, res);
});

module.exports = router;

function getData(req, res) {
    var partGrp = req.query.partGrp;
    var partNo = '';
    var schArr = [];
    

    if (req.query.partNo) {
        partNo = ` AND PART_NO LIKE '${req.query.partNo}%'`;
    }

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getSchP(conn, cb) {
        //console.log("Getting List");
        let selectStatement = `SELECT PART_NO as "partNo", sum(wip_qty) as "wipQty", sum(close_stk) as "closeStk" 
                                  FROM sched_t p 
                                 WHERE part_grp='${partGrp}'${partNo} 
                                   AND trunc(sched_dt) between trunc(sysdate) and trunc(sysdate+3) 
	                           AND part_no is not null   
                                   GROUP BY part_no`;
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
                //let objArr = [];
                result.rows.forEach(function (row) {
                    let obj = {};
                    obj.partNo = row.partNo;
                    obj.wipQty = row.wipQty;
                    obj.closeStk = row.closeStk;
                    obj.d0 = 0;
                    obj.d1 = 0;
                    obj.d2 = 0;
                    obj.d3 = 0;
                    obj.asnQty = 0;
                    obj.whQty = 0;
                    obj.dispQty = 0;
                    schArr.push(obj);
                });
                // res.writeHead(200, {'Content-Type': 'application/json'});
                // res.end(JSON.stringify(schArr));
                cb(null, conn);
            }
        });

    }

    function getSchP1(conn, cb) {
        //console.log("Getting List");
        let selectStatement = `SELECT trunc(sched_dt)-trunc(sysdate) as "day", part_no as "partNo",sum(qty) as "qty"
                                  FROM sched_t p 
                                 WHERE part_grp='${partGrp}' ${partNo}
                                   AND trunc(sched_dt) between trunc(sysdate) and trunc(sysdate+3) 
	                           AND part_no is not null 
                             group by sched_dt,part_no
                             order by sched_dt desc`;
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
                    schArr.forEach(function (sch)
                    {
                        if (row.partNo === sch.partNo)
                        {
                            console.log(sch["d" + row.day]);
                            console.log(sch[row.qty]);
                            sch["d" + row.day] = row.qty;
                        }

                    }
                    );
                });
            }
            cb(null, conn);
        }
        );
    }
    ;


    function getAsn(conn, cb) {
        //console.log("Getting List");
        let selectStatement = `  SELECT PART_NO as "partNo",SUM(NVL(QTY,0)) as "asnQty"
	                           FROM asn_t 
                                  WHERE part_grp='${partGrp}'${partNo}
                                  AND TRUNC(asn_date) = TRUNC(SYSDATE)
                                  GROUP BY PART_NO,ASN_DATE`;
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
                    schArr.forEach(function (sch)
                    {
                        if (row.partNo === sch.partNo)
                        {
                            sch.asnQty = row.asnQty;
                        }

                    });
                });
            }
            ;
            cb(null, conn);
        });
    }
    ;

    function getWareHouse(conn, cb) {
        //console.log("Getting List");

        let selectStatement = `SELECT b.PART_NO as "partNo",SUM(DECODE(b.STATUS,'Dispatched',0,'Reached',0,b.QTY)) as "whQty"
                                 FROM bins_t b,LOCATIONS_T L
                                WHERE b.PART_GRP='${partGrp}'${partNo}
                                  AND b.FROM_LOC=L.LOC_ID
                                  AND L.TYPE='Warehouse'
                                  group by part_no`;
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
                    schArr.forEach(function (sch)
                    {
                        if (row.partNo === sch.partNo)
                        {
                            sch.whQty = row.whQty;
                        }

                    });
                });
            }
            ;
            
            cb(null, conn);
        });

    }
    function getDisp(conn, cb) {
        //console.log("Getting List");

        let selectStatement = `SELECT b.PART_NO as "partNo",SUM(DECODE(b.STATUS,'Dispatched',b.QTY,'Reached',b.QTY,0)) as"dispQty"
                                 FROM bins_t b,LOCATIONS_T L
                                WHERE b.PART_GRP='${partGrp}'${partNo}
                                  AND b.FROM_LOC=L.LOC_ID
                                  AND L.TYPE='Warehouse'
                                  AND TRUNC(b.STATUS_DT) = trunc(sysdate)
                                  group by part_no`;
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
                    schArr.forEach(function (sch)
                    {
                        if (row.partNo === sch.partNo)
                        {
                            sch.dispQty = row.dispQty;
                        }

                    });
                });
            }
            ;
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(schArr));
            cb(null, conn);
        });

    }
    async.waterfall(
            [doConnect,
                getSchP,
                getSchP1,
                getAsn,
                getWareHouse,
                getDisp
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


function getSched(req, res) {
    var partGrp = req.query.partGrp;
    var partNo = req.query.partNo;
    //var schArr = [{hr: [],qty:[] }];
    var schArr =[];

    dateCrit = `TRUNC(SYSDATE) AND TRUNC(SYSDATE+3)`;

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };

    function getSchP(conn, cb) {
        //console.log("Getting List");
        let selectStatement = `WITH SCHED AS(
                                                  SELECT SCHED_HR,(NVL(QTY,0))QTY,(trunc(SCHED_DT)-trunc(sysdate)) SCHED_DT
                                                    FROM SCHED_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND PART_NO ='${partNo}'
                                                     AND TRUNC(SCHED_DT) BETWEEN ${dateCrit}
                                                ORDER BY SCHED_HR,SCHED_DT)
                                        SELECT SCHED_HR,SUM(DECODE(SCHED_DT,0,QTY,0))D0,
                                                        SUM(DECODE(SCHED_DT,1,QTY,0))D1,
                                                        SUM(DECODE(SCHED_DT,2,QTY,0))D2,
                                                        SUM(DECODE(SCHED_DT,3,QTY,0))D3 
                                          from SCHED
                                      GROUP BY SCHED_HR`;
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
                    let obj = {};
                    obj.schHr = row.SCHED_HR;
                    obj.D0 = row.D0;
                    obj.D1 = row.D1;
                    obj.D2 = row.D2;
                    obj.D3 = row.D3;
                    schArr.push(obj);
                });
              //  console.log(schArr);
                 res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(schArr));
                cb(null, conn);
            }
        });

    }

    async.waterfall(
            [doConnect,
                getSchP
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



function getParts(req, res) {

    var partGrp = req.query.partGrp;
    var partNo = req.query.partNo;
    var sqlStatement = `SELECT count(1) parts,loc,sum(part_qty) part_qty
                               FROM(
                               select distinct part_no,case  WHEN l.TYPE='Plant' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Plant'
                                                             WHEN l.TYPE='Plant' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit-Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS NOT IN ('Dispatched','Reached') Then 'Warehouse'
                                                             WHEN l.TYPE='Warehouse' AND ih.STATUS IN ('Dispatched','Reached') Then 'Transit-Customer' 
                                                         end loc,il.qty part_qty
                                 from inv_line_t il,inv_hdr_t ih,LOCATIONS_T l 
                                where ih.invoice_num=il.invoice_num 
                                  AND ih.from_loc=l.loc_id 
                                  and part_no is not null
                                  and ih.part_grp like '${partGrp}'
                                  AND IH.PART_GRP=IL.PART_GRP
                                  and il.part_no = '${partNo}'
                                  ) group by loc`;
    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getSched1(req, res) {
    var partGrp = req.query.partGrp;
    var partNo = req.query.partNo;
    var schArr =[];
    var datArr={};
    dateCrit = `TRUNC(SYSDATE) AND TRUNC(SYSDATE+3)`;
    
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };
    
    function getSchP(conn, cb) {
        //console.log("Getting List");
        let selectStatement = `SELECT SCHED_HR
                                                    FROM SCHED_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND PART_NO ='${partNo}'
                                                     AND TRUNC(SCHED_DT) BETWEEN ${dateCrit}
                                                GROUP BY SCHED_HR ORDER BY SCHED_HR`;

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
                    let obj = {};
                    obj[row.SCHED_HR]={} ;             
                    schArr.push(obj);
                });
                cb(null, conn);
            }
        });

    }
    
    function getSchP1(conn, cb) {
        let selectStatement = `SELECT TRUNC(SCHED_DT)-TRUNC(SYSDATE) as SCHED_DT
                                                    FROM SCHED_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND PART_NO ='${partNo}'
                                                     AND TRUNC(SCHED_DT) BETWEEN ${dateCrit}
                                                GROUP BY SCHED_DT ORDER BY SCHED_DT`;
 
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
                    let obj = {};
                    obj[row.SCHED_DT]=schArr ;                           
                    datArr.push(obj);
                    
                });
                cb(null, conn);
            }
        });

    }
    
    function getSchP2(conn, cb) {
        //console.log("Getting List");
        let selectStatement = `SELECT SCHED_HR,(NVL(QTY,0)) QTY,(trunc(SCHED_DT)-trunc(sysdate)) SCHED_DT
                                                    FROM SCHED_T 
						   WHERE PART_GRP='${partGrp}'
                                                     AND PART_NO ='${partNo}'
                                                     AND TRUNC(SCHED_DT) BETWEEN ${dateCrit}
                                                ORDER BY SCHED_HR,SCHED_DT`;

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
                    datArr.forEach(function(data)
                    {                       
                       if(data[row.SCHED_DT]===row.SCHED_DT)
                       {
                           data.schArr[row.SCHED_HR]=row.QTY;
                       }
                    });
                
                });
                 res.writeHead(200, {'Content-Type': 'application/json'});
                 res.end(JSON.stringify(datArr));
                cb(null, conn);
            }
        });

    }
   
    
    async.waterfall(
            [doConnect,
             getSchP,
             getSchP1,
             getSchP2
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