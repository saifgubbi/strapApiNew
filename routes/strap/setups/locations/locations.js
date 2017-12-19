var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');

router.get('/', function (req, res) {
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

function getData(req, res) {

    /*Get the Search Parameters*/
    var locId = (req.query.locId || '%') + '%';
    var desc = (req.query.desc || '%') + '%';
    var type = (req.query.type || '%') + '%';
    var closeStatus = (req.query.closeStatus || '%') + '%';

    var sqlStatement = `SELECT * FROM LOCATIONS_T WHERE LOC_ID LIKE '${locId}' AND CLOSE_STATUS LIKE '${closeStatus}' AND DESCRIPTION LIKE '${desc}' AND TYPE LIKE '${type}'`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function addData(req, res) {
    var sqlStatement = "INSERT INTO LOCATIONS_T VALUES (:1,:2,:3,:4,:5,:6) ";
    
    var bindVars = [req.body.locId, req.body.desc, req.body.type, req.body.closeStatus, req.body.lat, req.body.lon];
    //console.log(bindVars);
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function removeData(req, res) {
    var sqlStatement = "DELETE FROM LOCATIONS_T WHERE LOC_ID = (:1)";
    var bindVars = [req.query.locId];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function updateData(req, res) {
    var sqlStatement = `UPDATE LOCATIONS_T
                SET DESCRIPTION = :1 , TYPE = :2 , CLOSE_STATUS = :3, LAT=:4, LON=:5 WHERE LOC_ID=:6`;
    var bindVars = [req.body.desc, req.body.type, req.body.closeStatus, req.body.lat, req.body.lon, req.body.locId];
    //console.log(bindVars.join());
    op.singleSQL(sqlStatement, bindVars, req, res);
}
