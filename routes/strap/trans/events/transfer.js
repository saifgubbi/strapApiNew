var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

router.post('/damaged', function (req, res) {
    transDamaged(req, res);
});

router.post('/scrap', function (req, res) {
    transScrap(req, res);
});

router.post('/damagedSerial', function (req, res) {
    transDamagedSer(req, res);
});

router.get('/serialized', function (req, res) {
    getSerialized(req, res);
});

router.get('/reason', function (req, res) {
    getReason(req, res);
});

module.exports = router;

function transDamaged(req, res) {
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let partNo = req.body.partNo;
    //let pickList = req.body.pickList;
    let ts = new Date().getTime();

    let bindArr = [];

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    
    req.body.objArray.forEach(function (obj) {
        let binVars;
        binVars = [obj.oldBinId, 'Bin', 'Damage Transferred', new Date(), locId, '', '', partNo, obj.qty, '', userId, obj.reason , 0, ts, obj.newBinId, '', partGrp, '', '', ''];
        bindArr.push(binVars);
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
        console.log("In  doInsert");
        let arrayCount = 1;
        async.eachSeries(bindArr, function (data, callback) {
            arrayCount++;
            console.log("Inserting :", JSON.stringify(data));
            let insertStatement = sqlStatement;
            let bindVars = data;
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
                res.writeHead(400, {'Content-Type': 'application/json'});
                errArray.push({row: 0, err: err});
                res.end(`err:${err}}`);
            } else {
                res.json({"total": bindArr.length, "success": doneArray.length, "err": errArray.length, "errMsg": errArray});
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
                    res.status(400).json({message: err});
                }
                console.log("Done Waterfall");
                if (conn)
                    conn.close();
            });
}

function transScrap(req, res) {
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let partNo = req.body.partNo;
    //let pickList = req.body.pickList;
    let ts = new Date().getTime();

    let bindArr = [];

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    req.body.objArray.forEach(function (obj) {
        let binVars;
        binVars = [obj.oldBinId, 'Bin', 'Scrapped', new Date(), locId, '', '', partNo, obj.qty, '', userId, obj.reason, 0, ts, '', '', partGrp, '', '', ''];
        bindArr.push(binVars);
    });
    insertEvents(req, res, sqlStatement, bindArr);
}


function transDamagedSer(req, res) {
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let partNo = req.body.partNo;
    let ts = new Date().getTime();

    let bindArr = [];

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
//    console.log('Inside Trans Damaged Ser');
//    console.log(req.body.userId);
    req.body.objArray.forEach(function (obj) {
        if (obj.serArray.length>0) {
            obj.serArray.forEach(function (serial) {
                let binVars;
                binVars = [obj.oldBinId, 'Bin', 'Damage Transferred', new Date(), locId, '', '', partNo, 1, '', userId, obj.reason, 0, ts, obj.newBinId, '', partGrp, '', '', serial];
                bindArr.push(binVars);
                ts++;
            });
        } else {
            let binVars;
            binVars = [obj.oldBinId, 'Bin', 'Damage Transferred', new Date(), locId, '', '', partNo, obj.qty, '', userId, '', 0, ts, obj.oldBinId, '', partGrp, '', '', ''];
            bindArr.push(binVars);
        }
        ;
    });
    insertEvents(req, res, sqlStatement, bindArr);
}

function getSerialized(req, res) {
    let binId =req.query.Id;
    let partGrp =req.query.partGrp;
     console.log('Inside Serialized');
    console.log(binId);
    let sqlStatement = `SELECT NVL(SERIALIZED,'N') as "serialized",B.QTY as "binQty" FROM PARTS_T P,BINS_T B WHERE B.PART_NO=P.PART_NO AND B.BIN_ID='${binId}' AND B.PART_GRP=P.PART_GRP AND B.PART_GRP='${partGrp}'`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getReason(req, res) {
    let type =req.query.type;
    let partGrp =req.query.partGrp;
   //  console.log('Inside Serialized');
    let sqlStatement = `SELECT REASON_CODE,REASON FROM REASONS_T WHERE REASON_TYPE='${type}' AND PART_GRP='${partGrp}'`;
    var bindVars = [];
   // console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}