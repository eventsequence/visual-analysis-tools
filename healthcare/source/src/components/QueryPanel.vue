<template>
    <div id="query-panel">
        <div id="event-container"></div>
        <div class="query-components" v-show="!isShowAddComp">
            <vue-slider v-model="lengthValues"
                :min="0" :max="2334" 
                tooltip=hover
                :bg-style="bgStyle"
                :slider-style="sliderStyle"
                :process-style="processStyle"
                :tooltip-style="tooltipStyle"
                :style="style">
            </vue-slider>
            <button id="add-btn" @click="showAddComponents">Add</button>
            <button id="query-btn" @click="query">Query</button>
        </div>
        <div class="add-components" v-show="isShowAddComp">
            <div id="add-div">
                <div class="add-component-item">
                    <span>Add</span>
                    <img class="back-img"
                        src="../../static/img/back.png"
                        alt="back-btn"
                        @click="backtoQueryComp">
                </div>
                <input type="text" class="add-input"
                    v-model="keyword">
            </div>
            <div id="event-list">
                <div class="add-list-item"
                    v-for="(eventInfo, idx) in addList" :key="idx"
                    @click="addEvent(eventInfo)"
                    @mouseover="fillColor(idx,eventInfo)"
                    @mouseout="cleanColor(idx)"
                    :id="'addlistitem'+idx"
                    >
                    <span v-text="showlabel(eventInfo)"></span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import vueSlider from 'vue-slider-component'
import { seqquery } from '../js/seqquery'
import { vaxios } from "../request-common";
export default {
    data() {
        return {
            amount: 0,
            seqquery: seqquery(),
            lengthValues: [0,2334],
            lengthRange: [0, 2334],

            isShowAddComp: false,
            addList: [],
            keyword: '',

            style: {
                "padding-top": "10px",
                "padding-bottom": "10px",
                "width":"214px",
                "margin": "0 auto"
            },
            bgStyle:{
                "background-color": '#EEEEEE',
            },
            sliderStyle: {
                "top":"-4px",
                "box-shadow": "0px 0px 0px black",
                "border": "1.5px solid #A0A0A0",
                "height": "10px",
                "width": "10px"
            },
            processStyle: {
                "background-color": '#ccc',
            },
            tooltipStyle: {
                "height": 25,
                "color":"#696969",
                "background-color": '#EEEEEE',
                "border": "1px solid #EEEEEE"
            },
            // data of events
            eventVocab: []
        }
    },
    components: {
        vueSlider
    },
    methods: {
        showAddComponents() {
            this.isShowAddComp=true;
        },
        addEvent(eventInfo) {
            eventInfo['contain_num'] = +eventInfo.count;
            eventInfo['not_contain_num'] = this.amount - eventInfo.count;
            this.seqquery.addEvent(eventInfo);
            console.log(eventInfo);
        },
        backtoQueryComp() {
            this.isShowAddComp=false;
            this.keyword = "";
        },
        query() {
            let patterns = this.seqquery.getPatterns();
            Hub.$emit('query', patterns.join('|'), this.lengthValues.join('|'))
        },
        fillColor (idx, eventInfo) {
            let typeColors = {
                'Treatments': '#bfbfbf',
                'diagnose': '#7D7D7D'
            }
            let type = eventInfo.event_type
            let style = 'background-color:' + typeColors[type]
            document.getElementById('addlistitem' + idx).setAttribute('style', style)
        },
        cleanColor (idx) {
            document.getElementById('addlistitem' + idx).setAttribute('style', 'background-color: white')
        },
        showlabel (eventInfo) {
            if(!eventInfo) return;
            let label = eventInfo.label;
            if (!label) return eventInfo['icd_code'];
            
            if (label.length > 17) {
                label = label.slice(0, 15);
                label += '...';
            }
            return label;
        }
    },
    watch: {
        keyword: function (keyword, oldKeyword) {
            if (keyword !== '') {
                let newAddList = []
                let filter = keyword.toUpperCase()
                for (let item of this.eventVocab) {
                    let eventString = item['label']
                    if (eventString.toUpperCase().indexOf(filter) ===0) newAddList.push(item)
                }
                this.addList = newAddList;
            } else {
                this.addList = this.eventVocab;
            }
        }
    },
    created() {

    },
    mounted() {
        // vaxios.get('/maxlength')
        // .then((res)=> {
        //     this.lengthRange[1] = res.data;
        //     this.lengthValues[1] = res.data;
        // })
        vaxios.get('/disease_dict.json')
        .then((res)=>{
            let disease = res.data;
            this.seqquery.disease(disease);
        })

        vaxios.get('/treatment_dict.json')
        .then((res)=>{
            let treatment = res.data;
            this.seqquery.treatment(treatment);
        })

        this.seqquery.container(d3.select('#event-container').append('svg'))
        vaxios.get('/vocabulary')
            .then((res)=>{
                this.addList = res.data.eventList;
                this.eventVocab = res.data.eventList;
                this.amount = res.data.amount;
                
            })

    }
}
</script>
