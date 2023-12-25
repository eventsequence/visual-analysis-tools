Vis.simsankey = function() {

    var simsankey = {},
        container = null,
        data = null,
        size = [],
        margin = { left: 10, top: 10, right: 10, bottom: 10 },
        dispatch = d3.dispatch("moveCanvas",
                            "updateSwitch",
                            "updateMeanSeqColor",
                            "initNodeFilter",
                            "activateFilters",
                            "deactivateFilters",
                            "clearBrush",
                            "markEvent",
                            "clearMark",
                            "updateSimlist");

    let data_all={},
        seq=null,
        sseq=null,
        sseq_pack=[],
        event_conf=[],
        flowObj=null,
        flowUpdate=null,
        diff=null;

    //reformed data
    var time_diff=[],
        sseq_time_diff={}
        sseq_pack_time_diff=[];

    //element attributes
    let nodePadding=10,
        prop_width=6,
        main_width=23,
        max_timelen=15,
        link_width=1,
        timebar_padding=2,
        min_barlen=5,
        seq_bar_height=3,
        minDiffCircle=10,
        maxDiffCircle=35,
        sseq_gap=50;

    let maxDigits=8;

    let anomaly_canvas_height=150;

    let padding_left=10;

    let nodeWidth=prop_width+main_width+timebar_padding;

    let colorScale=d3.scalePow().range([0.4,1]);

    //scales
    let timeScale=d3.scaleLog(),
        seqTimeScale=d3.scaleLog(),
        diffCircleScale=d3.scaleSqrt(),
        popCircleScale=d3.scalePow();

    let popFormat=d3.format(".1f"),
        timeFormat=d3.format(".1r"),
        percentFormat=d3.format(".1%"),
        scoreFormat=d3.format(".2f");

    // tip
    let tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10,0])
        .html(function(d) {
            return d;
        });

    simsankey.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return simsankey;
    };

    simsankey.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return simsankey;
    };

    simsankey.seq=function(_){
        if (!arguments.length) return seq;
        seq = _;
        return simsankey;
    }

    simsankey.sseq=function(_){
        if (!arguments.length) return sseq;
        sseq = _;
        return simsankey;
    }

    simsankey.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return simsankey;
    };

    simsankey.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return simsankey;
    };

    simsankey.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    simsankey.layout = function() {

        time_diff=[];
        sseq_time_diff={};
        sseq_pack_time_diff=[];

        if(size.length==0){
            this.size([$("#main_svg").width()-margin.left-margin.right,
                $("#main_svg").height()-margin.top-margin.bottom]);
        }

        diff_canvas_height=size[1]-anomaly_canvas_height

        //calculate time scale
        seq.forEach(function(d,i){
            time=d['time']
            if(i>0){
                t_diff=time[0]-seq[i-1]['time'][seq[i-1]['time'].length-1]
                time_diff.push(t_diff)
            }
        })
        seqTimeScale.domain(d3.extent(time_diff,function(d){return d;}))
            .range([min_barlen,Data.layer_gap-Data.treeSize[0]]);

        let temp_sseqdiff=[]
        for(let pid in sseq){
            let time_diff=[]
            let dat=sseq[pid]
            for(let i=1;i<dat.length;i++){
                let time=dat[i]['time']
                t_diff=time[0]-dat[i-1]['time'][dat[i-1]['time'].length-1]
                time_diff.push(t_diff)
            }
            sseq_time_diff[pid]=time_diff;
            temp_sseqdiff.push(time_diff);
        }

        sseq_pack_time_diff=_.map(_.unzip(temp_sseqdiff),function(d){return d3.sum(d)/d.length});

        seqTimeScale.domain(d3.extent(_.flatten(temp_sseqdiff.concat(time_diff))))
            .range([min_barlen,Data.layer_gap-Data.treeSize[0]]);

        if(seqTimeScale.domain()[0]==0){
            seqTimeScale.domain([1e-6, seqTimeScale.domain()[1]]);
        }

        return simsankey;
    };

    simsankey.render = function() {

        if (!container) {
            return;
        }

        return simsankey.update();
    };

    simsankey.update = function() {

        d3.selectAll(".sankey_node,.sankey_link").on("mouseover", function(d) {
            if(Data.viewStatus=='sum') return
            if(!d3.select(this).classed('select')&&Data.selectlist.length){
                return;
            }
            let rlist = d.info["rlist"];
            highlightPath(rlist);
        })

        d3.selectAll(".sankey_node,.sankey_link").on("mouseout",function(d){
            if(Data.viewStatus=='sum') return
            clearHighlight();
        })

        d3.selectAll(".sankey_node,.sankey_link").on("click",function(d){
            if(Data.viewStatus=='sum') return
            if(d3.select(this).classed("unselect")){
                Data.selectlist=[];
                clearHighlight(true);
                return;
            }
            let rlist=d.info["rlist"];
            selectPath(rlist);
        })

        bindTooltips();

        return simsankey;
    };

    simsankey.init = function(){
        data_all[Data.abid]=seq;
        for(let pid in sseq){
            data_all[pid]=sseq[pid];
        }
        flowObj=computeFlow(data_all);
        flow=filterFlow();
        //cal timescale
        timeScale.domain(d3.extent(flowObj.links,function(d){
            return d3.sum(d.info.tlist)/d.info.tlist.length}))
            .range([-30,max_timelen]);

        if(timeScale.domain()[0]==0){
            timeScale.domain([1e-6, timeScale.domain()[1]]);
        }
        initSankey(flow);
        overlayAnomaly(flow);
        dispatch.call('updateMeanSeqColor',this,seq);

        //update node filter
        let min_node=d3.min(flowObj.nodes,(d)=>d.info.rlist.length);
        let max_node=d3.max(flowObj.nodes,(d)=>d.info.rlist.length);
        dispatch.call('initNodeFilter',this,[min_node,max_node]);

        return simsankey.update();
    }

    simsankey.sankey2seq = function(){
        sankey2seq();
        updateSseqColor(diff)
        return simsankey.update();
    }

    simsankey.sankey2sum = function(){
        sankey2sum();
        d3.select('#simseq_svg').attr('height','100%');
        return simsankey.update();
    }

    simsankey.seq2sankey = function(){
        seq2sankey();
        d3.select('#simseq_svg').attr('height',size[1]);
        return simsankey.update();
    }

    simsankey.sum2sankey = function(){
        sum2sankey();
        d3.select('#simseq_svg').attr('height',size[1]);
        return simsankey.update();
    }

    simsankey.seq2sum = function(){
        seq2sum();
        d3.select('#simseq_svg').attr('height','100%');
        return simsankey.update();
    }

    simsankey.sum2seq = function(){
        sum2seq();
        return simsankey.update();
    }

    simsankey.splitAnomaly = function(){
        compareDiff();
        return simsankey.update();
    }

    simsankey.overlayAnomaly = function(){
        mergeDiv();
        return simsankey.update();
    }

    simsankey.updateStage = function(){
        updateStage();
        return simsankey.update();
    }

    simsankey.updateLayerGap = function(){
        updateStage();
        return simsankey.update();
    }

    simsankey.updateFlow = function(){
        updateSankey();
        if(Data.viewStatus=='overlay'){
            updateAnomaly();
        }
        return simsankey.update();
    }

    simsankey.updateDiffFilter=function(){
        diff=identifyAnomaly();
        updateDiff(diff);
        updateDiffColor();
        updateSeq();
        updateSeqColor(diff);
        setTimeout(function(){
            if(Data.viewStatus=='seq'){
                updateSseqColor()
            }
            if(Data.viewStatus=='sankey'){
                updateSankeyColor();
            }
            if(Data.viewStatus=='sum'){
                updateSumColor();
            }
            dispatch.call('updateMeanSeqColor',this,diff);
        },1050);
        return simsankey.update();
    }

