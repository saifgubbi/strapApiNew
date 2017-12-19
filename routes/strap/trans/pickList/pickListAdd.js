var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.post('/', function (req, res) {
    addPickList(req, res);
});

router.get('/', function (req, res) {
    doChkPick(req, res);
});

module.exports = router;


function getDate(str1) {
// str1 format should be yyyy/mm/dd. Separator can be anything e.g. / or -. It wont effect
    var dt1 = parseInt(str1.substring(8, 10));
    var mon1 = parseInt(str1.substring(5, 7));
    var yr1 = parseInt(str1.substring(0, 4));
    var date1 = new Date(yr1, mon1 - 1, dt1);
    return date1;
}

function doChkPick(req, res) {
    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        //console.log(req.query.pickList);
        pickList = req.query.pickList;
        let sqlStatement = `SELECT * FROM PICK_LIST_T WHERE PICK_LIST='${pickList}'`;
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
                    res.status(200).send({pickList:false});
                    cb(null, conn);

                } else {
                    res.status(200).send({pickList:true});
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
}
;

function addPickList(req, res) {
    let userId = req.body.userId;
    let partGrp = req.body.partGrp;
    let locId = req.body.locId;
    let ts = new Date().getTime();

    let bindArr = [];
    /*Insert Pallet SQL*/
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    req.body.pickListArr.forEach(function (obj) {
        let bindVars = [obj.pickListNo, 'Pick List', 'Add', getDate(obj.pickListDt), locId, '', '', obj.partNo, obj.qty, '', userId, 1, 0, ts, '', '', partGrp, '', '', ''];
        bindArr.push(bindVars);
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
         //   console.log("Inserting :", JSON.stringify(data));
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

