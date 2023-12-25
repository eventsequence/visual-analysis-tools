<template>
  <div id="app">
    <div class="side-content">
      <profile-view></profile-view>
      <similar-patients-view></similar-patients-view>
      <query-and-patients-view></query-and-patients-view>
    </div>
    <div class="main-content">
      <prediction-view  :diseasedict="diseaseDict" :initialcode="initialDiseaseCode"></prediction-view>
      <div class="middle-content">
        <comparison-view></comparison-view>
        <correlation-view :diseaselist="diseaseList" :selecteddisease="selectedDisease" :diseasedict="diseaseDict"></correlation-view>
      </div>
    </div>
  </div>
</template>

<script>
import ProfileView from './components/ProfileView'
import SimilarPatientsView from './components/SimilarPatientsView'
import QueryAndPatientsView from './components/QueryAndPatientsView'
import PredictionView from './components/PredictionView'
import ComparisonView from './components/ComparisonView'
import CorrelationView from './components/CorrelationView'

// import * as d3 from 'd3';
import { vaxios } from './request-common';
import {Histogram} from './js/histogram';
import {Patientinfo} from './js/patientinfo'
import { Seqvis } from './js/seqvis';
import { Compvis } from "./js/compvis";
import { Simvis } from "./js/simvis";
import { Correlation } from "./js/correlation";
import {Descrip} from "./js/descrip";


var histogram = Histogram();
var patientinfo = Patientinfo();
var seqvis = Seqvis();
var compvis = Compvis();
var simvis = Simvis();
var correlation = Correlation();
var descrip = Descrip();


var recomendationFlag = false;

function updateDislist(pids, disList) {
    let newDislist = [];
    for (let i = 0; i < disList.length; i++){
        let disItem = disList[i];
        let pid = String(disItem['pid']);
        if (pids.indexOf(pid)>=0) {
            newDislist.push(disItem);
        }
    }
    return newDislist;
}

