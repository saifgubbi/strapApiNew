
var express = require('express');
var router = express.Router();
var op = require('../../../../oracleDBOps');
var moment = require('moment');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/detail', function (req, res) {
    getDetail(req, res);
});

router.delete('/', function (req, res) {
    removeData(req, res);
});


module.exports = router;

function getData(req, res) {

    var schedDt = '';
    if (req.query.schedDt) {
        schedDt = `AND SCHED_DT = '${moment(req.query.schedDt).format("DD-MMM-YYYY")}'`;
    }
    var partNo = (req.query.partNo || '%') + '%';
    var partGrp = req.query.partGrp;

    var sqlStatement = `SELECT SCHED_DT,CUST_PART_NO,PART_NO,SUM(WIP_QTY) AS WIP_QTY,SUM(QTY) AS QTY FROM SCHED_T WHERE PART_GRP LIKE '${partGrp}' ${schedDt} AND (PART_NO LIKE '${partNo}' OR CUST_PART_NO LIKE '${partNo}') GROUP BY SCHED_DT,CUST_PART_NO,PART_NO`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getDetail(req, res) {

    var schedDt = '';
    if (req.query.schedDt) {
        schedDt = `AND SCHED_DT = '${moment(req.query.schedDt).format("DD-MMM-YYYY")}'`;
    }
    var partNo = (req.query.partNo || '%') + '%';
    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT * FROM SCHED_T WHERE PART_GRP LIKE '${partGrp}' AND PART_NO LIKE '${partNo}' ${schedDt}`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function removeData(req, res) {
    var schedDt = moment(req.query.schedDt).format("DD-MMM-YYYY");
    var partGrp = req.query.partGrp;
    var sqlStatement = "DELETE FROM SCHED_T WHERE SCHED_DT = (:1) AND PART_GRP= :3";
    var bindVars = [schedDt, partGrp];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

