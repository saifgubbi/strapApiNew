var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getInvoice(req, res);
});

router.get('/plant', function (req, res) {
    getPlant(req, res);
});

router.get('/transit', function (req, res) {
    getTransit(req, res);
});

router.get('/warehouse', function (req, res) {
    getWarehouse(req, res);
});



module.exports = router;

function getInvoice1(req, res) {

    var partGrp = req.query.partGrp;

    var sqlStatement = `
                               SELECT 'Plant' type, NVL(SUM(invoice),0) invoice ,count(part_no) part_no,NVL(sum(qty),0) qty
                               FROM(
			                        	SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                                  FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                 WHERE ih.invoice_num=il.invoice_num
                                   AND ih.from_loc=l.loc_id
                                   AND l.type='Plant'
                                   AND ih.status not in ('Dispatched','Reached')
                                   and ih.status <>l.close_status
                                   AND part_no IS NOT NULL
                                   AND ih.part_grp='${partGrp}'
                                   AND ih.part_grp=il.part_grp
                                  GROUP BY part_no)
                               UNION
                               SELECT 'TransitPlant' type, NVL(SUM(invoice),0) invoice,count(part_no) part_no,NVL(sum(qty),0) qty
                               FROM(
                               SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                                 FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                WHERE ih.invoice_num=il.invoice_num
                                  AND ih.from_loc=l.loc_id
                                  AND l.type IN ('Plant')
                                  AND ih.status in ('Dispatched','Reached')
                                  and ih.status <>l.close_status
                                  AND part_no IS NOT NULL
                                  AND ih.part_grp='${partGrp}'
                                  AND ih.part_grp=il.part_grp
                                  GROUP BY part_no)
                                  UNION
                               SELECT 'TransitWh' type, NVL(SUM(invoice),0) invoice,count(part_no) part_no,NVL(sum(qty),0) qty
                               FROM(
                               SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                                 FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                WHERE ih.invoice_num=il.invoice_num
                                  AND ih.from_loc=l.loc_id
                                  AND l.type IN ('Warehouse')
                                  AND ih.status in ('Dispatched')
                                  and ih.status <>l.close_status
                                  AND part_no IS NOT NULL
                                  AND ih.part_grp='${partGrp}'
                                  AND ih.part_grp=il.part_grp
                                  GROUP BY part_no)
                                  UNION
                               SELECT 'Warehouse' type, NVL(SUM(invoice),0) invoice,count(part_no) part_no,NVL(sum(qty),0) qty
                               FROM(
                               SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                                 FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                WHERE ih.invoice_num=il.invoice_num
                                  AND ih.from_loc=l.loc_id
                                  AND l.type='Warehouse'
                                  AND ih.status not in ('Dispatched','Reached')
                                  and ih.status <>l.close_status
                                  AND part_no IS NOT NULL
                                  AND ih.part_grp='${partGrp}'
                                  AND ih.part_grp=il.part_grp
                                  GROUP BY part_no)`;
    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}
function getInvoice(req, res) {

    var partGrp = req.query.partGrp;

    var sqlStatement = `     SELECT loc as locType, NVL(SUM(invoice),0) invoice ,count(part_no) part_no,NVL(sum(qty),0) qty,status
                               FROM(
			        SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty,DECODE(status,'Dispatched','Transit','Reached','Transit',l.type) status,l.type as loc
                                  FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                 WHERE ih.invoice_num=il.invoice_num
                                   AND ih.from_loc=l.loc_id
                                   and ih.status <>l.close_status
                                   AND part_no IS NOT NULL
                                   AND ih.part_grp='${partGrp}'
                                   AND ih.part_grp=il.part_grp
                                  GROUP BY part_no,status,l.type)
                                  group by status,loc`;
    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getPlant(req, res) {

    var partGrp = req.query.partGrp;
    //console
    var sqlStatement = `SELECT SUM(invoice) ,count(part_no),sum(qty) qty
                        FROM(
                             SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                               FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                              WHERE ih.invoice_num=il.invoice_num
                                and ih.from_loc=l.loc_id
                                and l.type='Plant'
                                and ih.status<>'Dispatched'
                                and ih.status <>l.close_status
                                and part_no IS NOT NULL
                                AND ih.part_grp='${partGrp}'
                                AND ih.part_grp=il.part_grp
                                GROUP BY part_no)`;
    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}
function getTransit(req, res) {

    var partGrp = req.query.partGrp;
    //console
    var sqlStatement = `SELECT SUM(invoice),count(part_no),sum(qty) qty
                        FROM(
                             SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                               FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                              WHERE ih.invoice_num=il.invoice_num
                                and ih.from_loc=l.loc_id
                                and l.type in ('Plant','Warehouse')
                                and ih.status in ('Dispatched','Reached')
                                and ih.status <>l.close_status
                                and part_no IS NOT NULL
                                AND ih.part_grp='${partGrp}'
                                AND ih.part_grp=il.part_grp
                                GROUP BY part_no)`;
    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}
function getWarehouse(req, res) {

    var partGrp = req.query.partGrp;
    var sqlStatement = `SELECT SUM(invoice),count(part_no),sum(qty) qty
                        FROM(
                             SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                               FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                              WHERE ih.invoice_num=il.invoice_num
                                and ih.from_loc=l.loc_id
                                and l.type='Warehouse'
                                and ih.status<>'Dispatched'
                                and ih.status <>l.close_status
                                and part_no IS NOT NULL
                                AND ih.part_grp='${partGrp}'
                                AND ih.part_grp=il.part_grp
                                GROUP BY part_no)`;
    var bindVars = [];
    //console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

