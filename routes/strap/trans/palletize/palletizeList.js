var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');
var moment = require('moment');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/detail', function (req, res) {
    getDetail(req, res);
});

router.post('/detail', function (req, res) {
    depalletize(req, res);
});

module.exports = router;

function getData(req, res) {

    /*Get the Search Parameters*/
    var palletLabel = (req.query.label || '%') + '%';
    var palletId = (req.query.id || '%') + '%';
    var partGrp = (req.query.partGrp || '%') + '%';
    var palletDt = '';
     
    if (req.query.palletDt) {
        palletDt = `AND to_date(E.EVENT_DATE) = '${moment(req.query.palletDt).format("DD-MMM-YYYY")}'`;
    }
    var sqlStatement = `SELECT E.*,P.STATUS 
                          FROM EVENTS_T E,PALLETS_T P 
                         WHERE E.EVENT_NAME='Palletised' AND E.REF_ID LIKE '${palletId}' ${palletDt}
                           AND E.REF_LABEL LIKE '${palletLabel}' AND E.PART_GRP LIKE '${partGrp}' 
                           AND E.REF_LABEL=E.LABEL AND E.EVENT_ID=P.PALLET_ID 
                           AND E.PART_GRP=P.PART_GRP`;
    console.log(sqlStatement);
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getDetail(req, res) {

    /*Get the Search Parameters*/
    var palletLabel = (req.query.label || '%') + '%';
    var palletId = (req.query.id || '%') + '%';
    var partGrp = (req.query.partGrp || '%') + '%';
    var palDt = '';
     
    if (req.query.palDt) {
        palDt = `AND to_date(E.EVENT_DATE) = '${moment(req.query.date).format("DD-MMM-YYYY")}'`;
    }
    
    var sqlStatement = `SELECT E.*,B.STATUS  
                          FROM EVENTS_T E,BINS_T B 
                         WHERE E.EVENT_NAME='Palletised' AND E.REF_ID LIKE '${palletId}' ${palDt}
                           AND E.REF_LABEL LIKE '${palletLabel}' AND E.PART_GRP LIKE '${partGrp}' 
                           AND E.REF_LABEL<>E.LABEL AND E.EVENT_ID=B.BIN_ID 
                           AND E.PART_GRP=B.PART_GRP`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function depalletize(req, res) {
    let palletId = req.body.EVENT_ID;
    let palletLbl = req.body.LABEL;
    let palletType = req.body.EVENT_TYPE;
    let palletPart = req.body.PART_NO;
    let palletQty = req.body.QTY;
    let userId = req.body.USER_ID;
    let locId = req.body.FROM_LOC;
    let partGrp = req.body.PART_GRP;
    let comments = '';//req.body.isReturnable;
    let ts = new Date().getTime();

    let bindArr = [];

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    let bindVars = [palletId, palletType, 'Depalletise', new Date(), locId, '', palletLbl, palletPart, palletQty, null, userId, comments, 0, ts, palletId, palletLbl, partGrp, null, null, null];

    bindArr.push(bindVars);

    req.body.binArray.forEach(function (obj) {
        let binVars = [obj.EVENT_ID, 'Bin', 'Depalletise', new Date(), locId, '', obj.LABEL, obj.PART_NO, obj.QTY, null, userId, null, 0, ts, palletId, palletLbl, partGrp, null, null];
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
        let arrayCount = 1;
        async.eachSeries(bindArr, function (data, callback) {
            arrayCount++;
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
                res.writeHead(500, {'Content-Type': 'application/json'});
                errArray.push({row: 0, err: err});
                res.end(`errorMsg:${err}}`);
            } else {
                res.writeHead(200);
                res.end(`{total : ${bindArr.length},success:${doneArray.length},error:${errArray.length},errorMsg:${errArray}}`);
            }
            cb(null, conn);
        });
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