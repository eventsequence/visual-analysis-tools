<template>
  <div id="correlation-view" class="view">
    <div class="view-header">
      <label>Significance</label>
    </div>
    <div class="view-body" id="correlation-view-body">
        <div id="correlation-titles">
        </div>
        <div id="correlation-canvas"></div>
    </div>
  </div>
</template>
<script>
export default {
    data(){
        return {
            resultTitles:[],
            fullTitles: []
        }
    },
    props: ['diseaselist','selecteddisease', 'diseasedict'],
    watch: {
        selecteddisease: function(selectedList){
            let newResultTitles = [];
            let newFullTitles = [];
            for (let i=0; i< selectedList.length; i++) {
                let idx = selectedList[i];
                let label = this.diseasedict[this.diseaselist[idx]];
                newFullTitles.push(label);
                if (label.length >= 7) {
                    label = label.slice(0,4).replace(/(^\s*)|(\s*$)/g,"") +'...';
                }
                newResultTitles.push(label);
            }
            this.resultTitles = newResultTitles;
            this.fullTitles = newFullTitles;
            

        }
    }
}
</script>
