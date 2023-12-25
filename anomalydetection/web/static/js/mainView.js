Vis.mainView = function() {

    var mainView = {},
        container = null,
        data = null,
        size = [960, 800],
        margin = { left: 10, top: 10, right: 10, bottom: 10 },
        dispatch = d3.dispatch("select", "mouseover", "mouseout");

    mainView.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return mainView;
    };

    mainView.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return mainView;
    };

    mainView.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return mainView;
    };

    mainView.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return mainView;
    };

    mainView.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    mainView.init = function(){
        if(!container){
            return;
        }
        size=[$("#mainview").width()-margin.left-margin.right,
                $("#mainview").height()-margin.top-margin.bottom];

        console.log(data);
        let flowObj=computeFlow(data);
        initSankey(flowObj);
        mainView.update();
    }

    mainView.layout = function() {
        return mainView;
    };

    mainView.render = function() {

        if (!container) {
            return;
        }

        return mainView.update();
    };

    mainView.update = function() {

        d3.selectAll(".sankey_node,.sankey_link").on("mouseover", function(d) {
            let rlist = d.info["rlist"];
            highlightPath(rlist);
        })

        d3.selectAll(".sankey_node,.sankey_link").on("mouseout",function(d){
            clearHighlight();
        })

        return mainView;
    };

    ///////////////////////////////////////////////////
    // Private Functions

    function initSankey(data){
        let nodes=data["nodes"];
        let links=data["links"];

        let canvas=container.append("g")
                .attr("transform","translate("+margin.left+","+margin.top+")");
        let sankey=d3.sankey()
            .nodeWidth(10)
            .nodePadding(10)
            .size(size)
        console.log(size);
        let path=sankey.link();

        sankey.nodes(nodes)
            .links(links)
            .layout(32);

        let link=canvas.append("g").selectAll(".link")
            .data(links)
            .enter().append("path")
            .attr("class","sankey_link")
            .attr("d",path)
            .style("stroke-width",function(d){return Math.max(1,d.dy);})
            .sort(function(a,b){return b.dy-a.dy;});

        //add link titles
        link.append("title")
            .text(function(d) {
            return d.source.name + " → " +
                d.target.name + "\n" + "("+d.value+")";
            });

        let node=canvas.append("g").selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class","sankey_node")
            .attr("transform",function(d){
                return "translate("+d.x+","+d.y+")";
            });

        node.append("rect")
            .attr("height",function(d){return Math.max(2,d.dy);})
            .attr("width",sankey.nodeWidth())
            .attr("rx", 1)
            .attr("ry", 1)
            .append("title")
            .text(function(d){
                return d.name + "\n" +"("+d.value+")";
            })
    }

    function highlightPath(rlist){
        d3.selectAll(".sankey_node,.sankey_link").classed("highlight",function(d){
            let intersect = _.intersection(rlist, d.info["rlist"]);
            if (intersect.length > 0) {
                if(d3.select(this).classed("sankey_link")){
                    d3.select(this)
                        .style("stroke-width",function(link){return Math.max(1, intersect.length*link.dy/link.info["rlist"].length)})
                }
                if(d3.select(this).classed("sankey_node")){
                    var t=d3.transition().duration(300);
                    d3.select(this).transition(t).attr("height",function(node){return Math.max(3,intersect.length*node.dy/node.info["rlist"].length)})
                }
                return true;
            } else {
                d3.select(this).classed("fade", true);
            }
        })
    }

    function clearHighlight(){
        d3.selectAll('.sankey_link').style("stroke-width",function(link){return Math.max(1,link.dy)});
        d3.selectAll(".sankey_node").attr("height",function(node){return Math.max(2,node.dy)});
        d3.selectAll(".highlight").classed("highlight",false);
        d3.selectAll(".fade").classed("fade",false);
    }

    function computeFlow(data){

        var nodeMap = new Map();
        var linkMap = new Map();

        for(let pid in data){
            var events=data[pid]["event"];
            var seq_len=events.length;
            events.forEach(function(group,t){
                var group_nums=group.length;
                group.forEach(function(eid){
                    var node_name=eid+"("+t+")"
                    if(!nodeMap.has(node_name)){
                        nodeMap.set(node_name,{"rlist":[],"layer":t})
                    }
                    var node_info=nodeMap.get(node_name);
                    node_info["rlist"].push(pid);
                    nodeMap.set(node_name,node_info);
                    if(t<seq_len-1){
                        var t_group=events[t+1];
                        var t_group_num=t_group.length;
                        link_value=1/(group_nums*t_group_num)
                        t_group.forEach(function(etid){
                            var t_step=t+1;
                            var t_node_name=etid+"("+t_step+")";
                            var linkkey=node_name+","+t_node_name;
                            if(!linkMap.has(linkkey)){
                                linkMap.set(linkkey,{"rlist":[],"value":0})
                            }
                            var link_info=linkMap.get(linkkey)
                            link_info["rlist"].push(pid);
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

            nodes.push(node_obj);
            node_id+1;
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
            links.push(link_obj);
        }

        flowObj={
            "nodes":nodes,
            "links":links,
            "layer_node":_.groupBy(nodes,function(node){return node.info.layer;})
        };
        console.log(flowObj);
        return flowObj;

        return flowObj;
    };

    return mainView;
};
