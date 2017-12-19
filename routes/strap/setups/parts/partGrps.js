var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');

router.get('/', function (req, res) {
    getUserData(req, res);
});

router.get('/all', function (req, res) {
    getData(req, res);
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

module.exports = router;


function getUserData(req, res) {
    var user = req.query.user;
    var sqlStatement = `SELECT A.* FROM PARTS_GRP_T A , USER_PARTS_T B WHERE B.USER_ID='${user}' AND A.part_grp=B.part_grp`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getData(req, res) {
    var partGrp = (req.query.partGrp || '%') + '%';
    var description = (req.query.description || '%') + '%';
    var owner = (req.query.owner || '%') + '%';

    var sqlStatement = `SELECT * FROM PARTS_GRP_T WHERE PART_GRP like '${partGrp}' AND DESCRIPTION LIKE '${description}'  AND owner LIKE '${owner}'`;
   // console.log(sqlStatement);
    var bindVars = [];

    op.singleSQL(sqlStatement, bindVars, req, res);
}

function addData(req, res) {
    var sqlStatement = "INSERT INTO PARTS_GRP_T(PART_GRP,DESCRIPTION,OWNER) VALUES (:1,:2,:3) ";
    var bindVars = [req.body.partGrp, req.body.description, req.body.owner];

   // console.log(bindVars.join());
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function removeData(req, res) {
    var sqlStatement = "DELETE FROM PARTS_GRP_T WHERE PART_GRP = (:1)";
    //var bindVars = [req.body.PART_GRP];
    var bindVars = [req.query.partGrp];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function updateData(req, res) {
    var sqlStatement = `UPDATE PARTS_GRP_T
                SET DESCRIPTION = :1,
                OWNER = :2
                WHERE PART_GRP = :3`;
    var bindVars = [req.body.description, req.body.owner, req.body.partGrp];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
