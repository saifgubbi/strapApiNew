var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getData(req, res);
});

router.get('/batch', function (req, res) {
    getBatch(req, res);
});

router.get('/bin', function (req, res) {
    getBins(req, res);
});

router.get('/invoice', function (req, res) {
    getInvoice(req, res);
});

module.exports = router;

function getData(req, res) {

    //var locType = (req.query.locType || '%') + '%';
    var pickList = '';
    var partNo = '';
    var partGrp = '';
    var serDt = '';
    var serNum = '';
    var batch = '';
    var status = '';
   
    if (req.query.serDtFrom && req.query.serDtTo) {
        serDt = `AND TRUNC(SERIAL_DT) BETWEEN '${moment(req.query.serDtFrom).format("DD-MMM-YYYY")}' AND '${moment(req.query.serDtTo).format("DD-MMM-YYYY")}'`;
    }

 if (req.query.serNum) {
        serNum = `AND SERIAL_NUM = '${req.query.serNum}'`;
    }
    

    if (req.query.partNo) {
        partNo = ` AND PART_NO LIKE '${req.query.partNo}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }
    
     if (req.query.batch) {
        batch = ` AND BIN_LABEL LIKE '${req.query.batch}%' `;
    }
    
     if (req.query.status) {
        status = ` AND STATUS LIKE '${req.query.status}%' `;
    }
    
    

    //console
    var sqlStatement =`SELECT SERIAL_DT,
                              SERIAL_NUM,
                              BIN_ID,
                              BIN_LABEL as BATCH,
                              PART_NO,
                              PALLET_ID,
                              STATUS    
                              ,(select invoice_num from serial_inv_t where serial_num=A.serial_num and loc_type='Plant') WH_INVOICE
                              ,(select LR_NO from serial_inv_t where serial_num=A.serial_num and loc_type='Plant') WH_LR
                              ,(select invoice_num from serial_inv_t where serial_num=A.serial_num and loc_type='Warehouse') CUST_INVOICE
                              ,(select LR_NO from serial_inv_t where serial_num=A.serial_num and loc_type='Warehouse') CUST_LR
                              ,PICK_LIST
                         FROM SERIAL_T A
                        WHERE 1=1 ${serDt} ${serNum} ${partNo} ${partGrp} ${batch} ${status}
                        ORDER BY SERIAL_DT DESC,SERIAL_NUM`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getBatch(req, res) {

    /*Get the Search Parameters*/
    var batch = (req.query.batch || '%') + '%';
    var part = '';
    var partGrp = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }
    //SELECT S.SERIAL_NUM,S.SERIAL_DT,SI.*
    var sqlStatement = ` SELECT S.SERIAL_NUM,S.SERIAL_DT,NVL(SI.LOC_ID,S.LOC_ID) LOC_ID,S.BIN_LABEL,NVL(SI.BIN_ID,S.BIN_ID) BIN_ID,S.PART_NO,SI.PICK_LIST,NVL(SI.PALLET_ID,S.PALLET_ID) PALLET_ID
                          FROM SERIAL_T S,SERIAL_INV_T SI 
                         WHERE S.SERIAL_NUM=SI.SERIAL_NUM(+)
                           AND S.BIN_LABEL LIKE '${batch}' ${partGrp} ${part} 
                          ORDER BY SI.LOC_ID, S.SERIAL_NUM ASC`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getBins(req, res) {

    /*Get the Search Parameters*/
    var serNum = (req.query.serNum || '%') + '%';
    var part = '';
    var partGrp = '';
   if (req.query.part) {
        part = ` AND PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND PART_GRP LIKE '${req.query.partGrp}%' `;
    }

    var sqlStatement = `SELECT * FROM EVENTS_T WHERE EVENT_TYPE='Bin' AND EVENT_NAME='Picked' AND SERIAL_NUM LIKE '${serNum}' ${partGrp} ${part}`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getInvoice(req, res) {

    /*Get the Search Parameters*/
    var serNum = (req.query.serNum || '%');
    var part = '';
    var partGrp = '';
   if (req.query.part) {
        part = ` AND IL.PART_NO LIKE '${req.query.part}%' `;
    }

    if (req.query.partGrp) {
        partGrp = ` AND IL.PART_GRP LIKE '${req.query.partGrp}%'`;
    }

    var sqlStatement = `SELECT IH.INVOICE_NUM,IH.INV_DT,IH.FROM_LOC,IH.TO_LOC,IH.STATUS,IL.PART_NO,IL.QTY 
                          FROM INV_HDR_T IH,INV_LINE_T IL,SERIAL_INV_T I
                         WHERE IH.INVOICE_NUM=IL.INVOICE_NUM
                           AND IH.INVOICE_NUM =I.INVOICE_NUM
                           AND I.SERIAL_NUM LIKE '${serNum}' ${partGrp} ${part}
                           AND ih.part_grp=il.part_grp`;
                            
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}
