const router = require('koa-router')()
const db = require('./db')
const { spawn } = require('child-process-async')
const fs = require('fs-extra')
const Redis = require('ioredis')
const remove = require('remove')


const redis = new Redis()

router.get('/vocabulary', async (ctx) => {
    let redKey = ctx.originalUrl
    let vocabulary
    // if (await redis.exists(redKey)) {
    //     vocabulary = await redis.get(redKey)
    //     ctx.body = JSON.parse(vocabulary)
    //     return
    // }
    let treament = await fs.readJson('data/treatment_dict.json')
    let disease = await fs.readJson('data/disease_dict.json')

    vocabulary = await db.getVocabulary()
    let eventList = vocabulary.eventList
    for (let i = 0; i < eventList.length; i++) {
        let icd_code = eventList[i]['icd_code']
        let type = eventList[i]['event_type']
        if (type === 'Treatments') {
            eventList[i]['label'] = treament[icd_code]
        } else {
            eventList[i]['label'] = disease[icd_code]
        }
    }
    ctx.body = vocabulary
    redis.set(redKey, JSON.stringify(vocabulary))
})


router.get('/heartdisease', async (ctx) => {
    let heartdisease = await db.getHeartdisease()
    ctx.body = heartdisease
})
//
router.get('/maxlength', async (ctx) => {
    // let dataset = ctx.params.dataset
    let maxLength = await db.getMaxLength()
    ctx.body = maxLength
})

router.get('/minlength', async (ctx) => {
    let dataset = ctx.params.dataset
    let minLength = await db.getMinLength(dataset)
    ctx.body = minLength
})

router.get('/pidlist', async (ctx) => {
    let pidlist = await db.getPidList();
    ctx.body = pidlist;
})

router.get('/query', async (ctx) => {
    ctx.request.socket.setTimeout(1 * 60 * 60 * 1000)
    let redKey = ctx.originalUrl
    ctx.cookies.set('query', redKey)
    let resultObj
    if (await redis.exists(redKey)) {
        resultObj = await redis.get(redKey)
        resultObj = JSON.parse(resultObj)
        ctx.body = resultObj
        return
    }
    try {
        let patterns = ctx.query.pattern_str
        let eventLength = ctx.query.event_length
        let querySeq = await db.getQuerySequence(patterns, eventLength)
        ctx.body = querySeq

        redis.set(redKey, JSON.stringify(querySeq))
    } catch (e) {
        console.log('error: ')
        console.log(e)
    }
})

router.get('/resultobj', async (ctx) => {
    try {
        let resultObj = await fs.readJson('server/resultobj.json')
        ctx.body = {
            resultObj
        }
    } catch (e) {
        console.log('error: ')
        console.log(e)
    }
})


router.get('/retain', async (ctx) => {
    const train = ctx.query.train
    // console.log(JSON.stringify(train))
    path = 'server/models/retain-api/'
    const { stdout, stderr, exitCode } = await spawn('python2', ['server/models/retain-api/retain_api.py', train, path])
    result = String(stdout)
    console.log(String(stderr))
    // console.log(result)
    result=JSON.parse(result)

    ctx.body = {
        'pre': result['pre'],
        'contr': result['contribution']
    }
})

router.get('/patient/:pid', async (ctx) => {
    let pid = ctx.params.pid;
    let patientSeq = await db.getPatientSeq(pid);
    ctx.body = patientSeq;
})

router.get('/patients', async (ctx) => {
    let pids = ctx.query.pids;
    ctx.request.socket.setTimeout(20 * 60 * 1000)
    let redKey = ctx.originalUrl
    ctx.cookies.set('query', redKey)
    let patientSeqs
    if (await redis.exists(redKey)) {
        patientSeqs = await redis.get(redKey)
        patientSeqs = JSON.parse(patientSeqs)
        ctx.body = patientSeqs
        return
    }
    try {
        patientSeqs = await db.getPatientSeqs(pids);
    } catch (e) {
        console.log('error: ')
        console.log(e)
    }

    ctx.body = patientSeqs;
    redis.set(redKey, JSON.stringify(patientSeqs))
})

