Vis.focal = function() {

    var focal = {},
        container = null,
        seq = null,
        sseq=null,
        stage=null,
        diff = null,
        size_svg=[],
        size = [960, 800],
        margin = { left: 0, top: 30, right: 5, bottom: 10 },
        dispatch = d3.dispatch("updateScroll","moveSankey","updateStage");

    let padding_left=10,
        padding_right=10,
        padding_top=3;

    //element attributes
    let min_barlen=5,
        erect_size=[35,24],
        etree_size=[35,24],
        seq_bar_height=3,
        link_bar_width=5,
        circlepack_size=35,
        diff_bar_width=15,
        minCircleSize=5,
        maxCircleSize=35,
        minBarWidth=diff_bar_width,
        maxBarWidth=Data.layer_gap-50,
        treemap_size=[35,24],
        stage_circle_r=4,
        transformR=1;

    let image_size=7;

    //space attributes
    var canvas_width;

    //scales
    let timeScale=d3.scaleLog(),
        scrollScale=d3.scaleLinear(),
        diffScale=d3.scaleLinear(),
        circleSeqScale=d3.scaleSqrt(),
        circleSseqScale=d3.scaleSqrt(),
        circleScale=d3.scaleSqrt(),
        freqScale=d3.scaleLinear().range([minBarWidth,maxBarWidth]);

    let timeFormat=d3.format(".1r");

    //reformed data
    var time_diff=[],
        slots,
        seq_coords=[],
        sseq_coords=[],
        middle_coords=[];

    var line=d3.line()
            .x(function(d){return d.x})
            .y(function(d){return d.y})
            .curve(d3.curveMonotoneX);

    // tip
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .html(function(d) {
            return d;
        });

    focal.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return focal;
    };

    focal.seq = function(_) {
        if (!arguments.length) return seq;
        seq = _;
        return focal;
    };

    focal.stage = function(_) {
        if (!arguments.length) return stage;
        stage = _;
        return focal;
    };

    focal.sseq = function(_) {
        if (!arguments.length) return sseq;
        sseq = _;
        return focal;
    };

    focal.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return focal;
    };

    focal.size_svg = function(_) {
        if (!arguments.length) return size_svg;
        size_svg = _;
        return focal;
    };

    focal.diff = function(_){
        if (!arguments.length) return diff;
        diff = _;
        return focal;
    }

    focal.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return focal;
    };

    focal.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    focal.layout = function() {

        this.size_svg([$("#focal_svg").width()-margin.left-margin.right,
                    $("#focal_svg").height()-margin.top-margin.bottom]);

        this.size([size_svg[0],size_svg[1]/3]);

        let tmp_dis;

        if(seq[seq.length-1]['event'].length>1){
            tmp_dis=(size[0]-padding_left-padding_right-etree_size[0])/(seq.length-1);
        }else{
            tmp_dis=(size[0]-padding_left-padding_right-erect_size[0])/(seq.length-1);
        }

        if(tmp_dis>Data.layer_gap){
            Data.layer_gap=tmp_dis;
            canvas_width=size[0];
        }else{
            if(seq[seq.length-1]['event'].length>1){
                canvas_width=(seq.length-1)*Data.layer_gap+etree_size[0];
            }else{
                canvas_width=(seq.length-1)*Data.layer_gap+erect_size[0];
            }
        }

        Data.canvas_width=canvas_width;

        return focal;
    };

    focal.render = function() {

        if (!container) {
            return;
        }

        return focal.update();
    };

    focal.update = function() {

        // d3.selectAll('.erect')
        //     .call(tip);

        // d3.selectAll('.erect')
        //     .on('mouseover',function(d){
        //         tip.show(Data.idx2label[d.data.data.id]);
        //     })
        //     .on('mouseout',function(d){
        //         tip.hide();
        //     })

        d3.selectAll(".stage_bar")
            .on("mouseover",function(d){
                d3.select(this).select('.stage_line').classed('highlight',true);})
            .on("mouseout",function(d){
                d3.select(this).select('.stage_line').classed('highlight',false);})
            .on("click",function(d){
                if(Data.stage_expand[d[0]]==1){
                    Data.stage_expand[d[0]]=0;
                }else{
                    Data.stage_expand[d[0]]=1;
                }
                dispatch.call("updateStage",this,{});
            })

        return focal;
    };

    focal.init = function(){

        dispatch.call('updateScroll',this,size[0]/canvas_width);

        // calCommon(seq,sseq);

        // drawSlotNum();
        // drawStageBar();

        // calLineCoords();

        // drawSeq();
        // drawSseq();
        // drawDiffBar();

        return focal.update();
    }

    focal.moveCanvas=function(){
        //move canvas
        xoffset=-(canvas_width-size[0]+padding_right)
        d3.selectAll('.canvas').attr("transform",function(){
            let t=Util.getTranslate(d3.select(this).attr("transform")),
                xpos=xoffset,
                ypos=t[1];
                return "translate("+xoffset+","+ypos+")";
            })

        scrollScale.range([padding_left,xoffset]);
    }

    focal.packdiff=function(d){
        if(d){
            d3.selectAll('.bargroup').call(groupDiffCircle);
        }else{
            d3.selectAll('.bargroup').call(expandDiffCircle);
        }
    }

    focal.updateStage=function(){

        updateStageDat();

        updateSeqDat();
        updateSseqDat();

        focal.layout();

        calCommon(seq,sseq);

        calLineCoords();

        updateSeq();
        // updateSseq();
        // updateDiffbar();

        // updateStageBar();
    }

