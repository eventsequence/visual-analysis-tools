Vis.simseq = function() {

    var simseq = {},
        container = null,
        data=null,
        alignment=null,
        size = [960, 800],
        margin = { left: 20, top: 20, right: 10, bottom: 20 },
        dispatch = d3.dispatch("select", "mouseover", "mouseout");

    //element attributes
    let nodePadding=10,
        prop_width=6,
        main_width=23,
        max_timelen=10,
        link_width=1,
        timebar_padding=2;

    let padding_left=10;

    let nodeWidth=prop_width+main_width+timebar_padding;

    //scales
    let timeScale=d3.scaleLog();
    let scrollScale=d3.scaleLinear();

    let popFormat=d3.format(".1f");


    simseq.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return simseq;
    };

    simseq.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return simseq;
    };

    simseq.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return simseq;
    };

    simseq.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return simseq;
    };

    simseq.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Public Function
    simseq.layout = function() {

        this.size([$("#comp_svg").width()-margin.left-margin.right,
                    $("#comp_svg").height()-margin.top-margin.bottom]);

        return simseq;
    };

    simseq.render = function() {

        if (!container) {
            return;
        }

        return simseq.update();
    };

    simseq.update = function() {

        d3.selectAll(".main_node,.sankey_timebar").on("mouseover", function(d) {
            let rlist = d.info["rlist"];
            highlightPath(rlist);
        })

        d3.selectAll(".main_node,.sankey_timebar").on("mouseout",function(d){
            clearHighlight();
        })

        d3.selectAll(".main_node,.sankey_timebar").on("click",function(d){
            if(d3.select(this.parentNode).classed("fade")){
                clearHighlight(true);
                Data.selectlist=[];
                return;
            }
            let rlist=d.info["rlist"];
            selectPath(rlist);
        })


        return simseq;
    };

    simseq.init = function(){

        let delim=container.append("line")
            .attr("class","delim")
            .attr("x1",0)
            .attr("y1",size[1]+margin.top+margin.bottom)
            .attr("x2",size[0]+margin.left+margin.right)
            .attr("y2",size[1]+margin.top+margin.bottom);

        flowData=computeFlow(data);
        //cal timescale
        timeScale.domain(d3.extent(flowData.links,function(d){
            return d3.sum(d.info.tlist)/d.info.tlist.length}))
            .range([0,max_timelen]);

        if(timeScale.domain()[0]==0){
            timeScale.domain([1e-6, timeScale.domain()[1]]);
        }
        initSankey(flowData);
        return simseq.update();
    }

    simseq.moveCanvas=function(d){
        moveCanvas(d);
    }

    simseq.updateSankey=function(){
        let nodes=Data.flowObj["nodes"];
        let links=Data.flowObj["links"];
        let updated_nodes=_.filter(nodes,function(d){return d3.sum(d.info.props)>=Data.minNode;});
        let updated_links=_.filter(links,function(d){return _.contains(updated_nodes.map(x=>x.node),d.source.node)
                                                            &&_.contains(updated_nodes.map(x=>x.node),d.target.node)})

        updateSankey({"nodes":updated_nodes,"links":updated_links});
    }

    simseq.updateStage=function(){
        
    }

    ///////////////////////////////////////////////////
    // Private Functions
    function updateSankey(data){
        let t=d3.transition().duration(1000);
        let nodes=data["nodes"];
        let links=data["links"];

        let sankey=d3.sankey()
            .nodeWidth(nodeWidth)
            .nodePadding(nodePadding)
            .size(size);

        let path=sankey.vlink(timeScale);

        sankey.nodes(nodes)
            .links(links)
            .layout(32);

        let updatelinks=d3.select(".g_links").selectAll(".sankey_link")
            .data(links,(d)=>d.source.name+','+d.target.name);

        let linkEnter=updatelinks.enter()
            .insert("g")
            .attr("class","sankey_link");

        updatelinks.exit().remove();

        //timebar
        linkEnter.append("rect")
            .attr("class","sankey_timebar");

        linkEnter.append("rect")
            .attr("class","timebar_hl");

        linkEnter.append("path")
            .attr("class","link_path");

        d3.selectAll(".sankey_link").transition(t).attr("transform","translate("+padding_left+",0)");

        d3.selectAll(".sankey_timebar")
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

        d3.selectAll(".timebar_hl")
            .transition(t)
            .attr("x",function(d){return d.source.x+prop_width+main_width+timebar_padding;})
            .attr("y",function(d){return d.source.y+d.sy})
            .attr("width",function(d){
                let avg_time=d3.sum(d.info.tlist)/d.info.tlist.length;
                if(avg_time<=1e-6){
                    return 0
                }else{
                    return timeScale(avg_time)
                }
            });

        d3.selectAll(".link_path")
            .transition(t)
            .attr("d",path)
            .style("stroke-width",function(d){
                return link_width;
            })

        let updatenodes=d3.select(".g_nodes").selectAll(".sankey_node")
            .data(nodes,(d)=>d.name);

        updatenodes.exit().remove();

        let nodeEnter=updatenodes.enter()
            .insert("g")
            .attr("class","sankey_node");

        nodeEnter.append("rect")
            .attr("class","prop_rect");

        nodeEnter.append("rect")
            .attr("class","main_node")
            .classed("anomaly",function(d){return d.anomaly});

        nodeEnter.append("text")
            .attr("class","pop_txt")

        d3.selectAll(".sankey_node")
            .transition(t)
            .attr("transform",function(d){
                let xpos=d.x+padding_left;
                return "translate("+xpos+","+d.y+")";
            });

        d3.selectAll(".prop_rect")
            .transition(t)
            .attr("height",function(d){return Math.max(2,d.dy);})
            .attr("width",prop_width);

        d3.selectAll(".main_node")
            .transition(t)
            .attr("height",function(d){return Math.max(2,d.dy);})
            .attr("width",main_width)
            .attr("x",prop_width);

        //add text
        d3.selectAll(".pop_txt")
            .transition(t)
            .text(function(d){
                if(d.dy<10){
                    return ""
                }else{
                    let pop=Math.max(d3.sum(d.sourceLinks,function(d){return d.value}),d3.sum(d.targetLinks,function(d){return d.value}))
                    return popFormat(pop);
                }
            })
            .attr("x",function(d){return -d.dy/2})
            .attr("y",prop_width/2+0.5)
            .attr("transform","rotate(270)");
    }

    function initSankey(data){
        let nodes=data["nodes"];
        let links=data["links"];

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
            });

        //highlighting bar
        linkEnter.append("rect")
            .attr("class","timebar_hl")
            .attr("x",function(d){return d.source.x+prop_width+main_width+timebar_padding;})
            .attr("y",function(d){return d.source.y+d.sy})
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
            });

        //proportion
        node.append("rect")
            .attr("class","prop_rect")
            .attr("height",function(d){return Math.max(2,d.dy);})
            .attr("width",prop_width);

        //main node
        node.append("rect")
            .attr("class","main_node")
            .attr("height",function(d){return Math.max(2,d.dy);})
            .attr("width",main_width)
            .attr("x",prop_width)
            .classed("anomaly",function(d){return d.anomaly});

        //overlay anomaly
        // node.append("rect")
        //     .attr("class","anomaly_main")
        //     .attr("width",prop_width)
        //     .attr("height",function(d){
        //         let ab_prop=d3.sum(d.info.ablist)/d.info.ablist.length;
        //         return d.dy*ab_prop;
        //     })
        //     .attr("x",0);

        //add text
        node.append("text")
            .attr("class","pop_txt")
            .text(function(d){
                if(d.dy<10){
                    return ""
                }else{
                    let pop=Math.max(d3.sum(d.sourceLinks,function(d){return d.value}),d3.sum(d.targetLinks,function(d){return d.value}))
                    return popFormat(pop);
                }
            })
            .attr("x",function(d){return -d.dy/2})
            .attr("y",prop_width/2+0.5)
            .attr("transform","rotate(270)");


        // var canvas_width=$("#sankey_canvas")[0].getBoundingClientRect().width;
        // //move canvas
        // xoffset=margin.left-(canvas_width-size[0])
        // d3.select("#sankey_canvas").attr("transform","translate("+xoffset+","+margin.top+")")

        // scrollScale.domain(Data.scrollDomain);
        // scrollScale.range([margin.left,xoffset]);
    }

    function moveCanvas(d){
        d3.select("#sankey_canvas").attr("transform",function(){
            let t=Util.getTranslate(d3.select(this).attr("transform"));
            let xpos=scrollScale(d);
            let ypos=t[1];
            return "translate("+xpos+","+ypos+")";
        })
    }

    function highlightPath(rlist){
        if(Data.selectlist.length){
            return;
        }
        d3.selectAll(".sankey_node,.sankey_link").classed("highlight",function(d){
            var intersect = _.intersection(rlist, d.info["rlist"]);
            if (intersect.length > 0) {
                if(d3.select(this).classed("sankey_link")){
                    d3.select(this).select(".timebar_hl")
                        .attr("height",function(link){
                            return Math.max(1, intersect.length*link.dy/link.info["rlist"].length);
                        })
                        .attr("y",function(link){
                            let height=Math.max(1, intersect.length*link.dy/link.info["rlist"].length);
                            return d.source.y+d.sy+(link.dy-height)/2;
                        })
                }
                // if(d3.select(this).classed("sankey_node")){
                //     var t=d3.transition().duration(300);
                //     d3.select(this).transition(t).attr("height",function(node){return Math.max(3,intersect.length*node.dy/node.info["rlist"].length)})
                // }
                return true;
            } else {
                if(!d3.select(this).classed("select")){
                    d3.select(this).classed("fade", true);
                }
            }
        })
    }

    function clearHighlight(force){

        if(!force&&Data.selectlist.length){
            return;
        }

        d3.selectAll('.timebar_hl').attr("height",0);

        d3.selectAll(".sankey_node").attr("height",function(node){return Math.max(2,node.dy)});
        d3.selectAll(".highlight").classed("highlight",false);
        d3.selectAll(".fade").classed("fade",false);
        d3.selectAll(".select").classed("select",false);
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
                if(d3.select(this).classed("sankey_link")){
                    d3.select(this).select(".timebar_hl")
                        .attr("height",function(link){
                            return Math.max(1, intersect.length*link.dy/link.info["rlist"].length);
                        })
                        .attr("y",function(link){
                            let height=Math.max(1, intersect.length*link.dy/link.info["rlist"].length);
                            return d.source.y+d.sy+(link.dy-height)/2;
                        })
                }
                return true;
            }else{
                d3.select(this).classed("fade",true);
            }
        })
    }

    function computeFlow(data){

        var nodeMap = new Map();
        var linkMap = new Map();

        for(let pid in data){
            var events=data[pid]["a_event"];
            var times=data[pid]["a_time"];
            // var abevents=data[pid]["a_abevents"]
            var seq_len=events.length;
            events.forEach(function(group,t){
                var group_nums=group.length;
                group.forEach(function(eid,eindex){
                    var node_name=eid+"("+t+")"
                    var etime=times[t][eindex];
                    if(!nodeMap.has(node_name)){
                        nodeMap.set(node_name,{"rlist":[],"tlist":[],"props":[],"layer":t})
                    }
                    var node_info=nodeMap.get(node_name);
                    node_info["rlist"].push(pid);
                    node_info["tlist"].push(times[t][eindex])
                    // node_info["ablist"].push(abevents[t][eindex])
                    node_info["props"].push(1/group_nums);
                    nodeMap.set(node_name,node_info);
                    if(t<seq_len-1){
                        var t_group=events[t+1];
                        var t_group_num=t_group.length;
                        link_value=1/(group_nums*t_group_num)
                        t_group.forEach(function(etid,etindex){
                            var t_step=t+1;
                            var ettime=times[t+1][etindex];
                            var t_node_name=etid+"("+t_step+")";
                            var linkkey=node_name+","+t_node_name;
                            if(!linkMap.has(linkkey)){
                                linkMap.set(linkkey,{"rlist":[],"tlist":[],"value":0})
                            }
                            var link_info=linkMap.get(linkkey)
                            link_info["rlist"].push(pid);
                            link_info["tlist"].push(ettime-etime);
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
        console.log(flowObj);

        return flowObj;
    }

    return simseq;
};
