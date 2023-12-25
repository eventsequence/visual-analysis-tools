Vis.navi = function() {

    var navi = {},
        container = null,
        data = null,
        size = [960, 800],
        margin = { left: 10, top: 30, right: 10, bottom: 10 },
        dispatch = d3.dispatch("updateStage");

    let padding_left=10,
        padding_right=10,
        padding_top=3;

    let scrollScale=d3.scaleLinear();

    let drag_behavior=d3.drag()
            .on("start",dragstart)
            .on("drag",ondrag);

    navi.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return navi;
    };

    navi.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return navi;
    };

    navi.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return navi;
    };

    navi.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return navi;
    };

    navi.stage=function(_){
        if (!arguments.length) return stage;
        stage = _;
        return navi;
    }

    navi.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    navi.layout = function() {

        this.size([$("#navi_svg").width()-margin.left-margin.right,
                    $("#navi_svg").height()-margin.top-margin.bottom]);

        return navi;
    };

    navi.render = function() {

        if (!container) {
            return;
        }

        return navi.update();
    };

    navi.update = function() {
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
        return navi;
    };

    navi.initScroll=function(){
        drawScrollBar(1);
    }

    navi.updateScroll = function(d){
        updateScrollBar(d);
        drawSlotNum();
        drawStageBar();
        return navi.update();
    }

    navi.moveCanvas=function(d){
        moveCanvas(d);
    }

    navi.moveCanvasTo=function(d){
        moveCanvasTo(d);
    }

    navi.updateStage=function(){
        updateStageBar();
    }

    navi.updateScrollScale=function(d){
        updateScrollScale();
    }


    ///////////////////////////////////////////////////
    // Private Functions

    function drawScrollBar(percent){

        Data.scrollDomain=[padding_left,(1-percent)*size[0]];

        scrollScale.domain(Data.scrollDomain);

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

    }

    function updateScrollBar(percent){
        let t=d3.transition().duration(500);
        Data.scrollDomain=[padding_left,(1-percent)*size[0]]

        scrollScale.domain(Data.scrollDomain);
        d3.select('#scrollBar')
            .select('.selection')
            .transition(t)
            .attr('x',size[0]*(1-percent))
            .attr('width',size[0]*percent);

        d3.select('#scrollBar').select('.selection')
            .call(drag_behavior);
    }

    function drawSlotNum(){
        //draw slot num
        let slot_num=container.append("g")
            .attr("id","slot_num")
            .attr("class","canvas")
            .attr('transform',function(){
                xoffset=-(Data.canvas_width-size[0]+padding_right)
                ypos=margin.top;
                return 'translate('+xoffset+','+ypos+')';
            })

        slot_num.selectAll(".slotnum_txt")
            .data(d3.range(Data.meanseq.length).map(x=>"#"+x),(d)=>d)
            .enter()
            .append("text")
            .attr("class","slotnum_txt")
            .attr("x",function(d,i){return i*Data.layer_gap+Data.circleSize/2+padding_left})
            .text(function(d){return d});
    }

    function drawStageBar(){
        let stage_length=_.map(stage,function(x,i){return i==0?x:x-stage[i-1]});
        let stage_id=_.map(stage,function(x,i){return i});

        let stage_canvas=container.append("g")
            .attr("id","stage_canvas")
            .attr("class","canvas")
            .attr("transform",function(){
                xoffset=-(Data.canvas_width-size[0]+padding_right)
                ypos=margin.top+20;
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
            .attr("width",function(d){return (d[2]-1)*Data.layer_gap+Data.circleSize})
            .attr("height",15)
            .attr("class","stage_line_bg")
            .attr("fill",'white');

        stage_bars.append("line")
            .attr("x1",0)
            .attr("x2",(d)=>(d[2]-1)*Data.layer_gap+Data.circleSize)
            .attr("class","stage_line expand");
    }

    function updateStageBar(){

        let t=d3.transition().duration(1000);

        let slot_nums=d3.select("#slot_num").selectAll(".slotnum_txt")
            .data(Data.slotids,(d)=>d);
        slot_nums.enter()
            .append("text")
            .attr("class","slotnum_txt")
            .attr("x",function(d,i){return i*Data.layer_gap+Data.circleSize/2+padding_left})
            .text(function(d){return d});

        slot_nums.exit().remove();

        d3.selectAll('.slotnum_txt')
            .transition(t)
            .attr("x",function(d,i){return i*Data.layer_gap+Data.circleSize/2+padding_left});

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
                    return (d[2]-1)*Data.layer_gap+Data.circleSize
                }else{
                    return Data.circleSize;
                }
            });
        d3.selectAll(".stage_bar").select("line")
            .transition(t)
            .attr("x1",0)
            .attr("x2",function(d){
                if(d[4]==1){
                    return (d[2]-1)*Data.layer_gap+Data.circleSize
                }else{
                    return Data.circleSize;
                }
            })
        }

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
        }
    }

    function moveCanvas(d){
        let t=d3.transition().duration(d);
        //move canvas
        xoffset=-(Data.canvas_width-size[0]+padding_right)
        d3.selectAll('.canvas').transition(t).attr("transform",function(){
            let t=Util.getTranslate(d3.select(this).attr("transform")),
                xpos=xoffset,
                ypos=t[1];
                return "translate("+xpos+","+ypos+")";
            })

        scrollScale.range([padding_left,xoffset]);
    }

    function updateScrollScale(){
        xoffset=-(Data.canvas_width-size[0]+padding_right);
        scrollScale.range([padding_left,xoffset]);
    }


    function moveCanvasTo(startidx){
        let startpos=startidx*Data.layer_gap;
        let canvas=d3.selectAll('.canvas').filter(function(d){
            return d3.select(this).attr('id')!='mean_canvas'&&
                d3.select(this).attr('id')!='slot_num'&&
                 d3.select(this).attr('id')!='stage_canvas'
        });
        canvas.attr('transform',function(){
            let t=Util.getTranslate(d3.select(this).attr("transform")),
                xpos=-startpos,
                ypos=t[1];
                return "translate("+xpos+","+ypos+")";
        })

    }

    return navi;
};
