var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var fs = require('fs');
var multer = require('multer');
var path = 'uploads/serial';
var async = require('async');

var csv = require('csv-parser');
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

var upload = multer({storage: storage}).any();

router.post('/', function (req, res) {
    insertItems(req, res);
});

router.get('/', function (req, res) {
    getLogs(req, res);
});

module.exports = router;


function insertItems(req, res) {

    let dataArray = [];
    let errArray = [];
    let doneArray = [];
    let origFilename, sysFileName;
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };
    var doGetFile = function (conn, cb) {
        console.log("In Get File");

        upload(req, res, function (err) {
            if (err) {
                console.log('Error Occured');
                console.log(err);
                cb(err, conn);
            }

           // console.log(req.body);
            let file = req.files[0];
            origFilename = file.originalname;
            sysFileName = file.path;
            fs.createReadStream(file.path).pipe(csv())
                    .on('data', function (data) {
                        dataArray.push(data);
                    })
                    .on('end', function () {
                        cb(null, conn);
                    });
        });
    };


    function doInsert(conn, cb) {
        //console.log("In  doInsert");
        var partGrp = req.body.partGrp;
        var userId = req.body.userId;
        var locId = req.body.locId;
        let arrayCount = 1;
        //console.log(locId);
        async.eachSeries(dataArray, function (data, callback) {
            arrayCount++;
            //console.log("Inserting :", JSON.stringify(data));
            let insertStatement = "INSERT INTO SERIAL_T(SERIAL_DT,SERIAL_NUM,BIN_LABEL,PART_NO,PALLET_LABEL,PART_GRP,USER_ID,LOC_ID,STATUS) VALUES (TO_DATE(:1, 'dd/mm/yyyy hh24:mi:ss'),:2,:3,:4,:5,:6,:7,:8,:9) ";
            let bindVars = [data["Packaging Date"], data["Unique Part Ident. No."], data["Box Packaging No."], data["TTNR"] + data["Packaging Index"],data["Pallet Packaging No."], partGrp, userId,locId,'New'];
           // console.log(bindVars.join());
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
        }, function done(err) {
            if (err) {
                console.log("Upload Error");
                res.writeHead(500, {'Content-Type': 'application/json'});
                errArray.push({row: 0, err: err});
                res.end(`{total : ${dataArray.length},success:${doneArray.length},error:${errArray.length},errorMsg:${err}}`);
            } else {

                res.writeHead(200, {'Content-Type': 'application/json'});
                res.end(`{total : ${dataArray.length},success:${doneArray.length},error:${errArray.length},errorMsg:${errArray}}`);
            }


            cb(null, conn);
        }
        );
    }

    function doUpdateLog(conn, cb) {
        let timems = new Date().getTime();
        let insertLog = 'INSERT INTO UPLOAD_LOG_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11)';
        let bindVars = [timems, 'SERIAL', req.body.userId, dataArray.length, doneArray.length, errArray.length, sysFileName, origFilename, sysFileName + ".log", req.body.description, req.body.partGrp];

        if (errArray.length > 0) {
            var stream = fs.createWriteStream(sysFileName + ".log");
            stream.once('open', function (fd) {
                errArray.forEach(function (err) {
                    stream.write(`Row:${err.row} \t Error:${err.err}`);
                });
                stream.end();
                console.log("The file was saved!");
            });
        }


        conn.execute(insertLog
                , bindVars, {
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.error("In Insert Log: ==>", err, "<==");
            }

            cb(null, conn);
        });
    }



    async.waterfall(
            [doConnect,
                doGetFile,
                doInsert,
                doUpdateLog
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



function getLogs(req, res) {
    var sqlStatement = `SELECT * FROM (SELECT * FROM UPLOAD_LOG_T WHERE TYPE='SERIAL' AND PART_GRP='${req.query.partGrp}' ORDER BY SEQ DESC) WHERE ROWNUM<=10`;
    //console.log(sqlStatement);
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}