var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var moment = require('moment');
var async = require('async');

var oracledb = require('oracledb');

router.get('/palletised', function (req, res) {
    getPalletised(req, res);
});

router.get('/openInv', function (req, res) {
    getOpenInv(req, res);
});

router.get('/closeInv', function (req, res) {
    getCloseInv(req, res);
});

router.get('/invCount', function (req, res) {
    getInvCount(req, res);
});

router.get('/pickList', function (req, res) {
    getPickList(req, res);
});


module.exports = router;

function getPalletised(req, res) {

    /*Get the Search Parameters*/
    var partGrp = req.query.partGrp;
    var eventDate = '';
    //var invDtTo = '';
     
    if (req.query.eventDate) {
        eventDate = `and trunc(E.event_date) = '${moment(req.query.eventDate).format("DD-MMM-YYYY")}'`;
    }
       
    var sqlStatement = `select E.label,E.part_no,
                                   (select count(1)from BINS_T B 
                                     WHERE B.PALLET_ID=E.EVENT_ID 
                                       and B.PART_GRP=E.PART_GRP )no_bins,
                                  (select status from PALLETS_T P
                                    WHERE P.PALLET_ID=E.EVENT_ID 
                                      and P.PART_GRP=E.PART_GRP) status,
                                      E.qty 
                          from events_t E 
                         where E.event_type='Pallet' and E.event_name like 'Palletised'
                         AND E.PART_GRP='${partGrp}' ${eventDate} `;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}


function getOpenInv(req, res) {

    var partGrp = req.query.partGrp;
    var locType = req.query.locType;
        
    var sqlStatement = `SELECT ih.invoice_num,ih.inv_dt,ih.status_dt,ih.status,il.part_no,il.qty 
                          FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                         WHERE ih.invoice_num=il.invoice_num
                           AND ih.part_grp=il.part_grp
                           AND ih.from_loc=l.loc_id
                           AND ih.status<>l.close_status
                           AND L.TYPE='${locType}'
                           AND IH.PART_GRP='${partGrp}' `;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getCloseInv(req, res) {

    var partGrp = req.query.partGrp;
    var locType = req.query.locType;
    var eventDate = '';
     
    if (req.query.eventDate) {
        eventDate = `and trunc(ih.inv_dt) = '${moment(req.query.eventDate).format("DD-MMM-YYYY")}'`;
    }
   
     
    var sqlStatement = `SELECT ih.invoice_num,ih.inv_dt,ih.status_dt,ih.status,il.part_no,il.qty 
                          FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                         WHERE ih.invoice_num=il.invoice_num
                           AND ih.part_grp=il.part_grp
                           AND ih.from_loc=l.loc_id
                           AND ih.status=l.close_status
                           AND L.TYPE='${locType}'
                           AND IH.PART_GRP='${partGrp}' ${eventDate}`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getInvCount(req, res) {

    var partGrp = req.query.partGrp;
    var locType = req.query.locType;
    var eventDate = '';
     
    if (req.query.eventDate) {
        eventDate = `and trunc(ih.inv_dt) = '${moment(req.query.eventDate).format("DD-MMM-YYYY")}'`;
    }
   
    if (locType==='Plant')
    {
        var sqlStatement = `SELECT count(1) count_inv , decode(ih.status,'Dispatched','Trasit','Reached','Reached','Plant') status
                          FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                         WHERE ih.invoice_num=il.invoice_num
                           AND ih.part_grp=il.part_grp
                           AND ih.from_loc=l.loc_id
                           AND ih.status<>l.close_status
                           AND L.TYPE='${locType}'
                           AND IH.PART_GRP='${partGrp}' ${eventDate}
                         group by ih.status`;
    }
    else
    {
        var sqlStatement = `SELECT sum(count_inv) count_inv,status
                              FROM(
                                   SELECT count(1) count_inv , decode(ih.status,'Dispatched','Trasit','Reached','Reached',L.TYPE) status
                                     FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                    WHERE ih.invoice_num=il.invoice_num
                                      AND ih.part_grp=il.part_grp
                                      AND ih.from_loc=l.loc_id
                                      AND ih.status<>l.close_status
                                      AND L.TYPE='${locType}'
                                      AND IH.PART_GRP='${partGrp}' ${eventDate}
                                      group by ih.status,l.type
                                    UNION
                                   SELECT count(1) count_inv , ih.status status
                                     FROM INV_HDR_T IH,INV_LINE_T IL,LOCATIONS_T L
                                    WHERE ih.invoice_num=il.invoice_num
                                      AND ih.part_grp=il.part_grp
                                      AND ih.to_loc=l.loc_id
                                      AND ih.status='Received'
                                      AND L.TYPE='${locType}'
                                      AND IH.PART_GRP='${partGrp}' ${eventDate}
                                      group by ih.status 
                                    )
                                    GROUP BY status`;
    }
    var bindVars = [];
    console.log(sqlStatement)
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getPickList(req, res) {

    var partGrp = req.query.partGrp;
    var eventDate = '';
     
    if (req.query.eventDate) {
        eventDate = `and trunc(p.pick_date) = '${moment(req.query.eventDate).format("DD-MMM-YYYY")}'`;
    }
   
    
    var sqlStatement = `select p.pick_list,p.part_no,p.Qty from pick_list_t p where PART_GRP= '${partGrp}' ${eventDate} `;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}