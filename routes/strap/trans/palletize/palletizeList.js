var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/detail', function (req, res) {
    getDetail(req, res);
});


module.exports = router;

function getData(req, res) {

    /*Get the Search Parameters*/
    var palletLabel = (req.query.label || '%') + '%';
    var palletId = (req.query.id || '%') + '%';
    var partGrp = (req.query.partGrp || '%') + '%';
    var sqlStatement = `SELECT * FROM EVENTS_T WHERE EVENT_NAME='Palletised' AND REF_ID LIKE '${palletId}' AND REF_LABEL LIKE '${palletLabel}' AND PART_GRP LIKE '${partGrp}' AND REF_LABEL=LABEL`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getDetail(req, res) {

    /*Get the Search Parameters*/
    var palletLabel = (req.query.label || '%') + '%';
    var palletId = (req.query.id || '%') + '%';
    var partGrp = (req.query.partGrp || '%') + '%';
    var sqlStatement = `SELECT * FROM EVENTS_T WHERE EVENT_NAME='Palletised' AND REF_ID LIKE '${palletId}' AND REF_LABEL LIKE '${palletLabel}' AND PART_GRP LIKE '${partGrp}' AND REF_LABEL<>LABEL`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