// router.get('/distancelist', async (ctx) => {
//     if(!ctx.query.current_pid) return ctx.response.status = 400;
//     const currentpid = ctx.query.current_pid
//     let redKey = ctx.cookies.get('query')
//     let resultObj = await redis.get(redKey)
//     resultObj = JSON.parse(resultObj)
//     let queryObj = resultObj['queryObj']
//     const tmpdir = 'server/tmp/' + redKey.split('?')[1] + '/'
//     await fs.ensureDir(tmpdir)
//     let tmpPath = tmpdir + 'queryObj.json'
//     let currentSeq = await db.getCurrentSeq(currentpid)
//     await fs.writeJson(tmpPath, {currentSeq, queryObj})
//     console.log(tmpdir)
//     const { stdout, stderr, exitCode } = await spawn('python', ['server/models/similarity.py', tmpdir])
//     console.log(String(stderr))
//     console.log(exitCode)
//     let disList = JSON.parse(String(stdout))
//     ctx.body = disList
// })

// router.get('/correlation/:pid', async (ctx) => {
//     let pid = ctx.params.pid;
//     let patientSeq = await db.getPatientSeq(pid);
//     let tmpdir ='server/tmp' + ctx.originalUrl + '/';
//     let tmpPath = tmpdir + 'queryObj.json';
//     await fs.ensureDir(tmpdir)
//     await fs.writeJson(tmpPath, patientSeq);
//     console.log(tmpdir)
//     const {stdout, stderr} = await spawn('python', ['server/models/retain-api/correlation_api.py', tmpdir]);
//     let correlation = await fs.readJson(tmpdir + 'correlation.json')
//     ctx.body = correlation
// })

router.get('/alignment', async (ctx) => {
    const curpid =  ctx.query.cur_pid

    let cur_seq = await db.getPatientSeq(curpid)
    cur_seq = JSON.stringify(cur_seq)
    // await fs.writeJson('server/tmp/current_patient.json', JSON.parse(cur_seq))

    const sim_pid = ctx.query.sim_pid.split(',')

    // await fs.writeJson('server/tmp/select_pid.json', sim_pid)

    let redKey = ctx.cookies.get('query')
    let resultObj = await redis.get(redKey)
    resultObj = JSON.parse(resultObj)
    let sim_set = {}

    // console.log(sim_pid)
    // console.log(Object.keys(resultObj))

    for(var d=0; d<sim_pid.length; d++){

        sim_set[sim_pid[d]] = resultObj[sim_pid[d]]
    }
    // console.log(sim_set)
    const tmpdir = 'server/tmp/'
    const tmppath = tmpdir + 'selected_patient.json'
    await fs.ensureDir(tmpdir)
    await fs.writeJson(tmppath, sim_set)
    // const sim_set = ctx.query.sim_setƒJSON
    // console.log('data')
    // console.log("alignment start!!!!!")
    // // console.log(train)
    // // console.log(JSON.stringify(train))
    const { stdout, stderr, exitCode } = await spawn('python2', ['server/models/alignment.py', cur_seq, tmppath])
    result = String(stdout)
    console.log(String(stderr))
    // console.log(typeof(result))
    // // console.log(result)
    result=JSON.parse(result)

    // console.log('test')
    // console.log(resultObj)
    // let result = await fs.readJson('server/models/final_result.json')

    // console.log(result['alignObj'])
    ctx.body = {
        'seqview': result['alignObj'],
        'clusterview': result['clusterObj']
    }
})

router.get('/boxplot', async (ctx) => {
    const curpid =  ctx.query.cur_pid
    const pid_set = ctx.query.sim_pid.split(',')
    pid_set.unshift(curpid)
    const { stdout, stderr, exitCode } = await spawn('python2', ['server/models/influence.py', JSON.stringify(pid_set)])
    result = String(stdout)
    console.log(result)
    console.log(String(stderr))
    result=JSON.parse(result)
    ctx.body = result
})


