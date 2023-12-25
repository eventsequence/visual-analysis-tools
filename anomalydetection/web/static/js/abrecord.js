Vis.abrecord = function() {

    var abrecord = {},
        container = null,
        data = null,
        size = [960, 800],
        margin = { left: 10, top: 10, right: 10, bottom: 10 },
        dispatch = d3.dispatch("markEvent","clearMark","switchAbrecord");
    var ageFormat=d3.format(".0f");

    let nodeSize=[24,14],
        gapHeight=15,
        linemapWidth=124,
        capacity=3,
        vDistance=gapHeight-nodeSize[1],
        picSize=[80,80],
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

    abrecord.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return abrecord;
    };

    abrecord.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return abrecord;
    };

    abrecord.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return abrecord;
    };

    abrecord.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return abrecord;
    };

    abrecord.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    abrecord.layout = function() {

        return abrecord;
    };

    abrecord.render = function() {

        if (!container) {
            return;
        }

        d3.select('#profile_icons').style('display','block');

        let img_container=container.select("#profile_pic");
        img_container.append("img")
            .attr("src",function(){
                return Util.getProfilePic();
            })

        d3.select("#gender_label").text(function(){
            if(data.gender=="F"){
                return "Female";
            }else{
                return "Male";
            }
        })

        d3.select("#name_label").text(function(){
            if(data.gender=="F"){
                return Data.femaleName;
            }else{
                return Data.maleName;
            }
        })

        d3.select("#id_label").text(Data.abid);

        d3.select("#age_label").text(function(){
            let seq_starttime=Data.seqs["time"][0][0];
            let time_diff=seq_starttime-data.birthday;
            return ageFormat(Util.second2Year(time_diff));
        })

        return abrecord.update();
    };

    abrecord.renderSeq=function(){
        if (!container) {
            return;
        }
        let all_events=_.flatten(data["event"])
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
            .attr("class","abbox")
            .attr("width","100%")
            .attr("height",height)
            .attr("id",Data.abid);

        pbox.append("image")
            .attr("class","abrecord_img")
            .attr("xlink:href",Util.getProfilePic())

        pbox.append("rect")
            .attr("class","plist_info")
            .attr("y",picSize[0]-idHeight)
            .attr("width",picSize[0])
            .attr("height",idHeight);

        pbox.append("text")
            .attr("class","plist_infotxt")
            .attr("y",picSize[0]-idHeight/4)
            .attr("x",5)
            .text("ID:"+Data.abid);


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
            });

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

        return abrecord.update();
    }

    abrecord.update = function() {
        container.selectAll('.plist_event')
            .on('mouseover',function(d){
                tip.show(getTooltip(d));
                dispatch.call("markEvent",this,d[0]);
            })
            .on('mouseout',function(d){
                tip.hide();
                dispatch.call('clearMark',this,{})
            })

        d3.select('.dual_switch').on('click',function(){
            dispatch.call('switchAbrecord',this,{});
        })
        return abrecord;
    };

    abrecord.clearView = function(){
        d3.select('#profile_icons').style('display','none');
        d3.select('#profile_pic').select('img').remove();
    }


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
    return abrecord;
};
