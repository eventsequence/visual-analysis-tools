const { Pool } = require('pg')
const config = require('./server/config')
const moment = require('moment')

let pools = {}

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

const getPatientSeq = async function(pid) {
    const pool = getPool('event_pred_db5')
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

const query = async function () {
    let database = 'event_pred_db5' //'mimic_database'//'event_pred_db'
    const pool = getPool(database)
    const client = await pool.connect()
    try {
        let sql = 'alter table patient add event_length int'
        let result = await client.query(sql)
        result = await client.query('select pid from patient')
        for (let res of result.rows) {
            let pid = res.pid;
            let sql = `select event_code  from connect NATURAL join event where pid='${pid}' ORDER BY event_time`
            // console.log(sql)
            let patientSeq = await client.query(sql);
            patientSeq = patientSeq.rows;
            // let patientSeq = await getPatientSeq(pid);
            // console.log(patientSeq);
            let codes = [];
            for (let i = 0; i < patientSeq.length; i++) {
                let event_code = patientSeq[i]['event_code'];
                codes.push(event_code);
            }
            // console.log(codes)
            let code_string = codes.join('|');
            console.log(pid)
            // let len = codeStr ? codeStr.split('|').length : 0
            // console.log(len)
            sql = `update patient set code_string='${code_string}' where pid = ${pid}`
            // console.log(sql)
            await client.query(sql)
            sql = `update patient set event_length=${codes.length} where pid = ${pid}`
            // console.log(sql)
            await client.query(sql)
        }


        // let result = await client.query('select distinct event_code from event_tmp except select event_code from event')
        // console.log('len')
        // console.log(result.rows.length)
        // for (let res of result.rows) {
        //     if (res.event_code) {
        //         let tmpres = await client.query(`select event_type from event_tmp where event_code='${res.event_code}'`)
        //         let sql = `insert into event values ('${res.event_code}','${tmpres.rows[0].event_type}')`
        //         console.log(res.event_code + ' ' + tmpres.rows[0].event_type)
        //         try {
        //             client.query(sql)
        //         } catch(e) {
        //             console.log(e)
        //         }
        //     }
        // }

        // let sql = 'alter table patient add end_type varchar(64)'
        // // let result = await client.query(sql)
        // let result = await client.query('select * from patient')
        // for (let res of result.rows) {
        //     let codeStr = res.code_string
        //     let events = codeStr.split('|')
        //     let endEvent = events[events.length-1]
        //     sql = `update patient set end_type = (select event_type from event where event_code =32) as table`
        //     client.query(sql)
        //     // console.log(res)
        // }


        return 
    } catch (e) {
        console.log(e)
        return null
    } finally {
        client.release()
    }
}
query()