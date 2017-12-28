var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');

var moment = require('moment');

router.get('/', function (req, res) {
    getData(req, res);
});

module.exports = router;

function getData(req, res) {

    var partGrp = (req.query.partGrp || '%') + '%';
    var eventDt = '';
     
    if (req.query.eventDt) {
        eventDt = `AND to_date(E.EVENT_DATE) = '${moment(req.query.eventDt).format("DD-MMM-YYYY")}'`;
    }
    var sqlStatement = `SELECT E.LABEL as "palletLabel",E.PART_NO as "partNo",e.Qty as "qty",P.STATUS 
                          FROM EVENTS_T E,PALLETS_T P 
                         WHERE E.EVENT_NAME IN ('Palletised','Depalletised') 
                            AND E.PART_GRP LIKE '${partGrp}' ${eventDt}
                           AND E.REF_LABEL=E.LABEL AND E.EVENT_ID=P.PALLET_ID 
                           AND E.PART_GRP=P.PART_GRP`;
    console.log(sqlStatement);
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
