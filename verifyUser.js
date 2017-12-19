var express = require('express');
var router = express.Router();
var op = require('./oracleDBOps');


router.get('/', function (req, res) {
    verifyUser(req, res);
});


module.exports = router;

/*Get a single user for verification*/
function verifyUser(req, res) {
    req.domain = 'strap';
    var sqlStatement = `SELECT USER_ID,PASSWORD,NAME,ROLE,EMAIL,LOC_ID,PHONE,PART_GRP,ROLE FROM USERS_T WHERE USER_ID='${req.query.username}'`;
    console.log(sqlStatement);
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
