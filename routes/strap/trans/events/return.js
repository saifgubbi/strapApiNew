var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.get('/refId', function (req, res) {
    getPendingReceive(req, res);
});

router.get('/obj', function (req, res) {
    getReturnObjects(req, res);
});

router.post('/dispatch', function (req, res) {
    returnObj(req, res);
});

router.get('/check', function (req, res) {
    doChkRef(req, res);
});

router.post('/receive', function (req, res) {
    receiveObj(req, res);
});
module.exports = router;

function doChkRef(req, res) {
    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        refId = req.query.refId;
        partGrp = req.query.partGrp;
        let sqlStatement = `SELECT * FROM RETURN_LH_T WHERE LETTER_HEAD='${refId}' AND PART_GRP='${partGrp}'`;
        let bindVars = [];
        //  console.log(bindVars.join());
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
               // console.log(sqlStatement);
                if (result.rows.length === 0) {
                    res.status(200).send({refId:false});
                    cb(null, conn);

                } else {
                    res.status(200).send({refId:true});
                    cb(null, conn);
                }
            }
        });
    };
    async.waterfall(
            [
                doconnect,
                doSelect
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.writeHead(400, {'Content-Type': 'application/json'});
                    res.end(JSON.stringify(err));
                }
                if (conn)
                    dorelease(conn);
            });
};

function getPendingReceive(req, res) {
    
    var partGrp = req.query.partGrp;
      console.log('Inside Return')
    var sqlStatement = `SELECT LETTER_HEAD FROM RETURN_LH_T WHERE STATUS='Returned' AND PART_GRP = '${partGrp}'`;
    var bindVars = [];

    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getReturnObjects(req, res) {
    var refId = req.query.refId;
    var partGrp = req.query.partGrp;

    var sqlStatement = `(SELECT A.BIN_ID AS OBJ_ID, A.LABEL AS OBJ_LBL,A.QTY,A.PART_NO,'Bin' as OBJ_TYPE,B.LETTER_HEAD FROM BINS_T A,RETURN_LH_T B WHERE A.INVOICE_NUM=B.LETTER_HEAD AND A.PART_GRP=B.PART_GRP AND B.LETTER_HEAD='${refId}' AND B.PART_GRP = '${partGrp}' AND PALLET_ID is NULL) UNION (SELECT A.PALLET_ID AS OBJ_ID,A.LABEL AS OBJ_LBL,A.QTY,A.PART_NO,'Pallet' as OBJ_TYPE,B.LETTER_HEAD FROM PALLETS_LBL_T A,RETURN_LH_T B WHERE A.INVOICE_NUM=B.LETTER_HEAD AND A.PART_GRP=B.PART_GRP AND B.LETTER_HEAD='${refId}' AND B.PART_GRP = '${partGrp}')`;
    var bindVars = [];
    
    //console.log(sqlStatement);

    op.singleSQL(sqlStatement, bindVars, req, res);
}


function returnObj(req, res) {

    let partGrp = req.body.partGrp;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let lr = req.body.lr;
    let refId=req.body.refId;
    let qty=req.body.qty;
    let comments=req.body.comments;


    let ts = new Date().getTime();
        let invArr = [];

    let bindArr = [];

    /*Insert Pallet SQL*/
  
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    /*Insert Object (bin,pallets as dispatched)*/
    req.body.objArray.forEach(function (obj) {
            let objVars = [obj.objId, obj.type, 'Returned', new Date(), locId, '1760', null, null, 0, refId, userId, comments, 0, ts, null, null, partGrp, lr, null, null];
//        if (invArr.indexOf(obj.invId) < 0) {
//            invArr.push(obj.invId);
//        }
        bindArr.push(objVars);
    });

    /*Insert Unique Invoices with Dispatched Status*/
   // invArr.forEach(function (refId) {
       // let binVars = [invID, 'Invoice', 'Dispatched', new Date(), locId, null, '', '', 0, invID, userId, null, 0, ts, null, null, partGrp, lr, null, null];
        let binVars = [refId, 'Return LH', 'Returned', new Date(), locId, '1760', '', '', qty, refId, userId, comments, 0, ts, null, null, partGrp, lr, null, null];
        bindArr.push(binVars);
    //});

    insertEvents(req, res, sqlStatement, bindArr);

}


function receiveObj(req, res) {

    let partGrp = req.body.partGrp;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let lr = req.body.lr;
    let refId=req.body.refId;
    let qty=req.body.qty;
    let comments=req.body.comments;


    let ts = new Date().getTime();
        let invArr = [];

    let bindArr = [];

    /*Insert Pallet SQL*/
  
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    req.body.objArray.forEach(function (obj) {
            let objVars = [obj.objId, obj.type, 'Ret Received', new Date(), locId, '1760', null, null, 0, refId, userId, comments, 0, ts, null, null, partGrp, lr, null, null];
        bindArr.push(objVars);
    });

     let binVars = [refId, 'Return LH', 'Ret Received', new Date(), locId, '1760', '', '', qty, refId, userId, comments, 0, ts, null, null, partGrp, lr, null, null];
        bindArr.push(binVars);
   

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
       // console.log("In  doInsert");
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