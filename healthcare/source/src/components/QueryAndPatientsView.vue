<template>
  <div id="query-and-patients-view" class="view">
    <div class="tabs-header">
      <div class="tab" id="list-tab" :class="{active: !queryIsActive}" @click="showPanel('list-tab')">
        <label>Patients</label>
      </div>
      <div class="tab" id="query-tab" :class="{active: queryIsActive}" @click="showPanel('query-tab')">
        <label>Query</label>
      </div>

    </div>
    <div class="view-body" id="query-view-body">
      <div id="patientlist" v-show="!queryIsActive"></div>
      <query-panel v-show="queryIsActive" @update-patients="updatePatients"></query-panel>
      
    </div>
  </div>
</template>

<script>
import QueryPanel from './QueryPanel';

export default {
  data() {
    return {
      queryIsActive: false,
      queryObj: null,
      // patientinfo: patientinfo(),
    }
  },
  components: {
    QueryPanel
  },
  methods: {
    init() {
      // this.patientinfo.container(d3.select('#patientlist'))
      // this.queryObj = require('../../data/queryobj.json')
    },
    showPanel(panelID) {
      switch (panelID) {
        case 'query-tab':
          this.queryIsActive = true;
          break;
        case 'list-tab':
          this.queryIsActive = false;
          break;
      }
    },
    updatePatients(queryObj) {
      // this.queryObj = queryObj;
    }
  },
  // watch: {
  //   queryObj: function(newQueryObj) {
  //     // this.patientinfo.data(newQueryObj).show()
  //   },
  // },
  mounted () {
    this.init()
  }
}
</script>
