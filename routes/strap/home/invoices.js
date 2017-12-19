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

function getInvoice(req, res) {

    var partGrp = req.query.partGrp;

    var sqlStatement = `WITH Plant as
                               (
                               SELECT 'Plant' plant_type, NVL(SUM(invoice),0) plant_invoice ,count(part_no) plant_part_no,NVL(sum(qty),0) plant_qty
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
                                  GROUP BY part_no)),
                               Transit as
                               (
                               SELECT 'Transit' transit_type, NVL(SUM(invoice),0) transit_invoice,count(part_no) transit_part_no,NVL(sum(qty),0) transit_qty
                               FROM(
                               SELECT count(ih.invoice_num) invoice,part_no,sum(qty) qty
                                 FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                WHERE ih.invoice_num=il.invoice_num
                                  AND ih.from_loc=l.loc_id
                                  AND l.type IN ('Plant','Warehouse')
                                  AND ih.status in ('Dispatched','Reached')
                                  and ih.status <>l.close_status
                                  AND part_no IS NOT NULL
                                  AND ih.part_grp='${partGrp}'
                                  AND ih.part_grp=il.part_grp
                                  GROUP BY part_no)),
                               warehouse as(
                               SELECT 'Warehouse' warehouse_type, NVL(SUM(invoice),0) wh_invoice,count(part_no) wh_part_no,NVL(sum(qty),0) wh_qty
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
                                  GROUP BY part_no))
                               SELECT * FROM plant,transit,warehouse`;
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

