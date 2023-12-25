<template>
  <div id="comparison-view" class="view">
    <div class="tabs-header">
      <div class="tab" :class="{active: showpanelidx===2}" @click="showPanel(2)">
        <label>Description</label>
      </div>
      <div class="tab" :class="{active: showpanelidx===0}" @click="showPanel(0)">
        <label>Similar Patients</label>
        <div style="position:relative; left:60px">
        <!--<img  id="similar-switch" style='float:right; width: 20px; height: 18px' src="../../static/img/transition.png"/>-->
          <div id='similar-switch' style="display: flex">
            <button id='similar-seq' style="cursor: pointer; border-radius:2px 0px 0px 2px; background:#7D7D7D; outline:none; width: 23px" ><i style="color:#D2D2D2" class="fa fa-bars"></i></button>
            <button id='similar-clus' style="cursor: pointer; border-radius:0px 2px 2px 0px; background:#D2D2D2; outline:none; width: 23px" ><i style="color:#7D7D7D" class="fa fa-sitemap fa-rotate-270"></i></button>
          </div>
        </div>
      </div>
      <div class="tab" :class="{active: showpanelidx===1}" @click="showPanel(1)">
        <label>Outcome Analysis</label>
      </div>

    </div>
    <div class="view-body">
      <div id="similiar-comparison-canvas" v-show="showpanelidx===0">
        <div id="similiar-slider"></div>
      </div>
      <div id="consultation" v-show="showpanelidx===1">
        <div id="comp-slider"></div>
        <div id="comparison-canvas" ></div>
      </div>
      <div id="disease-panel" v-show="showpanelidx===2"></div>
    </div>
  </div>
</template>
<script>

export default {
  data () {
    return {
      showpanelidx:2,
    }
  },
  methods: {
    showPanel(panelIdx) {
      this.showpanelidx = panelIdx;
      if(panelIdx===0){
        $("#similar-switch").css("display","flex")
      }else{
        $("#similar-switch").css("display","none")
      }
    }
  },
  created() {
    Hub.$on('show-sequence-record', ()=> {
      this.showpanelidx = 1;
      $("#similar-switch").css("display","none")
    })
    Hub.$on('show-disease', ()=> {
      this.showpanelidx = 2;
      $("#similar-switch").css("display","none")
    })
  }, 
  mounted() {
    $("#similar-switch").css("display","none")

  }
}
</script>
