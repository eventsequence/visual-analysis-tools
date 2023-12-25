// layout UI and setup events
$(document).ready(function() {

    $( "#overview" ).tabs();

    loadData();
    render();

    eventListener();
});

//////////////////////////////////////////////////////////////////////
// local functions
function wire_events() {
    Views.controls.dispatch.on("packdiff",function(d){
      Views.focal.packdiff(d);
    })
    Views.controls.dispatch.on("updateMeanSeq",function(d){
      Views.meanseq.updateMeanSeq();
    })
    Views.controls.dispatch.on("updateSankey",function(d){
      Views.simseq.updateSankey();
    })
    Views.focal.dispatch.on("updateStage",function(d){
      Views.focal.updateStage();
      Views.simseq.updateStage();
      Views.meanseq.updateStage();
    })
};

function eventListener(){
    Views.tsne.dispatch.on("displayAnomaly",function(pid){
        Data.abid=pid;
        loadPatientData(pid);
        loadDict();

        drawProfile();
        drawStatistics();
        drawMean();

        Views.navi.moveCanvas();
    })

    Views.tsne.dispatch.on("clearAnomaly",function(d){})

    Views.similarity.dispatch.on("drawSimPatient",function(d){
        querySimilar(_.flatten(d));
        Views.navi.moveCanvas();
    })

    Views.meanseq.dispatch.on("updateScroll",function(d){
      Views.navi.updateScroll(d);
    })

    Views.simsankey.dispatch.on("moveCanvas",function(d){
      Views.navi.moveCanvas(d);
    })

    Views.meanseq.dispatch.on("moveCanvas",function(d){
      Views.navi.moveCanvas(d);
    })

    Views.meanseq.dispatch.on("moveCanvasTo",function(d){
      Views.navi.moveCanvasTo(d);
    })

    Views.simsankey.dispatch.on("updateSwitch",function(d){
      Views.controls.updateSwitch();
    })

    Views.simsankey.dispatch.on("updateMeanSeqColor",function(d){
      Views.meanseq.updateColor(d);
    })

    Views.controls.dispatch.on("sankey2seq",function(d){
      Views.simsankey.sankey2seq();
      Data.viewStatus='seq';
    })

    Views.controls.dispatch.on("sankey2sum",function(d){
      Views.simsankey.sankey2sum();
      Data.viewStatus='sum';
    })

    Views.controls.dispatch.on('seq2sankey',function(d){
      Views.simsankey.seq2sankey();
      Data.viewStatus='sankey';
    })

    Views.controls.dispatch.on('sum2sankey',function(d){
      Views.simsankey.sum2sankey();
      Data.viewStatus='sankey';
    })

    Views.controls.dispatch.on('seq2sum',function(d){
      Views.simsankey.seq2sum();
      Data.viewStatus='sum';
    })

    Views.controls.dispatch.on('sum2seq',function(d){
      Views.simsankey.sum2seq();
      Data.viewStatus='seq';
    })

    Views.controls.dispatch.on('overlayAnomaly',function(d){
      Views.simsankey.overlayAnomaly();
      Data.viewStatus='overlay';
    })

    Views.controls.dispatch.on('splitAnomaly',function(d){
      Views.simsankey.splitAnomaly();
      Data.viewStatus='sankey';
    })

    Views.navi.dispatch.on("updateStage",function(d){
      //update slot num
        let text=[]
        stage.forEach(function(d,i){
            stage_end_id=d-1;
            stage_start_id=i==0?0:stage[i-1];
            if(Data.stage_expand[i]==1){
                for(let id=stage_start_id;id<=stage_end_id;id++){
                    text.push("#"+id);
                }
            }else{
                text.push("#"+stage_start_id+"-#"+stage_end_id);
            }
        })
        Data.slotids=text;

        Views.meanseq.updateStage();
        Views.navi.updateStage();
        Views.simsankey.updateStage();

        Views.navi.updateScrollScale();

    })

    Views.meanseq.dispatch.on("updateLayerGap",function(){
        Views.simsankey.updateLayerGap();
    })

    Views.simsankey.dispatch.on("initNodeFilter",function(d){
        Views.controls.updateNodeFilter(d);
    })

    Views.controls.dispatch.on("updateSankey",function(d){
        Data.minNode=d;
        Views.simsankey.updateFlow(d);
    })

    Views.simsankey.dispatch.on("activateFilters",function(d){
        Views.controls.activateFilters();
    })

    Views.simsankey.dispatch.on('deactivateFilters',function(d){
        Views.controls.deactivateFilters();
    })

    Views.controls.dispatch.on("updateConf",function(d){
        Data.conf=d;
        Views.simsankey.updateDiffFilter();
    })

    Views.controls.dispatch.on("updateProb",function(d){
        Data.prop_range=d;
        Views.simsankey.updateDiffFilter();
    })

    Views.simsankey.dispatch.on("clearBrush",function(d){
        Views.meanseq.clearBrush();
    })

    Views.meanseq.dispatch.on("markEvent",function(d){
        markEvent(d);
    })

    Views.meanseq.dispatch.on("clearMark",function(d){
        clearMark();
    })

    Views.simsankey.dispatch.on("markEvent",function(d){
        markEvent(d);
    })

    Views.simsankey.dispatch.on("clearMark",function(d){
        clearMark();
    })

    Views.simlist.dispatch.on("markEvent",function(d){
        markEvent(d);
    })

    Views.simlist.dispatch.on("clearMark",function(d){
        clearMark();
    })

    Views.abrecord.dispatch.on("markEvent",function(d){
        markEvent(d);
    })

    Views.abrecord.dispatch.on("clearMark",function(d){
        clearMark();
    })

    Views.simsankey.dispatch.on("updateSimlist",function(d){
        if(Data.selectlist.length>0){
            d3.select('#rnum').text('('+Data.selectlist.length+')')
        }else{
            d3.select('#rnum').text('('+Data.simnum+')')
        }

        Views.simlist.update();
    })

    Views.abrecord.dispatch.on("switchAbrecord",function(d){
        d3.select("#profile").selectAll('*').remove();
        Views.abrecord.data(Data.seq_original);
        Views.abrecord.renderSeq();
    })
}

