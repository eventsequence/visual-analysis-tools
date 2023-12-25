const { Pool } = require('pg')
const config = require('../../server/config')
const moment = require('moment')
const fs = require('fs-extra')

let pools = {}
let database_all = 'event_pred_lung_db2'

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

const getEvents = async function (eventCode) {
    const pool = getPool(database_all);
    const client = await pool.connect();
    let eventResult = [];
    let sql = 'select * from event';
    try {
        eventResult = await client.query(sql);
        eventResult = eventResult.rows;
    } catch (e) {
        console.log(e);
    } finally {
        client.release();
    }
    let eventMap = {}
    for (let i = 0; i< eventResult.length; i++) {
        let event = eventResult[i]
        console.log(event)
        eventMap[event['event_code']] = event;
    }
    return eventMap;
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
const getPatientSeq = async function(pid) {
    const pool = getPool(database_all)
    const client = await pool.connect()
    let patientSeq = []
    let sql = `select event_code, icd_code, event_type, event_time from connect NATURAL join event where pid='${pid}' ORDER BY event_time`
    try {
    //   console.log(sql)
      patientSeq = await client.query(sql);

      patientSeq = patientSeq.rows;
    } catch (e) {
      console.log(e)
    } finally {
      client.release()
    }
    return patientSeq;
  }

const queryseq = async function() {
    const pool = getPool(database_all);
    const client = await pool.connect();
    let patients = [];
    let sql = 'select pid from patient';
    let tmpdir ='../data/sequences/';
    await fs.ensureDir(tmpdir)

    try {
        patients = await client.query(sql);
        patients = patients.rows;
        for (let i = 0; i < patients.length; i++) {
            let pid = patients[i]['pid']
            let patientSeq = await getPatientSeq(pid);
            let tmpPath = tmpdir + pid+ '.json';
            for (let j = 0; j < patientSeq.length; j++) {
                let item = patientSeq[j];
                if (item['event_type'] === 'Treatments') {
                    fs.writeJson(tmpPath, patientSeq);
                    break;
                }
            }
            // console.log(patientSeq[0])
            // fs.writeJson(tmpPath, patientSeq);
        }
        console.log('ok')
    } catch (e) {
        console.log(e);
    }

    return;
}

const getPatientSeq2 = async function(pid) {
    const pool = getPool(database_all)
    const client = await pool.connect()
    let patientSeq = []
    let sql = `select event_code, icd_code, event_type from connect NATURAL join event where pid='${pid}' ORDER BY event_time`
    try {
    //   console.log(sql)
      patientSeq = await client.query(sql);

      patientSeq = patientSeq.rows;
    } catch (e) {
      console.log(e)
    } finally {
      client.release()
    }
    return patientSeq;
  }
const queryseq2 = async function() {
    const pool = getPool(database_all);
    const client = await pool.connect();
    let patients = [];
    let sql = 'select pid from patient';
    let tmpdir ='../data/sequences_all/';
    await fs.ensureDir(tmpdir)

    try {
        patients = await client.query(sql);
        patients = patients.rows;
        for (let i = 0; i < patients.length; i++) {
            let pid = patients[i]['pid']
            let patientSeq = await getPatientSeq2(pid);

            if(patientSeq.length > 2){
              let tmpPath = tmpdir + pid+ '.json';
              fs.writeJson(tmpPath, {'pid':pid,'seq':patientSeq})
              console.log(pid)
            }
            // fs.writeJson(tmpPath, patientSeq);
        }
        console.log('ok')
    } catch (e) {
        console.log(e);
    }

    return;
}

queryseq2()

async function infoAdapter (results) {
    let seqences = {}
    for (let event of results) {
      if (typeof seqences[event['pid']] !== 'object') {
        seqences[event['pid']] = []
      }
      let eventInfo = {
        'event_code': '' + event['event_code'],
        'event_time': moment(event['event_time']).format('YYYY-MM-DD hh:mm:ss'),
        'event_type': event['event_type'],
        'icd_code': event['icd_code']
      }

      seqences[event['pid']].push(eventInfo)
    }
    return seqences
  }

const queryAllp = async function() {
    const pool = getPool(database_all)
    const client = await pool.connect()
    // const patternStr = regex(patterns)
    let resInfo = {}
    let sql = 'select pid from patient'
    // if (patternStr !== '' || eventLength !== '') {
    //   sql += ' where '
    // }
    // if (patternStr !== '') {
    //   sql += "upper(code_string) ~ '" + patternStr + "'"
    //   if (eventLength) {
    //     sql += ' and '
    //   }
    // }
    // if (eventLength) {
    //   const [minLen, maxLen] = eventLength.split('|')
    //   sql += 'event_length between ' + minLen + ' and ' + maxLen
    // }
    sql = 'select pid, event_code, event_type, event_time from connect NATURAL join event where pid in (' + sql + ') ORDER BY pid, event_time'

    try {
      console.log(sql)
      let results = await client.query(sql)
      console.log('end of query database..')
      resInfo = await infoAdapter(results.rows)
      console.log('entity num is: ' + Object.keys(resInfo).length)
    //   let tmpdir ='../../data/';
    //   await fs.ensureDir(tmpdir)
      fs.writeJson('../../data/allpatientseq.json', resInfo);
    } catch (e) {
      console.log(e)
    } finally {
      client.release()
    }

    return;
}

// queryAllp()
