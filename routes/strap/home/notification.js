var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');
var moment = require('moment');
var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getNotify(req, res);
});

router.get('/details', function (req, res) {
    getDetails(req, res);
});

module.exports = router;


function getNotify(req, res) {

    var sqlStatement = `SELECT event_date,event_id,comments description , event_ts
                       FROM(
                       select event_date,event_id,DECODE(SUBSTR(e.comments,INSTR(e.comments,':',1,2)+1,4),'Exit','Exit from ','Entr','Entry from ')||g.geofence_id as comments, e.event_ts
                         from events_t e,geofence_t g
                        where e.event_type IN ('Device')
                          and e.event_name in ('Notification')
                          and e.from_loc =g.map_val
                          and g.type='LOC_ID' 
                          AND e.event_date like to_date('${moment(req.query.eventDt).format("DD-MMM-YYYY")}')                       
                          )
                          order by event_ts desc`;
    
//        var sqlStatement = `SELECT event_date,event_type,event_name,event_id,comments description , event_ts,Priority
//                       FROM(
//                       select event_date,event_type,event_name,event_id,'Device Id :'||event_id||': Entry/Exit : '||FROM_LOC comments , e.event_ts,'Low' Priority
//                         from events_t e,geofence_t g
//                        where event_type IN ('Device')
//                          and event_name in ('Notification')
//                          and from_loc =g.map_val
//                          and g.type='LOC_ID' 
//                          AND event_date like to_date('${moment(req.query.eventDt).format("DD-MMM-YYYY")}')
//                        UNION                         
//                       select event_date,event_type,event_name,event_id,
//                              DECODE(e.event_name,'Dispatched',event_id||' '||e.event_name||' From '||e.from_loc,'Reached',event_id||' '||e.event_name||' To '||e.from_loc,e.event_name) comments ,
//                              e.event_ts,DECODE(e.event_name,'Reached','High','Dispatched','Medium') Priority
//                         from events_t e,locations_t l
//                        where event_type IN ('Invoice')
//                          and event_name in ('Reached','Dispatched')
//                          and from_loc =l.loc_id 
//                          AND event_date like to_date('${moment(req.query.eventDt).format("DD-MMM-YYYY")}')
//                          )
//                          order by event_ts desc`;
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

function getDetails(req, res) {
    var partGrp = req.query.partGrp;
    var devId = req.query.devId;
    var sqlStatement = `select ih.invoice_num,ih.inv_dt,ih.from_loc,ih.to_loc,ih.lr_no,ih.status,il.part_no,il.qty 
                          from inv_hdr_t ih,inv_line_t il,locations_t l 
                         where ih.invoice_num=il.invoice_num 
                           and ih.device_id='${devId}'
                           AND ih.from_loc=l.loc_id
                           and ih.part_grp=il.part_grp
                           and ih.part_grp='${partGrp}'
                           and ih.status<>l.close_status`;
    
    var bindVars = [];
    op.singleSQL(sqlStatement, bindVars, req, res);
}

