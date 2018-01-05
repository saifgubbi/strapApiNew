var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var bcrypt = require('bcryptjs');
var async = require('async');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/verifyUser', function (req, res) {
    verifyUser(req, res);
});

router.post('/', function (req, res) {
    addData(req, res);
});

router.delete('/', function (req, res) {
    removeData(req, res);
});

router.put('/', function (req, res) {
    updateData(req, res);
});


router.get('/parts', function (req, res) {
    getUserPart(req, res);
});

router.post('/parts', function (req, res) {
    addUserPart(req, res);
});

router.delete('/parts', function (req, res) {
    removeUserPart(req, res);
});



router.put('/updatePass', function (req, res) {
    updatePassword(req, res);
});

//router.put('/resetPwd', function (req, res) {
//    resetPassword(req, res);
//});

module.exports = router;


function hashPass(password, cb) {
    if (password.length > 8)
        cb(password);
    bcrypt.hash(password, 10, function (err, hash) {
        if (err)
            throw err;
        cb(hash);
    });
}

function getData(req, res) {

    /*Get the Search Parameters*/
    var userId = (req.query.userId || '%') + '%';
    var name = (req.query.name || '%') + '%';
    var locId = (req.query.locId || '%') + '%';

    var sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID LIKE '${userId}' AND NAME LIKE '${name}' AND LOC_ID LIKE '${locId}'`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}



function getUserPart(req, res) {

    /*Get the Search Parameters*/
    var userId = (req.query.userId || '%') + '%';

    var sqlStatement = `SELECT * FROM USER_PARTS_T WHERE USER_ID LIKE '${userId}'`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function addData(req, res) {
    
    var sqlStatement = "INSERT INTO USERS_T(USER_ID,PASSWORD,NAME,EMAIL,PHONE,ROLE,LOC_ID,PART_GRP) VALUES (:1,:2,:3,:4,:5,:6,:7,:8)";
    //console.log(req.body);
    hashPass(req.body.password, function (hashPassword) {
        bindVars = [req.body.userId, hashPassword, req.body.name, req.body.email, req.body.phone, req.body.role, req.body.locId, req.body.partGrp];
        op.singleSQL(sqlStatement, bindVars, req, res);
    });
}

function addUserPart(req, res) {
    var sqlStatement = "INSERT INTO USER_PARTS_T VALUES (:1,:2) ";
    bindVars = [req.body.userId, req.body.partGrp];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function removeData(req, res) {

    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            cb(null, conn);
        });
    };


    function deleteUser(conn, cb) {
        let sqlStatement = "DELETE FROM USERS_T WHERE USER_ID = (:1)";
        let bindVars = [req.query.userId];
        conn.execute(sqlStatement
                , bindVars, {
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.log("Error Occured: ", err);
                cb(err, conn);
            } else {
                cb(null, conn);
            }

        });

    }

    function deleteUserParts(conn, cb) {
        let sqlStatement = "DELETE FROM USER_PARTS_T WHERE USER_ID = (:1)";
        let bindVars = [req.body.userId];
        conn.execute(sqlStatement
                , bindVars, {
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.log("Error Occured: ", err);
                cb(err, conn);
            } else {
                res.status(200).json({message: 'Done'});
                cb(null, conn);
            }

        });
    }

    async.waterfall(
            [doConnect,
                deleteUser,
                deleteUserParts
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

function removeUserPart(req, res) {
    var sqlStatement = "DELETE FROM USER_PARTS_T WHERE USER_ID=:1 AND PART_GRP=:2";
    bindVars = [req.query.userId, req.query.partGrp];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function updateData(req, res) {

    var sqlStatement = `UPDATE USERS_T
                SET NAME = :1 , EMAIL= :2, PHONE=:3,ROLE=:4,LOC_ID=:5,PART_GRP=:6
                 WHERE USER_ID=:7`;
    var bindVars = [req.body.name, req.body.email, req.body.phone, req.body.role, req.body.locId, req.body.partGrp, req.body.userId];
        //console.log(bindVars.join());
        op.singleSQL(sqlStatement, bindVars, req, res);


}

/*Not Used*/
function updatePassword(req, res) {
    //console.log('inside update');
    var sqlStatement = "UPDATE USERS_T SET PASSWORD=:1 WHERE USER_ID=:2";
    hashPass(req.body.password, function (hashPassword) {
        var bindVars = [hashPassword, req.body.userId];
        op.singleSQL(sqlStatement, bindVars, req, res);
    });
}

function verifyUser(req, res) {
    var sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${req.query.userId}'`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

//function resetPassword(req, res) {
//    var sqlStatement = "UPDATE USERS_T SET PASSWORD=:1 , ACC_LOCK=:2, LOGIN_NUM =:3 WHERE USER_ID=:4";
//    hashPass(req.body.password, function (hashPassword) {
//        var bindVars = [hashPassword, '','',req.body.userId];
//        op.singleSQL(sqlStatement, bindVars, req, res);
//    });
//}