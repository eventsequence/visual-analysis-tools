const { Pool } = require('pg')
const config = require('../../server/config')
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
    let new_patients = [];
    let sql = 'select pid, gender, code_string from patient';
    try {
        patients = await client.query(sql);
        patients = patients.rows;
        for (let i in patients) {
          let events = patients[i]['code_string'].split('|')
          if(events.length>2){
            new_patients.push(patients[i])
          }
        }

    } catch (e) {
        console.log(e);
    } finally {
        client.release();
    }
    return new_patients;
}
function compressArray(original) {

	var compressed = [];
	// make a copy of the input array
	var copy = original.slice(0);

	// first loop goes over every element
	for (var i = 0; i < original.length; i++) {

		var myCount = 0;
		// loop over every element in the copy and see if it's the same
		for (var w = 0; w < copy.length; w++) {
			if (original[i] == copy[w]) {
				// increase amount of times duplicate is found
				myCount++;
				// sets item to undefined
				delete copy[w];
			}
		}

		if (myCount > 0) {
			var a = new Object();
			a.value = original[i];
			a.count = myCount;
			compressed.push(a);
		}
	}

	return compressed;
};
function cmp(a,b){return b.count-a.count;};

const query = async function() {
    let allPatients = await getAllPatients();
    let eventsMap = await getEvents();
    console.log(eventsMap)
    for (let i in allPatients) {
        let events = allPatients[i]['code_string'].split('|')
        //   let events = [...new Set(events)]
        let diag_events = []
        for (let i = 0; i < events.length; i++) {
            let eventCode = events[i];
            if(eventsMap[eventCode]['event_type'] === 'diagnose') {
            diag_events.push(eventsMap[eventCode]['icd_code'])
            }
        }
        diag_events = compressArray(diag_events)
        diag_events.sort(cmp)

        diag_events = diag_events.slice(0,5)
        let major_events = []
        for (let i = 0; i < diag_events.length; i++) {
            major_events.push(diag_events[i].value)
        }
        allPatients[i]['major_events'] = major_events
    }
    let tmpPath ='../../data/allpatients.json'
    await fs.writeJson(tmpPath, allPatients)
    console.log('ok')
}

query()
