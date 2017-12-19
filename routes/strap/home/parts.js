var express = require('express');
var router = express.Router();
var op = require('../../../oracleDBOps');
var async = require('async');

var oracledb = require('oracledb');

router.get('/', function (req, res) {
    getParts(req, res);
});


module.exports = router;


function getParts(req, res) {

    var partGrp = req.query.partGrp;  
    var sqlStatement = `WITH Plant AS
                            (
                            SELECT 'Plant' plant_type, count(part_no) plant_part_no,NVL(sum(qty),0) plant_qty
                              FROM
                                (SELECT b.part_no, sum(qty) qty
                                   from bins_t b,LOCATIONS_T l 
                                  where b.from_loc=l.loc_id 
                                    and b.part_no is not null
                                    AND l.type='Plant'
                                    and b.status NOT IN ('New','Dispatched','Reached')
                                    AND b.status <>l.close_status
                                    and b.part_grp like '${partGrp}'
                                    and b.qty <>0
                                    group by part_no)),
                             Transit AS(
                             SELECT 'Transit' trasit_type, count(part_no) transit_part_no,NVL(sum(qty),0) transit_qty
                               FROM
                                  (SELECT b.part_no, sum(qty) qty
                                     from bins_t b,LOCATIONS_T l 
                                    where b.from_loc=l.loc_id 
                                      and b.part_no is not null
                                      AND l.type IN ('Plant','Warehouse')
                                      and b.status IN ('Dispatched','Reached')
                                      AND b.status <>l.close_status
                                      and b.part_grp like '${partGrp}'
                                      and b.qty <>0
                                     group by part_no)),
                             Warehouse AS (
                             SELECT 'Warehouse' wh_type, count(part_no) wh_part_no,NVL(sum(qty),0) wh_qty
                               FROM
                                  (SELECT b.part_no, sum(qty) qty
                                     from bins_t b,LOCATIONS_T l 
                                    where b.from_loc=l.loc_id 
                                      and b.part_no is not null
                                      AND l.type='Warehouse'
                                      and b.status NOT IN ('New','Dispatched','Reached')
                                      AND b.status <>l.close_status
                                      and b.part_grp like '${partGrp}'
                                      and b.qty <>0
                                  group by part_no))                                 
                         select * from plant,transit,warehouse`;
    var bindVars = [];
    console.log(sqlStatement);
    op.singleSQL(sqlStatement, bindVars, req, res);
}

