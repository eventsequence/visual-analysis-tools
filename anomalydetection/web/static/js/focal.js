Vis.focal = function() {

    var focal = {},
        container = null,
        seq = null,
        mean = null,
        diff = null,
        size_svg=[],
        size = [960, 800],
        margin = { left: 0, top: 40, right: 5, bottom: 10 },
        dispatch = d3.dispatch("moveSankey");

    let padding_left=10,
        padding_right=10,
        padding_top=10;

    //element attributes
    let min_barlen=5,
        erect_size=[35,24],
        etree_size=[35,24],
        seq_bar_height=3,
        link_bar_width=5,
        circlepack_size=35,
        diff_bar_width=15,
        minCircleSize=diff_bar_width,
        maxCircleSize=35,
        minBarWidth=diff_bar_width,
        maxBarWidth=Data.layer_gap-50;

    let image_size=7;

    //space attributes
    var canvas_width;

    //scales
    let timeScale=d3.scaleLog(),
        scrollScale=d3.scaleLinear(),
        diffScale=d3.scaleLinear(),
        circleSeqScale=d3.scaleLinear(),
        circleMeanScale=d3.scaleLinear(),
        freqScale=d3.scaleLinear().range([minBarWidth,maxBarWidth]);

    let timeFormat=d3.format(".1r");

    //reformed data
    var time_diff=[];

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

    focal.mean = function(_) {
        if (!arguments.length) return mean;
        mean = _;
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

        if(seq["event"][seq["event"].length-1].length>1){
            tmp_dis=(size[0]-padding_left-padding_right-etree_size[0])/(seq["event"].length-1);
        }else{
            tmp_dis=(size[0]-padding_left-padding_right-erect_size[0])/(seq["event"].length-1);
        }

        if(tmp_dis>Data.layer_gap){
            Data.layer_gap=tmp_dis;
            canvas_width=size[0];
        }else{
            if(seq["event"][seq["event"].length-1].length>1){
                canvas_width=(seq["event"].length-1)*Data.layer_gap+etree_size[0];
            }else{
                canvas_width=(seq["event"].length-1)*Data.layer_gap+erect_size[0];
            }
            drawScrollBar(size[0]/canvas_width);
        }

        //calculate time scale
        let time=seq["time"];
        time.forEach(function(t,i){
            if(i>0){
                t_diff=t[t.length-1]-time[i-1][time[i-1].length-1]
                time_diff.push(t_diff)
            }
        })
        timeScale.domain(d3.extent(time_diff,function(d){return d;}))
            .range([min_barlen,Data.layer_gap-etree_size[0]]);

        circleSeqScale
            .domain(d3.extent(seq['event'],function(d){return d.length;}))
            .range([minCircleSize,maxCircleSize]);
        circleMeanScale
            .domain(d3.extent(mean['prop'],function(d){return d3.sum(d);}))
            .range([maxCircleSize,maxCircleSize]);

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
        return focal;
    };

    focal.init = function(){

        let delim=container.append("line")
            .attr("class","delim")
            .attr("x1",0)
            .attr("y1",size_svg[1]+margin.top+padding_top)
            .attr("x2",size[0]+margin.left+margin.right)
            .attr("y2",size_svg[1]+margin.top+padding_top);

        dataPreprocess();

        calCommon(seq,mean);
        //drawCommon();
        drawSlotNum();
        drawDiffBar();
        drawFocal();
        drawMean();

        moveCanvas();

        return focal.update();
    }

    ///////////////////////////////////////////////////
    // Private Functions
    function dataPreprocess(){
        freq=[]
        seq["event"].forEach(function(e){
            let egroup=_.groupBy(e,function(d){return d});
            let efreq=_.map(e,function(d){return egroup[d].length});
            freq.push(efreq);
        })
        seq["freq"]=freq;
        console.log(seq);
        console.log(mean);
    }
    function drawSlotNum(){
        //draw slot num
        let slot_num=container.append("g")
            .attr("id","slot_num")
            .attr('transform',function(){
                xoffset=-(canvas_width-size[0]+padding_right)
                ypos=margin.top-5;
                return 'translate('+xoffset+','+ypos+')';
            })

        slot_num.selectAll(".slotnum_txt")
            .data(d3.range(seq["event"].length))
            .enter()
            .append("text")
            .attr("class","slotnum_txt")
            .attr("x",function(d){return d*Data.layer_gap+erect_size[0]/2+padding_left})
            .text(function(d){return "#"+d});
    }

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
                if(_.uniq(d['events']).length>1){
                    ypos=(size[1]-etree_size[1])/2
                }else{
                    ypos=(size[1]-erect_size[1])/2
                }
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class",function(d){
                if(_.uniq(d['events']).length>1){
                    return "egroup treemap"
                }else if(d['events'].length==0){
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
            .data(function(d){return drawTreemap(d['events']);})
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
                if(_.uniq(diff['com'][i]['events']).length>1){
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
                let xpos=circlepack_size/2-circleSeqScale(d[0][0].length)/2;
                let ypos=circlepack_size/2-circleSeqScale(d[0][0].length)/2;
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

        let bargroup=canvas.selectAll(".bargroup")
            .data(_.zip(diff["seq_diff"],diff["mean_diff"]))
            .enter()
            .append("g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap;
                let ypos=size_svg[1]/2-diffScale(d3.sum(d[0]['score'])+d3.sum(d[1]['score']))/2+circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","bargroup")
            .call(diffBar);
    }

    function circleGlyph(selection){
        let circle_node=selection.selectAll("g")
            .data(function(d){
                if(d3.select(this).classed("seq")){
                    return getCirclePack(d[0],d[1],"seq")
                }else{
                    return getCirclePack(d[0],d[1],"mean");
                }
            })
            .enter()
            .append("g")
                .attr("transform",function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});

        circle_node.filter(function(d){return d.data.type=="Labs"||"root"})
            .append("circle")
            .attr("id",function(d){return "node-"+d.id})
            .attr("r",function(d){return d.r;})
            .classed("anomaly",function(d){return d.data.anomaly});

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
            .classed("anomaly",function(d){return d.data.anomaly});;

        var leaf = circle_node.filter(function(d) { return !d.children; });

        leaf.append("clipPath")
            .attr("id", function(d) { return "clip-" + d.id; })
            .append("use")
            .attr("xlink:href", function(d) { return "#node-" + d.id + ""; });
    }

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
                freqScale.domain(d3.extent(d[0]['freq']));
                let ewidth=_.map(d[0]['freq'],function(f){return freqScale(f)});
                return _.zip(d[0]['events'],d[0]['score'],ewidth)
            })
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
                let parentDat=d3.select(this.parentNode).data()[0][0]['score'];

                return diffScale(d3.sum(_.first(parentDat,i)))-diffScale.range()[0];
            })

        let mean_diff=selection.selectAll(".diffbar_rect")
            .data(function(d){
                freqScale.domain(d3.extent(d[1]['freq']));
                let ewidth=_.map(d[1]['freq'],function(f){return freqScale(f)});
                return _.zip(d[1]['events'],d[1]['score'],ewidth)
            })
            .enter()
            .append("rect")
            .attr("class","meandiff")
            .attr("width",function(d){return d[2]})
            .attr("height",function(d){return diffScale(d[1])-diffScale.range()[0]})
            .attr("x",function(d){return circlepack_size/2-d[2]/2})
            .attr("y",function(d,i){
                let parentDat=d3.select(this.parentNode).data()[0];
                let start_pos=diffScale(d3.sum(parentDat[0]['score']))-diffScale.range()[0]
                if(i==0){
                    return start_pos;
                }
                return start_pos+diffScale(d3.sum(_.first(parentDat[1]['score'],i)))-diffScale.range()[0];
            })
    }

    function moveCanvas(){
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
                d3.selectAll(".canvas,#slot_num").attr("transform",function(){
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

    function getCirclePack(elist,dif,type){
        let result=[{"id":"root","type":"root"}]
        let e_value=_.uniq(_.zip(elist[0],elist[1]),function(d){return d[0]});
        e_value.forEach(function(d){
            let anomaly;
            if(_.contains(dif['events'],parseInt(d[0]))){
                anomaly=true;
            }else{
                anomaly=false;
            }
            obj={
                "id":"root."+d[0],
                "value":d[1],
                "anomaly":anomaly,
                "type":Data.idx2type[d[0]]
            }
            result.push(obj)
        })

        var stratify = d3.stratify()
            .parentId(function(d) { return d.id.substring(0, d.id.lastIndexOf(".")); });
        var root=stratify(result)
            .sum(function(d){return d.value;})
            .sort(function(a,b){return b.value-a.value});

        // let circleSize;
        if(type=="seq"){
            circleSize=circleSeqScale(d3.sum(e_value,function(d){return d[1]}));
        }else{
            circleSize=circleMeanScale(d3.sum(e_value,function(d){return d[1]}));
        }

        var pack=d3.pack()
            .size([circleSize,circleSize])
            .padding(0.5);

        pack(root);

        return root.descendants();
    }

    function calCommon(seq,mean){
        let time_slots=seq['event'].length;
        let diffs=[];
        let radius=[];
        for(let i=0;i<time_slots;i++){
            seq_egroup=seq['event'][i];
            mean_egroup=mean['event'][i];
            mean_prop=mean['prop'][i];

            //summarize event differences
            com_events=_.intersection(seq_egroup,mean_egroup);
            seq_diff=_.uniq(_.difference(seq_egroup,com_events));
            mean_diff=_.uniq(_.difference(mean_egroup,com_events));

            //calculate frequency differences
            seq_efreq=_.countBy(seq_egroup,function(e){return e;});
            Object.keys(seq_efreq).map(function(key,index){
                seq_efreq[key]=seq_efreq[key]/seq_egroup.length;
            })

            mean_escore={}
            mean_efreq={}
            mean_egroup.forEach(function(e,i){
                mean_efreq[e]=mean_prop[i]/d3.sum(mean_prop);
                mean_escore[e]=mean_prop[i]
            })

            com_freq=[]
            com_events.forEach(function(e){
                com_freq.push([seq_efreq[e],mean_efreq[e]]);
            })

            seq_diff_freq=[]
            seq_score=[]
            seq_diff.forEach(function(e){
                seq_diff_freq.push(seq_efreq[e]);
                seq_score.push(1-Data.meanseq[i][Data.event2idx[e]]);
            })

            mean_score=[]
            mean_freq=[]
            mean_diff.forEach(function(e){
                mean_freq.push(mean_efreq[e]);
                mean_score.push(mean_escore[e]);
            })

            //sort freq
            zip_seq_diff=_.sortBy(_.zip(seq_diff,seq_diff_freq,seq_score),function(d){return d[1]})
            zip_mean_diff=_.sortBy(_.zip(mean_diff,mean_freq,mean_score),function(d){return -d[1]})

            seq_diff=_.unzip(zip_seq_diff)[0];
            seq_diff_freq=_.unzip(zip_seq_diff)[1];
            seq_score=_.unzip(zip_seq_diff)[2];

            mean_diff=_.unzip(zip_mean_diff)[0];
            mean_freq=_.unzip(zip_mean_diff)[1];
            mean_score=_.unzip(zip_mean_diff)[2];

            result={
                'com':{'events':com_events,'freq':com_freq},
                'seq_diff':{'events':seq_diff,'freq':seq_diff_freq,"score":seq_score},
                'mean_diff':{'events':mean_diff,"freq":mean_freq,"score":mean_score}
            }
            diffs.push(result);
        }
        // maxDiffFreq=d3.max(diffs,function(t){return Math.max(d3.sum(t['seq_diff']['freq']),d3.sum(t['mean_diff']['freq']))});
        // minDiffFreq=d3.min(diffs,function(t){return Math.min(d3.sum(t['seq_diff']['freq']),d3.sum(t['mean_diff']['freq']))});
        maxDiffScore=d3.max(diffs,function(t){return d3.sum(t['seq_diff']['score'])+d3.sum(t['mean_diff']['score'])});
        minDiffScore=d3.min(diffs,function(t){return d3.sum(t['seq_diff']['score'])+d3.sum(t['mean_diff']['score'])});
        diffScale.domain([0,maxDiffScore]);
        diffScale.range([circlepack_size,size_svg[1]-circlepack_size]);

        let f_result={}
        f_result['com']=_.map(diffs,function(d){return d['com']});
        f_result['seq_diff']=_.map(diffs,function(d){return d['seq_diff']});
        f_result['mean_diff']=_.map(diffs,function(d){return d['mean_diff']});

        return focal.diff(f_result);
    }

    return focal;
};
