const { Pool } = require('pg')
const config = require('./config')
const moment = require('moment')

let pools = {}
database_all = "event_pred_lung_db2"

function getPool (database) {
  const dbConfig = {
    host: config.devlopmentDB.host,
    user: config.devlopmentDB.user,
    password: config.devlopmentDB.password,
    port: config.devlopmentDB.port,
    database: database,
    idleTimeoutMillis: config.devlopmentDB.idleTimeoutMillis
  }
  if (pools[database] === undefined) {
    console.log('create new pool for ' + database)
    pools[database] = new Pool(dbConfig)
  }
  return pools[database]
}

const getUserDB = async function () {
  const pool = getPool('evt_seq')
  const client = await pool.connect()
  let userdb = []
  try {
    const sql = 'SELECT * FROM EVT_SEQ'
    const result = await client.query(sql)
    for (let res of result.rows) {
      userdb.push(res['db_name'])
    }
    return userdb
  } catch (e) {
    console.log(e)
    return null
  } finally {
    client.release()
  }
}

const getVocabulary = async function () {
  const pool = getPool('event_pred_db5')
  const client = await pool.connect()
  let eventCntResult, sumResult
  try {
    let eventCntSql = 'select count_table.icd_code, count,event_code, event_type from (select icd_code, count(distinct pid) from connect group by icd_code) as count_table, event where count_table.icd_code=event.icd_code';
    let sumSql = 'select count(pid) from patient';
    [eventCntResult, sumResult] = await Promise.all([client.query(eventCntSql), client.query(sumSql)])
    console.log(sumResult.rows)
  } catch (e) {
    console.log(e)
  } finally {
    client.release()
  }
  return {
    eventList:eventCntResult.rows,
    amount:sumResult.rows[0].count }
}

const getHeartdisease = async function () {
  const pool = getPool(database_all)
  const client = await pool.connect()
  let eventCntResult, sumResultm, eventResult, flag
  try {
    let eventCntSql = 'select icd_code, pid from connect group by (pid, icd_code)';

    let sumSql = 'select count(pid) from patient';
    [eventCntResult, sumResult] = await Promise.all([client.query(eventCntSql), client.query(sumSql)])

    sumResult = sumResult.rows[0].count
    eventResult = {}
    flag = [[],[],[],[]]
    codeList = ['482|486','487|488','489|491','492|493']
    for(var i=0; i<eventCntResult.rows.length; i++){
      let code = parseInt(eventCntResult.rows[i].icd_code)
      if(482<=code && code <= 486){
        if(!flag[0].includes(eventCntResult.rows[i].pid)){
          flag[0].push(eventCntResult.rows[i].pid)
        }
      }else if(487<=code && code <= 488){
        if(!flag[1].includes(eventCntResult.rows[i].pid)){
          flag[1].push(eventCntResult.rows[i].pid)
        }
      }else if(489<=code && code <= 491){
        if(!flag[2].includes(eventCntResult.rows[i].pid)){
          flag[2].push(eventCntResult.rows[i].pid)
        }
      }else if(492<=code && code <= 493){
        if(!flag[3].includes(eventCntResult.rows[i].pid)){
          flag[3].push(eventCntResult.rows[i].pid)
        }
      // }else if(493<=code && code <= 493){
      //   if(!flag[4].includes(eventCntResult.rows[i].pid)){
      //     flag[4].push(eventCntResult.rows[i].pid)
      //   }
      // }else if(494<=code && code <= 495){
      //   if(!flag[5].includes(eventCntResult.rows[i].pid)){
      //     flag[5].push(eventCntResult.rows[i].pid)
      //   }
      // }else if(496<=code && code <= 496){
      //   if(!flag[6].includes(eventCntResult.rows[i].pid)){
      //     flag[6].push(eventCntResult.rows[i].pid)
      //   }
      // }else if(497<=code && code <= 518){
      //   if(!flag[7].includes(eventCntResult.rows[i].pid)){
      //     flag[7].push(eventCntResult.rows[i].pid)
      //   }
      // }else if(519<=code && code <= 519){
      //   if(!flag[8].includes(eventCntResult.rows[i].pid)){
      //     flag[8].push(eventCntResult.rows[i].pid)
      //   }
      }
    }

    for(var i=0; i<flag.length; i++){
      eventResult[codeList[i]] = flag[i].length*1.0/sumResult
    }
  } catch (e) {
    console.log(e)
  } finally {
    client.release()
  }
  return eventResult
}