function loadData(){

    Util.getSync("/load/tsne.json",{},function(data){
        Data.tsne=data['data'];
    })

    Util.getSync("/load/sid.json",{},function(data){
        // Data.anomaly_id=_.filter(data['data'],function(d){return _.contains(Data.sid,d)});
        Data.anomaly_id=data['data'];
    })
}

function loadPatientData(pid){
    Util.getSync("p_data/"+pid,{},function(data){
      Data.seqs=data['data']['seqs'];
      Data.seq_original=data['data']['seqs'];
      Data.alignment=data['data']['alignment'];
      Data.meanseq=data['data']['mean_seq']
      Data.profile=data['data']['profile'];
      Data.distance=data['data']['distances'];
      Data.stage=data['data']['stage'];
      Data.stage_expand=new Array(Data.stage.length).fill(1);
      Data.slotids=Data.seqs['event'].map(function(d,i){return "#"+i.toString()});
    })
}

function loadDict(){

    Util.getSync("/load/idx2type.json", {}, function(data) {
        Data.idx2type= data['data']["idx2type"];
    });

    Util.getSync("/load/idx2label.json", {}, function(data) {
        Data.idx2label= data['data']['idx2label'];
    });

    Util.getSync("/load/event2idx.json",{},function(data){
        Data.event2idx=data['data'];
    })

    Util.getSync("/load/idx2event.json",{},function(data){
        Data.idx2event=data['data'];
    })
}

