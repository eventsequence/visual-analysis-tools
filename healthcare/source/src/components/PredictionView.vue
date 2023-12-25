<template>
  <div id="prediction-view" class="view">
    <div class="view-header" id="prediction-header">
      <label>Prediction</label>
      <div class="selection-group">
        <span style="margin-right:5px;">Category:</span>
        <div class="d_select" id="diag_type_1"  @click="dropdownClick(1)">
          <span>Circulatory System</span>
          <img src="/static/img/dropdown.png">
        </div>
        <div class="d_select" id="diag_type_2"  @click="dropdownClick(2)" >
          <span>Respiratory System</span>
          <img src="/static/img/dropdown.png" >
        </div>
        <div class="d_select" id="diag_type_3" @click="dropdownClick(3)" >
          <span>Digestive System</span>
          <img src="/static/img/dropdown.png" >
        </div>
        <div class="d_select" id="diag_type_4" @click="dropdownClick(4)" >
          <span>Genitourirary System</span>
          <img src="/static/img/dropdown.png">
        </div>

        <div class="d_dropdown" id="d_dropdown_1">
          <div class="d_dropdown_item" v-for="(item, idx) in diseasedict" :key="idx" v-if="idx.split('|').length>1" v-text="item" 
          @click="selectDiagnose(idx,1)">
          </div>
        </div>
        <div class="d_dropdown" id="d_dropdown_2" style="display:none">
          <div class="d_dropdown_item" v-for="(item, idx) in diseasedict" :key="idx" v-if="idx>=460&&idx<520" v-text="item" 
          @click="selectDiagnose(idx,2)">
          </div>
        </div>
        <div class="d_dropdown" id="d_dropdown_3" style="display:none">
          <div class="d_dropdown_item" v-for="(item, idx) in diseasedict" :key="idx" v-if="idx>=520&&idx<580" v-text="item" 
          @click="selectDiagnose(idx,3)">
          </div>
        </div>
        <div class="d_dropdown" id="d_dropdown_4" style="display:none">
          <div class="d_dropdown_item" v-for="(item, idx) in diseasedict" :key="idx" v-if="idx>=580&&idx<630" v-text="item" 
          @click="selectDiagnose(idx,4)">
          </div>
        </div>
      </div>
    </div>
    <div class="view-body">
      <div id="pre_select_text">
        <label style="margin-right:8px;flex-shrink: 0;">Potential Diseases:</label>
        <div id="selected-prediction-list">
          <div class="prediction-item" v-for="(item, idx) in predictionList"  :key="idx" :style="'background-color:'+typeColors[idx]">
            <span>{{item}}</span>
            <img src="/static/img/delete_big.png" @click="deletePredItem(idx)">
          </div>
        </div>
      </div>
      <div id="prediction-canvas"></div>
    </div>
  </div>
</template>

<script>
export default {
  data () {
    return {
      predictionList: [],
      predIcdcodeList: [],
      typeColors:['#68bde1','#aa97da','#93dc16','#fdca3d','#fd94b4']
    }
  },
  props: ['diseasedict','initialcode'],
  watch: {
    initialcode: function(initialcode) {
      this.predIcdcodeList = initialcode; //JSON.parse(JSON.stringify(initialcode));
      let predictionList = [];
      for (let i = 0; i < initialcode.length; i++) {
        let icdCode = initialcode[i];
        predictionList.push(this.diseasedict[icdCode]);
        // console.log(predictionList)
      }
      this.predictionList = predictionList;
    }
  },
  methods: {
    dropdownClick(dropdownIdx) {
      for (let i = 1; i <= 4; i++) {
        if (i===dropdownIdx) {
          let display = d3.select('#d_dropdown_'+i).style('display');
          if (display === 'none') {
            d3.select('#d_dropdown_'+i).style('display', 'block');
          }else {
            d3.select('#d_dropdown_'+i).style('display', 'none');
          }
        } else {
          d3.select('#d_dropdown_'+i).style('display', 'none');
        }
      }
    },
    selectDiagnose(icdCode, dropdownIdx) {
      d3.select('#d_dropdown_'+dropdownIdx).style('display', 'none');
      if (this.predictionList.length < 5 && this.predictionList.indexOf(this.diseasedict[icdCode])===-1) {
        this.predictionList.push(this.diseasedict[icdCode]);
        this.predIcdcodeList.push(icdCode);
        Hub.$emit('changePred', this.predIcdcodeList, this.typeColors);
      }
    },
    deletePredItem(idx) {
      this.predictionList.splice(idx, 1);
      this.predIcdcodeList.splice(idx, 1);
      let color = this.typeColors.splice(idx, 1)[0];
      this.typeColors.push(color);
      
      if(this.predictionList.length === 0) {
        this.typeColors = ['#68bde1','#aa97da','#93dc16','#fdca3d','#fd94b4'];
      }

      Hub.$emit('changePred', this.predIcdcodeList, this.typeColors);
    }
  }, 
  created(){

  },
  mounted () {

  }
}
</script>
