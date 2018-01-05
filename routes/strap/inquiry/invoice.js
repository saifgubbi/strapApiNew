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

    /*Get the Search Parameters*/
//    var eventId = (req.query.eventId || '%') + '%';
//    var locType = (req.query.locType || '%') + '%';
    var status = (req.query.status || '%') + '%';
    var fromLoc = (req.query.fromLoc || '%') + '%';
    var toLoc = (req.query.toLoc || '%') + '%';
    var invId = '';
    var partNo = '';
    var partGrp = '';
    var invDt = '';
    var locType ='';
    
    //var invDtTo = '';
     
    if (req.query.invDtFrom && req.query.invDtTo) {
        invDt = `AND to_date(A.INV_DT) BETWEEN '${moment(req.query.invDtFrom).format("DD-MMM-YYYY")}' AND '${moment(req.query.invDtTo).format("DD-MMM-YYYY")}'`;
    }

    if (req.query.invId) {
        invId = ` AND A.INVOICE_NUM LIKE '${req.query.invId}%' `;
    }

    if (req.query.partNo) {
        partNo = ` AND B.PART_NO LIKE '${req.query.partNo}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND A.PART_GRP LIKE '${req.query.partGrp}%' `;
    }
    
    if (req.query.locType==='Plant') {
      //  locType = ` AND A.STATUS NOT IN ('Dispatched','Reached') AND L.TYPE = 'Plant' AND A.STATUS<>L.CLOSE_STATUS AND B.part_no IS NOT NULL`;
        locType = ` AND L.TYPE = 'Plant' AND A.STATUS<>L.CLOSE_STATUS AND B.part_no IS NOT NULL`;
    }
    if (req.query.locType==='Warehouse') {
        //locType = ` AND A.STATUS NOT IN ('Dispatched') AND L.TYPE = 'Warehouse' AND A.STATUS<>L.CLOSE_STATUS AND B.part_no IS NOT NULL`;
        locType = `AND L.TYPE = 'Warehouse' AND A.STATUS<>L.CLOSE_STATUS AND B.part_no IS NOT NULL`;
    }
//    if (req.query.locType==='Transit') {
//        locType = ` AND A.STATUS IN ('Dispatched','Reached') AND L.TYPE IN ('Plant','Warehouse') AND A.STATUS<>L.CLOSE_STATUS AND B.part_no IS NOT NULL`;
//    }
    
    //console
    var sqlStatement =`SELECT A.INVOICE_NUM,A.INV_DT,A.FROM_LOC,A.TO_LOC,A.LR_NO,A.DEVICE_ID,B.PART_NO,A.STATUS,B.QTY
                         FROM INV_HDR_T A,
	                      INV_LINE_T B,
		              LOCATIONS_T L  
                        WHERE A.INVOICE_NUM=B.INVOICE_NUM 
	                  AND A.STATUS LIKE '${status}'  ${invDt}
	                  AND A.from_loc=L.LOC_ID 
                          AND A.FROM_LOC LIKE '${fromLoc}'
                          AND A.TO_LOC LIKE '${toLoc}' ${partGrp} ${invId} ${partNo} ${locType}
                          AND A.part_grp=B.part_grp
                          ORDER BY A.INV_DT DESC`;
    console.log(sqlStatement);
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