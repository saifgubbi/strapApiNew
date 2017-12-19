var express = require('express');
var bcrypt = require('bcryptjs');
var router = express.Router();
var op = require('./oracleDBOps');
var oracledb = require('oracledb');
var jwt = require('jsonwebtoken');
var async = require('async');


router.post('/', function (req, res) {
    loginUser(req, res);
});

router.post('/reset', function (req, res) {
    resetPassword(req, res);
});

router.post('/update', function (req, res) {
    updatePassword(req, res);
});

router.get('/verify', function (req, res) {
    verifyRole(req, res);
});

router.get('/link', function (req, res) {
    verifyLink(req, res);
});


module.exports = router;


function loginUser(req, res) {

    let userId = req.body.userId;
    let password = req.body.password;
    let userDB = {};
    let userFound = false;//Added for response set
    let userLock = false;//Added for response set
    let userOTP = false;
    let passwordValid = false;//Added for response set
    var bindArr = [];
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err) {
                cb(err, conn);
            }
            cb(null, conn);
        });
    };

    function doSelectUser(conn, cb) {
        console.log(req.body.userId);
        let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}'`;
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
                console.log(sqlStatement);
                if (result.rows.length === 0) {
                    res.status(401).send({'err': 'User not found'});
                    cb(null, conn);

                } else {
                    userDB = result.rows[0];
                    userFound = true;//Added for response set
                    cb(null, conn);
                }
            }
        });
    }

    function doChkOTP(conn, cb) {
        if (userFound)
        {
            console.log(req.body.userId);
            let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}' AND OTP is NULL`;
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
                    console.log(sqlStatement);
                    if (result.rows.length === 0) {
                        res.status(401).send({'err': 'Kindly reset the Password using OTP'});
                        cb(null, conn);

                    } else {
                        userOTP = true;//Added for response set
                        cb(null, conn);
                    }
                }
            });
        } else
            cb(null, conn);
    }

    function doChkLock(conn, cb) {
        if (userFound && userOTP)
        {
            console.log(req.body.userId);
            let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}' AND NVL(ACC_LOCK,'No')<>'Yes'`;
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
                    console.log(sqlStatement);
                    if (result.rows.length === 0) {
                        res.status(401).send({'err': 'Account Locked ! Kindly reset the Password'});
                        cb(null, conn);

                    } else {
                        userDB = result.rows[0];
                        userLock = true;//Added for response set
                        cb(null, conn);
                    }
                }
            });
        } else
            cb(null, conn);
    }

    function doVerifyPassword(conn, cb) {
        if (userFound && userLock && userOTP)//Added for response set
        {//Added for response set
            bcrypt.compare(password, userDB.PASSWORD, function (err, isMatch) {

                if (err)
                    cb(err, conn);
                if (!isMatch)
                {
                    updateEntry(conn, cb);
                }
                if (isMatch)
                {
                    passwordValid = true;//Added for response set
                    cb(null, conn);
                }
            });
        }//Added for response set
        else
            cb(null, conn);
    }


    function updateEntry(conn, cb) {

        let getSQL = `SELECT NVL(MAX(LOGIN_NUM),0) FROM USERS_T WHERE USER_ID=:1`;

        sqlStatement = "UPDATE USERS_T SET LOGIN_NUM=:1,ACC_LOCK=:2 WHERE USER_ID=:3";
        var bindVars = [req.body.userId];
        var count = 0;
        conn.execute(getSQL, bindVars, {
            autoCommit: true// Override the default non-autocommit behavior,
        }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                result.rows.forEach(function (row) {
                    count = row[0] + 1;
                    if (count === 3)
                    {
                        let binVars = [count, 'Yes', req.body.userId];
                        bindArr.push(binVars);
                        res.status(401).send({'err': 'Incorrect Password ! Account Locked'});
                    } else
                    {
                        let binVars = [count, '', req.body.userId];
                        bindArr.push(binVars);
                        var result = 3 - count;
                        res.status(401).send({'err': 'Incorrect Password ! ' + result + ' Attempts Remaining '});
                    }
                });
                doInsert(conn, cb);
            }
        });
    }
    ;

    function doInsert(conn, cb) {
        async.eachSeries(bindArr, function (data, callback) {
            let insertStatement = sqlStatement;
            let bindVars = data;
            conn.execute(insertStatement
                    , bindVars, {
                        autoCommit: true// Override the default non-autocommit behavior
                    }, function (err, result)
            {
                if (err) {
                    console.log("Error Occured: ", err);
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected); // 1
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
            } else {
                cb(null, conn);
            }
        }
        );
    }

    function doSendUser(conn, cb) {
        if (userFound && passwordValid && userLock)//Added for response set
        {
            //Added for response set

            let user = {};
            user.userId = userDB.USER_ID;
            user.name = userDB.NAME;
            user.email = userDB.EMAIL;
            user.phone = userDB.PHONE || 0;
            user.role = userDB.ROLE;
            user.locId = userDB.LOC_ID;
            user.partGrp = userDB.PART_GRP;

            var token = 'JWT ' + jwt.sign({username: userDB.USER_ID}, 'somesecretforjswt', {expiresIn: 10080});
            user.token = token;
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(user).replace(null, '"NULL"'));
            doUpdate(conn, cb);
        } else {
            cb(null, conn);
        }
    }//Added for response set

    function doUpdate(conn, cb) {
        let sqlStatement = "UPDATE USERS_T SET LOGIN_NUM=:1,ACC_LOCK=:2 WHERE USER_ID=:3";
        let bindVars = ['', '', req.body.userId];
        conn.execute(sqlStatement
                , bindVars, {
                    autoCommit: true// Override the default non-autocommit behavior
                }, function (err, result)
        {
            if (err) {
                console.log("Error Occured: ", err);
                cb(err, conn);
            } else {
                console.log("Rows inserted: " + result.rowsAffected); // 1
                cb(null, conn);
            }
        });
    }

    async.waterfall(
            [doConnect,
                doSelectUser,
                doChkOTP,
                doChkLock,
                doVerifyPassword,
                doSendUser
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

function hashPass(password, cb) {
    if (password.length > 8)
        cb(password);
    bcrypt.hash(password, 10, function (err, hash) {
        if (err)
            throw err;
        cb(hash);
    });
}

//function updatePassword(req, res) {
//    var sqlStatement = "UPDATE USERS_T SET PASSWORD=:1 , ACC_LOCK=:2, LOGIN_NUM =:3, OTP=:4 WHERE USER_ID=:5 AND OTP=:6";
//    hashPass(req.body.password, function (hashPassword) {
//        var bindVars = [hashPassword, '', '', '',req.body.userId,req.body.otp];
//        op.singleSQL(sqlStatement, bindVars, req, res);
//        
//    });
//}


function resetPassword(req, res) {

    let userId = req.body.userId;
    let userDB = {};
    let userFound = false;//Added for response set
    let genOTP = false;//Added for response set
    let passwordValid = false;//Added for response set
    var bindArr = [];
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err) {
                cb(err, conn);
            }
            cb(null, conn);
        });
    };

    function doSelectUser(conn, cb) {
        let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}'`;
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
                console.log(sqlStatement);
                if (result.rows.length === 0) {
                    res.status(401).send({'err': 'User not found'});
                    cb(null, conn);

                } else {
                    userDB = result.rows[0];
                    userFound = true;//Added for response set
                    cb(null, conn);
                }
            }
        });
    }

    function doGenOTP(conn, cb) {
        if (userFound)
        {
            let getSQL = `select trunc(dbms_random.value(10000000,99999999)) from USERS_T WHERE USER_ID=:1`;

            sqlStatement = "UPDATE USERS_T SET OTP=:1 WHERE USER_ID=:2";
            var bindVars = [req.body.userId];

            conn.execute(getSQL, bindVars, {
                autoCommit: true// Override the default non-autocommit behavior,
            }, function (err, result)
            {
                if (err) {
                    cb(err, conn);
                } else {
                    result.rows.forEach(function (row) {
                        if (result.rows.length === 0)
                        {
                            res.status(401).send({'err': 'Unable to Generate the OTP ! Kindly try Again'});
                        } else
                        {
                            let binVars = [row[0], req.body.userId];
                            bindArr.push(binVars);
                            res.status(200).send({'Success': 'OTP Generated ! Kindly Reset Password using OTP '});
                        }
                    });
                    doInsert(conn, cb);
                }
            });
        } else
            cb(null, conn);
    }
    ;

    function doInsert(conn, cb) {
        async.eachSeries(bindArr, function (data, callback) {
            let insertStatement = sqlStatement;
            let bindVars = data;
            conn.execute(insertStatement
                    , bindVars, {
                        autoCommit: true// Override the default non-autocommit behavior
                    }, function (err, result)
            {
                if (err) {
                    console.log("Error Occured: ", err);
                    callback();
                } else {
                    console.log("Rows inserted: " + result.rowsAffected); // 1
                    callback();
                }
            });
        }, function (err) {
            if (err) {
                console.log("Event Insert Error");
            } else {
                cb(null, conn);
            }
        }
        );
    }

    async.waterfall(
            [doConnect,
                doSelectUser,
                doGenOTP
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

function updatePassword(req, res) {

    let userId = req.body.userId;
    let otp = req.body.otp;
    let userDB = {};
    let userFound = false;//Added for response set
    let genOTP = false;//Added for response set

    var bindArr = [];
    var bindVars = [];
    var doConnect = function (cb) {
        op.doConnectCB(function (err, conn) {
            if (err) {
                cb(err, conn);
            }
            cb(null, conn);
        });
    };

    function doSelectUser(conn, cb) {
        let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}'`;
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
                if (result.rows.length === 0) {
                    res.status(401).send({'err': 'User not found'});
                    cb(null, conn);

                } else {
                    userDB = result.rows[0];
                    userFound = true;//Added for response set
                    cb(null, conn);
                }
            }
        });
    }

    function doSelectOTP(conn, cb) {
        let sqlStatement = `SELECT * FROM USERS_T WHERE USER_ID='${userId}' AND OTP='${otp}'`;
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
                if (result.rows.length === 0) {
                    res.status(401).send({'err': 'Invalid OTP for the User'});
                    cb(null, conn);

                } else {
                    userDB = result.rows[0];
                    genOTP = true;//Added for response set
                    cb(null, conn);
                }
            }
        });
    }

    function doUpdate(conn, cb) {
        if (userFound && genOTP)
        {

            sqlStatement = "UPDATE USERS_T SET PASSWORD=:1 , ACC_LOCK=:2, LOGIN_NUM =:3, OTP=:4 WHERE USER_ID=:5 AND OTP=:6";

            hashPass(req.body.password, function (hashPassword) {
                var bindVars = [hashPassword, '', '', '', req.body.userId, req.body.otp];
                conn.execute(sqlStatement, bindVars, {
                    autoCommit: true// Override the default non-autocommit behavior,
                }, function (err, result)
                {
                    if (err) {
                        res.status(401).send({'err': 'Unable to Update Password ! Kindly try Again'});
                        cb(null, conn);
                    } else {
                        res.status(200).send({'Success': 'Password Updated! Kindly login using same '});
                        cb(null, conn);
                    }
                });
            });

        } else
            cb(null, conn);
    }
    ;


    async.waterfall(
            [doConnect,
                doSelectUser,
                doSelectOTP,
                doUpdate
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

function verifyRole(req, res) {

    let userId = req.query.userId;
    let viewModel = req.query.viewModel;
    let role = req.query.role;

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let sqlStatement = `SELECT * FROM ROLE_ACCESS_T WHERE ROLE='${role}' AND VIEW_MODEL='${viewModel}'`;
        let bindVars = [];
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                if (result.rows.length === 0) {
                    res.status(200).send({access: false});
                    cb(null, conn);

                } else {
                    res.status(200).send({access: true});
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

function verifyLink(req, res) {

    let category = req.query.category;
    let role = req.query.role;
    let partGrp = req.query.partGrp;
    var listArr = [];

    var doconnect = function (cb) {
        op.doConnectCB(cb);
    };

    var dorelease = function (conn) {
        conn.close();
    };

    var doSelect = function (conn, cb) {
        let sqlStatement = `SELECT sub_category_id,SUB_CAT_NAME FROM LINK_ACCESS_T WHERE ROLE='${role}' AND CATEGORY='${category}' AND PART_GRP='${partGrp}' group by sub_category_id,SUB_CAT_NAME,trunc(seq) order by trunc(seq)`;
        let bindVars = [];
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                result.rows.forEach(function (row) {
                    let obj = {};
                    obj.subCategory = row.SUB_CATEGORY_ID;
                    obj.subCatName = row.SUB_CAT_NAME;
                    obj.link = [];
                    listArr.push(obj);
                });
                cb(null, conn);

            }
        });
    };

    var doSelect1 = function (conn, cb) {

        let sqlStatement = `SELECT sub_category_id,link_id,LINK_NAME FROM LINK_ACCESS_T WHERE ROLE='${role}' AND CATEGORY='${category}' AND PART_GRP='${partGrp}' GROUP BY sub_category_id,link_id,LINK_NAME,seq order by seq`;
        let bindVars = [];
        conn.execute(sqlStatement
                , bindVars, {
                    outFormat: oracledb.OBJECT
                }, function (err, result)
        {
            if (err) {
                cb(err, conn);
            } else {
                listArr.forEach(function (list)
                {
                    result.rows.forEach(function (row) {

                        if (list.subCategory === row.SUB_CATEGORY_ID)
                        {
                            if (list.subCategory === row.LINK_ID)
                            {
                                let data = {};
                                data = null;
                                list.link.push(data);
                            } else
                            {
                                let data = {};
                                data.id = row.LINK_ID;
                                data.name = row.LINK_NAME;
                                list.link.push(data);
                            }

                        }

                    });
                });
                res.writeHead(200, {'Content-Type': 'application/json'});
                // res.end(JSON.stringify(listArr).replace(null, '"null"'));
                res.end(JSON.stringify(listArr));
                cb(null, conn);

            }
        });
    };
    async.waterfall(
            [
                doconnect,
                doSelect,
                doSelect1
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