Vis.meanseq = function() {

    var meanseq = {},
        container = null,
        data = null,
        size = [],
        margin = { left: 10, top: 10, right: 10, bottom: 10 },
        dispatch = d3.dispatch("updateScroll",
                        'moveCanvas',
                        "updateLayerGap",
                        "moveCanvasTo",
                        "markEvent",
                        "clearMark");

    let padding_left=10,
        padding_right=10,
        padding_top=10;

    let circlepack_size=50;

    let line=d3.line()
        .x(function(d){return d.x})
        .y(function(d){return d.y})
        .curve(d3.curveMonotoneX);

    // tip
    let tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10,0])
        .html(function(d) {
            return d;
        });

    let probFormat=d3.format(".3f");

    meanseq.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return meanseq;
    };

    meanseq.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return meanseq;
    };

    meanseq.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return meanseq;
    };

    meanseq.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return meanseq;
    };

    meanseq.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    meanseq.layout = function() {

        this.size([$("#mean_svg").width()-margin.left-margin.right,
                    $("#mean_svg").height()-margin.top-margin.bottom]);

        let tmp_dis;

        tmp_dis=(size[0]-padding_left-padding_right-Data.treeSize[0])/(data.length-1);

        if(tmp_dis>Data.min_layer_gap){
            Data.layer_gap=tmp_dis;
            canvas_width=size[0];
        }else{
            Data.layer_gap=Data.min_layer_gap;
            canvas_width=(data.length-1)*Data.layer_gap+Data.treeSize[0];
        }
        Data.default_gap=Data.layer_gap;
        Data.canvas_width=canvas_width;
        Data.default_canvas=canvas_width;

        return meanseq;
    };

    meanseq.render = function() {

        if (!container) {
            return;
        }
        dispatch.call('updateScroll',this,size[0]/canvas_width);
        drawMean();

        return meanseq.update();
    };

    meanseq.update = function() {

        let brushScale=d3.scaleLinear().domain([0,data.length-1]).range([0,Data.default_canvas]);

        let brush=d3.brushX()
            .extent([[0,0],[Data.canvas_width+Data.treeSize[0],size[1]]])
            .on('end',brushend);

        d3.select('#mean_canvas').select('.bg_rect').classed('brush',true);
        d3.select('#mean_canvas').select('.bg_rect').call(brush);

        function brushend(){
            if (!d3.event.sourceEvent) return; // Only transition after input.
            if (!d3.event.selection){// Ignore empty selections.
                backToDefault();
                return;
            } 
            var d = d3.event.selection.map(brushScale.invert);
            var idx1=Math.ceil(d[0])
            var idx2=Math.ceil(d[1])
            if(idx1>=idx2){
                idx1=Math.floor(d[0])
                idx2=Math.ceil(d[1])
            }
            var pos1=Data.default_gap*idx1;
            var pos2=Data.default_gap*(idx2-1)+circlepack_size+5;

            d3.select(this).transition().call(d3.event.target.move,[pos1,pos2]);

            updateLayerGap([idx1,idx2-1]);
            Data.zoom=true;
        }

        d3.select('#mean_canvas').selectAll('.egroup.mean')
            .selectAll('.node--leaf')
            .on('mouseover',function(d){
                dispatch.call('markEvent',this, d.data.event);
                tip.show(getTooltip(d));
            })

        d3.select('#mean_canvas').selectAll('.egroup.mean')
            .selectAll('.node--leaf')
            .on('mouseout',function(d){
                dispatch.call('clearMark',this,{});
                tip.hide();
            })

        return meanseq;
    };

    meanseq.updateMeanSeq=function(){
        d3.selectAll('.egroup.mean').call(updateCircleGlyph);
    }

    meanseq.updateStage=function(){
        data=packMeanSeqStage();
        meanseq.layout();
        updateMean();
        // moveCanvas();
        return meanseq.update();
    }

    meanseq.updateColor = function(diff){
        updateColor(diff);
    }

    meanseq.clearBrush = function(){
        d3.select('#mean_canvas').select('.selection').style('display','none');
    }

    //private functions
    function drawMean(){
        let canvas=container.append("g")
            .attr("transform",function(){
                xpos=margin.left;
                ypos=margin.top;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("id","mean_canvas")
            .attr("class","canvas");

        let bg_rect=canvas.append('g')
            .attr('class','bg_rect')
            .attr('transform','translate(0,0)')
            .append('rect')
            .attr('width',Data.canvas_width)
            .attr('height',size[1])
            .style('fill','white')
            .attr('class','bg_rect');

        let coords=[]
        let timeslots=data.length;
        for(let i=0;i<timeslots;i++){
            let x_coord_1=padding_left+i*Data.layer_gap-(circlepack_size-Data.circleSize)/2,
                y_coord_1=size[1]/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;
            coords.push({"x":(x_coord_1+x_coord_2)/2,"y":y_coord_1})
        }

        let links=canvas.append('path')
            .datum(coords)
            .attr('class','event_link')
            .attr('d',line);

        let egroup = canvas.selectAll(".egroup")
            .data(data,(d,i)=>Data.slotids[i])
            .enter()
            .append("g")
            .attr("transform",function(d,i){
                let xpos=padding_left+i*Data.layer_gap-(circlepack_size-Data.circleSize)/2;
                let ypos=size[1]/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            })
            .attr("class","egroup mean")
            .call(circleGlyph);}

    function updateMean(){
        let t=d3.transition().duration(1000);

        d3.select('#mean_canvas').select('.bg_rect')
            .select('rect')
            .transition(t)
            .attr('width',Data.canvas_width);

        let coords=[]
        let timeslots=data.length;
        for(let i=0;i<timeslots;i++){
            let x_coord_1=padding_left+i*Data.layer_gap-(circlepack_size-Data.circleSize)/2,
                y_coord_1=size[1]/2,
                x_coord_2=padding_left+i*Data.layer_gap+circlepack_size;
            coords.push({"x":(x_coord_1+x_coord_2)/2,"y":y_coord_1})
        }
        d3.select('#mean_canvas').select('.event_link').datum(coords).transition(t)
            .attr('d',line);

        let updateMeangroup = d3.select('#mean_canvas').selectAll('.egroup.mean')
            .data(data,(d,i)=>Data.slotids[i]);

        updateMeangroup.enter()
            .append('g')
            .attr('class','egroup mean')
            .attr('transform',function(d,i){
                let xpos=padding_left+i*Data.layer_gap-(circlepack_size-Data.circleSize)/2;
                let ypos=size[1]/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',0);

        updateMeangroup.exit().remove();

        d3.select('#mean_canvas').selectAll('.egroup.mean')
            .transition(t)
            .attr('transform',function(d,i){
                let xpos=padding_left+i*Data.layer_gap-(circlepack_size-Data.circleSize)/2;
                let ypos=size[1]/2 - circlepack_size/2;
                return "translate("+xpos+","+ypos+")";
            })
            .style('opacity',1);
        
        d3.select('#mean_canvas').selectAll('.egroup.mean').call(updateCircleGlyph);
    }

    function circleGlyph(selection){
        let circle_node=selection.selectAll("g")
            .data(function(d,i){
                dat=getCirclePack(d,i);
                return getCirclePack(d,i);
            },(d)=>d.data.id)
            .enter()
            .append("g")
                .attr("transform",function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});

        circle_node
            .append("circle")
            .attr("id",function(d){return "node-"+d.id})
            .attr("r",function(d){return d.r;})
            .attr('eid',function(d){return d.data.event})
            .call(tip);

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
                .data(function(){
                    return getCirclePack(d,i);
                },(d)=>d.data.id);

            let circleEnter=circle_pack.enter()
                .append("g")
                .attr("transform",function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});
            circleEnter.filter(function(d){return d.data.type=="Labs"||"root"})
                .append("circle");
            circleEnter.filter(function(d){return d.data.type=="Medications"})
                .append("polygon");

            circle_pack.exit().remove();

            circle_pack.transition(t)
                .attr('transform',function(d){return "translate("+d.x+","+d.y+")";})
                .attr("class",function(d){return "circle_pack" + (!d.children ? " node--leaf" : d.depth ? "" : " node--root"); })
                .each(function(d){d.node=this});
            })
        selection.selectAll('.circle_pack')
            .select("circle")
            .transition(t)
            .attr("id",function(d){return "node-"+d.id})
            .attr("class",function(d){return d.data.anomaly})
            .attr("r",function(d){return d.r;})
            .attr('eid',function(d){return d.data.event})
            .call(tip);
    }

    function updateColor(diff){
        if(Data.viewStatus=='overlay'){
            d3.select('#mean_canvas').selectAll('.egroup').selectAll('.node--leaf')
                .classed('anomaly',false);
            d3.select('#mean_canvas')
                .selectAll('.egroup')
                .each(function(group,t){
                    d3.select(this).selectAll('.node--leaf')
                        .classed('anomaly',function(d){
                            let event=d.data.event;
                            let seq_event=diff[d.data.layer]['event']
                            return _.contains(seq_event,event)
                        })
                })
            return;
        }
        d3.select('#mean_canvas').selectAll('.egroup').selectAll('.node--leaf')
            .classed('less',false)
            .classed('more',false)
            .classed('anomaly',false);

        d3.select('#mean_canvas')
            .selectAll('.egroup')
            .each(function(group,t){
                d3.select(this).selectAll('.node--leaf')
                    .classed('less',function(d){
                        let diff_event=_.unzip(diff[t]['less'])[0]
                        return _.contains(diff_event,d.data.event)
                    })
                    .classed('more',function(d){
                        let diff_event=_.unzip(diff[t]['more'])[0]
                        return _.contains(diff_event,d.data.event)
                    })
            })
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

    function getCirclePack(dat,slot){
        let result=[{"id":"root","type":"root"}]
        let e_value=_.zip(dat['event'],dat['prop']);
        e_value.forEach(function(d,i){
            obj={
                "id":"root."+d[0],
                "event":d[0],
                "value":d[1],
                "type":Data.idx2type[d[0]],
                "layer":slot
            }
            result.push(obj)
        })

        var stratify = d3.stratify()
            .parentId(function(d) { return d.id.substring(0, d.id.lastIndexOf(".")); });
        var root=stratify(result)
            .sum(function(d){return d.value;})
            .sort(function(a,b){return b.value-a.value});

        var pack=d3.pack()
            .size([circlepack_size,circlepack_size])
            .padding(0.5);

        pack(root);

        return root.descendants();
    }

    function updateLayerGap(range){
        let range_length=range[1]-range[0]+1;
        if(range_length==1){
            Data.layer_gap=size[0]/2;
        }else{
            let tmp_dis;
            tmp_dis=(size[0]-padding_left-padding_right-Data.treeSize[0])/(range_length-1);

            if(tmp_dis>Data.min_layer_gap){
                Data.layer_gap=tmp_dis;
                Data.canvas_width=(data.length-1)*Data.layer_gap+Data.treeSize[0];
            }else{
                Data.layer_gap=Data.min_layer_gap;
                canvas_width=(data.length-1)*Data.layer_gap+Data.treeSize[0];
            }
        }
        dispatch.call('updateLayerGap',this, {});
        dispatch.call('moveCanvasTo',this, range[0]);
    }

    function backToDefault(){
        Data.layer_gap=Data.default_gap;
        Data.canvas_width=Data.default_canvas;
        dispatch.call('updateLayerGap',this,{});
        dispatch.call('moveCanvas',this,0);
        Data.zoom=false;
    }

    function moveCanvas(){
        dispatch.call('moveCanvas',this,0);
    }

/*************Data Related functions***********/
    function packMeanSeqStage(){
        let result=[]
        stage.forEach(function(d,i){
            let event_tmp=[]
            let props_tmp=[]
            let start_idx,end_idx;
            if(i==0){
                start_idx=0;
            }else{
                start_idx=stage[i-1];
            }
            end_idx=d-1;
            for(let idx=start_idx;idx<=end_idx;idx++){
                let event=Data.meanseq[idx]['event'];
                let prop=Data.meanseq[idx]['prop'];
                if(Data.stage_expand[i]==1){
                    result.push({'event':event,'prop':prop})
                }else{
                    event_tmp.push(event);
                    props_tmp.push(prop);
                }
            }
            if(event_tmp.length>0){
                let zipped_prop=_.zip.apply(null,props_tmp);
                let avg_prop=zipped_prop.map(x=>d3.sum(x)/x.length);
                result.push({'event':event_tmp[0],'prop':avg_prop});
            }
        })
        Data.meanseqStage=result;
        return result;
    }

    function getTooltip(d){
        obj={}
        obj['Event_Name']=Data.idx2label[d.data.event];
        obj['Mean_Prob']=probFormat(d.data.value);
        return Util.getTooltipHtml(obj);
    }

    return meanseq;
};