/***************v1 functions**************/
    function dataPreprocess(){
        //map arr idx to slot id(in case there is stage collapse)
        seq_final=[]
        seq["event"].forEach(function(e,i){
            let events=_.uniq(e);
            let efreq=events.map(x=>_.filter(e,function(d){return d==x}).length);
            let etime=events.map(x=>_.object(e,seq['time'][i])[x])
            let esize=events.map(x=>1)
            seq_final.push({'event':events,'time':etime,'freq':efreq,'size':esize,'id':Data.slotids[i]});
        })
        focal.seq(seq_final)
        let slots=seq.length;

        //pack sseq
        result=new Array(slots).fill(0).map(x=>[])//[pid, event,population,fequency]
        for(let pid in sseq){
            events=sseq[pid]['a_event']
            freqs=sseq[pid]['a_freq']
            events.forEach(function(egroup,t){
                egroup.forEach(function(e,index){
                    result[t].push([pid,e,1,freqs[t][index]]);
                })
            })
        }
        result_final=[]
        result.forEach(function(t_result,idx){
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
            result_final.push({'event':unzip[1].map(x=>parseInt(x)),
                                'pids':unzip[0],
                                'size':unzip[2],
                                'freq':unzip[3],
                                'id':Data.slotids[idx]})
        })
        focal.sseq(result_final);
    }

    function drawSlotNum(){
        //draw slot num
        let slot_num=container.append("g")
            .attr("id","slot_num")
            .attr("class","canvas")
            .attr('transform',function(){
                xoffset=-(canvas_width-size[0]+padding_right)
                ypos=margin.top-5;
                return 'translate('+xoffset+','+ypos+')';
            })

        slot_num.selectAll(".slotnum_txt")
            .data(d3.range(seq.length).map(x=>"#"+x),(d)=>d)
            .enter()
            .append("text")
            .attr("class","slotnum_txt")
            .attr("x",function(d,i){return i*Data.layer_gap+circlepack_size/2+padding_left})
            .text(function(d){return d});}

    function drawStageBar(){
        let stage_length=_.map(stage,function(x,i){return i==0?x:x-stage[i-1]});
        let stage_id=_.map(stage,function(x,i){return i});

        let stage_canvas=container.append("g")
            .attr("id","stage_canvas")
            .attr("class","canvas")
            .attr("transform",function(){
                xoffset=-(canvas_width-size[0]+padding_right)
                ypos=margin.top+2*stage_circle_r;
                return 'translate('+xoffset+','+ypos+')';
            })

        let stage_bars=stage_canvas.selectAll(".stage_bar")
            .data(_.zip(stage_id,stage,stage_length),(d)=>d[0])
            .enter()
            .append("g")
            .attr("class","stage_bar")
            .attr("transform",function(d,i){
                let xpos;
                if(i==0){
                    xpos=0;
                }else{
                    xpos=stage[i-1]*Data.layer_gap+padding_left;
                }
                return "translate("+xpos+",0)";
            })

        stage_bars.append("rect")
            .attr("y",-7.5)
            .attr("width",function(d){return (d[2]-1)*Data.layer_gap+circlepack_size})
            .attr("height",15)
            .attr("class","stage_line_bg")
            .attr("fill",'white');

        stage_bars.append("line")
            .attr("x1",0)
            .attr("x2",(d)=>(d[2]-1)*Data.layer_gap+circlepack_size)
            .attr("class","stage_line expand");}

    function calLineCoords(){
        seq_coords=[];
        seq.forEach(function(slot,i){
            let x_coord_1=padding_left+i*Data.layer_gap,
                y_coord_1=size_svg[1]/2-diff[i]['distance']/2 - circlepack_size/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;

            seq_coords.push({'x':(x_coord_1+x_coord_2)/2,"y":y_coord_1});
        })

        middle_coords=[];
        seq.forEach(function(slot,i){
            let x_coord_1=padding_left+i*Data.layer_gap,
                y_coord_1=size_svg[1]/2-diff[i]['distance']/2+d3.sum(diff[i]['seq_diff']['size'])+1.5,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;

            middle_coords.push({'x':(x_coord_1+x_coord_2)/2,"y":y_coord_1})
        })


        sseq_coords=[];
        seq.forEach(function(slot,i){
            let x_coord_1=padding_left+i*Data.layer_gap,
                y_coord_1=size_svg[1]/2+diff[i]['distance']/2+circlepack_size/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;

            sseq_coords.push({'x':(x_coord_1+x_coord_2)/2,"y":y_coord_1});
        })
    }

    function drawSeq(){

        // circleScale=circleSeqScale;
        let canvas=container.append("g")
            .attr("transform",function(){
                xpos=margin.left;
                ypos=margin.top;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("id","seq_canvas")
            .attr("class","canvas");

        //draw seq bg
        let upper_coords=_.map(seq_coords,function(d){return {'x':d.x ,'y':d.y-circlepack_size/2-1.5}});
        let upper_path=line(upper_coords);
        let lower_path=line(middle_coords.slice().reverse());

        seq_bg_path=upper_path+'L'+_.last(middle_coords).x+','+_.last(middle_coords).y
            +lower_path+'L'+upper_coords[0].x+','+upper_coords[0].y;

        canvas.append('path')
            .attr('d',seq_bg_path)
            .attr('id','seq_bg_path')
            .attr('fill','red')
            .attr('fill-opacity','0.1');

        //draw links
        let links=canvas.append('path')
            .datum(seq_coords)
            .attr('class','event_link')
            .attr('d',line);

        //add event
        let egroup = canvas.selectAll(".egroup")
            .data(seq,(d)=>d.id)
            .enter()
            .append("g")
            .attr("class","egroup_g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos=size_svg[1]/2-diff[i]['distance']/2 - circlepack_size;
                return "translate("+xpos+","+ypos+")";
            });

        egroup.append("circle")
            .attr("cx",circlepack_size/2)
            .attr("cy",circlepack_size/2)
            .attr("r",circlepack_size/2+1)
            .attr("class","border_circle");

        egroup.append("g")
            .attr("transform",function(d){
                let xpos=circlepack_size/2-d['packSize']/2;
                let ypos=circlepack_size/2-d['packSize']/2;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","egroup seq")
            .call(circleGlyph);}

    function updateSeq(){
        let t=d3.transition().duration(1000);
        circleScale=circleSeqScale;
        //update bg link
        let coords=[]
        seq.forEach(function(slot,i){
            let x_coord_1=padding_left+i*Data.layer_gap,
                y_coord_1=size_svg[1]/2-slot['distance']/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;

            coords.push({'x':(x_coord_1+x_coord_2)/2,"y":y_coord_1});
        })
        d3.select("#seq_canvas").select(".event_link")
            .datum(coords)
            .attr("d",line);
        //update event
        let egroup=d3.select('#seq_canvas').selectAll('.egroup_g')
            .data(seq,(d)=>d.id);

        let egroupEnter=egroup.enter()
            .insert("g")
            .attr("class","egroup_g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos=size_svg[1]/2- d['distance']/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            });

        egroupEnter.append("circle")
            .attr("cx",circlepack_size/2)
            .attr("cy",circlepack_size/2)
            .attr("r",circlepack_size/2+1)
            .attr("class","border_circle");

        egroupEnter.append("g")
            .attr("transform",function(d){
                let xpos=circlepack_size/2-d['circle_size']/2;
                let ypos=circlepack_size/2-d['circle_size']/2;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","egroup seq");

        egroup.exit().remove();

        d3.select("#seq_canvas").selectAll(".egroup_g")
            .transition(t)
            .attr("transform",function(d,i){
                let idx=_.indexOf(Data.slotids,d.id);
                let xpos=padding_left+idx*Data.layer_gap;
                let ypos=size_svg[1]/2- d['distance']/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            });

        d3.selectAll('.egroup.seq').call(updateCircleGlyph);}

    function drawSseq(){
        let canvas=container.append("g")
            .attr("transform",function(){
                xpos=margin.left;
                ypos=margin.top;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("id","sseq_canvas")
            .attr("class","canvas");

        //draw sseq bg
        let lower_coords=_.map(sseq_coords,function(d){return {'x':d.x,'y':d.y+circlepack_size/2+1.5}})
        let upper_path=line(middle_coords);
        let lower_path=line(lower_coords.slice().reverse());

        sseq_bg_path=upper_path+'L'+_.last(lower_coords).x+','+_.last(lower_coords).y
            +lower_path+'L'+middle_coords[0].x+','+middle_coords[0].y;

        canvas.append('path')
            .attr('d',sseq_bg_path)
            .attr('fill','blue')
            .attr('fill-opacity','0.1');

        //draw links
        let links=canvas.append('path')
            .datum(sseq_coords)
            .attr('class','event_link')
            .attr('d',line);

        //add event
        let egroup = canvas.selectAll(".egroup")
            .data(sseq,(d)=>d.id)
            .enter()
            .append("g")
            .attr("class","egroup_g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos=size_svg[1]/2+diff[i]['distance']/2;
                return "translate("+xpos+","+ypos+")";
            });

        egroup.append("circle")
            .attr("cx",circlepack_size/2)
            .attr("cy",circlepack_size/2)
            .attr("r",circlepack_size/2+1)
            .attr("class","border_circle");

        egroup.append("g")
            .attr("transform",function(d){
                let xpos=circlepack_size/2-d['packSize']/2;
                let ypos=circlepack_size/2-d['packSize']/2;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","egroup sseq")
            .call(circleGlyph);}

    function updateSseq(){
        let t=d3.transition().duration(1000);
        circleScale=circleSseqScale;
        //update bg link
        let coords=[]
        seq.forEach(function(slot,i){
            let x_coord_1=padding_left+i*Data.layer_gap,
                y_coord_1=size_svg[1]/2+slot['distance']/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;

            coords.push({'x':(x_coord_1+x_coord_2)/2,"y":y_coord_1});
        })
        d3.select("#sseq_canvas").select(".event_link")
            .datum(coords)
            .attr("d",line);
        //update event
        let egroup=d3.select('#sseq_canvas').selectAll('.egroup_g')
            .data(sseq,(d)=>d.id);

        let egroupEnter=egroup.enter()
            .insert("g")
            .attr("class","egroup_g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos=size_svg[1]/2+diffScale(d['anomaly_sum'])/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            });

        egroupEnter.append("circle")
            .attr("cx",circlepack_size/2)
            .attr("cy",circlepack_size/2)
            .attr("r",circlepack_size/2+1)
            .attr("class","border_circle");

        egroupEnter.append("g")
            .attr("transform",function(d){
                let xpos=circlepack_size/2-circleScale(d3.sum(d['freq']))/2;
                let ypos=circlepack_size/2-circleScale(d3.sum(d['freq']))/2;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","egroup sseq");

        egroup.exit().remove();

        d3.select("#sseq_canvas").selectAll(".egroup_g")
            .transition(t)
            .attr("transform",function(d,i){
                let idx=_.indexOf(Data.slotids,d.id);
                let xpos=padding_left+idx*Data.layer_gap;
                let ypos=size_svg[1]/2+diffScale(d['anomaly_sum'])/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            });

        d3.selectAll('.egroup.sseq').call(updateCircleGlyph);}

    function drawCommon(){
        let canvas=container.append("g")
            .attr("transform",function(){
                xpos=margin.left;
                ypos=margin.top+size[1];
                return "translate("+xpos+","+ypos+")";
            })
            .attr("id","comm_canvas");

        //common rect bg
        canvas.append('rect')
            .attr('class','bg')
            .attr('width',canvas_width)
            .attr('height',size[1]);

        canvas.append("rect")
            .attr("x",padding_left)
            .attr("y",(size[1]-seq_bar_height)/2)
            .attr("width",canvas_width)
            .attr("height",seq_bar_height)
            .attr("id","seq_bar");

        let com_group=canvas.selectAll(".com_group")
            .data(diff['com'])
            .enter()
            .append("g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos;
                if(_.uniq(d['event']).length>1){
                    ypos=(size[1]-etree_size[1])/2
                }else{
                    ypos=(size[1]-erect_size[1])/2
                }
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class",function(d){
                if(_.uniq(d['event']).length>1){
                    return "egroup treemap"
                }else if(d['event'].length==0){
                    return "egroup rect empty"
                }else{
                    return "egroup rect"
                }
            })

        canvas.selectAll(".egroup.rect")
            .append("rect")
            .attr("width",erect_size[0])
            .attr("height",erect_size[1])
            .attr('class','erect');

        let treeSlice=canvas.selectAll(".egroup.treemap")
            .selectAll("rect")
            .data(function(d){return drawTreemap(d['event']);})
            .enter()
            .append("rect")
            .attr('class','erect')
            .classed('empty',function(d){
                if(d.data.data.id=="root"){
                    return true
                }else{
                    return false
                }
            });

        treeSlice.attr("x",function(d){return d.x0;})
            .attr("y",function(d){return d.y0;})
            .attr("width",function(d){return d.x1-d.x0;})
            .attr("height",function(d){return d.y1-d.y0;});

        //add time bars
        let etime=canvas.selectAll(".timebar")
            .data(time_diff)
            .enter()
            .append("g")
            .attr("class","timebar")
            .attr("transform",function(d,i){
                let xpos;
                if(_.uniq(diff['com'][i]['event']).length>1){
                    xpos=padding_left+i*Data.layer_gap+etree_size[0];
                }else{
                    xpos=padding_left+i*Data.layer_gap+erect_size[0];
                }
                let ypos=(size[1]-seq_bar_height)/2;
                return "translate("+xpos+","+ypos+")";
            })
        etime.append("rect")
            .attr("width",function(d){return timeScale(d)})
            .attr("height",seq_bar_height);

        //add text
        etime.append("text")
            .attr("class","etime_txt")
            .attr("x",Data.layer_gap/2-etree_size[0]/2)
            .text(function(d){return timeFormat(Util.second2Days(d))+"D";});

        //move canvas
        xoffset=-(canvas_width-size[0]+padding_right)
        canvas.attr("transform",function(){
            let t=Util.getTranslate(d3.select(this).attr("transform")),
                xpos=xoffset,
                ypos=t[1];
                return "translate("+xoffset+","+ypos+")";
            })

        scrollScale.range([padding_left,xoffset]);
    }

    function drawMean(){
        let canvas=container.append("g")
            .attr("transform",function(){
                xpos=margin.left;
                ypos=margin.top;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("id","mean_canvas")
            .attr("class","canvas");

        // canvas.append("rect")
        //     .attr("x",padding_left)
        //     .attr("y",(size[1]-seq_bar_height)/2)
        //     .attr("width",canvas_width)
        //     .attr("height",seq_bar_height)
        //     .attr("id","seq_bar");

        let coords=[]
        diff['mean_diff'].forEach(function(dif,i){
            let x_coord_1=padding_left+i*Data.layer_gap,
                y_coord_1=size_svg[1]/2+diffScale(d3.sum(dif['score'])+d3.sum(diff['seq_diff'][i]['score']))/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;
            // coords.push({'x':x_coord_1,'y':y_coord_1})
            // coords.push({'x':x_coord_2,'y':y_coord_1});
            coords.push({"x":(x_coord_1+x_coord_2)/2,"y":y_coord_1})
        })

        let line=d3.line()
            .x(function(d){return d.x})
            .y(function(d){return d.y})
            .curve(d3.curveMonotoneX);

        let links=canvas.append('path')
            .datum(coords)
            .attr('class','event_link')
            .attr('d',line);

        let egroup = canvas.selectAll(".egroup")
            .data(function(d){
                let eprop=_.zip(mean["event"],mean["prop"]);
                return _.zip(eprop,diff["mean_diff"],diff["seq_diff"])
            })
            .enter()
            .append("g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos=size_svg[1]/2+diffScale(d3.sum(d[1]['score'])+d3.sum(d[2]['score']))/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            })
            .append("g")
            .attr("transform",function(d){
                let xpos=circlepack_size/2-circleMeanScale(d3.sum(d[0][1]))/2;
                let ypos=circlepack_size/2-circleMeanScale(d3.sum(d[0][1]))/2-1;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","egroup mean")
            .call(circleGlyph);
    }

    function drawFocal(){
        let canvas=container.append("g")
            .attr("transform",function(){
                xpos=margin.left;
                ypos=margin.top;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("id","focal_canvas")
            .attr("class","canvas");

        //add main sequence bar
        // canvas.append("rect")
        //     .attr("x",padding_left)
        //     .attr("y",(size[1]-seq_bar_height)/2)
        //     .attr("width",canvas_width)
        //     .attr("height",seq_bar_height)
        //     .attr("id","seq_bar");

        //draw links
        let coords=[]
        diff['seq_diff'].forEach(function(dif,i){
            let x_coord_1=padding_left+i*Data.layer_gap,
                y_coord_1=size_svg[1]/2-diffScale(d3.sum(dif['score'])+d3.sum(diff['mean_diff'][i]['score']))/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;
            // coords.push({'x':x_coord_1,'y':y_coord_1})
            // coords.push({'x':x_coord_2,'y':y_coord_1});

            coords.push({'x':(x_coord_1+x_coord_2)/2,"y":y_coord_1});
        })

        let line=d3.line()
            .x(function(d){return d.x})
            .y(function(d){return d.y})
            .curve(d3.curveMonotoneX);

        let links=canvas.append('path')
            .datum(coords)
            .attr('class','event_link')
            .attr('d',line);

        //add event
        let egroup = canvas.selectAll(".egroup")
            .data(function(d){
                let e_freq=_.zip(seq['event'],seq['freq']);
                return _.zip(e_freq,diff["seq_diff"],diff["mean_diff"])
            })
            .enter()
            .append("g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos=size_svg[1]/2-diffScale(d3.sum(d[1]['score'])+d3.sum(d[2]['score']))/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            });

        egroup.append("circle")
            .attr("cx",circlepack_size/2)
            .attr("cy",circlepack_size/2)
            .attr("r",circlepack_size/2+1)
            .attr("class","border_circle");

        egroup.append("g")
            .attr("transform",function(d){
                let xpos=circlepack_size/2-circleScale(d[0][0].length)/2;
                let ypos=circlepack_size/2-circleScale(d[0][0].length)/2;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","egroup seq")
            .call(circleGlyph);
    }

    function drawDiffBar(){

        let canvas=container.append("g")
            .attr("transform",function(){
                xpos=margin.left;
                ypos=margin.top;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("id","diffbar_canvas")
            .attr("class","canvas");

        //draw middle line
        let links=canvas.append('path')
            .datum(middle_coords)
            .attr('class','event_link dash')
            .attr("id","middle_link")
            .attr('d',line);

        let bargroup=canvas.selectAll(".bargroup")
            .data(diff,(d)=>d.id)
            .enter()
            .append("g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos=size_svg[1]/2-d['distance']/2+1.5;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","bargroup")
            .call(diffCircle);
    }

    function updateDiffbar(){
        var t=d3.transition().duration(1000);
        //update middle line
        let coords=[]
        seq.forEach(function(slot,i){
            let x_coord_1=padding_left+i*Data.layer_gap,
                y_coord_1=size_svg[1]/2-diffScale(slot['anomaly_sum'])/2+diffScale(d3.sum(slot['anomaly']))-circlepack_size/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;

            coords.push({'x':(x_coord_1+x_coord_2)/2,"y":y_coord_1});
        })
        d3.select("#diffbar_canvas").select("#middle_link")
            .datum(coords)
            .attr("d",line);
        let bargroup=d3.select("#diffbar_canvas").selectAll(".bargroup")
            .data(diff,(d)=>d.id);

        let bargroupEnter=bargroup.enter()
            .insert("g")
            .attr("class","bargroup")
            .attr("transform",function(d,i){
                let idx=_.indexOf(Data.slotids,d.id);
                let xpos=padding_left+idx*Data.layer_gap;
                let ypos=size_svg[1]/2-diffScale(d3.sum(d['seq_diff']['score'])+d3.sum(d['sseq_diff']['score']))/2+circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            });

        bargroup.exit().remove();

        bargroup.transition(t)
            .attr("transform",function(d,i){
                let idx=_.indexOf(Data.slotids,d.id);
                let xpos=padding_left+idx*Data.layer_gap;
                let ypos=size_svg[1]/2-diffScale(d3.sum(d['seq_diff']['score'])+d3.sum(d['sseq_diff']['score']))/2+circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            });

        d3.select('#diffbar_canvas').selectAll('.bargroup').call(updateDiff);
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
            .classed("anomaly",function(d){return d.data.anomaly>0});

        circle_node.filter(function(d){return d.data.type=="Medications"})
            .append("polygon")
            .attr("id",function(d){return "node-"+d.id})
            .attr("points",function(d){
                let offset=Math.sqrt(1/3)*d.r;
                let poly=[{"x":-offset,"y":-d.r},
                        {"x":offset,"y":-d.r},
                        {"x":2*offset,"y":0},
                        {"x":offset,"y":d.r},
                        {"x":-offset,"y":d.r},
                        {"x":-2*offset,"y":0},
                        {"x":-offset,"y":-d.r}];
                return poly.map(function(point){
                    return [point.x,point.y].join(",");
                }).join(" ");
            })
            .classed("anomaly",function(d){return d.data.anomaly>0});;

        var leaf = circle_node.filter(function(d) { return !d.children; });

        leaf.append("clipPath")
            .attr("id", function(d) { return "clip-" + d.id; })
            .append("use")
            .attr("xlink:href", function(d) { return "#node-" + d.id + ""; });}

    function updateCircleGlyph(selection){
        let t=d3.transition().duration(1000);
        selection.each(function(d){
            let circlepack=d3.select(this).selectAll("g")
                .data(function(d){return getCirclePack(d)},(d)=>d.data.id);

            let circleEnter=circlepack.enter()
                .insert("g")
                .attr("transform",function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});

            circleEnter.filter(function(d){return d.data.type=="Labs"||"root"})
                .append("circle")
                .classed("anomaly",function(d){return d.data.anomaly>0});
            circleEnter.filter(function(d){return d.data.type=="Medications"})
                .append("polygon")
                .classed("anomaly",function(d){return d.data.anomaly>0});

            circlepack.exit().remove();

            circlepack.transition(t)
                .attr('transform',function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});

        })
        selection.selectAll('.circle_pack').filter(function(d){return d.data.type=="Labs"||"root"})
            .select("circle")
            .transition(t)
            .attr("id",function(d){return "node-"+d.id})
            .attr("r",function(d){return d.r;});

        selection.selectAll('.circle_pack').filter(function(d){return d.data.type=="Medications"})
            .select("polygon")
            .transition(t)
            .attr("id",function(d){return "node-"+d.id})
            .attr("points",function(d){
                let offset=Math.sqrt(1/3)*d.r;
                let poly=[{"x":-offset,"y":-d.r},
                        {"x":offset,"y":-d.r},
                        {"x":2*offset,"y":0},
                        {"x":offset,"y":d.r},
                        {"x":-offset,"y":d.r},
                        {"x":-2*offset,"y":0},
                        {"x":-offset,"y":-d.r}];
                return poly.map(function(point){
                    return [point.x,point.y].join(",");
                }).join(" ");
            })}

    function treeGlyph(selection){
        let treeSlice=selection.selectAll(".egroup.treemap")
            .data(function(d){return drawTreemap(d[0]);})
            .enter()
            .append("rect")
            .attr('class','erect')
            .classed("anomaly",function(d){
                if(d.data.data.anomaly>0){
                    return true
                }else{
                    return false
                }
            })
            .classed('empty',function(d){
                if(d.data.data.id=="root"){
                    return true
                }else{
                    return false
                }
            });

        treeSlice.attr("x",function(d){return d.x0;})
            .attr("y",function(d){return d.y0;})
            .attr("width",function(d){return d.x1-d.x0;})
            .attr("height",function(d){return d.y1-d.y0;});
    }

    function diffBar(selection){
        let seq_diff=selection.selectAll(".diffbar_rect")
            .data(function(d){
                freqScale.domain(d3.extent(d['seq_diff']['freq']));
                let ewidth=_.map(d['seq_diff']['freq'],function(f){return freqScale(f)});
                return _.zip(d['seq_diff']['event'],d['seq_diff']['score'],ewidth)
            },(d)=>d[0])
            .enter()
            .append("rect")
            .attr("class","seqdiff")
            .attr("width",function(d){return d[2]})
            .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
            .attr("x",function(d){return circlepack_size/2-d[2]/2})
            .attr("y",function(d,i){
                if(i==0){
                    return 0;
                }
                let parentDat=d3.select(this.parentNode).data()[0]['seq_diff']['score'];
                return diffScale(d3.sum(_.first(parentDat,i)))-diffScale.range()[0];
            })

        let mean_diff=selection.selectAll(".diffbar_rect")
            .data(function(d){
                freqScale.domain(d3.extent(d['sseq_diff']['freq']));
                let ewidth=_.map(d['sseq_diff']['freq'],function(f){return freqScale(f)});
                return _.zip(d['sseq_diff']['event'],d['sseq_diff']['score'],ewidth)
            },(d)=>d[0])
            .enter()
            .append("rect")
            .attr("class","meandiff")
            .attr("width",function(d){return d[2]})
            .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
            .attr("x",function(d){return circlepack_size/2-d[2]/2})
            .attr("y",function(d,i){
                let parentDat=d3.select(this.parentNode).data()[0];
                let start_pos=diffScale(d3.sum(parentDat['seq_diff']['score']))-diffScale.range()[0]
                if(i==0){
                    return start_pos;
                }
                return start_pos+diffScale(d3.sum(_.first(parentDat['sseq_diff']['score'],i)))-diffScale.range()[0];
            })
    }

    function diffCircle(selection){
        let seq_diff=selection.selectAll(".diffbar_circle")
            .data(function(d){
                return _.zip(d['seq_diff']['event'],d['seq_diff']['size'],d['seq_diff']['score'])
            },(d)=>d[0])
            .enter()
            .append("circle")
            .attr("class","seqdiff")
            .attr("cx",circlepack_size/2)
            .attr("cy",function(d,i){
                let radius=d[1]/2
                if(i==0){
                    return radius;
                }
                let parentDat=d3.select(this.parentNode).data()[0]['seq_diff']['size'];
                return d3.sum(_.first(parentDat,i))+radius;
            })
            .attr("r",function(d){return d[1]/2})
            .attr("stroke-opacity",function(d){return d[2]});

        let mean_diff=selection.selectAll(".diffbar_circle")
            .data(function(d){
                return _.zip(d['sseq_diff']['event'],d['sseq_diff']['size'],d['sseq_diff']['score'])
            },(d)=>d[0])
            .enter()
            .append("circle")
            .attr("class","meandiff")
            .attr("cx",circlepack_size/2)
            .attr("cy",function(d,i){
                let radius=d[1]/2
                let parentDat=d3.select(this.parentNode).data()[0];
                let start_pos=d3.sum(parentDat['seq_diff']['size'])-diffScale.range()[0]
                if(i==0){
                    return start_pos+radius;
                }
                return start_pos+d3.sum(_.first(parentDat['sseq_diff']['size'],i))+radius;
            })
            .attr("r",function(d){return d[1]/2})
            .attr("stroke-opacity",function(d){return d[2]});
    }

    function updateDiff(selection){
        let t=d3.transition().duration(1000);
        selection.each(function(d){
            let diff_bars=d3.select(this).selectAll(".seqdiff")
                .data(function(d){
                freqScale.domain(d3.extent(d['seq_diff']['freq']));
                let ewidth=_.map(d['seq_diff']['freq'],function(f){return freqScale(f)});
                return _.zip(d['seq_diff']['event'],d['seq_diff']['score'],ewidth)
            },(d)=>d[0]);

            let diffbarEnter=diff_bars.enter()
                .insert('rect')
                .attr("class","seqdiff")
                .attr("width",function(d){return d[2]})
                .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
                .attr("x",function(d){return circlepack_size/2-d[2]/2})
                .attr("y",function(d,i){
                    if(i==0){
                        return 0;
                    }
                    let parentDat=d3.select(this.parentNode).data()[0]['seq_diff']['score'];
                    return diffScale(d3.sum(_.first(parentDat,i)))-diffScale.range()[0];
                })

            diff_bars.exit().remove();

            let meandiff=d3.select(this).selectAll('.meandiff')
                .data(function(d){
                    freqScale.domain(d3.extent(d['sseq_diff']['freq']));
                    let ewidth=_.map(d['sseq_diff']['freq'],function(f){return freqScale(f)});
                    return _.zip(d['sseq_diff']['event'],d['sseq_diff']['score'],ewidth)
                },(d)=>d[0]);

            let meandiffEnter=meandiff.enter()
                .insert("rect")
                .attr("class","meandiff")
                .attr("width",function(d){return d[2]})
                .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
                .attr("x",function(d){return circlepack_size/2-d[2]/2})
                .attr("y",function(d,i){
                    let parentDat=d3.select(this.parentNode).data()[0];
                    let start_pos=diffScale(d3.sum(parentDat['seq_diff']['score']))-diffScale.range()[0]
                    if(i==0){
                        return start_pos;
                    }
                    return start_pos+diffScale(d3.sum(_.first(parentDat['sseq_diff']['score'],i)))-diffScale.range()[0];
                })
            meandiff.exit().remove();
        })

        selection.selectAll('.seqdiff')
            .transition(t)
            .attr("width",function(d){return d[2]})
            .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
            .attr("x",function(d){return circlepack_size/2-d[2]/2})
            .attr("y",function(d,i){
                if(i==0){
                    return 0;
                }
                let parentDat=d3.select(this.parentNode).data()[0]['seq_diff']['score'];
                return diffScale(d3.sum(_.first(parentDat,i)))-diffScale.range()[0];
            })

        selection.selectAll('.meandiff')
            .transition(t)
            .attr("width",function(d){return d[2]})
            .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
            .attr("x",function(d){return circlepack_size/2-d[2]/2})
            .attr("y",function(d,i){
                let parentDat=d3.select(this.parentNode).data()[0];
                let start_pos=diffScale(d3.sum(parentDat['seq_diff']['score']))-diffScale.range()[0]
                if(i==0){
                    return start_pos;
                }
                return start_pos+diffScale(d3.sum(_.first(parentDat['sseq_diff']['score'],i)))-diffScale.range()[0];
            })
    }

    function groupDiffBar(selection){

        let t=d3.transition().duration(1000);

        selection.each(function(d){
            let subtree_height=treemap_size[1]*(d3.sum(d['seq_diff']['score']))/(d3.sum(d['seq_diff']['score'])+d3.sum(d['sseq_diff']['score']));
            let global_offset=diffScale(d3.sum(d['seq_diff']['score']))-diffScale.range()[0]-subtree_height;
            var seqdiff_bars=d3.select(this).selectAll('.seqdiff')
                .data(function(d){
                    //sub-treemap size
                    let height=treemap_size[1]*(d3.sum(d['seq_diff']['score']))/(d3.sum(d['seq_diff']['score'])+d3.sum(d['sseq_diff']['score']));
                    let size=[treemap_size[0],height];
                    let vLayout=d3.treemap().size(size).paddingOuter(0.5);
                    //data
                    vData=d3.stratify()(getDiffTreemap(d['seq_diff']))
                    //layout
                    var vRoot=d3.hierarchy(vData).sum(function(d){return d.data.size})
                    var vNodes=vRoot.descendants();
                    vLayout(vRoot);
                    return vRoot.children;
                })

            seqdiff_bars.transition(t)
                .attr("x",function(d){return d.x0})
                .attr("y",function(d){return d.y0+global_offset})
                .attr("width",function(d){return d.x1-d.x0})
                .attr("height",function(d){return d.y1-d.y0});

            var sseqdiff_bars=d3.select(this).selectAll('.meandiff')
                .data(function(d){
                    let height=treemap_size[1]*(d3.sum(d['sseq_diff']['score']))/(d3.sum(d['seq_diff']['score'])+d3.sum(d['sseq_diff']['score']));
                    let size=[treemap_size[0],height];
                    let vLayout=d3.treemap().size(size).paddingOuter(0.5);
                    //data
                    vData=d3.stratify()(getDiffTreemap(d['sseq_diff']))
                    //layout
                    var vRoot=d3.hierarchy(vData).sum(function(d){return d.data.size})
                    var vNodes=vRoot.descendants();
                    vLayout(vRoot);
                    return vRoot.children;
                })
            sseqdiff_bars.transition(t)
                .attr("x",function(d){return d.x0})
                .attr("y",function(d){
                    let parentDat=d3.select(this.parentNode).data()[0];
                    let offset=treemap_size[1]*(d3.sum(parentDat['seq_diff']['score']))/(d3.sum(parentDat['seq_diff']['score'])+d3.sum(parentDat['sseq_diff']['score']));
                    return d.y0+offset+global_offset;
                })
                .attr("width",function(d){return d.x1-d.x0})
                .attr("height",function(d){return d.y1-d.y0});
        })}

    function groupDiffCircle(selection){
        let t=d3.transition().duration(1000);
        selection.each(function(d,i){
            let offset=d['distance']/2-circlepack_size/2;
            let dat=getDiffCircle(d['seq_diff'],d['sseq_diff']);
            let seq_diff_dat=_.filter(dat,function(d){return d.id=='root.seq_diff'})[0];
            let sseq_diff_dat=_.filter(dat,function(d){return d.id=='root.sseq_diff'})[0];

            d3.select(this).selectAll('.packCircle_bg')
                .data(function(d){return _.first(dat,3)})
                .enter()
                .append('circle')
                .attr("cx",function(d){return d.x})
                .attr("cy",function(d){return d.y+offset})
                .attr("r",function(d){return d.r})
                .attr('class','border_circle');

            d3.select(this).append('line')
                .attr('x1',circlepack_size/2)
                .attr('x2',circlepack_size/2)
                .attr('y2',offset)
                .attr('class','connect_line')
                .attr('stroke','#bfbfbf');

            d3.select(this).append('line')
                .attr('x1',circlepack_size/2)
                .attr('x2',circlepack_size/2)
                .attr('y1',offset+circlepack_size)
                .attr('y2',d['distance'])
                .attr('class','connect_line')
                .attr('stroke','#bfbfbf');

            if(d['seq_diff']['event'].length>0){
                var seqdiff_circles=d3.select(this).selectAll('.seqdiff')
                    .data(seq_diff_dat.children);
                seqdiff_circles.transition(t)
                    .attr("cx",function(d){return d.x})
                    .attr("cy",function(d){return d.y+offset})
                    .attr("r",function(d){return d.r});
            }
            if(d['sseq_diff']['event'].length>0){
                var sseqdiff_circles=d3.select(this).selectAll('.meandiff')
                    .data(sseq_diff_dat.children);
                sseqdiff_circles.transition(t)
                    .attr("cx",function(d){return d.x})
                    .attr("cy",function(d){return d.y+offset})
                    .attr("r",function(d){return d.r});
            }
        })
        d3.selectAll('.seqdiff,.meandiff').raise();
    }

    function expandDiffCircle(selection){
        selection.selectAll('.border_circle,.connect_line').remove();
        var t=d3.transition().duration(1000);
        selection.each(function(d){
            let seq_diff=d3.select(this).selectAll(".seqdiff")
                .data(function(d){
                    return _.zip(d['seq_diff']['event'],d['seq_diff']['size'],d['seq_diff']['score'])
                });

            seq_diff.transition(t)
                .attr("cx",circlepack_size/2)
                .attr("cy",function(d,i){
                    let radius=d[1]/2
                    if(i==0){
                        return radius;
                    }
                    let parentDat=d3.select(this.parentNode).data()[0]['seq_diff']['size'];
                    return d3.sum(_.first(parentDat,i))+radius;
                })
                .attr("r",function(d){return d[1]/2})

            let mean_diff=d3.select(this).selectAll(".meandiff")
                .data(function(d){
                    return _.zip(d['sseq_diff']['event'],d['sseq_diff']['size'],d['sseq_diff']['score'])
                });

            mean_diff.transition(t)
                .attr("cx",circlepack_size/2)
                .attr("cy",function(d,i){
                    let radius=d[1]/2
                    let parentDat=d3.select(this.parentNode).data()[0];
                    let start_pos=d3.sum(parentDat['seq_diff']['size'])-diffScale.range()[0]
                    if(i==0){
                        return start_pos+radius;
                    }
                    return start_pos+d3.sum(_.first(parentDat['sseq_diff']['size'],i))+radius;
                })
                .attr("r",function(d){return d[1]/2})
        })
    }

    function expandDiffBar(selection){
        let t=d3.transition().duration(1000);

        selection.each(function(d){

            var seqdiff_bars=d3.select(this).selectAll('.seqdiff')
                .data(function(d){
                    freqScale.domain(d3.extent(d['seq_diff']['freq']));
                    let ewidth=_.map(d['seq_diff']['freq'],function(f){return freqScale(f)});
                    return _.zip(d['seq_diff']['event'],d['seq_diff']['score'],ewidth)
                });

            seqdiff_bars.transition(t)
                .attr("width",function(d){return d[2]})
                .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
                .attr("x",function(d){return circlepack_size/2-d[2]/2})
                .attr("y",function(d,i){
                    if(i==0){
                        return 0;
                    }
                    let parentDat=d3.select(this.parentNode).data()[0]['seq_diff']['score'];
                    return diffScale(d3.sum(_.first(parentDat,i)))-diffScale.range()[0];
                })

            var sseqdiff_bars=d3.select(this).selectAll('.meandiff')
                .data(function(d){
                    freqScale.domain(d3.extent(d['sseq_diff']['freq']));
                    let ewidth=_.map(d['sseq_diff']['freq'],function(f){return freqScale(f)});
                    return _.zip(d['sseq_diff']['event'],d['sseq_diff']['score'],ewidth)
                });
            sseqdiff_bars.transition(t)
                .attr("width",function(d){return d[2]})
                .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
                .attr("x",function(d){return circlepack_size/2-d[2]/2})
                .attr("y",function(d,i){
                    let parentDat=d3.select(this.parentNode).data()[0];
                    let start_pos=diffScale(d3.sum(parentDat['seq_diff']['score']))-diffScale.range()[0]
                    if(i==0){
                        return start_pos;
                    }
                    return start_pos+diffScale(d3.sum(_.first(parentDat['sseq_diff']['score'],i)))-diffScale.range()[0];
                })

        })
    }

    function drawScrollBar(percent){

        Data.scrollDomain=[padding_left,(1-percent)*size[0]];

        scrollScale.domain(Data.scrollDomain);

        let drag_behavior=d3.drag()
                    .on("start",dragstart)
                    .on("drag",ondrag);

        let scrollBar=container.append("g")
            .attr("id","scrollBar");

        scrollBar.append("rect")
            .attr("class","overlay")
            .attr("width",size[0]-padding_left)
            .attr("height",4)
            .attr("x",padding_left)
            .attr("y",padding_top);

        scrollBar.append("rect")
            .attr("class","selection")
            .attr("width",size[0]*percent)
            .attr("x",size[0]*(1-percent))
            .attr("y",padding_top-2)
            .attr("height","8")
            .attr("rx",4)
            .attr("ry",4)
            .call(drag_behavior);

        function dragstart(){
            d3.select(this).raise();
        }

        function ondrag(){
            let dx=d3.event.dx;
            let start_x=parseInt(d3.select(this).attr("x"))+dx;
            let end_x=parseInt(d3.select(this).attr("x"))+parseInt(d3.select(this).attr("width"))+dx;
            if(end_x>size[0]||start_x<padding_left){
                return;
            }else{
                d3.select(this).attr("x",parseInt(d3.select(this).attr("x"))+dx);
                d3.selectAll(".canvas").attr("transform",function(){
                    let t=Util.getTranslate(d3.select(this).attr("transform"));
                    let xpos=scrollScale(start_x);
                    let ypos=t[1];
                    return "translate("+xpos+","+ypos+")";
                })
                dispatch.call("moveSankey",this,start_x);
            }
        }
    }

    function drawTreemap(elist){
        let vData=d3.stratify()(getTreemapDat(elist));
        let vLayout=d3.treemap().size(etree_size).paddingOuter(1);
        let vRoot=d3.hierarchy(vData).sum(function(d){return d.data.size;});
        let vNodes=vRoot.descendants();
        vLayout(vRoot);
        return vNodes;
    }

    function getTreemapDat(elist){
        let result=[{"id":"root"}]
        let egroup=_.groupBy(elist,function(d){return d});
        for(let e in egroup){
            obj={
                "id":e,
                "parentId":"root",
                "size":egroup[e].length
            }
            result.push(obj)
        }
        return result;
    }

    function getDiffCircle(seq_diff,sseq_diff){
        let result=[{"id":"root","type":"root"},
            {"id":"root.seq_diff","type":"root"},
            {"id":"root.sseq_diff","type":"root"}];

        seq_diff['event'].forEach(function(e,i){
             obj={"id":"root.seq_diff."+e,
                "event":e,
                "value":seq_diff['freq'][i],
                "type":Data.idx2type[e]}
            result.push(obj);
        })

        sseq_diff['event'].forEach(function(e,i){
            obj={"id":"root.sseq_diff."+e,
                "event":e,
                "value":sseq_diff['freq'][i],
                "type":Data.idx2type[e]}
            result.push(obj);
        })

        var stratify = d3.stratify()
            .parentId(function(d) { return d.id.substring(0, d.id.lastIndexOf(".")); });

        var root=stratify(result)
            .sum(function(d){return d.value;})
            .sort(function(a,b){return a.value-b.value});

        var pack=d3.pack()
            .size([circlepack_size,circlepack_size])
            .padding(0.5);

        pack(root);

        return root.descendants();
    }

    function getDiffTreemap(dat){
        let result=[{"id":"root"}]
        dat['event'].forEach(function(e,i){
            obj={"id":e,
                "parentId":"root",
                "size":dat['score'][i],
                "freq":dat['freq'][i]
            }
            result.push(obj)
        })
        return result;
    }

    function getCirclePack(dat){
        let result=[{"id":"root","type":"root"}]
        dat['event'].forEach(function(e,i){
            if(dat['anomaly'][i]==0){
                 obj={"id":"root."+e,
                    "event":e,
                    "value":dat['freq'][i],
                    "anomaly":dat["anomaly"][i],
                    "type":Data.idx2type[e]}
                result.push(obj);
            }
        })

        var stratify = d3.stratify()
            .parentId(function(d) { return d.id.substring(0, d.id.lastIndexOf(".")); });

        var root=stratify(result)
            .sum(function(d){return d.value;})
            .sort(function(a,b){return b.value-a.value});

        var pack=d3.pack()
            .size([dat['packSize'],dat['packSize']])
            .padding(0.5);

        pack(root);

        return root.descendants();
    }

    function calCommon(seq,sseq){
        let time_slots=seq.length;
        let diffs=[];
        let radius=[];
        for(let i=0;i<time_slots;i++){
            let bar_dat={};
            seq_egroup=seq[i]['event'];
            sseq_egroup=sseq[i]['event'];
            mean_props=_.object(Data.meanseq[i]['event'],Data.meanseq[i]['prop'])

            //summarize event differences
            com_events=_.intersection(seq_egroup,sseq_egroup);
            seq_diff=_.difference(seq_egroup,com_events);
            sseq_diff=_.difference(sseq_egroup,com_events);

            Data.seq_diff.push(seq_diff);

            let seq_score=[],
                sseq_score=[];
            if(seq_diff.length>0){
                seq_score=_.map(seq_diff,function(e){
                    prop=mean_props[e];
                    return 1-prop;
                })
                seq_score_dict=_.object(seq_diff,seq_score);
                seq[i]['anomaly']=_.map(seq[i]['event'],function(e){
                    if(_.contains(seq_diff,e)){
                        return seq_score_dict[e];
                    }else{
                        return 0;
                    }
                })

                seq_diff_freq=seq_diff.map(x=>_.object(seq_egroup,seq[i]['freq'])[x])

                sort_seq_diff=_.sortBy(_.zip(seq_diff,seq_diff_freq,seq_score),d=>d[1]);
                seq_diff=_.unzip(sort_seq_diff)[0];
                seq_diff_freq=_.unzip(sort_seq_diff)[1];
                seq_score=_.unzip(sort_seq_diff)[2];
                bar_dat['seq_diff']={'event':seq_diff,'freq':seq_diff_freq,"score":seq_score};
            }else{
                seq[i]['anomaly']=seq_egroup.map(x=>0);
                bar_dat['seq_diff']={'event':[],'freq':[],"score":[]};
            }

            Data.sseq_diff.push(sseq_diff);
            if(sseq_diff.length>0){
                //calculate anomaly scores
                sseq_score=_.map(sseq_diff,function(e){
                    return mean_props[e];
                })
                sseq_score_dict=_.object(sseq_diff,sseq_score);
                //store data in original sequence
                sseq[i]['anomaly']=_.map(sseq[i]['event'],function(e){
                    if(_.contains(sseq_diff,e)){
                        return sseq_score_dict[e];
                    }else{
                        return 0;
                    }
                })
                //map frequency
                sseq_diff_freq=sseq_diff.map(x=>_.object(sseq_egroup,sseq[i]['freq'])[x])

                //sort frequency
                sort_sseq_diff=_.sortBy(_.zip(sseq_diff,sseq_diff_freq,sseq_score),d=>-d[1]);
                sseq_diff=_.unzip(sort_sseq_diff)[0];
                sseq_diff_freq=_.unzip(sort_sseq_diff)[1];
                sseq_score=_.unzip(sort_sseq_diff)[2];
                bar_dat['sseq_diff']={'event':sseq_diff,'freq':sseq_diff_freq,"score":sseq_score};
            }else{
                sseq[i]['anomaly']=sseq_egroup.map(x=>0);
                bar_dat['sseq_diff']={'event':[],'freq':[],"score":[]};
            }

            Data.seq_common.push(com_events);
            if(com_events.length>0){
                seq_common_freq=com_events.map(x=>_.object(seq_egroup,seq[i]['freq'])[x])
                sseq_common_freq=com_events.map(x=>_.object(sseq_egroup,sseq[i]['freq'])[x])
                bar_dat['seq_common']={'event':com_events,'freq':seq_common_freq};
                bar_dat['sseq_common']={'event':com_events,'freq':sseq_common_freq};
            }else{
                bar_dat['seq_common']={'event':[],'freq':[]}
                bar_dat['sseq_common']={'event':[],'freq':[]}
            }

            bar_dat['id']=Data.slotids[i];

            diffs.push(bar_dat);
        }
        //calculate circleScale
        let common_freqs=d3.extent(_.flatten(diffs.map(x=>[d3.sum(x['seq_common']['freq']),d3.sum(x['sseq_common']['freq'])])))
        circleScale.domain(common_freqs)
            .range([minCircleSize,maxCircleSize]);

        //calculate transformR
        distancelist=[]
        diffs.forEach(function(dif){
            let seq_freq=dif['seq_diff']['freq'];
            let seq_radius=seq_freq.map(x=>circleScale(x));
            let sseq_freq=dif['sseq_diff']['freq'];
            let sseq_radius=sseq_freq.map(x=>circleScale(x));
            distancelist.push(d3.sum(seq_radius)+d3.sum(sseq_radius));
        })
        let maxHeight=d3.max(distancelist)+circlepack_size*2+margin.top+margin.bottom;
        if(maxHeight>size_svg[1]){
            transformR=(size_svg[1]-margin.top-margin.bottom-circlepack_size*2)/d3.max(distancelist);
        }

        //calculate packing size and distance for seq and sseq
        seq.forEach(function(d,i){
            let com_freq=_.filter(_.zip(d['anomaly'],d['freq']),function(d){return d[0]==0});
            seq[i]['packSize']=eCircleR(d3.sum(com_freq,function(d){return d[1]}));
        })
        sseq.forEach(function(d,i){
            let com_freq=_.filter(_.zip(d['anomaly'],d['freq']),function(d){return d[0]==0});
            sseq[i]['packSize']=eCircleR(d3.sum(com_freq,function(d){return d[1]}));
        })
        diffs.forEach(function(d,i){
            let seq_diff_radius=d['seq_diff']['freq'].map(x=>eCircleR(x));
            let sseq_diff_radius=d['sseq_diff']['freq'].map(x=>eCircleR(x));
            diffs[i]['distance']=d3.sum(seq_diff_radius)+d3.sum(sseq_diff_radius)+3;
            diffs[i]['seq_diff']['size']=seq_diff_radius;
            diffs[i]['sseq_diff']['size']=sseq_diff_radius;
            diffs[i]['seq_diff']['packSize']=eCircleR(d3.sum(diffs[i]['seq_diff']['freq']));
            diffs[i]['sseq_diff']['packSize']=eCircleR(d3.sum(diffs[i]['sseq_diff']['freq']));
        })

        // maxDiffScore=d3.max(diffs,function(t){return d3.sum(t['seq_diff']['score'])+d3.sum(t['sseq_diff']['score'])});
        // diffScale.domain([0,maxDiffScore]);
        // diffScale.range([circlepack_size,size_svg[1]-circlepack_size-margin.top-margin.bottom]);

        return focal.diff(diffs);}

    function updateStageDat(){
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
    }

    function updateStageBar(){

        let t=d3.transition().duration(1000);

        let slot_nums=d3.select("#slot_num").selectAll(".slotnum_txt")
            .data(Data.slotids,(d)=>d);
        slot_nums.enter()
            .append("text")
            .attr("class","slotnum_txt")
            .attr("x",function(d,i){return i*Data.layer_gap+circlepack_size/2+padding_left})
            .text(function(d){return d});

        slot_nums.exit().remove();

        d3.selectAll('.slotnum_txt')
            .transition(t)
            .attr("x",function(d,i){return i*Data.layer_gap+circlepack_size/2+padding_left});

        //update stage bar
        let stage_length=_.map(stage,function(x,i){return i==0?x:x-stage[i-1]});
        let stage_id=_.map(stage,function(x,i){return i});
        let xposlist=[0];
        Data.stage_expand.forEach(function(d,i){
            if(d==1){
                xposlist.push(_.last(xposlist)+stage_length[i]);
            }else{
                xposlist.push(_.last(xposlist)+1);
            }
        })

        xposlist.pop();

        let stage_bars=d3.select("#stage_canvas").selectAll(".stage_bar")
            .data(_.zip(stage_id,stage,stage_length,xposlist,Data.stage_expand),(d)=>d[0]);

        d3.selectAll(".stage_bar")
            .transition(t)
            .attr("transform",function(d,i){
                xpos=d[3]*Data.layer_gap+padding_left;
                return "translate("+xpos+",0)";
            });
        d3.selectAll(".stage_bar").select("rect")
            .transition(t)
            .attr("width",function(d){
                if(d[4]==1){
                    return (d[2]-1)*Data.layer_gap+circlepack_size
                }else{
                    return circlepack_size;
                }
            });
        d3.selectAll(".stage_bar").select("line")
            .transition(t)
            .attr("x1",0)
            .attr("x2",function(d){
                if(d[4]==1){
                    return (d[2]-1)*Data.layer_gap+circlepack_size
                }else{
                    return circlepack_size;
                }
            })}

    function updateSeqDat(){
        focal.seq(packSeqStage(Data.seqs['event'],Data.seqs['time']));
    }

    function updateSseqDat(){
        let result={}
        for(pid in Data.sseq){
            result[pid]={}
            pack_seq=packSeqStage(Data.sseq[pid]['a_event'],Data.sseq[pid]['a_time'],Data.sseq[pid]['a_freq'])
            result[pid]['a_event']=pack_seq['event'];
            result[pid]['a_time']=pack_seq['time'];
            result[pid]['a_freq']=pack_seq['freq'];
        }
        focal.sseq(result);
    }

    function packSeqStage(event,time,freq=[]){
        let events=[]
        let times=[]
        let freqs=[]
        let ids=[]
        stage.forEach(function(d,i){
            let event_tmp=[]
            let time_tmp=[]
            let freq_tmp=[]
            let start_idx,end_idx;
            if(i==0){
                start_idx=0;
            }else{
                start_idx=stage[i-1];
            }
            end_idx=d-1;
            for(let idx=start_idx;idx<=end_idx;idx++){
                if(Data.stage_expand[i]==1){
                    events.push(event[idx])
                    times.push(time[idx])
                    if(freq.length){
                        freqs.push(freq[idx])
                    }
                    ids.push(idx.toString())
                }else{
                    event_tmp.push(event[idx])
                    time_tmp.push(time[idx])
                    if(freq.length){
                        freq_tmp.push(freq[idx])
                    }
                }
            }
            if(event_tmp.length>0){
                events.push(_.flatten(event_tmp))
                times.push(_.flatten(time_tmp))
                if(freq.length){
                    freqs.push(_.flatten(freq_tmp))
                }
            }
        })
        result={'event':events,'time':times};
        if(freq.length){
            result['freq']=freqs;
        }
        return result;
    }

    function eCircleR(freq){
        return circleScale(freq)*transformR;
    }

    return focal;
/***************v2 functions*************/


};