export default {
  name: 'App',
  components: {
    ProfileView,
    SimilarPatientsView,
    QueryAndPatientsView,
    PredictionView,
    ComparisonView,
    CorrelationView
  },
  data () {
      return {
          disList: [],
          queryObj: null,
          currentSeq: [],
          diseaseList :[],
          selectedDisease:[],
          diseaseDict: {},
          initialDiseaseCode: [],
        //   cutIndex: {},
          curpid: 0
      }
  },
  watch: {
    queryObj: function(newQueryObj){
        vaxios.get('/alignment',{
        headers: {
                'Content-type': 'application/json'
            },
            params: {
                cur_pid: this.curpid,
                sim_pid: Object.keys(newQueryObj).join(',')
            }
        })
        .then((res) => {
            res.data['seqview']['seq'] = newQueryObj
            console.log(res.data)
            simvis.data(res.data['seqview']).cluster(res.data['clusterview']).layout().render().drawPredict();
        })



    }
  },
  created () {
    Hub.$on('send-current-pid', (pid, curPicIdx)=> {
        recomendationFlag = true;
        this.curpid = pid;
        console.log('recieved current pid....')
        this.selectedDisease = [];
        this.initialDiseaseCode = [];
        seqvis.selectedDisease([]);
        compvis.remove()
        patientinfo.loading();
        simvis.loading();
        descrip.loading();
        vaxios.get('/patient/'+pid)
        .then((res) => {
            let patientSeq = res.data;
            this.currentSeq = res.data;
            seqvis.data(patientSeq).layout();
            seqvis.render();
            seqvis.predict()
            simvis.currentPid(pid).selected_disease(null).predict_result(null)


            vaxios.get('/patientsinfo/'+pid+'.json')
            .then((res)=>{
                console.log(res.data)
                let disList = res.data['dis_list'];
                disList.sort(function(a, b){
                    return a.dist  - b.dist;
                })
                this.disList = disList;
                histogram.majorEvents(res.data['major_events']).data(disList).init()
                let pids = [];
                for (let i = 0; i < 2000; i++) {
                    let similarPid = this.disList[i].pid;
                    pids.push(similarPid)
                }

                // vaxios.get('/boxplot',{
                // headers: {
                //         'Content-type': 'application/json'
                //     },
                //     params: {
                //         cur_pid: this.curpid,
                //         sim_pid: pids.join(',')
                //     }
                // })
                // .then((res)=>{
                //
                //     correlation.data(res.data).layout();
                // })
                // .catch((err) => {
                //     console.log(err)
                // })

            })
            .catch((err) => {
                console.log(err)
            })
        })
        .catch((err) => {
            console.log(err)
        })

////////////////////////////////////////////////////////////////////////
        //vaxios.get('/alignment')
        //.then((res) => {
        //    simvis.data(res.data['seqview']).cluster(res.data['clusterview']).init().layout();
        //})
    })

    Hub.$on('changePred', (predIcdcodeList, typeColors)=>{
        let idxlist = [];
        for (let i = 0; i < predIcdcodeList.length; i++) {
            let idx = this.diseaseList.indexOf(predIcdcodeList[i]);
            idxlist.push(idx);
        }
        seqvis.selectedDisease(idxlist);
        seqvis.resultColor(typeColors);
        seqvis.drawPre();
        if (idxlist.length > 0) {
            compvis.diseaseColors(typeColors);
            compvis.selectType(idxlist);
            // correlation.typeColors(typeColors);
            // correlation.update(idxlist);
            this.selectedDisease = idxlist;
            simvis.selected_disease(idxlist).diseaseColors(typeColors).drawPredict()
        }



    })


    Hub.$on('query', (pattern_str, length_str)=> {
        patientinfo.loading();
        simvis.loading();
        vaxios.get('/query', {
            params: {
                pattern_str: pattern_str,
                event_length: length_str
            }
        })
        .then((res) => {
            let queryObj = res.data;
            this.queryObj = queryObj;
            patientinfo.data(queryObj).show();
            let newDislist = updateDislist(Object.keys(queryObj), this.disList);
            histogram.changeStatus().data(newDislist).init()
        })
        .catch((err) => {
            console.log(err)
            console.log('here is an error from axios..')
        })
    })

    histogram.dispatch.on('selectpids', (plist)=>{
        patientinfo.patient_select(plist).reshow2();
        vaxios.get('/alignment',{
        headers: {
                'Content-type': 'application/json'
            },
            params: {
                cur_seq: JSON.stringify(this.currentSeq),
                sim_pid: JSON.stringify(plist)
            }
        })
        .then((res) => {
            console.log(res.data)
            simvis.data(res.data['seqview']).cluster(res.data['clusterview']).layout().render().drawPredict();
        })
    })
    histogram.dispatch.on('reloadpview', function(){
        patientinfo.reshow1();
    })
    histogram.dispatch.on('cleanpview', function() {
        patientinfo.clean();
    })
    histogram.dispatch.on('querypids', (pids)=>{
        console.log('query pids..')
        console.log(pids)
        patientinfo.loading();
        simvis.loading()
        vaxios.get('/patients', {
            params: {
                pids: pids.join(',')
            }
        }).then((res)=>{
            let queryObj = res.data;
            patientinfo.data(queryObj).show();
            simvis.clearAll()
            this.queryObj = queryObj;
        })
    })

    seqvis.dispatch.on('start', (selected_disease, typeColors, pre)=> {


        if (recomendationFlag) {
            recomendationFlag = false;
            // let pids = [];
            // let curCutIndex = this.cutIndex[this.pid];
            // for (let i = 1; i < 6; i++) {
            //     let similarPid = this.disList[i].pid;
            //     if
            //     pids.push()
            // }
            // histogram.dispatch.call('querypids', this, pids)
            patientinfo.loading();
            simvis.loading()
            console.log('curpid', this.curpid)
            let new_selected_disease = []
            selected_disease.forEach(function(d){
                if(pre[d]['prob']>=0.5){
                    new_selected_disease.push(d)
                }
            })
            if(new_selected_disease.length==0){
                new_selected_disease.push(selected_disease[0])
            }
            vaxios.get('/recommendsimilarpatients', {
                params:{
                    pid:this.curpid,
                    prediction: new_selected_disease.join(',')
                }
            })
            .then((res)=>{
                console.log('recommend');
                let queryObj = res.data;
                console.log(queryObj)
                patientinfo.data(queryObj).show();
                simvis.clearAll()
                this.queryObj = queryObj;
            })
            .catch((err)=>{
                console.log(err)
            })
        }


        console.log('start...');
        compvis.diseaseColors(typeColors).selectType(selected_disease);
        //correlation.update(selected_disease);
        this.selectedDisease = selected_disease;
        let selectedDiseaseCode = [];
        for (let i = 0; i < this.selectedDisease.length; i++) {
            let icdcode = this.diseaseList[this.selectedDisease[i]]
            selectedDiseaseCode.push(icdcode);
        }
        console.log('show disease when start')
        descrip.disease(selectedDiseaseCode[0]).show()
        simvis.predict_result(pre).selected_disease(selected_disease).diseaseColors(typeColors).drawPredict()
        console.log(selectedDiseaseCode)
        // correlation.update(this.selectedDisease)
        this.initialDiseaseCode = selectedDiseaseCode;
    })
    seqvis.dispatch.on('save', (pre_result)=> {
        Hub.$emit('show-sequence-record');
        compvis.drawSequence(pre_result);
    })

    seqvis.dispatch.on('detail', (icdCode)=>{
        Hub.$emit('show-disease');
        console.log('show disease..', icdCode);
        descrip.disease(icdCode).show()
    })

    // seqvis.dispatch.on('change', (selected_disease) => {
    //     // compvis.diseaseColors(selected_disease['type_color']);
    //     // compvis.selectType(selected_disease['selected']);
    //     // correlation.typeColors(selected_disease['type_color']);
    //     // correlation.update(selected_disease['selected']);
    //     // this.selectedDisease = selected_disease['selected'];
    // })
    vaxios.get('/type.json')
        .then((res)=>{
            let type = res.data;
            seqvis.type(type)
            simvis.type(type)
        })
        .catch((err) => {
            console.log(err)
        })
    vaxios.get('/treatment_dict.json')
        .then((res)=>{
            let treatment = res.data;
            compvis.treatment(treatment)
            simvis.treatment(treatment)
            patientinfo.treatment(treatment)
            seqvis.treatment(treatment)

            // correlation.treatment(treatment)
            // let data = require('../data/correlation/96199.json')
            // correlation.data(data).init().layout();
        })
        .catch((err) => {
            console.log(err)
        })

    // vaxios.get('/treat_set.json')
    //     .then((res)=>{
    //         correlation.treatment_set(res.data)
    //     })
    //     .catch((err) => {
    //         console.log(err)
    //     })

    vaxios.get('/disease_dict.json')
        .then((res)=>{
            let disease = res.data;
            this.diseaseDict = disease;
            seqvis.disease(disease)
            compvis.disease(disease)
            simvis.disease(disease)
            patientinfo.disease(disease);
            histogram.disease(disease);
            // correlation.diseaseDict(disease);
        })
        .catch((err) => {
            console.log(err)
        })
    vaxios.get('/disease.json')
        .then((res)=>{
            let disease = res.data;
            seqvis.disease_list(disease);
            simvis.disease_list(disease);
            compvis.icdCodeList(disease);
            // correlation.disease(disease);
            this.diseaseList = disease;
        })
        .catch((err) => {
            console.log(err)
        })

    vaxios.get('/icd_link.json')
        .then((res)=>{
            descrip.data(res.data)
        })
        .catch((err) => {
            console.log(err)
        })

    vaxios.get('/heartdisease')
        .then((res)=>{
            seqvis.eventCount(res.data)
            compvis.eventCount(res.data);
            simvis.eventCount(res.data);
        })
        .catch((err) => {
            console.log(err)
        })

    // vaxios.get('/cut_index.json')
    // .then((res)=>{
    //     this.cutIndex = res.data;
    // })
    // .catch((err) => {
    //     console.log(err)
    // })

    // vaxios.get('/boxplot.json')
    // .then((res)=> {

    //     correlation.data().init().layout();
    // })

  },
  mounted() {
    histogram.container(d3.select('#bar-chart-view').append('svg'));
    patientinfo.container(d3.select('#patientlist'));
    patientinfo.layout();
    seqvis.container(d3.select('#prediction-canvas').append('svg')).init();
    compvis.container(d3.select('#comparison-canvas').append('svg'));
    simvis.container(d3.select('#similiar-comparison-canvas').append('div'));
    correlation.container(d3.select('#correlation-canvas').append('svg'));
    descrip.container(d3.select("#disease-panel"));
    descrip.loading()
    compvis.layout();
    simvis.init()
    patientinfo.loading();
    simvis.loading();
    //let data = require('../server/tmp/result.json')
    //simvis.data(data['seqview']).cluster(data['clusterview']).layout().render();

    //vaxios.get('/alignment')
    //    .then((res) => {
    //        simvis.data(res.data['seqview']).cluster(res.data['clusterview']).layout().render();
    //    })
  }
}

</script>