/***********Visualization related functions*************/

    function initSankey(flow){

        let nodes=flow["nodes"];
        let links=flow["links"];

        let canvas=container.append("g")
                .attr("id","sankey_canvas")
                .attr("class","canvas")
                .attr("transform","translate("+margin.left+","+margin.top+")");

        let sankey=d3.sankey()
            .nodeWidth(nodeWidth)
            .nodePadding(nodePadding)
            .size(size);

        let path=sankey.vlink(timeScale);

        sankey.nodes(nodes)
            .links(links)
            .layout(32);

        let linkEnter=canvas.append("g").attr("class","g_links")
            .selectAll(".link")
            .data(sankey.links(),(d)=>d.source.name+','+d.target.name)
            .enter()
            .append("g")
            .attr("class","sankey_link")
            .attr("transform","translate("+padding_left+",0)");

        //timebar
        linkEnter.append("rect")
            .attr("class","sankey_timebar")
            .attr("x",function(d){return d.source.x+prop_width+main_width+timebar_padding;})
            .attr("y",function(d){return d.source.y+d.sy})
            .attr("height",function(d){return d.dy})
            .attr("width",function(d){
                let avg_time=d3.sum(d.info.tlist)/d.info.tlist.length;
                if(avg_time<=1e-6){
                    return 0
                }else{
                    return timeScale(avg_time)
                }
            })
            .call(tip);

        linkEnter.append("path")
            .attr("class","link_path")
            .attr("d",path)
            .style("stroke-width",function(d){
                // return Math.max(1,d.dy);
                return link_width;
            })
            // .sort(function(a,b){return b.dy-a.dy});

        let node=canvas.append("g").attr("class","g_nodes")
            .selectAll(".node")
            .data(sankey.nodes(),(d)=>d.name)
            .enter().append("g")
            .attr("class","sankey_node")
            .attr("transform",function(d){
                let xpos=d.x+padding_left;
                return "translate("+xpos+","+d.y+")";
            })

        //proportion
        node.append("rect")
            .attr("class","prop_rect")
            .attr("height",function(d){return nodeHeight(d);})
            .attr("width",prop_width);

        //main node
        node.append("rect")
            .attr("class","main_node")
            .attr("height",function(d){return nodeHeight(d);})
            .attr("width",main_width)
            .attr("x",prop_width)
            .attr('eid',(d)=>nodeEvent(d))
            .call(tip);

        node.append("text")
            .attr('class','sankey_node_txt')
            .text(function(d){
                return Data.idx2label[nodeEvent(d)].slice(0,maxDigits);
            })
            .attr('transform','rotate(270)')
            .attr("x",function(d){return -d.dy/2})
            .attr("y",prop_width+main_width/2+3)
            .style('display',function(d){
                if(nodeHeight(d)>40){
                    return 'block';
                }else{
                    return 'none';
                }
            })

        //add text
        node.append("text")
            .attr("class","pop_txt")
            .text(function(d){
                if(d.dy<10){
                    return ""
                }else{
                    let pop=Math.max(d3.sum(d.sourceLinks,function(d){return d.value}),d3.sum(d.targetLinks,function(d){return d.value}))
                    // let pop=d3.sum(d.info.props);
                    return popFormat(pop);
                    // return d.info.rlist.length;
                }
            })
            .attr("x",function(d){return -d.dy/2})
            .attr("y",prop_width/2)
            .attr("transform","rotate(270)");
        }

    function overlayAnomaly(){

        let anomaly_nodes=flowObj['nodes'].filter(function(d){return _.contains(d.info.rlist,Data.abid)});
        let anomaly_links=flowObj['links'].filter(function(d){return _.contains(d.info.rlist,Data.abid)});

        let canvas = container.append('g')
            .attr('class','canvas')
            .attr('id','anomaly_canvas')
            .attr("transform","translate("+margin.left+","+margin.top+")");

        let path=d3.sankey().anomalyLink(timeScale);

        let linkEnter=canvas.append("g").attr("class","g_anomaly_links")
            .selectAll(".link")
            .data(anomaly_links,(d)=>d.source.name+','+d.target.name)
            .enter()
            .append("g")
            .attr("class","anomaly_links")
            .attr("transform","translate("+padding_left+",0)");

        //timebar
        linkEnter.append("rect")
            .attr("class","anomaly_timebar")
            .attr("x",function(d){return d.source.x+prop_width+main_width+timebar_padding;})
            .attr("y",function(d){return d.source.y})
            .attr("height",function(d){
                let height=Math.max(2,d.source.dy);
                let abidx=_.indexOf(d.source.info.rlist,Data.abid);
                let prop=d.source.info.props[abidx]/d3.sum(d.source.info.props);
                // return Math.max(2,height*prop);
                return height*prop;
            })
            .attr("width",function(d){
                let s_layer=d.source.info.layer;
                time=seq[s_layer+1]['time'][0]-seq[s_layer]['time'][0]
                return timeScale(time);
            })
            .call(tip);

        linkEnter.append("path")
            .attr("class","anomaly_link_path")
            .attr("d",path)
            .style("stroke-width",function(d){
                return link_width;
            });

        let node=canvas.append("g").attr("class","g_anomaly_nodes")
            .selectAll(".node")
            .data(anomaly_nodes,(d)=>d.name)
            .enter().append("g")
            .attr("class","anomaly_nodes")
            .attr("transform",function(d){
                let xpos=d.x+padding_left;
                return "translate("+xpos+","+d.y+")";
            });

        //proportion
        node.append("rect")
            .attr("class","anomaly_prop_rect")
            .attr('height',function(d){
                let height=nodeHeight(d);
                let abidx=_.indexOf(d.info.rlist,Data.abid);
                let prop=d.info.props[abidx]/d3.sum(d.info.props);
                // return Math.max(2,height*prop);
                return height*prop;
            })
            .attr('width',prop_width)

        //main node
        node.append("rect")
            .attr("class","anomaly_main_node")
            .attr('x',prop_width)
            .attr('height',function(d){
                let height=nodeHeight(d);
                let abidx=_.indexOf(d.info.rlist,Data.abid);
                let prop=d.info.props[abidx]/d3.sum(d.info.props);
                return height*prop;
            })
            .attr('width',main_width)
            .attr('eid',(d)=>nodeEvent(d))
            .call(tip);

        linkEnter.raise();

        d3.select('#sankey_canvas').style('opacity','0.5');}

    function compareDiff(){

        //data preprocess
        packSseq();
        diff=identifyAnomaly();

        var t=d3.transition().duration(1000);
        setTimeout(function(){
            splitDiv();
        },1500);
        //uncheck switch
        Data.viewStatus='sankey';
        dispatch.call('updateSwitch',this,{});

        //move sankey canvas
        d3.select('#sankey_canvas')
            .transition(t)
            .attr('transform',function(){
                let t=Util.getTranslate(d3.select(this).attr("transform")),
                    xpos=t[0],
                    ypos=parseInt(t[1])+anomaly_canvas_height;
                    return "translate("+xpos+","+ypos+")";
                })

        //recalculate sankey positions
        flowObj=computeFlow(sseq);

        timeScale.domain(d3.extent(flowObj.links,function(d){
                return d3.sum(d.info.tlist)/d.info.tlist.length}))
            .range([-30,max_timelen]);

        if(timeScale.domain()[0]==0){
            timeScale.domain([1e-6, timeScale.domain()[1]]);
        }

        updateSankey();

        d3.select('#sankey_canvas').transition(t).style('opacity','1');

        d3.select('.g_anomaly_links').transition(t).style('opacity',0);
        d3.selectAll('.anomaly_prop_rect').transition(t).style('opacity',0);

        //relayout anomaly nodes
        treemap_nodes=getSeqTreemaps();
        treemapDict={}
        _.flatten(treemap_nodes).forEach(function(d){
            treemapDict[d.data.id]=d;
        })

        d3.selectAll('.anomaly_nodes')
            .each(function(d){
                let node_name=d3.select(this).data()[0].name;
                let treemap_dat=treemapDict[node_name];
                d3.select(this).datum(treemap_dat,(d)=>d.data.data.id);
            });

        d3.selectAll('.anomaly_nodes')
            .transition(t)
            .attr("transform",function(d){
                let xpos=d.data.data.layer*Data.layer_gap+padding_left;
                return "translate("+xpos+","+margin.top+")";
            });

        d3.selectAll('.anomaly_nodes')
            .select('.anomaly_main_node')
            .classed('split',true)
            .transition(t)
            .attr("x",function(d){return d.x0})
            .attr("y",function(d){return d.y0})
            .attr("width",function(d){return d.x1-d.x0})
            .attr("height",function(d){return d.y1-d.y0})
            .attr('eid',(d)=>treeEvent(d))
            .call(tip);

        //draw time bar
        let timebar_canvas=d3.select('#anomaly_canvas')
            .append('g')
            .attr('class','seqtimebar_canvas')
            .attr('transform',function(){
                let ypos=Data.treeSize[1]/2+margin.top;
                return 'translate(0,'+ypos+')'
            })
            .style('opacity',0);

        timebar_canvas.append("rect")
            .attr("x",padding_left)
            .attr("y",-seq_bar_height/2)
            .attr("width",Data.canvas_width)
            .attr("height",seq_bar_height)
            .attr("class","seq_bar");

        let seq_timebar=timebar_canvas.selectAll('.seqtimebar')
            .data(time_diff)
            .enter()
            .append('g')
            .attr('class','seqtimebar')
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })

        let bg_rects=d3.select('.g_anomaly_nodes')
            .selectAll('.rect')
            .data(seq)
            .enter()
            .append('rect')
            .attr('class','anomaly_seq_bgrect')
            .attr('x',function(d,i){return Data.layer_gap*i+padding_left})
            .attr('y',margin.top)
            .attr('width',Data.treeSize[0])
            .attr('height',Data.treeSize[1])
            .style('opacity',0);;

        seq_timebar.append("rect")
            .attr("width",function(d){
                if(d<1e-6){
                    return 0
                }
                return seqTimeScale(d)
            })
            .attr("height",seq_bar_height)
            .attr('class','etime_bar');

        seq_timebar.append("text")
            .attr("class","etime_txt")
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2)
            .text(function(d){return timeFormat(Util.second2Days(d))+" D";});

        d3.select('.g_anomaly_nodes').raise();
        d3.select('.g_anomaly_nodes').selectAll('.anomaly_nodes').raise();

        timebar_canvas.transition(t).style('opacity',1);
        bg_rects.transition(t).style('opacity',1);

        //draw differences
        drawDiff(diff);
        updateColor(diff);
    }

    function splitDiv(){
        console.log('splitdiv');
        d3.select('#main').classed('split',true);
        d3.select('#simseq').classed('inactive',false);
        $('#sankey_canvas').appendTo('#simseq svg');
        d3.select('#sankey_canvas')
            .attr('transform',function(){
                let t=Util.getTranslate(d3.select(this).attr("transform")),
                    xpos=t[0],
                    ypos=0;
                    return "translate("+xpos+","+ypos+")";
                })
        d3.select('#simseq_svg').attr('height',size[1]);

        initSseq(flowObj,diff);
        //activate prob and conf filters
        dispatch.call('activateFilters',this,{});
        simsankey.update();
    }

    function mergeDiv(){
        let t=d3.transition().duration(1000);
        let delay=0;
        if(Data.viewStatus=='sum'){
            sum2sankey();
            delay=2000;
        }else if(Data.viewStatus=='seq'){
            seq2sankey();
            delay=2000;
        }else{
            delay=0;
        }
        t.delay(delay);

        setTimeout(function(){
            sankey2overlay();
        },delay+500);

        setTimeout(function(){
            removeViews();
        },delay+2500);

        d3.select('#anomaly_canvas').selectAll('*').raise();

        function sankey2overlay(){
            console.log('sankey2overlay');
            d3.select('#main').classed('split',false);
            d3.select('#simseq').classed('inactive',true);
            $('#sankey_canvas').appendTo('#main svg');
            d3.select('#sankey_canvas')
                .attr('transform',function(){
                let t=Util.getTranslate(d3.select(this).attr("transform")),
                    xpos=t[0],
                    ypos=parseInt(t[1])+anomaly_canvas_height;
                    return "translate("+xpos+","+ypos+")";
                })

            d3.select('#sankey_canvas')
                .transition(t)
                .attr('transform',function(){
                    let t=Util.getTranslate(d3.select(this).attr("transform")),
                        xpos=t[0],
                        ypos=margin.top;
                        return "translate("+xpos+","+ypos+")";
                    })
            d3.select('#diff_canvas').transition(t).style('opacity',0);
            d3.select('#anomaly_canvas').select('.seqtimebar_canvas').transition(t).style('opacity',0);
            d3.select('#anomaly_canvas').selectAll('.anomaly_seq_bgrect').transition(t).style('opacity',0);

            flowObj=computeFlow(data_all);

            timeScale.domain(d3.extent(flowObj.links,function(d){
                return d3.sum(d.info.tlist)/d.info.tlist.length}))
            .range([-30,max_timelen]);

            if(timeScale.domain()[0]==0){
                timeScale.domain([1e-6, timeScale.domain()[1]]);
            }

            updateSankey();

            let nodeDict={}
            flowObj.nodes.forEach(function(d){
                nodeDict[d.name]=d;
            })

            d3.selectAll('.anomaly_nodes')
            .each(function(d){
                let node_name=d.data.id;
                let node_dat=nodeDict[node_name];
                d3.select(this).datum(node_dat);
            });

            d3.selectAll('.anomaly_nodes')
                .attr("transform",function(d){
                    let xpos=d.x+padding_left;
                    return "translate("+xpos+","+d.y+")";
                });

            d3.selectAll('.anomaly_nodes').select('.anomaly_main_node')
                .classed('split',false)
                .attr('x',prop_width)
                .attr('y',0)
                .attr('height',function(d){
                    let height=nodeHeight(d);
                    let abidx=_.indexOf(d.info.rlist,Data.abid);
                    let prop=d.info.props[abidx]/d3.sum(d.info.props);
                    return height*prop;
                })
                .attr('width',main_width)
                .attr('eid',(d)=>nodeEvent(d));

            d3.select('.g_anomaly_links').transition(t).style('opacity',1);
            d3.selectAll('.anomaly_prop_rect').transition(t).style('opacity',1);
            d3.select('#sankey_canvas').transition(t).style('opacity','0.5');

            updateAnomaly();

            d3.select('#anomaly_canvas').raise();
        }

        function removeViews(){
            console.log('removeViews');
            d3.select('#simseq_svg').selectAll('*').remove();
            d3.select('#diff_canvas').remove();
            d3.select('#anomaly_canvas').select('.seqtimebar_canvas').remove();
            d3.select('#anomaly_canvas').selectAll('.anomaly_seq_bgrect').remove();
            d3.selectAll('.less').classed('less',false);
            d3.selectAll('.more').classed('more',false);
        }

        Data.viewStatus='overlay'
        Data.overlay=true;
        dispatch.call('updateSwitch',this,{});
        dispatch.call('deactivateFilters',this,{});
    }

    function updateStage(){
        dispatch.call('clearBrush',this,{});
        seq=packSeqDatStage();
        sseq=packSseqDatStage();
        simsankey.layout();

        if(Data.viewStatus=='overlay'){
            data_all[Data.abid]=seq;
            for(let pid in sseq){
                data_all[pid]=sseq[pid];
            }
            flowObj=computeFlow(data_all);
            //cal timescale
            timeScale.domain(d3.extent(flowObj.links,function(d){
                return d3.sum(d.info.tlist)/d.info.tlist.length}))
                .range([-30,max_timelen]);

            if(timeScale.domain()[0]==0){
                timeScale.domain([1e-6, timeScale.domain()[1]]);
            }
            updateSankey();
            updateAnomaly();
            setTimeout(function(){
                dispatch.call('updateMeanSeqColor',this,seq);
            },1050)
        }else{
            flowObj=computeFlow(sseq);
            //cal timescale
            timeScale.domain(d3.extent(flowObj.links,function(d){
                return d3.sum(d.info.tlist)/d.info.tlist.length}))
                .range([-30,max_timelen]);

            if(timeScale.domain()[0]==0){
                timeScale.domain([1e-6, timeScale.domain()[1]]);
            }
            packSseq();
            diff=identifyAnomaly();
            updateDiff(diff);
            updateDiffColor();
            updateSeq();
            updateSeqColor(diff);

            if(Data.viewStatus=='sankey'){
                updateSankey();
                updateSseqSankey();
            }
            if(Data.viewStatus=='seq'){
                updateSankey();
                updateSseq();
            }
            if(Data.viewStatus=='sum'){
                updateSum();
                updateSseqSankey();
            }
            setTimeout(function(){
                if(Data.viewStatus=='seq'){
                    updateSseqColor()
                }
                if(Data.viewStatus=='sankey'){
                    updateSankeyColor();
                }
                if(Data.viewStatus=='sum'){
                    updateSumColor();
                }
                dispatch.call('updateMeanSeqColor',this,diff);
            },1050);
        }}

    function updateSankey(){
        flowUpdate=filterFlow();
        let t=d3.transition().duration(1000);

        let flowNode=flowUpdate["nodes"];
        let flowLink=flowUpdate["links"];

        let sankey=d3.sankey()
            .nodeWidth(nodeWidth)
            .nodePadding(nodePadding);

        if(Data.viewStatus=='overlay'){
            sankey.size([size[0],size[1]]);
        }else{
            sankey.size([size[0],size[1]-anomaly_canvas_height-10]);
        }

        let path=sankey.vlink(timeScale);

        sankey.nodes(flowNode)
            .links(flowLink)
            .layout(32);

    /********update links********/

        let updatelinks=d3.select('.g_links')
            .selectAll('.sankey_link')
            .data(flowLink,(d)=>d.source.name+','+d.target.name);

        let linkEnter=updatelinks.enter().insert('g')
            .attr('class','sankey_link')
            .style('opacity',0);

        linkEnter.append('rect')
            .attr('class','sankey_timebar')
            .attr("x",function(d){return d.source.x+prop_width+main_width+timebar_padding;})
            .attr("y",function(d){return d.source.y+d.sy})
            .attr("height",function(d){return d.dy})
            .attr("width",function(d){
                let avg_time=d3.sum(d.info.tlist)/d.info.tlist.length;
                if(avg_time<=1e-6){
                    return 0
                }else{
                    return timeScale(avg_time)
                }
            });

        linkEnter.append("path")
            .attr("class","link_path")
            .attr("d",path);

        updatelinks.exit().remove();

        d3.selectAll('.sankey_link').transition(t)
            .attr("transform","translate("+padding_left+",0)")
            .style('opacity',1);

        d3.selectAll('.sankey_link').select('.sankey_timebar')
            .transition(t)
            .attr("x",function(d){return d.source.x+prop_width+main_width+timebar_padding;})
            .attr("y",function(d){return d.source.y+d.sy})
            .attr("height",function(d){return d.dy})
            .attr("width",function(d){
                let avg_time=d3.sum(d.info.tlist)/d.info.tlist.length;
                if(avg_time<=1e-6){
                    return 0
                }else{
                    return timeScale(avg_time)
                }
            });

        d3.selectAll('.sankey_link').select('.link_path')
            .transition(t)
            .attr("d",path)
            .style("stroke-width",function(d){
                return link_width;
            });

    /********update nodes********/

        let updatenodes=d3.select('.g_nodes').selectAll('.sankey_node')
            .data(flowNode,(d)=>d.name);

        let nodeEnter=updatenodes.enter().insert('g')
            .attr('class','sankey_node')
            .attr("transform",function(d){
                let xpos=d.x+padding_left;
                return "translate("+xpos+","+d.y+")";
            })
            .style('opacity',0);

        nodeEnter.append('rect')
            .attr('class','prop_rect')
            .attr("height",function(d){return nodeHeight(d);})
            .attr("width",prop_width);

        nodeEnter.append('rect')
            .attr("class","main_node")
            .attr("height",function(d){
                orig_height=d3.select(this).attr('height');
                return nodeHeight(d);
            })
            .attr("width",main_width)
            .attr("x",prop_width);

        nodeEnter.append("text")
            .attr('class','sankey_node_txt')
            .text(function(d){
                return Data.idx2label[nodeEvent(d)].slice(0,maxDigits);
            })
            .attr('transform','rotate(270)')
            .attr("x",function(d){return -d.dy/2})
            .attr("y",prop_width+main_width/2+3)
            .style('display',function(d){
                if(nodeHeight(d)>40){
                    return 'block';
                }else{
                    return 'none';
                }
            })

        nodeEnter.append('text')
            .attr("class","pop_txt")
            .attr("x",function(d){return -d.dy/2})
            .attr("y",prop_width/2)
            .attr("transform","rotate(270)");

        updatenodes.exit().remove();

        d3.selectAll('.sankey_node').transition(t)
            .attr("transform",function(d){
                let xpos=d.x+padding_left;
                return "translate("+xpos+","+d.y+")";
            })
            .style('opacity',1);

        d3.selectAll('.sankey_node').select('.prop_rect')
            .transition(t)
            .attr("height",function(d){return nodeHeight(d);})
            .attr("width",prop_width);

        d3.selectAll('.sankey_node').select('.main_node')
            .transition(t)
            .attr("height",function(d){
                orig_height=d3.select(this).attr('height');
                return nodeHeight(d);
            })
            .attr("width",main_width)
            .attr("x",prop_width)
            .attr('eid',(d)=>nodeEvent(d))
            .call(tip);

        d3.selectAll('.sankey_node').select('.pop_txt')
            .transition(t)
            .text(function(d){
                if(d.dy<10){
                    return ""
                }else{
                    let pop=Math.max(d3.sum(d.sourceLinks,function(d){return d.value}),d3.sum(d.targetLinks,function(d){return d.value}))
                    // let pop= d3.sum(d.info.props);
                    return popFormat(pop);
                    // return node.info.rlist.length;
                }
            })
            .attr("x",function(d){return -d.dy/2})
            .attr("y",prop_width/2)
            .attr("transform","rotate(270)");

        d3.selectAll('.sankey_node').select('.sankey_node_txt')
            .transition(t)
            .text(function(d){
                return Data.idx2label[nodeEvent(d)].slice(0,maxDigits);
            })
            .attr('transform','rotate(270)')
            .attr("x",function(d){return -d.dy/2})
            .attr("y",prop_width+main_width/2+3)
            .style('display',function(d){
                if(nodeHeight(d)>40){
                    return 'block';
                }else{
                    return 'none';
                }
            })

        d3.selectAll('.sankey_node').attr('id',(d)=>'node'+d.name);
    }

    function updateAnomaly(){
        let flow=filterFlow();
        let t=d3.transition().duration(1000);
        let anomaly_nodes=flow['nodes'].filter(function(d){return _.contains(d.info.rlist,Data.abid)});
        let anomaly_links=flow['links'].filter(function(d){return _.contains(d.info.rlist,Data.abid)});

        let path=d3.sankey().anomalyLink(timeScale);

        let updatelinks=d3.select('#anomaly_canvas').select('.g_anomaly_links')
            .selectAll('.anomaly_links')
            .data(anomaly_links,(d)=>d.source.name+','+d.target.name);

        let linkEnter=updatelinks.enter().insert('g')
            .attr('class','anomaly_links')
            .attr("transform","translate("+padding_left+",0)")
            .style('opacity',0);

        updatelinks.exit().remove();

        linkEnter.append('rect')
            .attr('class','anomaly_timebar')
            .attr("x",function(d){return d.source.x+prop_width+main_width+timebar_padding;})
            .attr("y",function(d){return d.source.y})
            .attr("height",function(d){
                let height=d.source.dy;
                let abidx=_.indexOf(d.source.info.rlist,Data.abid);
                let prop=d.source.info.props[abidx]/d3.sum(d.source.info.props);
                return height*prop;
            })
            .attr("width",function(d){
                let s_layer=d.source.info.layer;
                time=seq[s_layer+1]['time'][0]-seq[s_layer]['time'][0]
                return timeScale(time);
            });

        linkEnter.append('path')
            .attr('class','anomaly_link_path')
            .style('stroke-width',link_width)
            .attr("d",path);

        d3.selectAll('.anomaly_links')
            .transition(t)
            .attr("transform","translate("+padding_left+",0)")
            .style('opacity',1);

        d3.selectAll('.anomaly_links').select('.anomaly_timebar')
            .transition(t)
            .attr("x",function(d){return d.source.x+prop_width+main_width+timebar_padding;})
            .attr("y",function(d){return d.source.y})
            .attr("height",function(d){
                let height=d.source.dy;
                let abidx=_.indexOf(d.source.info.rlist,Data.abid);
                let prop=d.source.info.props[abidx]/d3.sum(d.source.info.props);
                return height*prop;
            })
            .attr("width",function(d){
                let s_layer=d.source.info.layer;
                time=seq[s_layer+1]['time'][0]-seq[s_layer]['time'][0]
                return timeScale(time);
            })
            .call(tip);

        d3.selectAll('.anomaly_links').select('.anomaly_link_path')
            .transition(t)
            .attr("d",path);

        let updateNodes=d3.select('#anomaly_canvas').select('.g_anomaly_nodes')
            .selectAll('.anomaly_nodes')
            .data(anomaly_nodes,(d)=>d.name);

        let nodeEnter=updateNodes.enter().insert('g')
            .attr('class','anomaly_nodes')
            .attr("transform",function(d){
                let xpos=d.x+padding_left;
                return "translate("+xpos+","+d.y+")";
            })
            .style('opacity',0);

        nodeEnter.append('rect')
            .attr('class','anomaly_prop_rect')
            .attr('height',function(d){
                let height=nodeHeight(d);
                let abidx=_.indexOf(d.info.rlist,Data.abid);
                let prop=d.info.props[abidx]/d3.sum(d.info.props);
                return height*prop;
            })
            .attr('width',prop_width);

        nodeEnter.append('rect')
            .attr('class','anomaly_main_node')
            .attr('x',prop_width)
            .attr('height',function(d){
                let height=nodeHeight(d);
                let abidx=_.indexOf(d.info.rlist,Data.abid);
                let prop=d.info.props[abidx]/d3.sum(d.info.props);
                return height*prop;
            })
            .attr('width',main_width)

        updateNodes.exit().remove();

        d3.selectAll('.anomaly_nodes')
            .transition(t)
            .attr("transform",function(d){
                let xpos=d.x+padding_left;
                return "translate("+xpos+","+d.y+")";
            })
            .style('opacity',1);

        d3.selectAll('.anomaly_nodes').select('.anomaly_prop_rect')
            .transition(t)
            .attr('height',function(d){
                let height=nodeHeight(d);
                let abidx=_.indexOf(d.info.rlist,Data.abid);
                let prop=d.info.props[abidx]/d3.sum(d.info.props);
                return height*prop;
            })
            .attr('width',prop_width);

        //main node
        d3.selectAll('.anomaly_nodes').select('.anomaly_main_node')
            .transition(t)
            .attr('x',prop_width)
            .attr('height',function(d){
                let height=nodeHeight(d);
                let abidx=_.indexOf(d.info.rlist,Data.abid);
                let prop=d.info.props[abidx]/d3.sum(d.info.props);
                return height*prop;
            })
            .attr('width',main_width)
            .attr('eid',(d)=>nodeEvent(d))
            .call(tip);

        d3.selectAll('.anomaly_link_path').raise();

        d3.select('#sankey_canvas').style('opacity','0.5');
    }

    function drawDiff(){
        let t=d3.transition().duration(1000);
        let diff_canvas_height=anomaly_canvas_height-2*margin.top-Data.treeSize[1];
        let diff_canvas=d3.select('#main_svg')
            .append('g')
            .attr('class','canvas')
            .attr('id','diff_canvas')
            .attr('transform',function(){
                let t=Util.getTranslate(d3.select('#sankey_canvas').attr("transform")),
                    xpos=t[0],
                    ypos=margin.top;
                    return "translate("+xpos+","+ypos+")";
                })
            .style('opacity',0);

        let diff_bgline=diff_canvas.append('line')
            .attr('x1',padding_left)
            .attr('x2',(diff.length-1)*Data.layer_gap+padding_left)
            .attr('y1',diff_canvas_height/2+margin.top+Data.treeSize[1])
            .attr('y2',diff_canvas_height/2+margin.top+Data.treeSize[1])
            .attr('class','event_link');

        let diff_node=diff_canvas.selectAll('.diff_node')
            .data(diff,(d,i)=>Data.slotids[i])
            .enter()
            .append('g')
            .attr('class','diff_node')
            .attr('transform',function(d,i){
                let xpos=Data.layer_gap*i+padding_left;
                let ypos=margin.top+Data.treeSize[1];
                return 'translate('+xpos+','+ypos+')';
            });

        diff_node.append('line')
            .attr('class','event_link')
            .attr('x1',Data.treeSize[0]/2)
            .attr('x2',Data.treeSize[0]/2)
            .attr('y1',0)
            .attr('y2',diff_canvas_height+20);

        diff_node.append('circle')
            .attr('class','diff_outter')
            .attr('r',(d)=>Math.max(3,diffCircleScale(d.score_sum)))
            .attr('cx',(d)=>Data.treeSize[0]/2)
            .attr('cy',diff_canvas_height/2);

        //draw inner circles
        diff_node
            .append('g')
            .attr('class','g_diffs')
            .attr('transform',function(d){
                // let xpos=Data.treeSize[0]/2-popCircleScale(d.pop_sum);
                // let ypos=diff_canvas_height/2-popCircleScale(d.pop_sum);
                let xpos=Data.treeSize[0]/2-diffCircleScale(d.score_sum);
                let ypos=diff_canvas_height/2-diffCircleScale(d.score_sum);
                return 'translate('+xpos+','+ypos+')';
            })
            .call(circleGlyph);

        diff_canvas.transition(t).style('opacity',1);

        diff_canvas.attr("transform",function(){
            let t=Util.getTranslate(d3.select('#sankey_canvas').attr("transform")),
                xpos=t[0],
                ypos=t[1];
                return "translate("+xpos+","+ypos+")";
        })
    }

    function updateDiff(){
        let diff_canvas_height=anomaly_canvas_height-2*margin.top-Data.treeSize[1];
        let t=d3.transition().duration(1000);
        d3.select('#diff_canvas').select('.event_link')
            .transition(t)
            .attr('x1',padding_left)
            .attr('x2',(diff.length-1)*Data.layer_gap+padding_left)
            .attr('y1',diff_canvas_height/2+margin.top+Data.treeSize[1])
            .attr('y2',diff_canvas_height/2+margin.top+Data.treeSize[1]);

        let diff_nodes=d3.select('#diff_canvas').selectAll('.diff_node')
            .data(diff,(d,i)=>Data.slotids[i]);

        let diffEnter=diff_nodes.enter().insert('g')
            .attr('class','diff_node')
            .attr('transform',function(d,i){
                let xpos=Data.layer_gap*i+padding_left;
                let ypos=margin.top+Data.treeSize[1];
                return 'translate('+xpos+','+ypos+')';
            })
            .style('opacity',0);

        diffEnter.append('line')
            .attr('class','event_link');

        diffEnter.append('circle')
            .attr('class','diff_outter')
            .attr('r',function(d,i){
                return Math.max(3,diffCircleScale(d.score_sum))
            })
            .attr('cx',(d)=>Data.treeSize[0]/2)
            .attr('cy',diff_canvas_height/2);

        diffEnter.append('g')
            .attr('class','g_diffs')
            .attr('transform',function(d){
                // let xpos=Data.treeSize[0]/2-popCircleScale(d.pop_sum);
                // let ypos=diff_canvas_height/2-popCircleScale(d.pop_sum);
                let xpos=Data.treeSize[0]/2-diffCircleScale(d.score_sum);
                let ypos=diff_canvas_height/2-diffCircleScale(d.score_sum);
                return 'translate('+xpos+','+ypos+')';
            });

        diff_nodes.exit().remove();

        d3.select('#diff_canvas').selectAll('.diff_node')
            .transition(t)
            .attr('transform',function(d,i){
                let xpos=Data.layer_gap*i+padding_left;
                let ypos=margin.top+Data.treeSize[1];
                return 'translate('+xpos+','+ypos+')';
            })
            .style('opacity',1);

        d3.selectAll('.diff_node').select('.event_link')
            .transition(t)
            .attr('x1',Data.treeSize[0]/2)
            .attr('x2',Data.treeSize[0]/2)
            .attr('y1',0)
            .attr('y2',diff_canvas_height+20);

        d3.selectAll('.diff_node').select('.diff_outter')
            .transition(t)
            .attr('r',function(d,i){
                return Math.max(3,diffCircleScale(d.score_sum))
            })
            .attr('cx',(d)=>Data.treeSize[0]/2)
            .attr('cy',diff_canvas_height/2);

        d3.selectAll('.diff_node').select('.g_diffs')
            .transition(t)
            .attr('transform',function(d){
                // let xpos=Data.treeSize[0]/2-popCircleScale(d.pop_sum);
                // let ypos=diff_canvas_height/2-popCircleScale(d.pop_sum);
                let xpos=Data.treeSize[0]/2-diffCircleScale(d.score_sum);
                let ypos=diff_canvas_height/2-diffCircleScale(d.score_sum);
                return 'translate('+xpos+','+ypos+')';
            })

        d3.selectAll('.diff_node').select('.g_diffs').call(updateCircleGlyph);
        bindTooltips();

        updateSankey();
    }

    function initSseq(){
        let nodePosDict={}
        flowObj.nodes.forEach(function(d){
            nodePosDict[d.name]={'x':d.x,'y':d.y};
        })

        let canvas = d3.select('#simseq_svg').append('g')
            .attr('class','canvas')
            .attr('id','sseq_canvas')
            .attr("transform",function(){
                let xpos=margin.left,
                    ypos=margin.top;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',0);

        let sseq_dat=[]
        for(let pid in sseq){
            sseq_dat.push({'pid':pid,'sseq':sseq[pid]});
        }

        let sseq_canvas=canvas.selectAll('.sseq')
            .data(sseq_dat)
            .enter()
            .append('g')
            .attr('class','sseq')
            .attr('id',function(d,i){return 'sseq#'+d.pid});

        //draw time bar
        let timebar_canvas=sseq_canvas
            .append('g')
            .attr('class','sseqtimebar_canvas')
            .attr('transform',function(){
                let ypos=Data.treeSize[1]/2+margin.top;
                return 'translate(0,'+ypos+')'
            });

        timebar_canvas.append("rect")
            .attr("x",padding_left)
            .attr("y",-seq_bar_height/2)
            .attr("width",Data.canvas_width)
            .attr("height",seq_bar_height)
            .attr("class","seq_bar");

        let seq_timebar=timebar_canvas.selectAll('.seqtimebar')
            .data(function(d){return sseq_time_diff[d.pid]})
            .enter()
            .append('g')
            .attr('class','seqtimebar')
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })

        seq_timebar.append("rect")
            .attr("width",function(d){
                if(d<1e-6){
                    return 0
                }
                return seqTimeScale(d)
            })
            .attr("height",seq_bar_height)
            .attr('class','etime_bar');

        seq_timebar.append("text")
            .attr("class","etime_txt")
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2)
            .text(function(d){return timeFormat(Util.second2Days(d))+" D";});

        let sseq_egroup=sseq_canvas.selectAll('.egroup')
            .data((d)=>_.zip(d.sseq,d3.range(d.sseq.length)))
            .enter()
            .append('g')
            .attr('class','egroup_sseq')
            .attr('transform',function(d,i){
                let xpos=Data.layer_gap*i+padding_left;
                let ypos=(Data.treeSize[1]-seq_bar_height)/2;
                return 'translate('+xpos+','+ypos+')';
            });

        sseq_egroup.selectAll('.event')
            .data((d)=>_.zip(d[0].event,d[0].freq,d[0].time),(d)=>d[0])
            .enter()
            .append('rect')
            .attr('y',function(d){
                let layer=d3.select(this.parentNode).data()[0][1];
                let key=d[0]+'('+Data.slotids[layer]+')';
                return nodePosDict[key].y;
            })
            .attr('width',main_width)
            .attr('height',5)
            .attr('class','sseq_erect')
            .classed('less',function(d){
                let t=d3.select(this.parentNode).data()[0][1];
                let e=d[0];
                let diff_event=_.unzip(diff[t]['less'])[0]
                return _.contains(diff_event,e);
            })
            .classed('more',function(d){
                let t=d3.select(this.parentNode).data()[0][1];
                let e=d[0];
                let diff_event=_.unzip(diff[t]['more'])[0]
                return _.contains(diff_event,e);
            })
            .attr('eid',(d)=>d[0])
            .call(tip);

        canvas.attr("transform",function(){
            let t=Util.getTranslate(d3.select('#sankey_canvas').attr("transform")),
                xpos=t[0],
                ypos=-10;
                return "translate("+xpos+","+ypos+")";
        })

        canvas.style('pointer-events','none');
        d3.select('#sankey_canvas').raise();
    }

    function updateSseqSankey(){
        let nodePosDict={}
        flowObj.nodes.forEach(function(d){
            nodePosDict[d.name]={'x':d.x,'y':d.y};
        })

        let sseq_dat=[]
        for(let pid in sseq){
            sseq_dat.push({'pid':pid,'sseq':sseq[pid]});
        }

        let sseq_canvas=d3.select('#sseq_canvas').selectAll('.sseq')
            .data(sseq_dat);

        let sseqEnter=sseq_canvas.enter().insert('g')
            .attr('class','sseq')
            .attr('id',function(d){return 'sseq#'+d.pid});

        sseq_canvas.exit().remove();

        //draw time bar
        let timebar_canvas=sseqEnter
            .append('g')
            .attr('class','sseqtimebar_canvas');

        timebar_canvas.append("rect")
            .attr("class","seq_bar");

        let seq_timebar=timebar_canvas.selectAll('.seqtimebar')
            .data(function(d){return sseq_time_diff[d.pid]})
            .enter()
            .append('g')
            .attr('class','seqtimebar');

        seq_timebar.append("rect")
            .attr('class','etime_bar');

        seq_timebar.append("text")
            .attr("class","etime_txt");

        let sseq_egroup=sseqEnter.selectAll('.egroup_sseq')
            .data((d)=>_.zip(d.sseq,d3.range(d.sseq.length)))
            .enter()
            .append('g')
            .attr('class','egroup_sseq');

        sseq_egroup.selectAll('.event')
            .data((d)=>_.zip(d[0].event,d[0].freq,d[0].time),(d)=>d[0])
            .enter()
            .append('rect')
            .attr('class','sseq_erect');

        let timebar_update=d3.selectAll('.sseq').select('.sseqtimebar_canvas')
            .selectAll('.seqtimebar')
            .data(function(d){return sseq_time_diff[d.pid]});

        let timebarEnter = timebar_update.enter().insert('g')
            .attr('class','seqtimebar');

        timebar_update.exit().remove();

        timebarEnter.append('rect')
            .attr('class','etime_bar');

        timebarEnter.append('text')
            .attr('class','etime_txt');

        d3.selectAll('.sseq').select('.sseqtimebar_canvas')
            .select('.seq_bar')
            .attr("x",padding_left)
            .attr("y",-seq_bar_height/2)
            .attr("width",Data.canvas_width)
            .attr("height",seq_bar_height);

        d3.selectAll('.sseq').select('.sseqtimebar_canvas').selectAll('.seqtimebar')
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })

        d3.selectAll('.sseq').select('.sseqtimebar_canvas').selectAll('.seqtimebar')
            .select('.etime_bar')
            .attr("width",function(d){
                if(d<1e-6){
                    return 0
                }
                return seqTimeScale(d)
            })
            .attr("height",seq_bar_height);

        d3.selectAll('.sseq').select('.sseqtimebar_canvas').selectAll('.seqtimebar')
            .select('.etime_txt')
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2)
            .text(function(d){return timeFormat(Util.second2Days(d))+" D";});

        let egroup_update=d3.selectAll('.sseq').selectAll('.egroup_sseq')
            .data((d)=>_.zip(d.sseq,d3.range(d.sseq.length)));

        let groupEnter=egroup_update.enter()
            .insert('g')
            .attr('class','egroup_sseq');

        egroup_update.exit().remove();

        groupEnter.selectAll('.event')
            .data((d)=>_.zip(d[0].event,d[0].freq,d[0].time),(d)=>d[0])
            .append('rect')
            .attr('class','sseq_erect');

        let erect_update=d3.select('#sseq_canvas').selectAll('.sseq')
            .selectAll('.egroup_sseq')
            .selectAll('.sseq_erect')
            .data((d)=>_.zip(d[0].event,d[0].freq,d[0].time),(d)=>d[0]);

        erect_update.enter().insert('rect')
            .attr('class','sseq_erect');

        erect_update.exit().remove();

        d3.select('#sseq_canvas').selectAll('.sseq')
            .attr('transform',function(d,i){
                let ypos=i*sseq_gap;
                return 'translate(0,'+ypos+')';
            });

        d3.select('#sseq_canvas').selectAll('.sseq').selectAll('.egroup_sseq')
            .attr('transform',function(d,i){
                let xpos=Data.layer_gap*i+padding_left;
                let ypos=(Data.treeSize[1]-seq_bar_height)/2;
                return 'translate('+xpos+','+ypos+')';
            });

        d3.select('#sseq_canvas').selectAll('.sseq').selectAll('.egroup_sseq')
            .selectAll('.sseq_erect')
            .attr('y',function(d){
                let layer=d3.select(this.parentNode).data()[0][1];
                let key=d[0]+'('+Data.slotids[layer]+')';
                return nodePosDict[key].y;
            })
            .attr('width',main_width)
            .attr('height',5)
            .attr('class','sseq_erect')
            .attr('eid',(d)=>d[0])
            .call(tip);

        d3.select('#simseq svg').attr('height',_.keys(sseq).length*sseq_gap);
    }

    function updateSeq(){
        let t=d3.transition().duration(1000);
         //relayout anomaly nodes
        treemap_nodes=getSeqTreemaps();

        let anomalyUpdate=d3.select('#anomaly_canvas')
            .select('.g_anomaly_nodes')
            .selectAll('.anomaly_nodes')
            .data(_.flatten(treemap_nodes),(d)=>d.data.data.id);

        let anomalyEnter=anomalyUpdate.enter().insert('g')
            .attr('class','anomaly_nodes')
            .attr('id',function(d){return d.data.data.id})
            .attr("transform",function(d){
                let xpos=d.data.data.layer*Data.layer_gap+padding_left;
                return "translate("+xpos+","+margin.top+")";
            })
            .style('opacity',0);

        anomalyUpdate.exit().remove();

        anomalyEnter.append('rect')
            .attr('class','anomaly_main_node')
            .classed('split',true)
            .attr("x",function(d){return d.x0})
            .attr("y",function(d){return d.y0})
            .attr("width",function(d){return d.x1-d.x0})
            .attr("height",function(d){return d.y1-d.y0});

        anomalyEnter.append('rect')
            .attr('class','anomaly_prop_rect');

        d3.select('#anomaly_canvas')
            .select('.seqtimebar_canvas')
            .select('.seq_bar')
            .transition(t)
            .attr('width',Data.canvas_width);

        let timebarUpdate=d3.select('#anomaly_canvas')
            .select('.seqtimebar_canvas')
            .selectAll('.seqtimebar')
            .data(time_diff);

        let timebarEnter=timebarUpdate.enter().insert('g')
            .attr('class','seqtimebar')
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            });

        timebarUpdate.exit().remove();

        timebarEnter.append('rect')
            .attr('class','etime_bar');

        timebarEnter.append('text')
            .attr('class','etime_txt')
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2);

        d3.selectAll('.anomaly_nodes')
            .transition(t)
            .attr("transform",function(d){
                let xpos=d.data.data.layer*Data.layer_gap+padding_left;
                return "translate("+xpos+","+margin.top+")";
            })
            .style('opacity',1);

        d3.selectAll('.anomaly_nodes')
            .select('.anomaly_main_node')
            .transition(t)
            .attr("x",function(d){return d.x0})
            .attr("y",function(d){return d.y0})
            .attr("width",function(d){return d.x1-d.x0})
            .attr("height",function(d){return d.y1-d.y0})
            .attr('eid',(d)=>treeEvent(d))
            .call(tip);

        d3.select('#anomaly_canvas').select('.seqtimebar_canvas')
            .selectAll('.seqtimebar')
            .transition(t)
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })

        d3.select('#anomaly_canvas').select('.seqtimebar_canvas')
            .selectAll('.seqtimebar')
            .select('.etime_bar')
            .transition(t)
            .attr("width",function(d){
                if(d<1e-6){
                    return 0
                }
                return seqTimeScale(d)
            })
            .attr("height",seq_bar_height);

        d3.select('#anomaly_canvas').select('.seqtimebar_canvas')
            .selectAll('.seqtimebar')
            .select('.etime_txt')
            .transition(t)
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2)
            .text(function(d){return timeFormat(Util.second2Days(d))+" D";});

        d3.select('.g_anomaly_nodes')
            .selectAll('.anomaly_seq_bgrect')
            .remove();

        d3.select('.g_anomaly_nodes')
            .selectAll('.rect')
            .data(seq)
            .enter()
            .append('rect')
            .attr('class','anomaly_seq_bgrect')
            .attr('x',function(d,i){return Data.layer_gap*i+padding_left})
            .attr('y',margin.top)
            .attr('width',Data.treeSize[0])
            .attr('height',Data.treeSize[1]);

        d3.select('.g_anomaly_nodes').raise();
        d3.select('.g_anomaly_nodes').selectAll('.anomaly_nodes').raise();}

    function updateSseq(){
        let t=d3.transition().duration(1000);
        let canvas = d3.select('#simseq_svg').append('g')
            .attr('class','canvas')
            .attr('id','sseq_canvas')
            .attr("transform",function(){
                let xpos=margin.left,
                    ypos=-10;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',0);

        let sseq_dat=[]
        for(let pid in sseq){
            sseq_dat.push({'pid':pid,'sseq':sseq[pid]});
        }

        let sseq_canvas=d3.select('#sseq_canvas').selectAll('.sseq')
            .data(sseq_dat);

        let sseqEnter=sseq_canvas.enter().insert('g')
            .attr('class','sseq')
            .attr('id',function(d){return 'sseq#'+d.pid});

        sseq_canvas.exit().remove();

        //draw time bar
        let timebar_canvas=sseqEnter
            .append('g')
            .attr('class','sseqtimebar_canvas');

        timebar_canvas.append("rect")
            .attr("class","seq_bar");

        let seq_timebar=timebar_canvas.selectAll('.seqtimebar')
            .data(function(d){return sseq_time_diff[d.pid]})
            .enter()
            .append('g')
            .attr('class','seqtimebar');

        seq_timebar.append("rect")
            .attr('class','etime_bar');

        seq_timebar.append("text")
            .attr("class","etime_txt");

        let sseq_egroup=sseqEnter.selectAll('.egroup_sseq')
            .data((d)=>_.zip(d.sseq,d3.range(d.sseq.length)))
            .enter()
            .append('g')
            .attr('class','egroup_sseq');

        sseq_egroup.selectAll('.event')
            .data((d)=>_.zip(d[0].event,d[0].freq,d[0].time),(d)=>d[0])
            .enter()
            .append('rect')
            .attr('class','sseq_erect');

        let timebar_update=d3.selectAll('.sseq').select('.sseqtimebar_canvas')
            .selectAll('.seqtimebar')
            .data(function(d){return sseq_time_diff[d.pid]});

        let timebarEnter = timebar_update.enter().insert('g')
            .attr('class','seqtimebar')
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',0);

        timebar_update.exit().remove();

        timebarEnter.append('rect')
            .attr('class','etime_bar');

        timebarEnter.append('text')
            .attr('class','etime_txt')
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2);

        d3.selectAll('.sseq').select('.sseqtimebar_canvas')
            .select('.seq_bar')
            .transition(t)
            .attr("x",padding_left)
            .attr("y",-seq_bar_height/2)
            .attr("width",Data.canvas_width)
            .attr("height",seq_bar_height);

        d3.selectAll('.sseq').select('.sseqtimebar_canvas').selectAll('.seqtimebar')
            .transition(t)
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',1)

        d3.selectAll('.sseq').select('.sseqtimebar_canvas').selectAll('.seqtimebar')
            .select('.etime_bar')
            .transition(t)
            .attr("width",function(d){
                if(d<1e-6){
                    return 0
                }
                return seqTimeScale(d)
            })
            .attr("height",seq_bar_height);

        d3.selectAll('.sseq').select('.sseqtimebar_canvas').selectAll('.seqtimebar')
            .select('.etime_txt')
            .transition(t)
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2)
            .text(function(d){return timeFormat(Util.second2Days(d))+" D";});

        let egroup_update=d3.selectAll('.sseq').selectAll('.egroup_sseq')
            .data((d)=>_.zip(d.sseq,d3.range(d.sseq.length)));

        let groupEnter=egroup_update.enter()
            .insert('g')
            .attr('class','egroup_sseq')
            .attr('transform',function(d,i){
                let xpos=Data.layer_gap*i+padding_left;
                let ypos=(Data.treeSize[1]-seq_bar_height)/2;
                return 'translate('+xpos+','+ypos+')';
            })
            .style('opacity',0);

        egroup_update.exit().remove();

        groupEnter.selectAll('.event')
            .data((d)=>_.zip(d[0].event,d[0].freq,d[0].time),(d)=>d[0])
            .append('rect')
            .attr('class','sseq_erect');

        let update_e=d3.selectAll('.egroup_sseq').selectAll('.sseq_erect')
            .data(function(d){return getTreemap(d[0],d[1])});

        update_eEnter=update_e.enter().insert('rect')
            .attr('class','sseq_erect');

        update_e.exit().remove();

        d3.select('#sseq_canvas').selectAll('.sseq')
            .transition(t)
            .attr('transform',function(d,i){
                let ypos=i*sseq_gap;
                return 'translate(0,'+ypos+')';
            });

        d3.select('#sseq_canvas').selectAll('.sseq').selectAll('.egroup_sseq')
            .transition(t)
            .attr('transform',function(d,i){
                let xpos=Data.layer_gap*i+padding_left;
                let ypos=(Data.treeSize[1]-seq_bar_height)/2;
                return 'translate('+xpos+','+ypos+')';
            })
            .style('opacity',1);

        d3.selectAll('.egroup_sseq').selectAll('.sseq_erect')
            .transition(t)
            .attr("x",function(d){return d.x0})
            .attr("y",function(d){return d.y0})
            .attr("width",function(d){return d.x1-d.x0})
            .attr("height",function(d){return d.y1-d.y0})
            .attr('eid',(d)=>treeEvent(d))
            .call(tip);

        d3.select('#simseq svg').attr('height',_.keys(sseq).length*sseq_gap);}

    function updateSum(){
        let t=d3.transition().duration(1000);

        console.log(Data.layer_gap);

        //relayout sankey nodes
        let treemap_nodes=getSseqTreemaps();

        let update_node=d3.select('#sankey_canvas').select('.g_nodes').selectAll('.sankey_node').data(_.flatten(treemap_nodes),(d)=>d.data.id);

        let nodeEnter=update_node.enter().insert('g')
            .attr('class','sankey_node')
            .attr("transform",function(d){
                let xpos=d.data.data.layer*Data.layer_gap+padding_left;
                let ypos=0;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',0);

        update_node.exit().remove();

        nodeEnter.append('rect')
            .attr('class','main_node')
            .classed('sum',true);

        nodeEnter.append('rect')
            .attr('class','prop_rect');

        nodeEnter.append('text')
            .attr('class','pop_txt');

        d3.selectAll('.sankey_node')
            .transition(t)
            .attr("transform",function(d){
                let xpos=d.data.data.layer*Data.layer_gap+padding_left;
                let ypos=0;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',1);

        d3.select('#sankey_canvas').select('.g_nodes').selectAll('.sankey_node')
            .select('.main_node')
            .classed('sum',true)
            .transition(t)
            .attr("x",function(d){return d.x0})
            .attr("y",function(d){return d.y0})
            .attr("width",function(d){return d.x1-d.x0})
            .attr("height",function(d){return d.y1-d.y0})
            .attr('eid',(d)=>treeEvent(d))
            .call(tip);

        //draw time bar
        let timebar_canvas=d3.select('#sankey_canvas').select('.sseqtimebar_canvas');

        timebar_canvas.select('.seq_bar')
            .transition(t)
            .attr('width',Data.canvas_width);

        let seqbarUpdate=timebar_canvas.selectAll('.seqtimebar')
            .data(sseq_pack_time_diff);

        let seqbar_enter=seqbarUpdate.enter().insert('g')
            .attr('class','seqtimebar')
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',0);

        seqbar_enter.append('rect')
            .attr('class','etime_bar');

        seqbar_enter.append('text')
            .attr('class','etime_txt')
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2);

        seqbarUpdate.exit().remove();

        timebar_canvas.selectAll('.seqtimebar')
            .transition(t)
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',1);

        timebar_canvas.selectAll('.seqtimebar').select('.etime_bar')
            .transition(t)
            .attr("width",function(d){
                if(d<1e-6){
                    return 0
                }
                return seqTimeScale(d)
            })
            .attr("height",seq_bar_height)

        timebar_canvas.selectAll('.seqtimebar').select('.etime_txt')
            .transition(t)
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2)
            .text(function(d){return timeFormat(Util.second2Days(d))+" D";});

        d3.select('#sankey_canvas')
            .selectAll('.sseq_bgrect')
            .remove();

        d3.select('#sankey_canvas')
            .selectAll('.rect')
            .data(sseq_pack)
            .enter()
            .append('rect')
            .attr('class','sseq_bgrect')
            .attr('x',function(d,i){return Data.layer_gap*i+padding_left})
            .attr('y',0)
            .attr('width',Data.treeSize[0])
            .attr('height',Data.treeSize[1]);

        d3.select('.g_nodes').raise();
    }

    function sankey2seq(){
        let selectids;
        if(Data.selectlist.length>0){
            selectids=Data.selectlist;
        }else{
            selectids=Data.alllist;
        }
        let t=d3.transition().duration(1000);
        let t1=d3.transition().duration(1000).delay(1000);

        // d3.select('#sseq_canvas').style('opacity',1);
        // d3.select('#sseq_canvas').selectAll('*').style('opacity',1);
        d3.select('#sseq_canvas').style('opacity',1);
        let select_sseq=d3.select('#sseq_canvas').selectAll('.sseq').filter(function(d){return _.contains(selectids,d.pid)});
        let unselect_sseq=d3.select('#sseq_canvas').selectAll('.sseq').filter(function(d){return !_.contains(selectids,d.pid)});

        select_sseq.style('display','block');
        unselect_sseq.style('display','none');

        d3.select('#sseq_canvas').selectAll('.egroup_sseq').style('opacity',1);
        d3.select('#sseq_canvas').selectAll('.sseqtimebar_canvas').style('opacity',0);
        d3.select('#sseq_canvas').selectAll('.sseqtimebar_canvas').transition(t1).style('opacity',1);

        d3.select('#sankey_canvas').transition(t)
            .style('opacity','0');

        select_sseq
            .transition(t)
            .attr('transform',function(d,i){
                let ypos=i*sseq_gap;
                return 'translate(0,'+ypos+')';
            });

        let event_rect=d3.selectAll('.egroup_sseq').selectAll('.sseq_erect')
            .data(function(d){return getTreemap(d[0],d[1])});

        event_rect.transition(t)
            .attr("x",function(d){return d.x0})
            .attr("y",function(d){return d.y0})
            .attr("width",function(d){return d.x1-d.x0})
            .attr("height",function(d){return d.y1-d.y0})
            .attr('eid',(d)=>treeEvent(d));

        d3.select('#simseq svg').attr('height',_.keys(sseq).length*sseq_gap);

        d3.select('#sseq_canvas').style('pointer-events','auto');
        d3.select('#sseq_canvas').raise();
        d3.select('#sankey_canvas').style('pointer-events','none');
    }

    function sankey2sum(){
        let t=d3.transition().duration(1000);
        d3.selectAll('.g_links,.prop_rect,.pop_txt,.sankey_node_txt').transition(t).style('opacity',0)
            .style('pointer-event','none');

        //relayout sankey nodes
        let treemap_nodes=getSseqTreemaps();
        treemapDict={}
        _.flatten(treemap_nodes).forEach(function(d){
            treemapDict[d.data.id]=d;
        })

        let sankey_nodes;
        if(Data.selectlist.length>0){
            sankey_nodes=d3.selectAll('.sankey_node.select');
        }else{
            sankey_nodes=d3.selectAll('.sankey_node')
        }
        sankey_nodes
            .each(function(d){
                let node_name=d3.select(this).data()[0].name;
                let treemap_dat=treemapDict[node_name];
                d3.select(this).datum(treemap_dat,(d)=>d.data.id);
            });

        sankey_nodes
            .transition(t)
            .attr("transform",function(d){
                let xpos=d.data.data.layer*Data.layer_gap+padding_left;
                let ypos=0;
                return "translate("+xpos+","+ypos+")";
            });

        sankey_nodes
            .select('.main_node')
            .classed('sum',true)
            .transition(t)
            .attr("x",function(d){return d.x0})
            .attr("y",function(d){return d.y0})
            .attr("width",function(d){return d.x1-d.x0})
            .attr("height",function(d){return d.y1-d.y0})
            .attr('eid',(d)=>treeEvent(d));

        //draw time bar
        let timebar_canvas=d3.select('#sankey_canvas')
            .append('g')
            .attr('class','sseqtimebar_canvas')
            .attr('transform',function(){
                let ypos=Data.treeSize[1]/2;
                return 'translate(0,'+ypos+')'
            });

        timebar_canvas.append("rect")
            .attr("x",padding_left)
            .attr("y",-seq_bar_height/2)
            .attr("width",Data.canvas_width)
            .attr("height",seq_bar_height)
            .attr("class","seq_bar");

        let seq_timebar=timebar_canvas.selectAll('.seqtimebar')
            .data(sseq_pack_time_diff)
            .enter()
            .append('g')
            .attr('class','seqtimebar')
            .attr("transform",function(d,i){
                let xpos=Data.layer_gap*i+padding_left+Data.treeSize[0];
                let ypos=-seq_bar_height/2;
                return "translate("+xpos+","+ypos+")";
            })

        d3.select('#sankey_canvas')
            .selectAll('.rect')
            .data(sseq_pack)
            .enter()
            .append('rect')
            .attr('class','sseq_bgrect')
            .attr('x',function(d,i){return Data.layer_gap*i+padding_left})
            .attr('y',0)
            .attr('width',Data.treeSize[0])
            .attr('height',Data.treeSize[1]);

        seq_timebar.append("rect")
            .attr("width",function(d){
                if(d<1e-6){
                    return 0
                }
                return seqTimeScale(d)
            })
            .attr("height",seq_bar_height)
            .attr('class','etime_bar');

        seq_timebar.append("text")
            .attr("class","etime_txt")
            .attr("x",Data.layer_gap/2-Data.treeSize[0]/2)
            .text(function(d){return timeFormat(Util.second2Days(d))+" D";});

        d3.select('.g_nodes').raise();
    }

    function seq2sankey(){
        let nodeDict={}
        flowObj.nodes.forEach(function(d){
            nodeDict[d.name]=d;
        })

        let t1=d3.transition().duration(500);
        let t2=d3.transition().duration(1300).delay(550);
        d3.selectAll('.sseq').select('.sseqtimebar_canvas').transition(t1).style('opacity',0);

        function move_erect(){

            d3.select('#sseq_canvas').selectAll('.sseq')
                .transition(t2)
                .attr('transform','translate(0,0)');

            d3.selectAll('.sseq_erect')
                .transition(t2)
                .attr('x',0)
                .attr('y',function(d){
                    let layer=d3.select(this.parentNode).data()[0][1];
                    let key=d.data.id+'('+Data.slotids[layer]+')';
                    return nodeDict[key].y;
                })
                .attr('width',main_width)
                .attr('height',5)
                .attr('eid',(d)=>d.data.id);
        }

        setTimeout(function(){
            move_erect();
            sum2sankey();
            d3.select('#sseq_canvas').transition(t2).style('opacity',0);
            d3.select('#sankey_canvas').transition(t2).style('opacity',1);
        },550);

        d3.select('#sankey_canvas').style('pointer-events','auto');
        d3.select('#sankey_canvas').raise();
        d3.select('#sseq_canvas').style('pointer-events','none');

        d3.select('#simseq_svg').attr('height',size[1]);}

    function sum2sankey(){
        let t=d3.transition().duration(1000);
        let nodeDict={}
        flowObj.nodes.forEach(function(d){
            nodeDict[d.name]=d;
        })

        d3.selectAll('.sankey_node')
            .each(function(d){
                let node_dat=d3.select(this).data()[0];
                let node_name;
                if(_.has(node_dat,'data')){
                    node_name=node_dat.data.id
                }else{
                    node_name=node_dat.name;
                }
                let sankey_dat=nodeDict[node_name];
                d3.select(this).datum(sankey_dat);
            });

        d3.selectAll('.sankey_node')
            .transition(t)
            .attr("transform",function(d){
                let xpos=d.x+padding_left;
                return "translate("+xpos+","+d.y+")";
            })

        d3.selectAll('.sankey_node')
            .select('.main_node')
            .classed('sum',false)
            .transition(t)
            .attr("height",function(d){return nodeHeight(d);})
            .attr("width",main_width)
            .attr("x",prop_width)
            .attr('y',0)
            .attr('eid',(d)=>nodeEvent(d));

        d3.select('#sankey_canvas').select('.sseqtimebar_canvas').remove();
        d3.select('#sankey_canvas').selectAll('.sseq_bgrect').remove();

        d3.selectAll('.g_links,.prop_rect,.pop_txt,.sankey_node_txt').transition(t).style('opacity',1)
            .style('pointer-event','auto');
    }

    function seq2sum(){
        let t=d3.transition().duration(1000);
        //relayout seq treemap nodes
        let treemap_nodes=getSseqTreemaps();
        treemapDict={}
        _.flatten(treemap_nodes).forEach(function(d){
            treemapDict[d.data.id]=d;
        })
        d3.select('#sseq_canvas').selectAll('.sseq')
            .transition(t)
            .attr('transform','translate(0,0)');

        d3.select('#sseq_canvas')
            .transition(t)
            .style('opacity',0);

        d3.select('#sseq_canvas').selectAll('.egroup_sseq')
            .selectAll('.sseq_erect')
            .each(function(d){
                let node_id=d.data.id+'('+d.data.data.layer+')';
                let treemap_dat=treemapDict[node_id];
                d3.select(this).datum(treemap_dat);
            })

        d3.selectAll('.sseq_erect')
            .classed('sum',true)
            .attr("x",function(d){return d.x0})
            .attr("y",function(d){return d.y0})
            .attr("width",function(d){return d.x1-d.x0})
            .attr("height",function(d){return d.y1-d.y0})
            .attr('eid',(d)=>treeEvent(d));

        d3.select('#sankey_canvas').style('pointer-events','auto');
        d3.select('#sankey_canvas').raise();
        d3.select('#sseq_canvas').style('pointer-events','none');

        sankey2sum();
        d3.select('#sankey_canvas')
            .transition(t.delay(500))
            .style('opacity',1);

        d3.select('#simseq_svg').attr('height',size[1]);}

    function sum2seq(){
        let t=d3.transition().duration(1000);
        sankey2seq();
    }

    function highlightPath(rlist){
        d3.selectAll(".sankey_node,.sankey_link").classed("highlight",function(d){
            var intersect = _.intersection(rlist, d.info["rlist"]);
            if (intersect.length > 0) {
                return true;
            } else {
                d3.select(this).classed("fade", true);
            }
        })}

    function clearHighlight(force){

        d3.selectAll(".sankey_node").attr("height",function(node){return Math.max(2,node.dy)});
        d3.select("#sankey_canvas").selectAll(".highlight").classed("highlight",false);
        d3.selectAll(".fade").classed("fade",false);
        if(!force&&Data.selectlist.length){
            return;
        }
        d3.selectAll(".select").classed("select",false);
        d3.selectAll(".unselect").classed("unselect",false);
        dispatch.call('updateSimlist',this,{});

        if(force==true&&Data.viewStatus!='overlay'){
            packSseq();
            diff=identifyAnomaly();
            updateDiff();
            updateColor(diff);
        }
    }

    function selectPath(rlist){
        if(!Data.selectlist.length){
            Data.selectlist=rlist;
        }else{
            Data.selectlist=_.intersection(rlist,Data.selectlist);
        }
        d3.selectAll(".sankey_node,.sankey_link").classed("select",function(d){
            let intersect=_.intersection(Data.selectlist,d.info["rlist"]);
            if(intersect.length>0){
                return true;
            }else{
                d3.select(this).classed("unselect",true);
            }
        })
        if(Data.viewStatus!='overlay'){
            packSseq();
            diff=identifyAnomaly();
            updateDiff();
            updateColor(diff);
        }
        dispatch.call('updateSimlist',this,{});
    }

    function moveCanvas(duration){
        dispatch.call('moveCanvas',this,duration);
    }

    function circleGlyph(selection){
        let circle_node=selection.selectAll("g")
            .data(function(d){return getCirclePack(d)},(d)=>d.data.id)
            .enter()
            .append("g")
                .attr("transform",function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});

        circle_node.filter(function(d){return d.data.type=="Labs"})
            .append("circle")
            .attr("id",function(d){return "node-"+d.id})
            .attr("r",function(d){return d.r;})
            .style('opacity',(d)=>colorScale(d.data.conf))
            .attr("class",function(d){return d.data.anomaly})
            .attr('eid',(d)=>d.data.event);

        circle_node.filter(function(d){return d.data.type=="Medications"})
            .append("polygon")
            .attr("id",function(d){return "node-"+d.id})
            .style('opacity',(d)=>colorScale(d.data.conf))
            .attr("points",function(d){
                // let offset=Math.sqrt(1/3)*d.r;
                let offset=d.r/2;
                let yoffset=Math.sqrt(3/4)*d.r;
                let poly=[{"x":-offset,"y":-yoffset},
                        {"x":offset,"y":-yoffset},
                        {"x":2*offset,"y":0},
                        {"x":offset,"y":yoffset},
                        {"x":-offset,"y":yoffset},
                        {"x":-2*offset,"y":0},
                        {"x":-offset,"y":-yoffset}];
                return poly.map(function(point){
                    return [point.x,point.y].join(",");
                }).join(" ");
            })
            .attr('eid',(d)=>d.data.event)
            .attr("class",function(d){return d.data.anomaly});

        circle_node.call(tip);

        var leaf = circle_node.filter(function(d) { return !d.children; });

        leaf.append("clipPath")
            .attr("id", function(d) { return "clip-" + d.id; })
            .append("use")
            .attr("xlink:href", function(d) { return "#node-" + d.id + ""; });
    }

    function updateCircleGlyph(selection){
        let t=d3.transition().duration(1000);
        selection.each(function(d,i){
            var circle_pack=d3.select(this).selectAll('.circle_pack')
                .data(function(d,i){
                    return getCirclePack(d,i);
                },(d)=>d.data.id);

            let circleEnter=circle_pack.enter()
                .append("g")
                .attr("transform",function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});

            circleEnter.filter(function(d){return d.data.type=="Labs"})
                .append("circle");

            circleEnter.filter(function(d){return d.data.type=="Medications"})
                .append("polygon");


            circle_pack.exit().remove();

            circle_pack.transition(t)
                .attr('transform',function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});
            })

        selection.selectAll('.circle_pack').filter(function(d){return d.data.type=="Labs"})
            .select("circle")
            .transition(t)
            .attr("id",function(d){return "node-"+d.id})
            .attr("class",function(d){return d.data.anomaly})
            .attr("r",function(d){return d.r;})
            .style('opacity',(d)=>colorScale(d.data.conf))
            .attr('eid',(d)=>d.data.event)

        selection.selectAll('.circle_pack').filter(function(d){return d.data.type=="Medications"})
            .select("polygon")
            .transition(t)
            .attr("id",function(d){return "node-"+d.id})
            .attr("class",function(d){return d.data.anomaly})
            .attr("points",function(d){
                // let offset=Math.sqrt(1/3)*d.r;
                let offset=d.r/2;
                let yoffset=Math.sqrt(3/4)*d.r;
                let poly=[{"x":-offset,"y":-yoffset},
                        {"x":offset,"y":-yoffset},
                        {"x":2*offset,"y":0},
                        {"x":offset,"y":yoffset},
                        {"x":-offset,"y":yoffset},
                        {"x":-2*offset,"y":0},
                        {"x":-offset,"y":-yoffset}];
                return poly.map(function(point){
                    return [point.x,point.y].join(",");
                }).join(" ");
            })
            .style('opacity',(d)=>colorScale(d.data.conf))
            .attr('eid',(d)=>d.data.event)

        selection.selectAll('.circle_pack').call(tip);

    }

    function updateSankeyColor(){
        d3.select('.g_nodes').selectAll('.sankey_node')
            .classed('less',function(d){
                let t=d.info.layer;
                let e=nodeEvent(d);
                let diff_event=_.unzip(diff[t]['less'])[0]
                return _.contains(diff_event,e);
            })
            .classed('more',function(d){
                let t=d.info.layer;
                let e=nodeEvent(d);
                let diff_event=_.unzip(diff[t]['more'])[0]
                return _.contains(diff_event,e);
            })

        d3.select('.g_links').selectAll('.sankey_link')
            .classed('less',function(d){
                let t=d.target.info.layer;
                let e=nodeEvent(d.target);
                let diff_event=_.unzip(diff[t]['less'])[0]
                return _.contains(diff_event,e);
            })
            .classed('more',function(d){
                let t=d.target.info.layer;
                let e=nodeEvent(d.target);
                let diff_event=_.unzip(diff[t]['more'])[0]
                return _.contains(diff_event,e);
            })}

    function updateSeqColor(){
        d3.select('.g_anomaly_nodes')
            .selectAll('.anomaly_nodes')
            .classed('less',function(d){
                let t=d.data.data.layer;
                let e=treeEvent(d);
                let diff_event=_.unzip(diff[t]['less'])[0]
                return _.contains(diff_event,e);
            })
            .classed('more',function(d){
                let t=d.data.data.layer;
                let e=treeEvent(d);
                let diff_event=_.unzip(diff[t]['more'])[0]
                return _.contains(diff_event,e);
            });
    }

    function updateDiffColor(){
        d3.select('#diff_canvas').selectAll('.diff_node')
            .select('.g_diffs')
            .selectAll('.node--leaf')
            .classed('less',(d)=>d.data.anomaly=='less')
            .classed('more',(d)=>d.data.anomaly=='more');}

    function updateSseqColor(){
        d3.selectAll('.sseq').selectAll('.egroup_sseq').selectAll('.sseq_erect')
            .classed('less',function(d){
                let t=d.data.data.layer;
                let e=d.data.data.id;
                let diff_event=_.unzip(diff[t]['less'])[0]
                return _.contains(diff_event,e);
            })
            .classed('more',function(d){
                let t=d.data.data.layer;
                let e=d.data.data.id;
                let diff_event=_.unzip(diff[t]['more'])[0]
                return _.contains(diff_event,e);
            });
    }

    function updateSumColor(){
        d3.select('#sankey_canvas').select('.g_nodes')
            .selectAll('.sankey_node')
            .classed('less',function(d){
                let t=d.data.data.layer;
                let e=treeEvent(d);
                let diff_event=_.unzip(diff[t]['less'])[0]
                return _.contains(diff_event,e);
            })
            .classed('more',function(d){
                let t=d.data.data.layer;
                let e=treeEvent(d);
                let diff_event=_.unzip(diff[t]['more'])[0]
                return _.contains(diff_event,e);
            });
    }

    function updateColor(){
        d3.selectAll('.less').classed('less',false);
        d3.selectAll('.more').classed('more',false);
        updateSankeyColor(diff);
        updateSeqColor(diff);
        if(Data.viewStatus=='seq') updateSseqColor(diff);
        if(Data.viewStatus=='sum') updateSumColor(diff);
        updateDiffColor(diff);
        dispatch.call('updateMeanSeqColor',this,diff);
    }

    function bindTooltips(){
        d3.selectAll('.main_node').on('mouseover',function(d){
            if(Data.viewStatus=='sankey'||'overlay'){
                tip.show(getSankeyTooltips(d));
                dispatch.call('markEvent',this,nodeEvent(d));
            }
            if(Data.viewStatus=='sum'){
                tip.show(getSumTooltips(d));
                dispatch.call('markEvent',this,treeEvent(d));
            }
        }).on('mouseout',function(d){
            tip.hide();
            dispatch.call('clearMark',this,{});
        })

        d3.selectAll('.sankey_timebar').on('mouseover',function(d){
            if(Data.viewStatus=='sankey'||'overlay'){
                tip.show(getSankeyLinkTooltips(d));
            }
        })
        .on('mouseout',function(d){
            tip.hide();
        })

        d3.selectAll('.anomaly_timebar').on('mouseover',function(d){
            if(Data.viewStatus=='sankey'||'overlay'){
                tip.show(getAnomalyLinkTooltips(d));
            }
        })
        .on('mouseout',function(d){
            tip.hide();
        })

        d3.selectAll('.g_diffs').selectAll('.node--leaf').on('mouseover',function(d){
            if(Data.viewStatus=='sankey'){
                if(!d.data.pid.length==1||!d.data.pid[0]==Data.abid){
                    highlightPath(d.data.pid);
                }
            }
            tip.show(getDiffTooltips(d));
            dispatch.call('markEvent',this,d.data.event);
        })
       .on('mouseout',function(d){
            if(Data.viewStatus=='sankey'){
                clearHighlight();
            }
            tip.hide();
            dispatch.call('clearMark',this,{});
        })

         d3.selectAll('.g_diffs').selectAll('.node--leaf').on('click',function(d){
            if(Data.viewStatus=='sankey'){
                if(_.intersection(Data.selectlist,d.data.pid).length==0){
                    Data.selectlist=[];
                    clearHighlight(true);
                }
                if(Data.viewStatus=='sankey'){
                    selectPath(d.data.pid);
                }
            }
        });

        d3.selectAll('.anomaly_main_node').on('mouseover',function(d){
            if(Data.viewStatus=='overlay'){
                tip.show(getAnomalyNodeTooltips(d));
                dispatch.call('markEvent',this,nodeEvent(d));
            }else{
                tip.show(getSeqTooltips(d));
                dispatch.call('markEvent',this,treeEvent(d));
            }
        })
        d3.selectAll('.anomaly_main_node').on('mouseout',function(d){
            tip.hide();
            dispatch.call('clearMark',this,{});
        })

        d3.selectAll('.egroup_sseq').selectAll('.sseq_erect').on('mouseover',function(d){
            tip.show(getSseqTooltips(d));
            dispatch.call('markEvent',this,treeEvent(d));
        })
        d3.selectAll('.egroup_sseq').selectAll('.sseq_erect').on('mouseout',function(d){
            tip.hide();
            dispatch.call('clearMark',this,{});
        })}