function display() {

/***************Main Sequence View*******************/
    var focal_svg=d3.select('#main').append('svg')
        .attr('id','focal_svg')
        .attr('width','100%')
        .attr('height','100%');

    Views.focal.container(focal_svg);

    Views.focal.seq(Data.seqs);
    Views.focal.stage(Data.stage);

    //preprocess similar patients
    let alignment=Data.alignment;
    //calculate top similar seqs
    let key_dis=_.map(alignment,function(val,key){return [key,val['distance']]})
    let key_dis_sorted=key_dis.sort(function(a,b){return a[1]-b[1]});

    let top_seqs={};
    for(let i=0;i<Data.simnum;i++){
      let key=key_dis_sorted[i][0]
      top_seqs[alignment[key]['pid']]=alignment[key];
    }
    reformed_seq=reformSeq(top_seqs);
    Views.focal.sseq(reformed_seq);
    Data.sseq=reformed_seq;

    Views.focal.layout();
    Views.focal.init();

/***************Sequence View - Sankey*******************/

   	var comp_svg=d3.select("#comp_canvas").append("svg")
   			.attr("id","comp_svg")
   			.attr("width","100%")
   			.attr("height","100%");

   	Views.simseq.container(comp_svg);

   	Views.simseq.data(reformed_seq);
   	Views.simseq.layout();
   	Views.simseq.init();

/**************Sequence View - Mean Sequence******************/


    var mean_svg=d3.select("#mean").append("svg")
        .attr("id","mean_svg")
        .attr("width","100%")
        .attr("height","100%");

    Views.meanseq.container(mean_svg);
    Views.meanseq.data(mean_dat).layout().render();

    Views.focal.moveCanvas();

/***************Sequence View - Controls***************/

    var controls=d3.select("#controls");
    Views.controls.container(controls);
    Views.controls.render();

/***************Similar Patient List*******************/


    Views.simlist.container(d3.select("#simlist"));
    Views.simlist.data(top_seqs);
    Views.simlist.render();


/***************Anomalous Patient Profile*******************/


    Views.abrecord.container(d3.select("#profile"));
    Views.abrecord.data(Data.profile);
    Views.abrecord.renderSeq();


/***************Similarity Distribution View*******************/


    var sim_svg=d3.select('#stat').append('svg')
        .attr('id','sim_svg')
        .attr('width','100%')
        .attr('height','100%');
    Views.similarity.container(sim_svg);
    Views.similarity.data(Data.distance);
    Views.similarity.layout();
}

function render(){
    plotTsne();
    displayControls();
    displayNavi();
}

function plotTsne(){
    var tsne_svg=d3.select('#tsne_div').append('svg')
        .attr('id','tsne_svg')
        .attr('width','100%')
        .attr('height','95%');
    Views.tsne.container(tsne_svg);
    Views.tsne.data(Data.tsne).layout().render();
  }

function displayControls(){
    var controls=d3.select("#controls");
    Views.controls.container(controls);
    Views.controls.render();}

function displayNavi(){
  var navi_svg=d3.select('#navi').append('svg')
      .attr('id','navi_svg')
      .attr('width','100%')
      .attr('height','100%');

    Views.navi.container(navi_svg);
    Views.navi.layout();
    Views.navi.initScroll();
}

function drawProfile(){
    Views.abrecord.container(d3.select("#profile"));
    Views.abrecord.data(Data.profile);
    Views.abrecord.render();
    // Views.abrecord.data(Data.seqs);
    // Views.abrecord.renderSeq();
  }

function drawStatistics(){
    var sim_svg=d3.select('#stat_div').append('svg')
        .attr('id','sim_svg')
        .attr('width','100%')
        .attr('height','100%');
    Views.similarity.container(sim_svg);
    Views.similarity.data(Data.distance);
    Views.similarity.layout();}

function drawMean(){

  mean_dat=[]
  Data.meanseq.forEach(function(d,i){
      let events=[]
      let props=[]
      for(let i=0;i<d.length;i++){
        events.push(Data.idx2event[i]);
        props.push(d[i]);
      }
      mean_dat.push({'event':events,'prop':props});
  })

    Data.meanseq=mean_dat;
    Data.meanseqStage=mean_dat;

  var mean_svg=d3.select("#mean").append("svg")
      .attr("id","mean_svg")
      .attr("width","100%")
      .attr("height","100%");

  Views.meanseq.container(mean_svg);
  Views.navi.stage(Data.stage);
  Views.meanseq.data(mean_dat).layout().render();
}

function drawFocal(){
    Views.focal.seq(Data.seqs)

    var focal_svg=d3.select('#main').append('svg')
      .attr('id','focal_svg')
      .attr('width','100%')
      .attr('height','100%');

    Views.focal.container(focal_svg);
    Views.focal.stage(Data.stage);

    Views.navi.stage(Data.stage);
    Views.focal.init();
}

function drawSimilarRlist(top_seqs){
    Views.simlist.container(d3.select("#simlist"));
    Views.simlist.data(Data.top_seqs);
    Views.simlist.render();
  }

