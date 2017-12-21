var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.post('/', function (req, res) {
    partsAssign(req, res);
});

router.get('/pickList', function (req, res) {
    getPickList(req, res);
});

router.get('/', function (req, res) {
    getInvPicklist(req, res);
});

router.get('/parts', function (req, res) {
    getInvParts(req, res);
});

router.get('/id', function (req, res) {
    getId(req, res);

});

router.get('/pick', function (req, res) {
    getPick(req, res);

});


module.exports = router;


function partsAssign(req, res) {
    let invId = req.body.id;
    let partGrp = req.body.partGrp;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partNo = req.body.partNo;
    let qty = req.body.qty;
    let ts = new Date().getTime();
    let bindArr = [];

    /*Insert Pallet SQL*/

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    let bindVars = [invId, 'Invoice', 'Parts Assigned', new Date(), locId, null, null, partNo, qty, invId, userId, null, 0, ts, null, null, partGrp, null, null,null];
    
    //console.log('Inside inv picklist');
    bindArr.push(bindVars);
    
    req.body.objArray.forEach(function (obj) {
       // console.log('Inside First for .. ');
//        let binVars = [obj.objId, obj.type, 'Invoiced', new Date(), locId, null, obj.objLbl, obj.objPart, obj.objQty, invId, userId, null, 0, ts, null, null, partGrp, null, null,null];
//        bindArr.push(binVars);
        obj.binArr.forEach(function (obj1) {
            //console.log('Inside Second for .. ');
            let binVars = [obj1.id, 'Bin', 'Invoiced', new Date(), locId, null, obj1.objLbl, partNo, obj1.qty, invId, userId, null, 0, ts, null, obj.pickList, partGrp, null, null,null];
            bindArr.push(binVars);
        });
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

function getPickList(req, res) {
    var partGrp = req.query.partGrp;
    var partNo = req.query.partNo;
    var sqlStatement;
   
        sqlStatement = `SELECT PICK_LIST AS "pickList" ,QTY as "qty"
                          FROM PICK_LIST_T
                         WHERE PART_GRP='${partGrp}' 
                           AND PART_NO='${partNo}' 
                           AND STATUS='Picked'
                      GROUP BY PICK_LIST,qty`;
    
    //console.log(sqlStatement);
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getPick(req, res) {
    var partGrp = req.query.partGrp;
    var pickList = req.query.pickList;
     var pickRes ={};
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err)
                throw err;
            cb(null, conn);
        });
    };
    //console.log('Inside Pick');
    function getList(conn, cb) {
        var sqlStatement;
  
        sqlStatement = `SELECT COUNT(1) AS "bins" , PART_NO as "partNo",PICK_LIST as "pickList",SUM(QTY) as "qty" FROM BINS_T WHERE PICK_LIST = '${pickList}' AND PART_GRP='${partGrp}' GROUP BY PART_NO,PICK_LIST order by part_no`;
        
        //console.log(sqlStatement);
        let bindVars = [];
       conn.execute(sqlStatement
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
                    pickRes = row;
                });
                 pickRes.binArr= [];
                cb(null, conn);
            }
        });
    }

    function getBins(conn, cb) {
        var sqlStatement;
        sqlStatement = `SELECT BIN_ID AS "id" , QTY as "qty" FROM BINS_T WHERE PICK_LIST = '${pickList}' AND PART_GRP='${partGrp}' GROUP BY BIN_ID,QTY order by bin_id`;
     
        // console.log(sqlStatement);
        let bindVars = [];
       conn.execute(sqlStatement
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
                    pickRes.binArr.push({id:row.id,qty:row.qty});
                });

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(pickRes));
                cb(null, conn);
            }
        });
    }
    
    async.waterfall(
            [doConnect,
                getList,
                getBins
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

function getId(req, res) {
    var pickList = req.query.pickList;
    var partGrp = req.query.partGrp;
    var sqlStatement;
  
    sqlStatement = `SELECT COUNT(1) AS "bins" , PART_NO as "partNo",PICK_LIST as "pickList",SUM(QTY) as "qty" FROM BINS_T WHERE PICK_LIST = '${pickList}' AND PART_GRP='${partGrp}' GROUP BY PART_NO,PICK_LIST order by part_no`;
     
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getInvPicklist(req, res) {
    var invId = req.query.invId;
    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT COUNT(1) as "bins",PART_NO as "partNo",REF_LABEL as "pickList",SUM(QTY) as "qty" FROM EVENTS_T  WHERE PART_GRP='${partGrp}' AND INVOICE_NUM='${invId}' 
                        AND EVENT_TYPE='Bin' AND EVENT_NAME='Invoiced' GROUP BY REF_LABEL,PART_NO ORDER BY PART_NO`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getInvParts(req, res) {

    var invId = req.query.invId;
    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT B.PART_NO AS PART_NO,B.QTY AS COUNT FROM INV_HDR_T A,INV_LINE_T B WHERE A.INVOICE_NUM=B.INVOICE_NUM AND A.INVOICE_NUM='${invId}' and A.PART_GRP='${partGrp}'`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);

}