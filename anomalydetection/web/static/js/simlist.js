Vis.simlist = function() {

    var simlist = {},
        container = null,
        data = null,
        size = [960, 800],
        margin = { left: 10, top: 10, right: 10, bottom: 10 },
        dispatch = d3.dispatch("markEvent","clearMark");

    let nodeSize=[24,14],
        gapHeight=20,
        linemapWidth=124,
        capacity=3,
        vDistance=gapHeight-nodeSize[1],
        picSize=[93,93],
        minHeight=100,
        idHeight=20
        gapWidth=(linemapWidth-nodeSize[0]*capacity)/(capacity-1);

    let maxDigits=4;

    // tip
    let tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10,0])
        .html(function(d) {
            return d;
        });


    simlist.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return simlist;
    };

    simlist.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return simlist;
    };

    simlist.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return simlist;
    };

    simlist.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return simlist;
    };

    simlist.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    simlist.layout = function() {

        return simlist;
    };

    simlist.render = function() {

        if (!container) {
            return;
        }
        for(var key in data){
            let all_events=_.flatten(data[key]["seq"]["event"])
            let seq=_.uniq(all_events);
            let freqs=[]
            seq.forEach(function(e){
                let freq=_.filter(all_events,function(d){return d==e;}).length;
                freqs.push(freq);
            })
            let linenums=Math.ceil(seq.length/capacity);
            let height=nodeSize[1]*linenums+vDistance*(linenums-1);
            if(height<minHeight){
                height=minHeight;
            }
            let pbox=container.append("svg")
                .attr("xmlns","http://www.w3.org/2000/svg")
                .attr("xmlns:xlink","http://www.w3.org/1999/xlink")
                .attr("class","pbox")
                .attr("width","100%")
                .attr("height",height+margin.top+margin.bottom)
                .attr("id",key);

            pbox.append("image")
                .attr("class","plist_img")
                .attr("xlink:href",function(){
                    let gender=Util.getRandomInt(2);
                    if(gender){
                        return Util.getRandomPic("F");
                    }else{
                        return Util.getRandomPic("M");
                    }
                })

            pbox.append("rect")
                .attr("class","plist_info")
                .attr("y",picSize[0]-idHeight)
                .attr("width",picSize[0])
                .attr("height",idHeight);

            pbox.append("text")
                .attr("class","plist_infotxt")
                .attr("y",picSize[0]-idHeight/4)
                .attr("x",5)
                .text("ID:"+data[key]['pid']);


            let path_canvas=pbox.append('g')
                .attr("transform",function(){
                    let xpos=picSize[0]+10;
                    return "translate("+xpos+",0)";
                })

            let seqCoords=getSeqCoords(seq);
            let lineFunction=d3.line()
                .curve(d3.curveLinear)
                .x(function(d){return d.x+nodeSize[0]/2;})
                .y(function(d){return d.y+nodeSize[1]/2;});
            path_canvas.append("path")
                .attr("d",lineFunction(seqCoords))
                .attr("class","plist_path");

            let plist_event=path_canvas.selectAll(".plist_event")
                .data(_.zip(seq,seqCoords,freqs))
                .enter()
                .append("g")
                .attr('class','plist_event')
                .attr('transform',function(d){
                    return 'translate('+d[1].x+','+d[1].y+')';
                })
                .call(tip);

            plist_event.append('rect')
                .attr("x",0)
                .attr("y",0)
                .attr("width",nodeSize[0])
                .attr("height",nodeSize[1]);

            plist_event.append('text')
                .attr('x',nodeSize[0]/2)
                .attr('y',nodeSize[1]/2)
                .attr('class','event_txt')
                .text(function(d){
                    return Data.idx2label[d[0]].slice(0,maxDigits);
                });
        }

        return simlist.events();
    };

    simlist.events = function(){
        container.selectAll('.plist_event')
            .on('mouseover',function(d){
                tip.show(getTooltip(d));
                dispatch.call("markEvent",this,d[0]);
            })
            .on('mouseout',function(d){
                tip.hide();
                dispatch.call('clearMark',this,{})
            })
    }

    simlist.update = function() {
        if(Data.selectlist.length>0){
             container.selectAll("svg")
                    .style('display',function(d){
                        if(_.contains(Data.selectlist,d3.select(this).attr('id'))){
                            return 'block'
                        }else{
                            return 'none';
                        }
                    })
        }else{
            container.selectAll("svg").style('display','block');
        }
        return simlist;
    };

    ///////////////////////////////////////////////////
    // Private Functions

    function getSeqCoords(data){
        let coords=[];
        for(let i=1;i<=data.length;i++){
            let linenum=Math.ceil(i/capacity);
            let ypos=(linenum-1)*(nodeSize[1]+vDistance);
            let xpos;
            let index=i%capacity==0?3:i%capacity;
            if(linenum==1){
                xpos=(i-1)*(nodeSize[0]+gapWidth);
                coords.push({"x":xpos,"y":ypos});
                continue;
            }
            if(linenum%2==0){
                xpos=(capacity-index)*(nodeSize[0]+gapWidth);
            }else{
                xpos=(index-1)*(nodeSize[0]+gapWidth);
            }
            coords.push({"x":xpos,"y":ypos});
        }
        return coords;
    }

    function getTooltip(d){
        obj={}
        obj['Event_Name']=Data.idx2label[d[0]];
        // obj['Event_Type']=Data.idx2type[d[0]];
        obj['Frequency']=d[2];
        return Util.getTooltipHtml(obj);
    }

    return simlist;
};
