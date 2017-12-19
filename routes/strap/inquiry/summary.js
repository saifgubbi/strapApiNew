var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/pallet', function (req, res) {
    getPallets(req, res);
});

router.get('/bin', function (req, res) {
    getBins(req, res);
});

router.get('/serial', function (req, res) {
    getSerial(req, res);
});

router.get('/details', function (req, res) {
    getDetails(req, res);
});

module.exports = router;

function getData(req, res) {

    var partGrp = req.query.partGrp;
    var invDt = '';
    //var invDtTo = '';
     
    if (req.query.invDtFrom && req.query.invDtTo) {
        invDt = `AND to_date(E.event_date) BETWEEN '${moment(req.query.invDtFrom).format("DD-MMM-YYYY")}' AND '${moment(req.query.invDtTo).format("DD-MMM-YYYY")}'`;
    }

    //console
//    var sqlStatement =`select event_type,event_name,count(1) inv_count,ih.from_loc,ih.to_loc,l.type location, sum(il.qty) qty,il.part_no
//                         from events_t e,inv_hdr_t ih,inv_line_t il,locations_t l
//                        where ih.invoice_num=il.invoice_num
//                          AND ih.from_loc =l.loc_id  
//                          AND e.event_id=ih.invoice_num
//                          AND event_date = to_date('08-Dec-2017')
//                          AND EVENT_TYPE='Invoice'
//                          AND ih.status=e.event_name
//                          AND e.part_grp='${partGrp}'
//                     group by event_type,event_name,ih.from_loc,ih.to_loc,l.type,il.part_no
//                     order by l.type`;
    
    var sqlStatement =`select ih.invoice_num,ih.status,l.type location, sum(il.qty) qty,il.part_no,NVL(ih.lr_no,'No LR Assigned'),NVL(ih.device_id,'No Device Assigned')
                         from inv_hdr_t ih,inv_line_t il,locations_t l
                        where ih.invoice_num=il.invoice_num
                          AND ih.from_loc =l.loc_id
                          AND ih.INV_DT = to_date('08-Dec-2017')
                          AND ih.part_grp='${partGrp}'
                          AND ih.part_grp=il.part_grp
                     group by ih.invoice_num,ih.status,l.type,il.part_no,ih.lr_no,ih.device_id
                     order by l.type`;
    //${invDt}
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getPallets(req, res) {

    /*Get the Search Parameters*/
    var invId = (req.query.invId || '%') + '%';
    var part = '';
    var partGrp = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    //var sqlStatement = `SELECT * FROM PALLETS_T WHERE INVOICE_NUM LIKE '${invId}' ${partGrp} ${part} `;
    var sqlStatement = `SELECT * FROM EVENTS_T WHERE EVENT_TYPE='Pallet' AND EVENT_NAME='Invoiced' AND INVOICE_NUM LIKE '${invId}' ${partGrp} ${part} ORDER BY EVENT_TS DESC`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getBins(req, res) {

    /*Get the Search Parameters*/
    var invId = (req.query.invId || '%');
    var part = '';
    var partGrp = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    //var sqlStatement = `SELECT * FROM BINS_T WHERE INVOICE_NUM LIKE '${invId}' ${partGrp} ${part} ORDER BY BIN_ID`;
    var sqlStatement = `SELECT * FROM EVENTS_T WHERE EVENT_TYPE='Bin' AND EVENT_NAME='Palletised' AND REF_ID IN
                        (SELECT EVENT_ID FROM EVENTS_T WHERE EVENT_TYPE='Pallet' AND EVENT_NAME='Invoiced'
                         AND INVOICE_NUM LIKE '${invId}' ${partGrp} ${part})  ${partGrp} ${part}
                        UNION
                        SELECT * FROM EVENTS_T WHERE EVENT_TYPE='Bin' AND EVENT_NAME='Invoiced' AND INVOICE_NUM LIKE '${invId}' ${partGrp} ${part} `;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getSerial(req, res) {

    /*Get the Search Parameters*/
    var invId = (req.query.invId || '%');
    var part = '';
    var partGrp = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    //var sqlStatement = `SELECT * FROM SERIAL_T WHERE 1=1 AND (CUST_INVOICE LIKE '${invId}' OR WH_INVOICE LIKE '${invId}') ${partGrp} ${part} ORDER BY SERIAL_NUM`;
    var sqlStatement = `SELECT S.SERIAL_NUM,S.SERIAL_DT,S.BIN_LABEL,NVL(SI.PICK_LIST,S.PICK_LIST) PICK_LIST,NVL(SI.BIN_ID,S.BIN_ID) BIN_ID,S.PALLET_ID,SI.LOC_TYPE,SI.INVOICE_NUM 
                          FROM SERIAL_T S,SERIAL_INV_T SI
                         WHERE S.SERIAL_NUM=SI.SERIAL_NUM(+)
                           AND SI.INVOICE_NUM = '${invId}' ${partGrp} ${part} ORDER BY S.SERIAL_NUM`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getDetails(req, res) {

    /*Get the Search Parameters*/
    var invId = (req.query.invId || '%');
    var partGrp = '';

    

    if (req.query.partGrp) {
        partGrp = ` AND A.PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    //console
    var sqlStatement =`SELECT * 
                                 FROM EVENTS_T A,LOCATIONS_T L
                                WHERE EVENT_TYPE = 'Invoice' 
                                  AND EVENT_ID LIKE '${invId}' ${partGrp}
                                  AND A.from_loc=L.LOC_ID 
                             ORDER BY EVENT_TS DESC`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}