function querySimilar(pidlist){
    Data.simnum=pidlist.length;
    d3.select('#rnum').text('('+pidlist.length+')');
    drawSimSankey(pidlist);
    drawSimilarRlist(pidlist);
}

function drawSimSankey(pidlist){

    var simsankey_svg=d3.select('#main').append('svg')
      .attr('id','main_svg')
      .attr('width','100%')
      .attr('height','100%');

    var simseq_svg=d3.select('#simseq').append('svg')
      .attr('id','simseq_svg')
      .attr('width','100%')
      .attr('height','100%');

    Views.simsankey.container(simsankey_svg);

    //align similar patients
    let alignment=_.filter(Data.alignment,function(d){return _.contains(pidlist,d['pid'])});
    //calculate top similar seqs
    let key_dis=_.map(alignment,function(val,key){return [key,val['distance']]})
    let key_dis_sorted=key_dis.sort(function(a,b){return a[1]-b[1]});

    let top_seqs={};
    Data.alllist=_.map(alignment,function(d){return d.pid});
    for(let i=0;i<alignment.length;i++){
      let key=key_dis_sorted[i][0]
      top_seqs[alignment[key]['pid']]=alignment[key];
    }
    Data.top_seqs=top_seqs;
    reformed_seq=reformSeq(top_seqs);

    //reconstruct seq and sseq
    seq_final=[]
    Data.seqs["event"].forEach(function(e,i){
        let events=_.uniq(e);
        let efreq=events.map(x=>_.filter(e,function(d){return d==x}).length);
        let etime=events.map(x=>_.object(e,Data.seqs['time'][i])[x])
        let esize=events.map(x=>1)
        seq_final.push({'event':events,'time':etime,'freq':efreq});
    })
    Data.seqs=seq_final

    let sseq_final={}
    for(pid in reformed_seq){
        sseq_arr=[]
        let data=reformed_seq[pid]
        let events=[]
        let times=[]
        let freqs=[]
        data['a_event'].forEach(function(egroup,idx){
          sseq_arr.push({'event':egroup,'freq':data['a_freq'][idx],'time':data['a_time'][idx]});
        })
        sseq_final[pid]=sseq_arr;
    }
    Data.sseq=sseq_final;

    Views.simsankey.seq(seq_final);
    Views.simsankey.sseq(sseq_final);

    Views.simsankey.layout().init();
}

function markEvent(d){
    // d3.selectAll($("[eid='"+d+"']")).raise();
    d3.selectAll($("[eid='"+d+"']")).classed('mark',true);
}

function clearMark(){
    d3.selectAll('.mark').classed('mark',false);
}

function reformSeq(seq){
    result={}
    for(let pid in seq){
      result[pid]={}
      let events=seq[pid]['seq']["event"];
      let time=seq[pid]['seq']["time"];
      // let ab_events=seq[pid]["ab_events"]
      let align=seq[pid]["path"];
      let align_group=_.groupBy(align,function(d){return d[0]});
      let slotnum=_.max(_.map(align,function(d){return d[0]}),function(d){return d});
      let event_final=[]
      let time_final=[]
      let ab_final=[]
      let freq_final=[]
      for(let i=0;i<=slotnum;i++){
          let egroup=[];
          let tgroup=[];
          let abgroup=[];
          let align_events=_.map(align_group[i],function(d){return d[1];});
          align_events.forEach(function(d){
              egroup.push(events[d]);
              tgroup.push(time[d]);
              // abgroup.push(ab_events[d])
          })
          egroup=_.flatten(egroup)
          tgroup=_.flatten(tgroup)

          uniq_events=_.uniq(egroup)
          uniq_time=uniq_events.map(x=>_.object(egroup,tgroup)[x])
          event_final.push(uniq_events);
          time_final.push(uniq_time);
          e_freq=uniq_events.map(x=>_.filter(egroup,function(d){return d==x}).length);
          freq_final.push(e_freq);
          // ab_final.push(_.flatten(abgroup))
      }
      result[pid]["a_event"]=event_final;
      result[pid]["a_time"]=time_final;
      result[pid]['a_freq']=freq_final;
    }
    return result
}