const getMaxLength = async function () {
  const pool = getPool(database_all)
  const client = await pool.connect()
  let maxLen = 0
  try {
    let lengthSql = `SELECT MAX(event_length) FROM patient`
    const result = await client.query(lengthSql)
    maxLen = result.rows[0]['max']
  } catch (e) {
    console.log(e)
  }finally {
    client.release()
  }
  console.log(maxLen)
  return maxLen
}

const getMinLength = async function (database) {
  const pool = getPool(database)
  const client = await pool.connect()
  let minLen = Infinity
  try {
    let lengthSql = `SELECT min(event_length) FROM patient`
    const result = await client.query(lengthSql)
    minLen = result.rows[0]['min']
  } catch (e) {
    console.log(e)
  }finally {
    client.release()
  }
  console.log(minLen)
  return minLen
}

const getVocabularyFromMimic = async function (database) {
  const pool = getPool(database)
  const client = await pool.connect()
  let typeList = []
  let itemList = []
  try {
    let typeSql = 'SELECT DISTINCT event_type FROM event_info_table Order by event_type'
    let itemSql = 'select event_type, event_code from event_info_table'
    let [typeResult, itemResult] = await Promise.all([client.query(typeSql), client.query(itemSql)])
    for (let res of typeResult.rows) {
      typeList.push(res['event_type'])
    }
    for await (let res of itemResult.rows) {
      itemList.push(res['event_type'] + '-' + ('' + res['event_code']).replace(/ /g, '_'))
    }
    itemList = [...new Set(itemList)].sort()
  } catch (e) {
    console.log(e)
  } finally {
    client.release()
  }
  return { typeList, itemList }
}

function regex (patterns) {
  let patternList = patterns.split('|')
  let patternStr =  patternList.join('\\|(.*\\|)?').toUpperCase()
  return '\\|(.*\\|)?' + patternStr + '\\|(.*\\|)?'
}

const getPidList = async function() {
  const pool = getPool(database_all);
  const client = await pool.connect()
  let pidlist = []
  try {
    let sql = `SELECT pid, gender, code_string FROM patient`
    let result = await client.query(sql)
    result = result.rows;
    let new_result = []
    for (let i in result) {
      let events = result[i]['code_string'].split('|')
      if(events.length>2){
        new_result.push(result[i])
      }
    }
    for (let i = 0; i < new_result.length; i++) {
      pidlist.push(new_result[i]['pid']);
    }
  } catch (e) {
    console.log(e)
  }finally {
    client.release()
  }

  return pidlist;
}

async function infoAdapter (results) {
  let seqences = {}
  console.log("length is: ",results.length)
  let len = results.length;
  for (let i = 0; i < len; i++) {
    let event = results[i];
    if (typeof seqences[event['pid']] !== 'object') {
      seqences[event['pid']] = []
    }
    let eventInfo = {
      'event_code': '' + event['event_code'],
      'event_time': event['event_time'],
      'event_type': event['event_type'],
      'icd_code': event['icd_code']
    }
    seqences[event['pid']].push(eventInfo)
  }
  return seqences
}

