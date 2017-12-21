var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var async = require('async');
var oracledb = require('oracledb');

router.post('/', function (req, res) {
    palletize(req, res);
});

router.get('/', function (req, res) {
    getPallet(req, res);
});

router.get('/bin', function (req, res) {
    getBins(req, res);
});
module.exports = router;

function getPallet(req, res) {

    var palletId = req.query.id;
    var palletLbl = req.query.label;
    var partGrp = req.query.partGrp;
    var locId = req.query.locId;

    var userDb = {};
    let palletIdFound = false;//Added for response set
    let palletLocFound = false;//Added for response set
    let palletStatus = false;
    let palletLblFound = false;
    let palletLblFound1 = false;
    
    var bindArr = [];
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err) {
                cb(err, conn);
            }
            cb(null, conn);
        });
    };



    function getPalletId(conn, cb) {
        
           let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                            (SELECT count(1) as palletCount FROM PALLETS_T WHERE PALLET_ID='${palletId}' AND PART_GRP='${partGrp}'
                            UNION
                             SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE PALLET_ID='${palletId}' AND PART_GRP='${partGrp}')`;
            let bindVars = [];
            console.log(sqlStatement);
            conn.execute(sqlStatement
                    , bindVars, {
                        outFormat: oracledb.OBJECT
                    }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    if (result.rows[0].palletCount === 0) {
                        if(palletId ===palletLbl)
                        
                        {
                          res.status(200).send({'message': 'Pallet Not Found','status':'true'});
                        }
                        else
                        {
                            res.status(200).send({'message': 'Pallet Not Found','status':'false'});
                        }
                        cb(null, conn);
                    } else {
                        palletIdFound = true;//Added for response set
                        console.log('Pallet Found');
                        cb(null, conn);
                    }
                }
            });
        
    }
    
    function getPalletLbl(conn, cb) {
        if (palletIdFound)
        {
           let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                            (SELECT count(1) as palletCount FROM PALLETS_T WHERE LABEL ='${palletLbl}' AND PART_GRP='${partGrp}'
                            UNION
                             SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE LABEL ='${palletLbl}' AND PART_GRP='${partGrp}')`;
            let bindVars = [];
            //console.log(sqlStatement);
            conn.execute(sqlStatement
                    , bindVars, {
                        outFormat: oracledb.OBJECT
                    }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    if (result.rows[0].palletCount === 0) {
                        palletLblFound = true;
                       // console.log('Pallet Not Found');
                        cb(null, conn);
                    } else {
                        //Added for response set
                        res.status(200).send({'message': 'Pallet Lbl Already Exist','status':'false'});
                      //  console.log('Pallet Found');
                        cb(null, conn);
                    }
                }
            });
        } else
        {
            let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                            (SELECT count(1) as palletCount FROM PALLETS_T WHERE LABEL ='${palletLbl}' AND PART_GRP='${partGrp}'
                            UNION
                             SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE LABEL ='${palletLbl}' AND PART_GRP='${partGrp}')`;
            let bindVars = [];
            //console.log(sqlStatement);
            conn.execute(sqlStatement
                    , bindVars, {
                        outFormat: oracledb.OBJECT
                    }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    if (result.rows[0].palletCount === 0) {
                        palletLblFound = true;//Added for response set
                       // console.log('Pallet Not Found');
                        cb(null, conn);
                    } else {                        
                        res.status(200).send({'message': 'Pallet Lbl Exists Already','status':'false'});
                        //console.log('Pallet Found');
                        cb(null, conn);
                    }
                }
            });
        }
    }
    
        function getPalletLoc(conn, cb) {
            if (palletIdFound && palletLblFound)
            {               
            
          let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                                 (SELECT count(1) as palletCount FROM PALLETS_T WHERE (PALLET_ID='${palletId}' OR LABEL ='${palletLbl}') AND PART_GRP='${partGrp}' AND FROM_LOC='${locId}'
                                 UNION
                                SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE (PALLET_ID='${palletId}' OR LABEL ='${palletLbl}') AND PART_GRP='${partGrp}' AND FROM_LOC='${locId}')`;
       
        let bindVars = [];
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                //console.log(sqlStatement);
                if (result.rows[0].palletCount === 0) {
                    res.status(200).send({'message': 'Wrong Location','status':'false'});
                    cb(null, conn);

                } else {
                    //userDB = result.rows[0];
                    palletLocFound = true;//Added for response set
                    cb(null, conn);
                }
            }
        });
    }
    else
    {
        cb(null, conn);
    }
    }
    function doChkStatus(conn, cb) {
        if (palletIdFound && palletLocFound && palletLblFound)
        {
            //console.log(req.body.userId);
            let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                            (SELECT count(1) as palletCount FROM PALLETS_T WHERE (PALLET_ID='${palletId}' OR LABEL ='${palletLbl}') AND PART_GRP='${partGrp}' AND STATUS in ('Ready','Palletised')
                            UNION
                             SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE (PALLET_ID='${palletId}' OR LABEL ='${palletLbl}') AND PART_GRP='${partGrp}' AND STATUS in ('Ready','Palletised'))`;
            let bindVars = [];
            
            conn.execute(sqlStatement
                    , bindVars, {
                        outFormat: oracledb.OBJECT
                    }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    //console.log(sqlStatement);
                    if (result.rows[0].palletCount === 0) {
                        res.status(200).send({'message': 'Pallet is not in Ready or Palletised Status','status':'false'});
                        cb(null, conn);

                    } else {
                        palletStatus = true;
                        //console.log('Pallet in Ready or Palletised Status');
                        cb(null, conn);
                    }
                }
            });
        } else
            cb(null, conn);
    }

    function doChkLabel(conn, cb) {
        if (palletIdFound && palletLocFound && palletStatus && palletLblFound)
        {
            let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                            (SELECT count(1) as palletCount FROM PALLETS_T WHERE PALLET_ID='${palletId}' AND LABEL ='${palletLbl}' AND PART_GRP='${partGrp}'
                            UNION
                             SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE PALLET_ID='${palletId}' AND LABEL ='${palletLbl}' AND PART_GRP='${partGrp}')`;
            let bindVars = [];
            conn.execute(sqlStatement
                    , bindVars, {
                        outFormat: oracledb.OBJECT
                    }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    //console.log(sqlStatement);
                    if (result.rows[0].palletCount === 0) {
                        palletLblFound1 = true;//Added for response set
                        cb(null, conn);

                    } else {
                      
                       res.status(200).send({'message': 'Pallet and Label Combination Already Exist','status':'false'});
                      //res.status(200).send({'Pallet': 'Pallet Not Found'});
                        cb(null, conn);
                    }
                }
            });
        } else
            cb(null, conn);
    }

    function doVerifyPalletised(conn, cb) {
        if (palletIdFound && palletLocFound && palletStatus &&palletLblFound1 && palletLblFound)//Added for response set
        {
             let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                            (SELECT count(1) as palletCount FROM PALLETS_T WHERE (PALLET_ID='${palletId}' OR LABEL ='${palletLbl}') AND PART_GRP='${partGrp}' AND STATUS='Palletised'
                            UNION
                             SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE (PALLET_ID='${palletId}' OR LABEL ='${palletLbl}') AND PART_GRP='${partGrp}' AND STATUS='Palletised')`;
            let bindVars = [];
            conn.execute(sqlStatement
                    , bindVars, {
                        outFormat: oracledb.OBJECT
                    }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    //console.log(sqlStatement);
                    if (result.rows[0].palletCount === 0) {
                        res.status(200).send({'message': 'Create Pallet','status':'true'});
                        cb(null, conn);

                    } else {
                         res.status(200).send({'message': 'Already Palletised ! Merge','status':'merge'});
                        cb(null, conn);
                    }
                }
            });
        } else
            cb(null, conn);
    }

    async.waterfall(
            [doConnect,                
                getPalletId,
                getPalletLbl,
                getPalletLoc,
                doChkStatus,
                doChkLabel,
                doVerifyPalletised
            ],
            function (err, conn) {
                if (err) {
                    console.error("In waterfall error cb: ==>", err, "<==");
                    res.status(500).json(err);
                    if (conn)
                    {
                        conn.close();

                    }
                }
                console.log("Done Waterfall");
                if (conn)
                {
                    console.log('Connection Closed');
                    conn.close();
                }
            });
}

function getPallet1(req, res) {
    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        // console.log(req.query.id);
        palletId = req.query.id;
        palletLbl = req.query.label;
        partGrp = req.query.partGrp;

        let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                            (
                            SELECT count(1) as palletCount FROM PALLETS_T WHERE PALLET_ID='${palletId}' AND LABEL ='${palletLbl}' AND STATUS ='Palletised' AND PART_GRP='${partGrp}'
                            UNION
                            SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE PALLET_ID='${palletId}' AND LABEL ='${palletLbl}'  AND STATUS='Palletised' AND PART_GRP='${partGrp}')`;
        let bindVars = [];
        // console.log(sqlStatement);
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                // console.log(result);
                // console.log(result.rows[0].palletCount);
                if (result.rows[0].palletCount === 0) {
                    res.status(200).send({palletised: false});
                    cb(null, conn);

                } else {
                    res.status(200).send({palletised: true});
                    cb(null, conn);
                }
            }
        });
    };
    var doSelect1 = function (conn, cb) {
        // console.log(req.query.id);
        palletId = req.query.id;
        palletLbl = req.query.label;
        partGrp = req.query.partGrp;

        let sqlStatement = `SELECT sum(palletCount) as "palletCount" FROM
                            (
                            SELECT count(1) as palletCount FROM PALLETS_T WHERE PALLET_ID='${palletId}' AND LABEL ='${palletLbl}' AND STATUS ='Palletised' AND PART_GRP='${partGrp}'
                            UNION
                            SELECT count(1) as palletCount FROM PALLETS_LBL_T WHERE PALLET_ID='${palletId}' AND LABEL ='${palletLbl}'  AND STATUS='Palletised' AND PART_GRP='${partGrp}')`;
        let bindVars = [];
        // console.log(sqlStatement);
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                // console.log(result);
                // console.log(result.rows[0].palletCount);
                if (result.rows[0].palletCount === 0) {
                    res.status(200).send({palletised: false});
                    cb(null, conn);

                } else {
                    res.status(200).send({palletised: true});
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

function getBins(req, res) {
    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        // console.log(req.query.id);
        binId = req.query.id;
        partGrp = req.query.partGrp;
        locId = req.query.locId;
        let sqlStatement = `SELECT count(1) as "binsCount" FROM BINS_T WHERE BIN_ID='${binId}' AND STATUS='Ready' AND QTY =0 AND PART_GRP='${partGrp}' AND FROM_LOC='${locId}'`;
        let bindVars = [];
        //  console.log(sqlStatement);
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                //    console.log(result.rows[0].binsCount);
                if (result.rows[0].binsCount === 0) {
                    res.status(200).send({ready: false});
                    cb(null, conn);

                } else {
                    res.status(200).send({ready: true});
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

//function palletize1(req, res) {
//    var palletId = req.body.id;
//    var palletLbl = req.body.label;
//    var palletType = req.body.type;
//    var palletStatus = req.body.status;
//    var palletPart = req.body.partNo;
//    var palletQty = req.body.qty;
//    var userId = req.body.userId;
//    var locId = req.body.locId;
//    var partGrp = req.body.partGrp;
//    var comments = req.body.isReturnable;
//    var ts = new Date().getTime();
//    var bindArr = [];
//    
//    if (palletStatus==='Palletised')
//    {  
//        let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20)";
//    
//        let bindVars = [palletId, palletType, palletStatus, new Date(), locId, '', palletLbl, palletPart, palletQty, null, userId, comments, 0, ts, palletId, palletLbl, partGrp, null, null, null];
//
//        bindArr.push(bindVars);
//
//        req.body.objArray.forEach(function (obj) {
//            let binVars = [obj.objId, 'Bin', palletStatus, new Date(), locId, '', obj.objLbl, obj.objPart, obj.objQty, null, userId, null, 0, ts, palletId, palletLbl, partGrp, null, null];
//            bindArr.push(binVars);
//        });
//    }
//    else
//    {
//        function getDePalletise(req, res) {
//            var request = require('request');
//            var dataArr = {obj:[]};
//            let devArr = [];
//
//            var doConnect = function (cb) {
//                op.doConnectCB(function (err, conn) {
//                    if (err)
//                        throw err;
//                    cb(null, conn);
//                });
//            };
//            
//            let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20)";
//            function getPallet(conn, cb) {
//                    request('api/strap/palletizeList?&id='+palletId+'&label='+palletLbl, function (err, response, result) {
//                       if (err) {
//                            callback();
//                        } else {
//                            try {
//                                let apiResp = JSON.parse(result);
//                                dataArr.push(apiResp);
//                            } catch (err) {
//                                console.log(err);
//                            }
//                            callback();
//                        }
//                    });               
//                } 
//            function getBins(conn, cb) {
//                    request('api/strap/palletizeList/detail?&id='+palletId+'&label='+palletLbl+'&partGrp='+partGrp, function (err, response, result) {
//                       if (err) {
//                            callback();
//                        } else {
//                            try {
//                                let apiResp = JSON.parse(result);
//                                dataArr.obj.push(apiResp);
//                            } catch (err) {
//                                console.log(err);
//                            }
//                            callback();
//                        }
//                    });               
//                }    
//           
//    async.waterfall(
//            [doConnect,
//                getPallet,
//                getBins
//            ],
//            function (err, conn) {
//                if (err) {
//                    console.error("In waterfall error cb: ==>", err, "<==");
//                    res.status(500).json({message: err});
//                }
//                console.log("Done Waterfall");
//                if (conn)
//                    conn.close();
//            });
//
//       }
//        
//    }
//    
//    }
//    //insertEvents(req, res, sqlStatement, bindArr);
////}

function palletize(req, res) {
    let palletId = req.body.id;
    let palletLbl = req.body.label;
    let palletType = req.body.type;
    let palletStatus = req.body.status;
    let palletPart = req.body.partNo;
    let palletQty = req.body.qty;
    let userId = req.body.userId;
    let locId = req.body.locId;
    let partGrp = req.body.partGrp;
    let comments = req.body.isReturnable;
    let ts = new Date().getTime();

    let bindArr = [];

    /*Insert Pallet SQL*/
        
    let sqlStatement = "INSERT INTO EVENTS_T VALUES (:1,:2,:3,:4,:5,:6,:7,:8,:9,:10,:11,:12,:13,:14,:15,:16,:17,:18,:19,:20) ";
    let bindVars = [palletId, palletType, 'Palletised', new Date(), locId, '', palletLbl, palletPart, palletQty, null, userId, comments, 0, ts, palletId, palletLbl, partGrp, null, null, null];

    bindArr.push(bindVars);

    req.body.objArray.forEach(function (obj) {
        let binVars = [obj.objId, 'Bin', 'Palletised', new Date(), locId, '', obj.objLbl, obj.objPart, obj.objQty, null, userId, null, 0, ts, palletId, palletLbl, partGrp, null, null];
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