router.get('/recommendsimilarpatients', async (ctx)=>{
    let redKey = ctx.originalUrl
    ctx.cookies.set('query', redKey)

    let curpid =ctx.query.pid;
    let curSeq = await db.getPatientSeq(curpid);
    let prediction = ctx.query.prediction.split(',');
    let disList = await fs.readJson('data/patientsinfo/'+curpid+'.json')
    disList = disList['dis_list'];
    disList.sort(function(a, b){
        return a.dist  - b.dist;
    })
    let disease_list = await fs.readJson('data/disease.json');
    let predIcdcodeList = [];
    for (let i=0; i < prediction.length; i++) {
        let idx = prediction[i];
        predIcdcodeList.push(disease_list[idx])
    }
    let curIndexObj = await fs.readJson(`data/cutpatients/${curpid}.json`);
    let queryObj ={};
    console.log(disList)
    for (let i=1;i<disList.length ;i++) {
        let similarPid = disList[i].pid;
        if (true) {
            let similarSeq = await db.getPatientSeq(similarPid);
            if(similarSeq.length<curSeq.length-10){
                continue;
            }
            let cutIndex = curIndexObj[similarPid];
            if (cutIndex >= similarSeq.length-1) {
                continue;
            }
            let compareGroup = [];
            let timeString = similarSeq[cutIndex].event_time;
            for (let j = cutIndex+1; j < similarSeq.length; j++) {
                let item = similarSeq[j];
                if ( item.event_time === timeString ) {
                    compareGroup.push(item);
                } else {
                    break;
                }
            }

            // newpredIcdcodeList = []
            // for (var j=0; j< predIcdcodeList.length; j++){
            //     var start = predIcdcodeList[j].split("|")[0]
            //     var end = predIcdcodeList[j].split("|")[1]
            //     for (var index = parseInt(start); index<= parseInt(end); index++){
            //         newpredIcdcodeList.push(index.toString())
            //     }
            // }
            //
            // for (let j =0; j < compareGroup.length; j++) {
            //     if (newpredIcdcodeList.includes(compareGroup[j].icd_code)) {
            //         queryObj[similarPid] = similarSeq;
            //         break;
            //     }
            // }
            queryObj[similarPid] = similarSeq;

            if (Object.keys(queryObj).length >= 10) {
                break;
            }
        }
        // let similarSeq = await db.getPatientSeq(similarPid);
        // if(similarSeq.length<curSeq.length-10){
        //     continue;
        // }
        // let cutIndex = curIndexObj[similarPid];
        // if (cutIndex >= similarSeq.length-1) {
        //     continue;
        // }
        // let compareGroup = [];
        // let timeString = similarSeq[cutIndex].event_time;
        // for (let j = cutIndex+1; j < similarSeq.length; j++) {
        //     let item = similarSeq[j];
        //     if ( item.event_time === timeString ) {
        //         compareGroup.push(item);
        //     } else {
        //         break;
        //     }
        // }

        // newpredIcdcodeList = []
        // for (var j=0; j< predIcdcodeList.length; j++){
        //     var start = predIcdcodeList[j].split("|")[0]
        //     var end = predIcdcodeList[j].split("|")[1]
        //     for (var index = parseInt(start); index<= parseInt(end); index++){
        //         newpredIcdcodeList.push(index.toString())
        //     }
        // }

        // // for (let j =0; j < compareGroup.length; j++) {
        // //     if (newpredIcdcodeList.includes(compareGroup[j].icd_code)) {
        // //         queryObj[similarPid] = similarSeq;
        // //         break;
        // //     }
        // // }
        // queryObj[similarPid] = similarSeq;

        // if (Object.keys(queryObj).length >= 2) {
        //     break;
        // }
    }
    ctx.body = queryObj;
    redis.set(redKey, JSON.stringify(queryObj))
})

module.exports = router
