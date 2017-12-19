var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');

router.get('/asn', function (req, res) {
    getAsn(req, res);
});

router.get('/bin', function (req, res) {
    getBin(req, res);
});


router.post('/', function (req, res) {
    assignAsn(req, res);
});


module.exports = router;


function getAsn(req, res) {
    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT * FROM ASN_T A , INV_HDR_T B WHERE A.PART_GRP LIKE '${partGrp}' AND A.INVOICE_NUM=B.INVOICE_NUM AND B.STATUS IN ('New','ASN Assigned','LR Assigned') AND A.PART_GRP=B.PART_GRP`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getBin(req, res) {
    var partGrp = (req.query.partGrp || '%') + '%';
    var binId = req.query.id;
    var sqlStatement = `SELECT * FROM BINS_T WHERE BIN_ID = '${binId}' AND PART_GRP LIKE '${partGrp}' `;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}



function assignAsn(req, res) {
    let asn = req.body.asn;
    let locId = req.body.locId;
    let partNo = req.body.part;
    let partGrp = req.body.partGrp;
    let qty = req.body.qty;
    let userId = req.body.userId;
    let invId = req.body.invId;
    let ts = new Date().getTime();

    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";

    let bindArr = [];

    binVars = [invId, 'Invoice', 'Parts Assigned', new Date(), locId, '', '', partNo, qty, invId, userId, '', 0, ts, asn, '', partGrp, '', '', ''];
    bindArr.push(binVars);

    req.body.objArray.forEach(function (obj) {
        binVars = [obj.binId, 'Bin', 'Invoiced', new Date(), locId, '', asn, partNo, obj.qty, invId, userId, '', 0, ts, '', '', partGrp, '', '', ''];
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


