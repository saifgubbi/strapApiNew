var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');
//oracledb.prefetchRows = 100;
router.get('/', function (req, res) {
    getData(req, res);
});




module.exports = router;

function getData(req, res) {
    var partGrp = req.query.partGrp;
    let selectStatement = `WITH SCHED
                                 AS
                                  (  SELECT count(PART_NO) sched_Count,NVL(sum(sched_qty),0)sched_qty
                                    FROM (select sum(qty) sched_qty,PART_NO
                                       from sched_t
                                      where part_grp LIKE '${partGrp}'
                                        and trunc(sched_dt)=trunc(sysdate) and part_no is not null
                                        GROUP BY SCHED_DT,PART_NO
                                  )),
                              DISP
                                AS
                                 (
                                        SELECT count(IL.PART_NO) disp_count,SUM(DECODE(IH.STATUS,'Dispatched',IL.QTY,'Reached',IL.QTY,0)) DISP_QTY
                                          FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                         WHERE IH.PART_GRP LIKE '${partGrp}'
                                           AND IH.INVOICE_NUM=IL.INVOICE_NUM
                                           AND IH.FROM_LOC=L.LOC_ID
                                           AND L.TYPE='Warehouse'
                                           AND IH.STATUS in ('Dispatched','Reached')
                                           AND ih.part_grp=il.part_grp
                                           and trunc(status_dt)=trunc(sysdate)
                                  )
                                 SELECT NVL(Sched_Count,0)Sched_Count,NVL(sched_qty,0)sched_qty
                                      ,NVL(disp_count,0)disp_count,NVL(DISP_QTY,0)DISP_QTY
                                 FROM SCHED ,DISP`;


    var bindVars = [];
    op.singleSQL(selectStatement, bindVars, req, res);

}
