var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getUser(req, res);
});

module.exports = router;


function getUser(req, res) {

    var userId = req.query.userId;
    var sqlStatement = `SELECT NAME,PART_GRP,LOC_ID,ROLE,EMAIL,PHONE 
                                  FROM users_t 
                                 WHERE user_id='${userId}'`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

