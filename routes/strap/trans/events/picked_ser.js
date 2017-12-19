var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');


router.get('/bin', function (req, res) {
    getOldBin(req, res);
});

router.get('/serial', function (req, res) {
    getSerial(req, res);
});


router.post('/', function (req, res) {
    picked(req, res);

});

router.get('/serialized', function (req, res) {
    getSerialized(req, res);
});


module.exports = router;


function picked(req, res) {
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let partNo = req.body.partNo;
    let pickList = req.body.pickList;
    let ts = new Date().getTime();

    let bindArr = [];

    /*Insert Pallet SQL*/

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    req.body.objArray.forEach(function (obj) {
        if (obj.oldBinId === obj.newBinId)
        {
            let binVars;
            binVars = [obj.newBinId, 'Bin', 'Picked', new Date(), locId, '', '', partNo, obj.qty, '', userId, '', 0, ts, obj.oldBinId, pickList, partGrp, '', '', ''];
            bindArr.push(binVars);
        }
        else
        {
        if (obj.partArray.length>0) {
            obj.partArray.forEach(function (part) {
                let binVars;
                binVars = [obj.oldBinId, 'Bin', 'Transferred', new Date(), locId, '', '', partNo, 1, '', userId, '', 0, ts, obj.newBinId, pickList, partGrp, '', '', part];
                bindArr.push(binVars);
                binVars = [obj.newBinId, 'Bin', 'Picked', new Date(), locId, '', '', partNo, 1, '', userId, '', 0, ts, obj.oldBinId, pickList, partGrp, '', '', part];
                bindArr.push(binVars);
                ts++;
            })
        } else {
            let binVars;
            binVars = [obj.newBinId, 'Bin', 'Picked', new Date(), locId, '', '', partNo, obj.qty, '', userId, '', 0, ts, obj.oldBinId, pickList, partGrp, '', '', ''];
            bindArr.push(binVars);
        }
        ;
    };
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

function getOldBin(req, res) {
    let partGrp = req.query.partGrp;
    let oldBin = req.query.id;

    let sqlStatement = `SELECT PART_NO,QTY FROM BINS_T WHERE BIN_ID='${oldBin}' AND PART_GRP='${partGrp}'`;
    var bindVars = [];

    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getSerial(req, res) {
    let partGrp = req.query.partGrp;
    let oldBin = req.query.id;
    console.log('Fetch Serial');

    let sqlStatement = `SELECT A.SERIAL_NUM FROM SERIAL_T A,BINS_T B WHERE B.BIN_ID='${oldBin}' AND B.PART_GRP='${partGrp}' AND B.BIN_ID=A.BIN_ID AND B.PART_GRP=A.PART_GRP`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getSerialized(req, res) {
    let partNo =req.query.partNo;

    let sqlStatement = `SELECT NVL(SERIALIZED,'N') SERIALIZED FROM PARTS_T P WHERE regexp_replace(P.PART_NO, '[^[:alnum:]]', null)='${partNo}'`;
    var bindVars = [];

    op.singleSQL(sqlStatement, bindVars, req, res);
}