const getQuerySequence = async function (patterns, eventLength) {
  const pool = getPool(database_all)
  const client = await pool.connect()
  const patternStr = regex(patterns)
  let resInfo = {}
  let sql = 'select pid from patient'
  if (patternStr !== '' || eventLength !== '') {
    sql += ' where '
  }
  if (patternStr !== '') {
    sql += "upper(code_string) ~ '" + patternStr + "'"
    if (eventLength) {
      sql += ' and '
    }
  }
  if (eventLength) {
    const [minLen, maxLen] = eventLength.split('|')
    sql += 'event_length between ' + minLen + ' and ' + maxLen
  }
  sql = 'select pid, connect.event_code, event.icd_code, event_type, event_time from connect left join event on connect.event_code=event.event_code where pid in (' + sql + ') ORDER BY pid, event_time'

  try {
    console.log(sql)
    let results = await client.query(sql)
    console.log('end of query database..')
    resInfo = await infoAdapter(results.rows)
    console.log('entity num is: ' + Object.keys(resInfo).length)
  } catch (e) {
    console.log(e)
  } finally {
    client.release()
  }
  return resInfo
}
// const createDatabase = async function (datasetName) {
//   let pool = getPool('evt_seq')
//   let client = await pool.connect()
//   let userdb = []
//   let statusObj
//   try {
//     let sql = 'SELECT * FROM EVT_SEQ'
//     let result = await client.query(sql)
//     for (let res of result.rows) {
//       userdb.push(res['db_name'])
//     }
//     if (datasetName in userdb) {
//       statusObj = {
//         success: false,
//         msg: 'dataset name is in used..'
//       }
//     } else {
//       // await client.query('drop database academic')
//       // await client.query("delete from evt_seq where db_name = 'academic'")
//       await client.query(`CREATE DATABASE ${datasetName}`)
//       await client.query(`insert into evt_seq (db_name) values ('${datasetName}')`)
//       statusObj = {
//         success: true
//       }
//     }
//   } catch (e) {
//     console.log(e)
//   } finally {
//     client.release()
//   }
//   return statusObj
// }

const getPatientSeq = async function(pid) {
  const pool = getPool(database_all)
  const client = await pool.connect()
  let patientSeq = []
  let sql = `select event_code, icd_code, event_type, event_time from connect NATURAL join event where pid='${pid}' ORDER BY event_time`
  try {
    patientSeq = await client.query(sql);

    patientSeq = patientSeq.rows;
  } catch (e) {
    console.log(e)
  } finally {
    client.release()
  }
  return patientSeq;
}

const getAllPatients = async function() {
  const pool = getPool(database_all);
  const client = await pool.connect();
  let patients = [];
  let sql = 'select pid, gender, code_string from patient';
  try {
    patients = await client.query(sql);
    patients = patients.rows;
  } catch (e) {
    console.log(e);
  } finally {
    client.release();
  }
  return patients;
}

const getEventType = async function (eventCode) {
  const pool = getPool(database_all);
  const client = await pool.connect();
  let eventType = [];
  let sql = 'select event_type from event where event_code='+eventCode;
  try {
    eventType = await client.query(sql);
    eventType = eventType.rows[0]['event_type'];
  } catch (e) {
    console.log(e);
  } finally {
    client.release();
  }
  return eventType;
}

const getCurrentSeq = async function (pid) {
  const pool = getPool(database_all);
  const client = await pool.connect();
  let currentSeq = [];
  let sql = 'select code_string from patient where pid='+pid;
  try {
    currentSeq = await client.query(sql);
    currentSeq = currentSeq.rows[0]['code_string'];
    currentSeq = currentSeq.split('|')
  } catch (e) {
    console.log(e);
  } finally {
    client.release();
  }
  return currentSeq;
}

const getPatientSeqs = async function( pids ) {
  const pool = getPool(database_all);
  const client = await pool.connect();
  let resInfo = {}
  let sql = 'select pid, connect.event_code,event.icd_code, event_type, event_time from connect left join event on connect.event_code=event.event_code where pid in (' + pids + ') ORDER BY pid, event_time';

  try {
    console.log(sql)
    let results = await client.query(sql)
    console.log('end of query database..')
    resInfo = await infoAdapter(results.rows)
    console.log('entity num is: ' + Object.keys(resInfo).length)
  } catch (e) {
    console.log(e)
  } finally {
    client.release()
  }
  return resInfo;
}

module.exports = {
  getUserDB,
  getVocabulary,
  getMaxLength,
  getMinLength,
  getVocabularyFromMimic,
  getQuerySequence,
  getPatientSeq,
  getAllPatients,
  getEventType,
  getCurrentSeq,
  getPatientSeqs,
  getPidList,
  getHeartdisease
}