/*****************Data related functions***********/

    function computeFlow(data){

        var nodeMap = new Map();
        var linkMap = new Map();

        for(let pid in data){
            var seq_len=data[pid].length;
            data[pid].forEach(function(dat,t){
                var e_nums=dat['event'].length;
                dat['event'].forEach(function(eid,eindex){
                    var node_name=eid+"("+Data.slotids[t]+")"
                    var etime=dat['time'];
                    if(!nodeMap.has(node_name)){
                        nodeMap.set(node_name,{"rlist":[],"tlist":[],"props":[],"layer":t})
                    }
                    var node_info=nodeMap.get(node_name);
                    node_info["rlist"].push(pid);
                    node_info["tlist"].push(etime[eindex])
                    // node_info["ablist"].push(abevents[t][eindex])
                    node_info["props"].push(1/e_nums);
                    nodeMap.set(node_name,node_info);
                    if(t<seq_len-1){
                        var t_group=data[pid][t+1];
                        var t_e_num=t_group['event'].length;
                        link_value=1/(e_nums*t_e_num)
                        t_group['event'].forEach(function(etid,etindex){
                            var t_step=t+1;
                            var ettime=data[pid][t+1]['time'][etindex];
                            var t_node_name=etid+"("+Data.slotids[t_step]+")";
                            var linkkey=node_name+","+t_node_name;
                            if(!linkMap.has(linkkey)){
                                linkMap.set(linkkey,{"rlist":[],"tlist":[],"value":0})
                            }
                            var link_info=linkMap.get(linkkey)
                            link_info["rlist"].push(pid);
                            link_info["tlist"].push(ettime-etime[eindex]);
                            link_info["value"]+=link_value;
                            linkMap.set(linkkey,link_info);
                        })
                    }
                })
            })
        }

        var nodes=[],
            node_id=0;

        var nodeIter=nodeMap.keys();
        for(let node of nodeIter){
            node_obj={
                "node":node_id,
                "name":node,
                "info":nodeMap.get(node)
            };
            let layer=node_obj.info.layer;
            let event=parseInt(node.split("(")[0])
            if(_.contains(Data.sseq_diff[layer],event)){
                node_obj['anomaly']=1
            }else{
                node_obj['anomaly']=0
            }

            nodes.push(node_obj);
            node_id+=1;
        }

        var links=[];
        var linkIter=linkMap.keys();
        node_list=Array.from(nodeMap.keys());
        for(let link of linkIter){
            link_obj={
                "source":node_list.indexOf(link.split(",")[0]),
                "target":node_list.indexOf(link.split(",")[1]),
                "value":linkMap.get(link)["value"],
                "info":linkMap.get(link)
            }
            link_obj.info.rlist=_.uniq(link_obj.info.rlist);
            links.push(link_obj);
        }

        flowObj={
            "nodes":nodes,
            "links":links,
            "layer_node":_.groupBy(nodes,function(node){return node.info.layer;})
        };

        Data.flowObj=flowObj;
        return flowObj;
    }

    function filterFlow(){
        let nodes=Data.flowObj["nodes"];
        let links=Data.flowObj["links"];
        if(links.length>0){
            var source=links[0].source;
            if(typeof source==="number"){
                let sankey=d3.sankey();
                sankey.nodes(nodes)
                    .links(links)
                    .computeNodeLinks();
            }
        }
        let anomaly_nodes;
        if(Data.viewStatus=='overlay'){
            anomaly_nodes=_.filter(nodes,function(d){return _.contains(d.info.rlist,Data.abid)})
        }else{
            anomaly_nodes=_.filter(nodes,function(d){
                let layer=d.info.layer;
                let evt=nodeEvent(d);
                let diff_events=_.unzip(diff[layer]['more'].concat(diff[layer]['less']))[0];
                return _.contains(diff_events,evt);
            })
        }
        let updated_nodes=_.filter(nodes,function(d){return d.info.rlist.length>=Data.minNode||_.contains(anomaly_nodes,d);});
        let updated_links=_.filter(links,function(d){return _.contains(updated_nodes.map(x=>x.node),d.source.node)
                                                            &&_.contains(updated_nodes.map(x=>x.node),d.target.node)});

        flowUpdate={"nodes":updated_nodes,"links":updated_links};
        return flowUpdate;
    }

    function getSeqTreemaps(){
        let treemap_nodes=[]
        seq.forEach(function(dat,t){
            event=dat['event']
            time=dat['time']
            freq=dat['freq']
            treemap=[{"id":"root"}]
            _.zip(event,time,freq).forEach(function(d){
                obj={
                    "id":d[0].toString()+"("+Data.slotids[t]+")",
                    "parentId":"root",
                    // "size":d[2],
                    "size":1,
                    "time":d[1],
                    "layer":t
                }
                treemap.push(obj);
            })
            let vData=d3.stratify()(treemap);
            let vLayout=d3.treemap().size(Data.treeSize).paddingOuter(1);
            let vRoot=d3.hierarchy(vData).sum(function(d){return d.data.size;});
            let vNodes=vRoot.descendants();
            vLayout(vRoot);
            treemap_nodes.push(vNodes[0].children);
        })
        return treemap_nodes;
    }

    function getSseqTreemaps(){
        let treemap_nodes=[]
        sseq_pack.forEach(function(dat,t){
            let event=dat['event']
            let freq=dat['freq']
            let size=dat['size']
            let pids=dat['pids']
            let treemap=[{"id":"root"}]
            let node_names=_.map(flowUpdate.nodes,(d)=>d.name);
            event.forEach(function(d,idx){
                let obj={
                    "id":d.toString()+"("+Data.slotids[t]+")",
                    "parentId":"root",
                    // "size":size[idx],
                    "size":1,
                    'freq':freq[idx],
                    'pids':pids[idx],
                    "layer":t
                }
                if(_.contains(node_names,obj.id)){
                    treemap.push(obj);
                }
            })
            let vData=d3.stratify()(treemap);
            let vLayout=d3.treemap().size(Data.treeSize).paddingOuter(1);
            let vRoot=d3.hierarchy(vData).sum(function(d){return d.data.size;});
            let vNodes=vRoot.descendants();
            vLayout(vRoot);
            treemap_nodes.push(vNodes[0].children);
        })
        return treemap_nodes;
    }

    function getTreemap(egroup,t){
        treemap=[{"id":"root"}]
        egroup['event'].forEach(function(d,idx){
            obj={
                'id':d,
                'parentId':"root",
                // 'size':egroup['freq'][idx],
                "size":1,
                'time':egroup['time'][idx],
                'layer':t
            }
            treemap.push(obj);
        })
        let vData=d3.stratify()(treemap);
        let vLayout=d3.treemap().size(Data.treeSize).paddingOuter(1);
        let vRoot=d3.hierarchy(vData).sum(function(d){return d.data.size;});
        let vNodes=vRoot.descendants();
        vLayout(vRoot);
        return vNodes[0].children;
    }

    function packSseq(){
        let selectids;
        if(Data.selectlist.length>0){
            selectids=Data.selectlist;
        }else{
            selectids=Data.alllist;
        }
        pack=new Array(seq.length).fill(0).map(x=>[])//[pid, event,population,fequency]

        selectids.forEach(function(pid){
            sseq[pid].forEach(function(dat,t){
                egroup=dat['event']
                freqs=dat['freq']
                egroup.forEach(function(e,index){
                    pack[t].push([pid,e,1,freqs[index]]);
                })
            })
        })
        
        sseq_pack=[]
        event_conf=[]
        pack.forEach(function(t_result,idx){
            group_result=[]
            let egroup=_.groupBy(t_result,function(d){return d[1]});
            for(let e in egroup){
                rlist=egroup[e];
                total_size=d3.sum(rlist,function(d){return d[2]});
                avg_freq=d3.sum(rlist,function(d){return d[3]})/rlist.length;
                pid_list=_.map(rlist,function(d){return d[0]});
                group_result.push([pid_list,e,total_size,avg_freq]);
            }
            unzip=_.unzip(group_result);
            sseq_pack.push({'event':unzip[1].map(x=>parseInt(x)),
                                'pids':unzip[0],
                                'size':unzip[2],
                                'freq':unzip[3],
                                'id':Data.slotids[idx],
                                'conf':unzip[0].map(function(x){
                                    if(Data.selectlist.length>0){
                                        return _.uniq(x).length/Data.selectlist.length
                                    }else{
                                        return _.uniq(x).length/Data.simnum;
                                    }
                                })
                            })
            event_conf.push({'event':unzip[1].map(x=>parseInt(x)),
                            'conf':unzip[0].map(function(x){
                                    if(Data.selectlist.length>0){
                                        return _.uniq(x).length/Data.selectlist.length
                                    }else{
                                        return _.uniq(x).length/Data.simnum;
                                    }
                                }),
                            'pids':_.uniq(unzip[0])});
        })

        return sseq_pack;}

    function identifyAnomaly(){
        let anomaly_more=[];
        let anomaly_less=[];
        seq.forEach(function(d,t){
            let props=_.object(Data.meanseqStage[t]['event'],Data.meanseqStage[t]['prop']);
            let confs=_.object(event_conf[t]['event'],event_conf[t]['conf']);
            let event_pid=_.object(event_conf[t]['event'],event_conf[t]['pids']);
            let events=d['event'];
            let more=[];//[event,population,anomaly_score]
            events.forEach(function(e){
                let cond1=!_.contains(event_conf[t]['event'],e);
                let cond2=(1-props[e])>Data.prop_range;
                let cond3=(1-confs[e])>Data.conf;
                if(cond1||(cond2&&cond3)){
                    let population;
                    if(_.contains(event_conf[t]['event'],e)){
                        population=event_pid[e].length+1;
                    }else{
                        population=1
                    }
                    if(!cond1){
                        more.push([e,population,1-props[e],1-confs[e],event_pid[e]]);
                    }else{
                        more.push([e,population,1-props[e],1,[Data.abid]]);
                    }
                }
            })
            anomaly_more.push(more);
        })
        sseq_pack.forEach(function(d,t){
            let props=_.object(Data.meanseqStage[t]['event'],Data.meanseqStage[t]['prop']);
            let confs=_.object(event_conf[t]['event'],event_conf[t]['conf']);
            let events=d['event'];
            let pids=d['pids'];
            let less=[];
            events.forEach(function(e,i){
                let cond1=!_.contains(seq[t]['event'],e);
                let cond2=props[e]>Data.prop_range;
                let cond3=confs[e]>Data.conf;
                // if((cond1&&cond3)||(cond1&&cond2)){
                if(cond1&&cond2&&cond3){
                    let population=pids[i].length;
                    less.push([e,population,props[e],confs[e],pids[i]]);
                }
            })
            anomaly_less.push(less);
        })

        let diff=[]
        anomaly_more.forEach(function(dat,idx){
            let less=anomaly_less[idx];
            let score_sum=d3.sum(dat,(d)=>d[2])+d3.sum(less,(d)=>d[2]);
            let pop_sum=d3.sum(dat,(d)=>d[1])+d3.sum(less,(d)=>d[1]);
            diff.push({'more':dat,'less':less,'score_sum':score_sum,'pop_sum':pop_sum});
        })

        diffCircleScale.domain(d3.extent(_.filter(diff,function(d){return d.score_sum>0}),(d)=>d.score_sum))
            .range([minDiffCircle,maxDiffCircle]);

        // popCircleScale.domain([0,d3.max(diff,(d)=>d.pop_sum)])
        //     .range([minDiffCircle,maxDiffCircle]);

        // let scales=_.map(diff,function(d){return diffCircleScale(d.score_sum)-popCircleScale(d.pop_sum)});
        // if(d3.min(scales)<0){
        //     let min_idx=_.indexOf(scales,d3.min(scales));
        //     let transform_scales=_.map(diff,function(d){return diffCircleScale(d.score_sum)/popCircleScale(d.pop_sum)});
        //     let minScale=d3.min(transform_scales);
        //     popCircleScale
        //         .range([minDiffCircle*minScale,maxDiffCircle*minScale]);
        // }
        // let diffCircleR=_.map(diff,function(d){return diffCircleScale(d.score_sum)});
        // let popCircleR=_.map(diff,function(d){return popCircleScale(d.pop_sum)})

        let confs=_.flatten(_.map(diff,function(d){return _.unzip(d['more'].concat(d['less']))[3]}));
        colorScale.domain(d3.extent(confs));

        return diff;
    }

    function nodeHeight(d){
        return d.dy;
    }

    function nodeEvent(d){
        return parseInt(d.name.split('(')[0]);
    }

    function treeEvent(d){
        return parseInt(d.data.id.split('(')[0]);
    }

    function getCirclePack(dat){
        let result=[{"id":"root","type":"root"}]
        dat['more'].forEach(function(d,i){
            let event=d[0];
            let population=d[1];
            let score=d[2];
            let conf=d[3];
            let pid=d[4];
            obj={
                "id":"root."+event,
                "event":event,
                // "value":population,
                "population":population,
                "value":score,
                "score":score,
                'anomaly':'more',
                "type":Data.idx2type[event],
                'conf':conf,
                "pid":pid
            }
            result.push(obj);
        })

        dat['less'].forEach(function(d,i){
            let event=d[0];
            let population=d[1];
            let score=d[2];
            let conf=d[3];
            let pid=d[4];
            obj={
                "id":"root."+event,
                "event":event,
                // "value":population,
                "population":population,
                "value":score,
                "score":score,
                'anomaly':'less',
                "type":Data.idx2type[event],
                "conf":conf,
                "pid":pid
            }
            result.push(obj);
        })

        var stratify = d3.stratify()
            .parentId(function(d) { return d.id.substring(0, d.id.lastIndexOf(".")); });

        var root=stratify(result)
            .sum(function(d){return d.value;})
            .sort(function(a,b){return b.value-a.value});

        let packSize=diffCircleScale(dat.score_sum)*2;

        var pack=d3.pack()
            .size([packSize,packSize])
            .padding(1);

        pack(root);

        return root.descendants();
    }

    function packSeqDatStage(){
        let result=[]
        stage.forEach(function(d,i){
            let start_idx,end_idx;
            if(i==0){
                start_idx=0;
            }else{
                start_idx=stage[i-1];
            }
            end_idx=d-1;
            let event_tmp=[]
            let freq_tmp=[]
            let time_tmp=[]
            for(let idx=start_idx;idx<=end_idx;idx++){
                let event=Data.seqs[idx]['event']
                let time=Data.seqs[idx]['time']
                let freq=Data.seqs[idx]['freq']
                if(Data.stage_expand[i]==1){
                    result.push(Data.seqs[idx]);
                }else{
                    event_tmp.push(event)
                    time_tmp.push(time)
                    if(freq.length){
                        freq_tmp.push(freq)
                    }
                }
            }
            if(event_tmp.length>0){
                let event_result=[]
                let time_result=[]
                let freq_result=[]

                let event_all=_.flatten(event_tmp);
                let time_all=_.flatten(time_tmp);
                let freq_all=_.flatten(freq_tmp);
                let zip_dat=_.zip(event_all,time_all,freq_all);
                let group_dat=_.groupBy(zip_dat,function(d){return d[0]});
                for(let e in group_dat){
                    event_result.push(parseInt(e));
                    time_result.push(d3.sum(group_dat[e],(d)=>d[1])/group_dat[e].length)
                    freq_result.push(d3.sum(group_dat[e],(d)=>d[2]));
                }
                result.push({'event':event_result,'time':time_result,'freq':freq_result});
            }
        })
        return result;
    }

    function packSseqDatStage(){
        let result={}
        for(let pid in Data.sseq){
            let seq_result=[]
            stage.forEach(function(d,i){
                let start_idx,end_idx;
                if(i==0){
                    start_idx=0;
                }else{
                    start_idx=stage[i-1];
                }
                end_idx=d-1;
                let event_tmp=[]
                let freq_tmp=[]
                let time_tmp=[]
                for(let idx=start_idx;idx<=end_idx;idx++){
                    let event=Data.sseq[pid][idx]['event']
                    let time=Data.sseq[pid][idx]['time']
                    let freq=Data.sseq[pid][idx]['freq']
                    if(Data.stage_expand[i]==1){
                        seq_result.push(Data.sseq[pid][idx]);
                    }else{
                        event_tmp.push(event)
                        time_tmp.push(time)
                        if(freq.length){
                            freq_tmp.push(freq)
                        }
                    }
                }
                if(event_tmp.length>0){
                    let event_result=[]
                    let time_result=[]
                    let freq_result=[]

                    let event_all=_.flatten(event_tmp);
                    let time_all=_.flatten(time_tmp);
                    let freq_all=_.flatten(freq_tmp);
                    let zip_dat=_.zip(event_all,time_all,freq_all);
                    let group_dat=_.groupBy(zip_dat,function(d){return d[0]});
                    for(let e in group_dat){
                        event_result.push(parseInt(e));
                        time_result.push(d3.sum(group_dat[e],(d)=>d[1])/group_dat[e].length)
                        freq_result.push(d3.sum(group_dat[e],(d)=>d[2]));
                    }
                    seq_result.push({'event':event_result,'time':time_result,'freq':freq_result});
                }
            })
            result[pid]=seq_result;
        }
        return result;
    }

    function getSankeyTooltips(d){
        obj={}
        obj['Event_Name']=Data.idx2label[nodeEvent(d)];
        obj['Event_Type']=Data.idx2type[nodeEvent(d)];
        obj['Population']=d.info.rlist.length;
        obj['Records']=percentFormat(d.info.rlist.length/Data.simnum);
        // obj['Value']=percentFormat(d3.sum(d.info.props)/Data.simnum);
        return Util.getTooltipHtml(obj);
    }

    function getDiffTooltips(d){
        obj={}
        obj['Event_Name']=Data.idx2label[d.data.event]
        obj['Event_Type']=d.data.type;
        obj['Anomaly_Score']=scoreFormat(d.data.score);
        obj['Population']=d.data.population;
        obj['Support']=percentFormat(d.data.conf);
        return Util.getTooltipHtml(obj);
    }

    function getSumTooltips(d){
        obj={}
        obj['Event_Name']=Data.idx2label[treeEvent(d)];
        obj['Average_Freq']=popFormat(d.data.data.freq);
        obj['Population']=d.value;
        return Util.getTooltipHtml(obj);
    }

    function getSseqTooltips(d){
        obj={}
        obj['Event_Name']=Data.idx2label[treeEvent(d)];
        obj['Event_Type']=Data.idx2type[treeEvent(d)];
        obj['Time']=Util.unix2Date(d.data.data.time);
        obj['Frequency']=d.data.data.size;
        return Util.getTooltipHtml(obj);
    }

    function getSeqTooltips(d){
        obj={}
        obj['Event_Name']=Data.idx2label[treeEvent(d)];
        obj['Event_Type']=Data.idx2type[treeEvent(d)];
        obj['Time']=Util.unix2Date(d.data.data.time);
        obj['Frequency']=d.data.data.size;
        return Util.getTooltipHtml(obj);
    }

    function getSankeyLinkTooltips(d){
        obj={}
        obj['Source_Event']=Data.idx2label[nodeEvent(d.source)];
        obj['Target_Event']=Data.idx2label[nodeEvent(d.target)];
        obj['Population']=d.info.rlist.length;
        obj['Average Duration']=timeFormat(Util.second2Days((d3.sum(d.info.tlist)/d.info.tlist.length)))+" Days";
        return Util.getTooltipHtml(obj);
    }

    function getAnomalyNodeTooltips(d){
        obj={}
        obj['Event_Name']=Data.idx2label[nodeEvent(d)];
        obj['Event_Type']=Data.idx2type[nodeEvent(d)];
        obj['Population']=1;
        obj['Propotion']=percentFormat(1/Data.simnum);
        return Util.getTooltipHtml(obj);
    }

    function getAnomalyLinkTooltips(d){
        obj={}
        obj['Source_Event']=Data.idx2label[nodeEvent(d.source)];
        obj['Target_Event']=Data.idx2label[nodeEvent(d.target)];
        obj['Population']=1;
        abidx=_.indexOf(d.info.rlist,Data.abid);
        obj['Duration']=timeFormat(Util.second2Days((d.info.tlist[abidx])))+" Days";
        return Util.getTooltipHtml(obj);
    }
    return simsankey;
};
