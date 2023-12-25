// import * as _ from '../lib/underscore'
// import { sankey as Sankey } from 'd3-sankey';

export const Simvis = function() {
    var simvis = {},
        container = null,
        Canvas = null,
        clusCanvas = null,
        seqCanvas = null,
        originCanvas = null,
        data = null,
        treatment = null,
        disease = null,
        disease_list = null,
        eventCount = {},
        selected_disease = null,
        selected_code = null,
        predict_result = null,
        type = null,
        cluster = null,
        sliderCanvas = null,
        // size = [796, 534],
        seqSize = [1000, 500],
        margin = {top: 4, right: 0, bottom: 10, left: 0},
        diseaseColors = null,
        currentPid = null,
        typeColors = {
            'diagnose': '#23C5BC',
            'Treatments': '#FDCA3D',
        },
        typeColor2 = {
            'diagnose': '#7D7D7D',
            // 'Treatments': '#365d7e'
            // 'Treatments': '#4b89ac',
            'Treatments': '#BFBFBF'
        },
        typeColor3 = {
            // 'diagnose': '#7D7D7D',
            'diagnose': '#FFFFFF',
            'Treatments': '#FFFFFF',
        },
        threadNum = 0,
        dispatch = d3.dispatch('select')

    simvis.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return simvis;
    }

    simvis.predict_result = function(_) {
        if (!arguments.length) return predict_result;
        predict_result = _;
        return simvis;
    }

    simvis.currentPid = function(_) {
        if (!arguments.length) return currentPid;
        currentPid = _;
        return simvis;
    }

    simvis.selected_disease = function(_) {
        if (!arguments.length) return selected_disease;
        selected_disease = _;

        selected_code = []
        if(selected_disease){
            selected_disease.forEach(function(d){
                // selected_code.push(parseInt(type[disease_list[d]]))
                selected_code.push(disease_list[d])
            }) 
        }
       
        return simvis;
    }

    simvis.diseaseColors = function(_) {
        if (!arguments.length) return diseaseColors;
        diseaseColors = _;
        return simvis;
    }

    simvis.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return simvis;
    }

    simvis.cluster = function (_) {
        if (!arguments.length) return cluster
        cluster = _
        return simvis
    }

    simvis.treatment = function(_) {
        if(!arguments.length) return treatment;
        treatment = _;
        return simvis;
    }

    simvis.disease = function(_) {
        if(!arguments.length) return disease;
        disease = _;
        return simvis;
    }

    simvis.disease_list = function(_) {
        if (!arguments.length) return disease_list;
        disease_list = _;
        return simvis;
    }

    simvis.type = function(_) {
        if(!arguments.length) return type;
        type = _;
        return simvis;
    }

    simvis.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return simvis;
    }

    simvis.margin = function(_) {
        if(!arguments.length) return margin;
        margin = _;
        return simvis;
    }

    simvis.eventCount = function(_) {
        if(!arguments.length) return eventCount;
        eventCount = _;
        return simvis;
    }

    simvis.loading = function() {
        container.selectAll('#sim-container').remove();
        container.select('.load').remove();
        container.select("#divide_line").remove();
        container.classed('contain', true);
        container.append('div')
        .attr('class', 'load')
        .attr("position","fixed")
        .style('width', '100%')
        .style('height', '100%')
        .html(function(){
            return  "<div class = 'loading' ><div class='loader'><div class='loader-inner ball-clip-rotate-pulse'><div></div><div></div></div><p>Calculating...</p ></div></div>"

        })
        sliderCanvas.attr('display', 'none')
        container.select('.loading').style('display', 'block');
        return simvis;
    }

    simvis.dispatch = dispatch;


    ///////////////////////////////////////////////////
    // Private Parameters
    var treemap = d3.treemap()
        .tile(d3.treemapResquarify)
        .round(false)
        .paddingInner(0.3)
    var pow_scale = 0.1
    var eventRectSize = [31, 16], eventPadding = 20;
    var eventRectPadding = 1;
    let threadHeight = 50
    let stage_num=0
    let seq_data=[]
    let result_data=[]
    let seq_time =[]
    let result_time = []
    let seq_bar = []
    let result_bar = []
    let current_bar = []
    let stage_min_max = []
    let result_min_max = []

    let sequence = []

    let plist = []
    let seq_height = 20
    let event_width = 29
    let seq_padding = 25
    let stage_width=65
    let connect = stage_width-event_width
    let his_width = 800
    let result_width = 800
    let total_height = 500
    let node_mark = {}
    
    let type_reves = {}

    let stage_connect_width = 10

    var sankey = null;
    var max_re_length = 0;

    let duration_scale = d3.scaleLinear().range([4, 12])

    let show_flag = "sequence"
    let highlight_color = "#fc9272"
    let similar_set = []
    var onRect = 0
    var sliderLength = 696;
    var sliderScale = d3.scaleLinear().range([0, sliderLength]);
    var graph = {"nodes" : [], "links" : []};


    simvis.init = function(){

        sliderCanvas = d3.select('#similiar-slider')
        .append('svg')
        .attr('height', 50)
        .attr('width', 796)
        .append('g')
        .attr('transform', 'translate(50,0)')
        .attr('display', 'none')

        sliderCanvas
        .append('line')
        .attr('x1',0)
        .attr('x2', sliderLength)
        .attr('y1', 20)
        .attr('y2', 20)
        .attr('stroke', '#BFBFBF')
        .attr('stroke-width', 4)

        sliderCanvas
        .append('rect')
        .attr('x', 0)
        .attr('y', 20-4)
        .attr('width', 100)
        .attr('height', 8)
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('fill', '#7d7d7d')
        .on('mousedown', dragstart)
        
        $("#similar-seq").on("click",function(d){
            
            show_flag = "sequence"
            draw_switch()
            $(this).css("background","#7D7D7D")
            d3.select("#similar-seq i").style("color","#D2D2D2")
            $("#similar-clus").css("background","#D2D2D2")
            d3.select("#similar-clus i").style("color","#7D7D7D")
        })

        $("#similar-clus").on("click",function(d){
            
            show_flag = "cluster"
            draw_switch()
            $(this).css("background","#7D7D7D")
            d3.select("#similar-clus i").style("color","#D2D2D2")
            $("#similar-seq").css("background","#D2D2D2")
            d3.select("#similar-seq i").style("color","#7D7D7D")
        })

        return simvis;
    }
    ///////////////////////////////////////////////////
    // Public Function
    simvis.layout = function() {

        show_flag = "sequence"
        Object.keys(type).forEach(function(key){
            type_reves[type[key]] = key
        })


        let old_seq_data =[]
        let old_result_data = []
        let old_seq_time =[]
        let old_result_time = []
        let old_similar_set = []

        Object.keys(data['align']).forEach(function(key){
            old_seq_data.push(data['align'][key])
            old_similar_set.push(key)
        })
        stage_num = old_seq_data[0].length

        his_width = stage_num*(stage_width)-connect
        total_height = (old_seq_data.length)*threadHeight + 90

        total_height = Math.max(cluster.cluster_height+seq_height+90,total_height)
        // sankey = d3.sankey()
        //     .nodeWidth(event_width)
        //     .nodePadding(5)
        //     .size([his_width+stage_width, 500])
        
        max_re_length = 0
        let re_length = []
        Object.keys(data['result']).forEach(function(key){
            old_result_data.push(data['result'][key])
            re_length.push(data['result'][key].length)
            if(data['result'][key].length>max_re_length){
                max_re_length = data['result'][key].length
            }
        })

        stage_min_max = [1000000, 0]
        result_min_max = [1000000, 0]
 
        Object.keys(data['align_time']).forEach(function(key){
            old_seq_time.push(data['align_time'][key])
            for(var i=0; i<stage_num-1; i++){
                if(data['align_time'][key][i]['time']>stage_min_max[1]){
                    stage_min_max[1] = data['align_time'][key][i]['time']
                }
                if(data['align_time'][key][i]['time']<stage_min_max[0]){
                    stage_min_max[0] = data['align_time'][key][i]['time']
                }
            }
        })
        Object.keys(data['result_time']).forEach(function(key){
            old_result_time.push(data['result_time'][key])
            for(var i=0; i<data['result_time'][key].length; i++){
                
                if(data['result_time'][key][i]['time']>result_min_max[1]){
                    result_min_max[1] = data['result_time'][key][i]['time']
                }
                if(data['result_time'][key][i]['time']<result_min_max[0]){
                    result_min_max[0] = data['result_time'][key][i]['time']
                }
                
            }
        })

        let pid_sort = sortWithIndices(re_length).sortIndices

        seq_data =[]
        result_data = []
        seq_time =[]
        result_time = []
        similar_set = []
        for(var i=pid_sort.length-1; i>-1; i--){
            seq_data.push(old_seq_data[pid_sort[i]])
            result_data.push(old_result_data[pid_sort[i]])
            seq_time.push(old_seq_time[pid_sort[i]])
            result_time.push(old_result_time[pid_sort[i]])
            similar_set.push(old_similar_set[pid_sort[i]])
        }

        seq_bar = []
        result_bar = []
        current_bar = []

        var tmp_current_bar = [0,0]
        for(var j=0; j<data["current_time"].length; j++){
            if((data["current_time"][j]['time']/(3600*24))<1.1){
                tmp_current_bar[1] = j+1
            }else{
                current_bar.push(tmp_current_bar)
                tmp_current_bar = [j+1,j+1]
            }
            if(j==data["current_time"].length-1){
                current_bar.push(tmp_current_bar)
            }
        }

        for(var i=0; i<seq_time.length; i++){
            var ps_bar = []
            var pr_bar = []

            var tmp_ps_bar = [0,0]
            var tmp_pr_bar = [0,0]
            for(var j=0; j<seq_time[i].length; j++){
                if((seq_time[i][j]['time']/(3600*24))<1){
                    tmp_ps_bar[1] = j+1
                }else{
                    ps_bar.push(tmp_ps_bar)
                    tmp_ps_bar = [j+1,j+1]
                }
                if(j==seq_time[i].length-1){
                    ps_bar.push(tmp_ps_bar)
                }
            }
            for(var j=0; j<result_time[i].length; j++){
                if((result_time[i][j]['time']/(3600*24))<1.1){
                    tmp_pr_bar[1] = j+1
                }else{
                    pr_bar.push(tmp_pr_bar)
                    tmp_pr_bar = [j+1,j+1]
                }
                if(j==result_time[i].length-1){
                    pr_bar.push(tmp_pr_bar)
                }
            }
            seq_bar.push(ps_bar)
            result_bar.push(pr_bar)
        }

        result_width = max_re_length * stage_width - connect

        // simvis.update()






        return simvis
    }

    simvis.render = function(){

        container.attr('id', 'similar-container')

        d3.selectAll("#sim-canvas").remove()

        // container.select('.loading').style('display', 'none');
        // container.select('.load').remove();
        container.classed('contain', false);
        Canvas = container
            // .append('div')
            // .attr('id',"sim-container")
            .append('svg')
            .attr('id', 'sim-canvas')
            .attr('width', his_width+connect+result_width+connect+50)
            .attr('height', total_height)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)
        sliderScale.domain([0,his_width+connect+result_width+connect+50])
        sliderCanvas.select('rect')
        .attr('width', (d)=>{
            return Math.min(sliderLength, sliderScale(796))
        })
        // originCanvas = Canvas.append("g")
        //     .attr("class","origin-container")
        //     .attr("transform","translate(0,20)")

        // seqCanvas = Canvas.append("g")
        //     .attr("class","seq-container")
        //     .attr("transform","translate(0,80)")
        // clusCanvas = Canvas.append("g")
        //     .attr("class","clus-container")
        //     .attr("transform","translate(0,80)")

        $('#similar-container').scroll(function () {
            var sl = this.scrollLeft;
            // $(this).attr()
            // var width = this.clientWidth;
            // var sw = this.scrollWidth;
            sliderCanvas
            .select('rect')
            .attr('x', sliderScale(sl));
        });

        return simvis
    }

    simvis.drawcluster =function(){
        
        let nodes= cluster.nodes
        let links=cluster.links
        let layout=cluster.layout
        let draw_node=[]
        let draw_link = []
        let layout_sorted = []
        let node_num = []

        graph = {"nodes" : [], "links" : []};
        let nodes_index = {}

        nodes.forEach(function(d,i){

            var node_info=d['name'].split(/c|t/);
            var stage_id=node_info[2]
            var cluster_id=node_info[1]

            var current_node = { "name": d.name, "id": i, "type": d.type, "code": d.code, "value": d.value, "e_list": d.e_list, 'x': stage_id*stage_width, 'dx': event_width, 'y':layout[stage_id][cluster_id], 'dy': d.value*seq_height}
            graph.nodes.push(current_node);
            nodes_index[d.name] = current_node
        })

        let max_duration = 0
        let min_duration = 10000000000000000000

        links.forEach(function (d) {
          graph.links.push({ "source": nodes_index[d.source],
                             "target": nodes_index[d.target],
                             "value": +d.value,
                            "connect": d.connect});
          if(Math.pow(d.connect.duration,1)>max_duration){
            max_duration = Math.pow(d.connect.duration,1)
          }
          if(Math.pow(d.connect.duration,1)<min_duration){
            min_duration = Math.pow(d.connect.duration,1)
          }
         });

        graph.nodes.forEach(function(d,i){
            var sourceLinks = []
            var targetLinks = []
            node_mark[d['name']] = 0
            for(var i=0; i<graph.links.length; i++){
                if(graph.links[i]['source']['name'] == d['name']){
                    sourceLinks.push(graph.links[i])
                }
                if(graph.links[i]['target']['name'] == d['name']){
                    targetLinks.push(graph.links[i])
                }
            }
            let target_pos = []
            let sum_value = 0
            for(var k=0;k<sourceLinks.length;k++){
                target_pos.push(sourceLinks[k]['target'].y)
                sum_value += sourceLinks[k].value
            }
            let sorted = sortWithIndices(target_pos).sortIndices
            let sum_height = 0
            for(var k=0;k<sorted.length;k++){
                sourceLinks[sorted[k]].height = d.dy*sourceLinks[sorted[k]].value/sum_value
                sourceLinks[sorted[k]].y_pos = sum_height
                sourceLinks[sorted[k]].code = d.code
                sum_height += sourceLinks[sorted[k]].height
            }
            d['sourceLinks'] = sourceLinks
            d['targetLinks'] = targetLinks
        })




        duration_scale.domain([min_duration,max_duration])
        

        // sankey
            // .nodes(graph.nodes)
            // .links(graph.links)
            // .layout(500);

        // d3.selectAll(".seq_group").remove()
        d3.selectAll(".clus-container").remove()
        // d3.selectAll(".sankey_link").remove()
        // d3.selectAll(".sankey_node").remove()

        clusCanvas = Canvas.append("g")
            .attr("class","clus-container")
            .attr("transform","translate(50,90)")

        clusCanvas.append("g")
            .attr("transform","translate(0,0)")
            .selectAll(".sankey_circle_1")
            .data(graph.links)
            .enter()
            .append("g")
            .attr("class","sankey_circle_1")
            .append("circle")
            .attr("name",function(d){
                return d.value
            })
            // .attr("d",function(d){
            //     let y_top = d.height/2-2.5
            //     let y_bottom = d.height/2+2.5
            //     if(y_top<0){
            //         y_top=0
            //         y_bottom = d.height
            //     }
            //     return "M " + Math.round(d['source'].x + d['source'].dx+ duration_scale(Math.pow(d.connect.duration,1)))+" "+ Math.round(d['source'].y+d.y_pos + y_top) + " A 5 5, 0, 0, 1, " + Math.round(d['source'].x + d['source'].dx+ duration_scale(Math.pow(d.connect.duration,1)))+" "+Math.round(d['source'].y+ d.y_pos + y_bottom)+ " Z"
            // })
            .attr("cx",function(d){
                //return d['source'].x + d['source'].dx
                return d['source'].x + d['source'].dx+ duration_scale(Math.pow(d.connect.duration,1))+2
            })
            .attr("cy",function(d){
                // return d['source'].y+d['source'].dy/2
                return d['source'].y + d.y_pos + d.height/2
            })
            .attr('r',1.5)
            .style("fill","#BFBFBF")
            .style("stroke","#BFBFBF")
            .style("stroke-width",1)
            .style('stroke-opacity',function(d){
                return 0
            })
            .style("fill-opacity",0)

        clusCanvas.append("g")
            .attr("transform","translate(0,0)")
            .selectAll(".sankey_circle_2")
            .data(graph.links)
            .enter()
            .append("g")
            .attr("class","sankey_circle_2")
            .append("circle")
            .attr("name",function(d){
                return d.value
            })
            // .attr("d",function(d){
            //     let y_top = d['target'].dy/2-2.5
            //     let y_bottom = d['target'].dy/2+2.5
            //     if(y_top<0){
            //         y_top=0
            //         y_bottom = d['target'].dy
            //     }
            //     return "M " +Math.round(d['target'].x)+" "+ Math.round(d['target'].y+y_top) + " A 5 5, 0, 0, 0, " + Math.round(d['target'].x)+" "+Math.round(d['target'].y+y_bottom)+" Z"
            // })
            .attr("cx",function(d){
                return d['target'].x
            })
            .attr("cy",function(d){
                return d['target'].y+d['target'].dy/2
            })
            .attr('r',1.5)
            .style("fill","#BFBFBF")
            .style("stroke","#BFBFBF")
            .style("stroke-width",1)
            .style('stroke-opacity',function(d){
                return 0
            })
            .style("fill-opacity",0)

        let sankey_node_dura = clusCanvas.append("g")
            .attr("transform","translate(0,0)")
            .selectAll(".sankey_node_dura")
            .data(graph.nodes)
            .enter()
            .append("g")
            .attr("class","sankey_node_dura")
            .attr("transform", function(d) { 
                return "translate(" + (d.x+d.dx) + "," + d.y + ")"; 
            })
            .attr("name",function(d){
                return "duration_"+d.name
            })
            

        sankey_node_dura.selectAll(".node_duration")
            .data(function(d){
                // let sourceLinks = d.sourceLinks
                // let target_pos = []
                // let sum_value = 0
                // for(var k=0;k<sourceLinks.length;k++){
                //     target_pos.push(sourceLinks[k]['target'].y)
                //     sum_value += sourceLinks[k].value
                // }
                // let sorted = sortWithIndices(target_pos).sortIndices
                // let sum_height = 0
                // for(var k=0;k<sorted.length;k++){
                //     sourceLinks[sorted[k]].height = d.dy*sourceLinks[sorted[k]].value/sum_value
                //     sourceLinks[sorted[k]].y_pos = sum_height
                //     sourceLinks[sorted[k]].code = d.code
                //     sum_height += sourceLinks[sorted[k]].height
                // }
                return d.sourceLinks
            })
            .enter()
            .append("g")
            .attr("class","node_duration")
            .classed('highlight',true)
            .append("rect")
            .attr("class",function(d){
                return "duration_"+  d['source']['name'].split(/c|t/)[2]
            })
            .attr("id",function(d){
                return "duration_"+d['source']['name'].split(/c|t/)[2]+"_"+d.code
            })
            .attr("x",function(d){
                return 2
            })
            .attr("y",function(d){
                return d.y_pos
            })
            .attr("height",function(d){
                return d.height
            })
            .attr("width",function(d){
                if(d.connect.type=='nothing'){
                    return 0
                }else{
                    return duration_scale(Math.pow(d.connect.duration,1))
                }
                
            })
            .style("fill",function(d){
                if(d.connect.type=='nothing'){
                    return 'none'
                }else{
                    return typeColor2[d.connect.type]
                }
                
            })
            .style("fill-opacity",0)
            .style("stroke","#7D7D7D")
            .style('stroke-opacity',function(d){
                return 0
            })
            


        clusCanvas.append("g")
            .attr("transform","translate(0,0)")
            .selectAll(".sankey_link")
            .data(graph.links)
            .enter()
            .append("g")
            .attr("class","sankey_link")
            .classed('highlight',true)
            .attr("name",function(d){
                return "link_"+d['source'].name+'-'+d['target'].name
            })
            .append("line")
            .attr("path",function(d){
                return d.value
            })
            .attr("x1",function(d){
                //return d['source'].x + d['source'].dx
                
                return d['source'].x + d['source'].dx+ duration_scale(Math.pow(d.connect.duration,1))+2
            })
            .attr("y1",function(d){
                // return d['source'].y+d['source'].dy/2
                return d['source'].y+d.y_pos + d.height/2
            })
            .attr("x2",function(d){
                return d['target'].x
            })
            .attr("y2",function(d){
                return d['target'].y+d['target'].dy/2
            })
            .style("stroke","#7D7D7D")
            .style("stroke-width",1)
            .style('stroke-opacity',function(d){
                return 0
            })
            .style("fill-opacity",0)

        let sankey_node = clusCanvas.append("g")
            .attr("transform","translate(0,0)")
            .selectAll(".sankey_node")
            .data(graph.nodes)
            .enter()
            .append("g")
            .attr("class","sankey_node")
            .attr("id",function(d){
                let cur_stage = d.name.split(/c|t/)[2]
                return "sankey_" + cur_stage
            })
            .attr("name",function(d){
                return d.name
            })
            .attr("label",function(d){
                return d.code
            })
            .attr("transform", function(d) { 
          return "translate(" + d.x + "," + d.y + ")"; })
            .attr('name',function(d){
                return d.name
            })
            .classed('highlight',true)

        sankey_node    
            .append("rect")
            .attr("id",function(d){
                return "rect_"+d.code
            })
            .attr("height", function(d) { 
                return d.dy
            })
            .attr("x", 6)
            .attr("width", function(d){
                return d.dx-6
            })
            .style("fill",function(d){
                let cur_stage = parseInt(d.name.split(/c|t/)[2])
                if(cur_stage < data['current_align'].length){
                    let cur_list = data['current_align'][cur_stage].map(function(d){return d['event_code']})
                    if(cur_list.indexOf(parseInt(d.code))>=0){
                        // return typeColors[d.type]
                        return highlight_color
                    }
                    else{
                        return typeColor2[d.type]
                    }
                }else{
                    // var index_code = selected_code.indexOf(parseInt(d.code))
                    var index_code = -1
                    for(var ii = 0; ii<selected_code.length; ii++){
                        var start_code = parseInt(selected_code[ii].split("|")[0])
                        var end_code = parseInt(selected_code[ii].split("|")[1])
                        if(parseInt(type_reves[d.code])>start_code&& parseInt(type_reves[d.code])<end_code){
                            index_code = ii
                        }
                    }

                    if(index_code>=0){
                        // return typeColors[d.type]
                        return diseaseColors[index_code]
                    }
                    else{
                        return typeColor2[d.type]
                    }
                }
                
            })
            .style("stroke","#7D7D7D")
            .style('stroke-opacity',function(d){
                return 0
            })
            .style("fill-opacity",0)
            

        sankey_node
            .append("rect")
            .attr("id",function(d){
                return "box_"+d.code
            })
            .attr("width", 6)
            .attr("height",function(d){
                return d.dy
            })
            .style("fill","white")
            .style("fill-opacity",0)
            .style("stroke","#7D7D7D")
            .style("stroke-opacity",0)
            

        sankey_node
            .append("g")
            .attr("transform",function(d){return "translate(2.5,"+d.dy/2+")rotate(270)"})
            .append("text")
            .attr("id",function(d){
                return "text_"+d.code
            })
            .style("text-anchor","middle")
            .style("alignment-baseline","middle")
            .attr("x",0)
            .attr("y",0)
            .style("fill","#7D7D7D")
            .style("font-size",6)
            .style("pointer-events","none")
            .style("fill-opacity",0)
            .text(function(d){
                return d.value.toFixed(1)
            })

        let text_canvas = clusCanvas.append("g")
            .attr("transform","translate(0,0)")

        for(var n=0; n<graph.nodes.length; n++){
            let cur_node = graph.nodes[n]
            let cur_stage = cur_node.name.split(/c|t/)[2]
            let opacity = 0
            let text_color = null
            if(cur_node.dy<18){
                opacity= 0
            }else{
                opacity= 1
            }
            if(cur_node.type == "Treatments"){
                text_color = "#FFFFFF"
            }else{
                text_color = "#FFFFFF"
            }

            if(cur_node.dy>=cur_node.dx-6){
               let text_span = text_canvas.append("g")
                    .attr("class","sankey_text")
                    .datum(graph.nodes[n])
                    .classed('highlight',true)
                    .attr("id","text_"+cur_stage)
                    .attr("name",'text_'+cur_node.name)
                    .attr("transform", "translate(" + (cur_node.x+cur_node.dx/2+3) + "," + (cur_node.y+cur_node.dy/2) + ") rotate(270)")
                    .append("text")
                    .attr("id","t_"+cur_node.code)
                    .style("text-anchor","middle")
                    .style("alignment-baseline","middle")
                    .attr("x",0)
                    .attr("y",0)
                    .attr("fill",text_color)
                    .attr("font-size",8)
                    .attr("pointer-events","none")
                    .style("fill-opacity",0)
                    

                var current_text = ''
                if(cur_node.type=='Treatments'){
                    current_text = treatment[type_reves[cur_node.code]]
                }else{
                    current_text = disease[type_reves[cur_node.code]]
                }
                let t_span = []
                let tmp = ''
                let max_text_num = Math.round(cur_node.dy / 8) + 1
                for(var t=0; t<current_text.length; t++){
                    if(t == current_text.length-1&&Math.floor(t/max_text_num)<=2){
                        tmp += current_text.charAt(t)
                       t_span.push(tmp)
                       tmp = ''
                       break
                    }
                    if(t%max_text_num==0&&t!=0){
                        if(Math.floor(t/max_text_num)<=2){
                           t_span.push(tmp)
                           tmp = current_text.charAt(t)
                        }else{
                            break
                        } 
                    }else{
                        tmp += current_text.charAt(t)
                    }
                }
                for(var t=0; t<t_span.length; t++){
                    text_span.append('tspan')
                        .attr("x",0)
                        .attr("y",0)
                        .attr('dy',(t-(t_span.length-1)/2)*8+4)
                        .attr('name',t_span[t])
                        .text(t_span[t])
                } 
            }else{
                let text_span = text_canvas.append("g")
                    .attr("class","sankey_text")
                    .datum(graph.nodes[n])
                    .classed('highlight',true)
                    .attr("id","text_"+cur_stage)
                    .attr("name",'text_'+cur_node.name)
                    .attr("transform", "translate(" + (cur_node.x+cur_node.dx/2+3) + "," + (cur_node.y+cur_node.dy/2) + ")")
                    .append("text")
                    .attr("id","t_"+cur_node.code)
                    .style("text-anchor","middle")
                    .style("alignment-baseline","middle")
                    .attr("x",0)
                    .attr("y",0)
                    .attr("fill",text_color)
                    .attr("font-size",8)
                    .attr("pointer-events","none")
                    .style("fill-opacity",0)
                    

                var current_text = ''
                if(cur_node.type=='Treatments'){
                    current_text = treatment[type_reves[cur_node.code]]
                }else{
                    current_text = disease[type_reves[cur_node.code]]
                }
                let t_span = []
                let tmp = ''
                let max_text_num = Math.round((cur_node.dx-6) / 8) + 1
                let max_layer = Math.floor((cur_node.dy) / 8)
                for(var t=0; t<current_text.length; t++){
                    if(t == current_text.length-1&&Math.floor(t/max_text_num)<=max_layer-1){
                        tmp += current_text.charAt(t)
                       t_span.push(tmp)
                       tmp = ''
                       break
                    }
                    if(t%max_text_num==0&&t!=0){
                        if(Math.floor(t/max_text_num)<=max_layer){
                           t_span.push(tmp)
                           tmp = current_text.charAt(t)
                        }else{
                            break
                        } 
                    }else{
                        tmp += current_text.charAt(t)
                    }
                }
                for(var t=0; t<t_span.length; t++){
                    text_span.append('tspan')
                        .attr("x",0)
                        .attr("y",0)
                        .attr('dy',(t-(t_span.length-1)/2)*8+3)
                        .attr('name',t_span[t])
                        .text(t_span[t])
                }
            }

            

        }
          //   .selectAll(".sankey_text")
          //   .data(graph.nodes)
          //   .enter()
          //   .append("g")
          //   .attr("class","sankey_text")
          //   .attr("name",function(d){
          //       return d.name
          //   })
          //   .attr("transform", function(d) { 
          // return "translate(" + (d.x+d.dx/2) + "," + (d.y+d.dy/2) + ") rotate(270)"; })
          //   .append("text")
          //   .style("text-anchor","middle")
          //   .style("alignment-baseline","middle")
          //   .attr("x",0)
          //   .attr("y",0)
          //   .attr("fill","white")
          //   .attr("font-size",8)
          //   .attr("pointer-events","none")
          //   .attr("fill-opacity",function(d){
          //       if(d.dy<20){
          //           return 0
          //       }else{
          //           return 1
          //       }
          //   })
          //   .text(function(d){
          //       var current_text = ''
          //       if(d.type=='Treatments'){
          //           current_text = treatment[type_reves[d.code]]
          //       }else{
          //           current_text = disease[type_reves[d.code]]
          //       }
          //       return current_text
          //   })

        d3.selectAll('.sankey_node').style('pointer-events','none');


        $('.sankey_node').tipsy({
          gravity: 'w',
            html: true,
            fade: false,
            opacity: 0.7,
          title:function(){
            var cur_icd_code = type_reves[this.__data__.code]
            var cur_type = this.__data__.type
            var number = this.__data__.e_list.length
            var value = this.__data__.value
            // e_list.map(function(d){
            //     let c_event = data['seq'][d['pid']][d['event_pos']]
            //     let c_icd_code = type_reves[c_event.event_code]
            //     let c_event_type = c_event.event_type
            //     return {'event_type': c_event_type, 'icd_code': c_icd_code}
            // })

            // cur_list = _.uniq(cur_list,function(item,key,a){
            //   return item.icd_code
            // })

            var tip = ''
            let patientPercent = value/seq_data.length;
            if(cur_type=='Treatments'){
                tip += "<div class='rect-tooltip'><div class='tooltip-item'>Treatment</div><div class='tooltip-item'>Name: "+treatment[cur_icd_code]+"</div><div class='tooltip-item'>Patient Num: "+number+"</div><div class='tooltip-item'>Patient Percentage: "+Math.round(patientPercent*100)+"%</div></div>"

            } else {
                tip += "<div class='rect-tooltip'><div class='tooltip-item'>Diagnosis</div><div class='tooltip-item'>ICD-9: "+cur_icd_code+"</div><div class='tooltip-item'>Name: "+disease[cur_icd_code]+"</div><div class='tooltip-item'>Patient Num: "+number+"</div><div class='tooltip-item'>Patient Percentage: "+Math.round(patientPercent*100)+"%</div></div>"
            }

            return tip;

          }
        });
        
        $( ".sankey_node" ).on('click', function() {

            if(d3.select(this).classed("highlight")){

                onRect = 1

                var current_node = this.__data__.name
                var sourceLinks = this.__data__.sourceLinks
                var targetLinks = this.__data__.targetLinks

                console.log(this.__data__);
                var getForward = find_forwards(this.__data__, {'node':[this.__data__.name],'link':[]} )
                var getBackward = find_backwards(this.__data__, {'node':[],'link':[]} )
                var getResult = {'node': getForward['node'].concat(getBackward['node']), 'link': getForward['link'].concat(getBackward['link'])}
                var result_node = {}
                var result_link = {}

                graph.nodes.forEach(function(d){
                    result_node[d['name']] = 0
                })
                graph.links.forEach(function(d){
                    result_link[d['source']['name']+'-'+d['target']['name']] = 0
                })

                getResult.node.forEach(function(d){
                    result_node[d] = 1
                })
                getResult.link.forEach(function(d){
                    result_link[d] = 1
                })

                d3.selectAll(".sankey_node.highlight")
                    .classed("highlight",function(d){
                        if(result_node[d.name]){
                            return true
                        }else{
                            return false
                        }
                    })
                    
                d3.selectAll(".sankey_link.highlight")
                    .classed("highlight",function(d){
                        if(result_link[d['source'].name+'-'+d['target'].name]){
                            return true
                        }else{
                            return false
                        }
                    })

                d3.selectAll(".node_duration.highlight")
                    .classed("highlight",function(d){
                        if(result_node[d['source'].name]){
                            return true
                        }else{
                            return false
                        }
                    })

                d3.selectAll(".sankey_text.highlight")
                    .classed("highlight",function(d){
                        if(result_node[d.name]){
                            return true
                        }else{
                            return false
                        }
                    })
                Object.keys(node_mark).forEach(function(key){
                    node_mark[key]=0
                })

            }

            
        })

        $("#sim-canvas").on('click',function(){
            if(show_flag=='cluster'&&!onRect){
                d3.selectAll(".sankey_node")
                    .classed("highlight",true)
                    
                d3.selectAll(".sankey_link")
                    .classed("highlight",true)

                d3.selectAll(".node_duration")
                    .classed("highlight",true)

                d3.selectAll(".sankey_text")
                    .classed("highlight",true)

                d3.selectAll(".sankey_node.highlight rect")
                    .style("fill-opacity",1)
                    .style("stroke-opacity",1)

                d3.selectAll(".sankey_node.highlight g text").style("fill-opacity",function(d){
                                        if(d.dy>9){
                                            return 1
                                        }else{
                                            return 0
                                        }
                                    })
                d3.selectAll(".sankey_link.highlight line").style("stroke-opacity",1)
                d3.selectAll(".node_duration.highlight rect").style("fill-opacity",1).style("stroke-opacity",1)
                d3.selectAll(".sankey_text.highlight text").style("fill-opacity",function(d){
                                        if(d.dy<10){
                                            return 0
                                        }else{
                                            return 1
                                        }
                                    })
            }
            onRect = 0
        })

    
        $( ".sankey_node" ).on('mouseenter', function() {

            // d3.selectAll(".sankey_node rect").style("fill-opacity",0.1).style("stroke-opacity",0.1)
            // d3.selectAll(".sankey_node g text").style("fill-opacity",0.1)
            // d3.selectAll(".sankey_link line").style("stroke-opacity",0.1)
            // d3.selectAll(".node_duration rect").style("fill-opacity",0.1).style("stroke-opacity",0.1)
            // d3.selectAll(".sankey_text text").style("fill-opacity",0.1)
            if(d3.select(this).classed("highlight")){
                var current_node = this.__data__.name
                var sourceLinks = this.__data__.sourceLinks
                var targetLinks = this.__data__.targetLinks

                
                var getForward = find_forwards(this.__data__, {'node':[this.__data__.name],'link':[]} )
                var getBackward = find_backwards(this.__data__, {'node':[],'link':[]} )
                var getResult = {'node': getForward['node'].concat(getBackward['node']), 'link': getForward['link'].concat(getBackward['link'])}
                var result_node = {}
                var result_link = {}

                graph.nodes.forEach(function(d){
                    result_node[d['name']] = 0
                })
                graph.links.forEach(function(d){
                    result_link[d['source']['name']+'-'+d['target']['name']] = 0
                })

                getResult.node.forEach(function(d){
                    result_node[d] = 1
                })
                getResult.link.forEach(function(d){
                    result_link[d] = 1
                })


                d3.selectAll(".sankey_node.highlight rect")
                    .style("fill-opacity",function(d){
                        if(result_node[d.name]){
                            return 1
                        }else{
                            return 0.1
                        }
                    })
                    .style("stroke-opacity",function(d){
                        if(result_node[d.name]){
                            return 1
                        }else{
                            return 0.1
                        }
                    })

                d3.selectAll(".sankey_node.highlight g text").style("fill-opacity",function(d){
                        if(result_node[d.name]){
                            if(d.dy>9){
                                return 1
                            }else{
                                return 0
                            }
                        }else{
                            return 0.1
                        }
                    })
                    
                d3.selectAll(".sankey_link.highlight line")
                    .style("stroke-opacity",function(d){
                        if(result_link[d['source'].name+'-'+d['target'].name]){
                            return 1
                        }else{
                            return 0
                        }
                    })

                d3.selectAll(".node_duration.highlight rect").style("fill-opacity",function(d){
                        if(result_node[d['source'].name]){
                            return 1
                        }else{
                            return 0
                        }
                    })
                    .style("stroke-opacity",function(d){
                        if(result_node[d['source'].name]){
                            return 1
                        }else{
                            return 0
                        }
                    })

                d3.selectAll(".sankey_text.highlight text")
                    .style("fill-opacity",function(d){
                        if(result_node[d.name]){
                            if(d.dy<10){
                                return 0
                            }else{
                                return 1
                            }
                        }else{
                            return 0.1
                        }
                    })

                Object.keys(node_mark).forEach(function(key){
                    node_mark[key]=0
                })
            }
            

        });
        
        $( ".sankey_node" ).on('mouseleave', function(d) {
            if(d3.select(this).classed("highlight")){
                d3.selectAll(".sankey_node.highlight rect")
                    .style("fill-opacity",1)
                    .style("stroke-opacity",1)

                d3.selectAll(".sankey_node.highlight g text").style("fill-opacity",function(d){
                                        if(d.dy>9){
                                            return 1
                                        }else{
                                            return 0
                                        }
                                    })
                d3.selectAll(".sankey_link.highlight line").style("stroke-opacity",1)
                d3.selectAll(".node_duration.highlight rect").style("fill-opacity",1).style("stroke-opacity",1)
                d3.selectAll(".sankey_text.highlight text").style("fill-opacity",function(d){
                                        if(d.dy<10){
                                            return 0
                                        }else{
                                            return 1
                                        }
                                    })
            }
           
        });

        return simvis
    }

    simvis.drawPredict = function(){
        if(!predict_result) return;
        if(!Canvas) return;
        show_flag = 'sequence'
        $("#similar-seq").css("background","#7D7D7D")
        $("#similar-clus").css("background","#D2D2D2")
        d3.select("#similar-seq i").style("color","#D2D2D2")
        d3.select("#similar-clus i").style("color","#7D7D7D")

        container.select('.load').remove();
        sliderCanvas.attr('display', 'block');

        d3.select("#divide_line").remove()

        Canvas.append("line")
            .attr("id","divide_line")
            .attr('x1', his_width+connect/2+50)
            .attr('x2', his_width+connect/2+50)
            .attr('y1',0)
            .attr('y2', total_height)
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width',2)
            .attr('stroke-dasharray', '2,2')

        d3.selectAll(".origin-container").remove()

        originCanvas = Canvas.append("g")
            .attr("class","origin-container")
            .attr("transform","translate(50,30)")

        let result_origin = originCanvas.append("g")
            .attr("transform","translate("+his_width+",0)")

        let predict_draw = []
        for(var i=0; i<selected_disease.length; i++){
            let icdcode = disease_list[selected_disease[i]];
            
            let confidence = eventCount[icdcode];
            predict_draw.push({
                'prob':predict_result[selected_disease[i]]['prob'],
                'icd_code': disease_list[selected_disease[i]],
                "event_type": 'diagnose',
                'confidence':confidence
            })
        }

        treemap.size([eventRectSize[0]-eventRectPadding * 2, seq_height*Math.pow(selected_disease.length,pow_scale)]);
                    // treemap.size([eventRectSize[0], eventRectSize[0]])
        var obj={
          'name':'obj',
          'children':[]
        };
        let eventTypes = ["diagnose"]
        eventTypes.forEach(function(type){
          var typeObj={
            'name':type,
            'children':[]
          }
          obj['children'].push(typeObj);
        })
        predict_draw.forEach(function(event,index){
          var e_type=event['event_type']
          var eventObj={
            'name':event['event_type']+'-'+event['icd_code']+'-'+index,
            'size':event['prob'],
            'confidence': event['confidence']
          }
          obj['children'][_.indexOf(eventTypes,e_type)]['children'].push(eventObj);
        })
        obj['children'].forEach(function(etype,index){
          if(!etype['children'].length){
            obj['children'].splice(index,1);
          }
        })
        var tree_root = d3.hierarchy(obj)
            .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
            .sum(function sumBySize(d) {
              return d.size
            })
            .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
        treemap(tree_root);
        var tree_origin = tree_root.leaves()

        result_origin.append("line")
            .attr('x1', 0)
            .attr('x2', connect)
            .attr('y1',seq_height/2)
            .attr('y2', seq_height/2)
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width',2)
            .attr('stroke-dasharray', '2,2')

        result_origin.append('text')
            .attr('x',connect+event_width/2)
            .attr('y', -seq_height*0.5)
            .attr("font-size",9)
            .style("text-anchor","middle")
            .style("alignment-baseline","middle")
            .style("pointer-events","none")
            .style("fill",'#696969')
            .style("fill-opacity",1)
            .text('Prediction')

        result_origin.append("g")
            .attr("transform","translate("+connect+",0)")
            .selectAll(".result_origin")
            .data(tree_origin)
            .enter()
            .append("g")
            .attr('class','result_origin')
            .attr("transform","translate(0,"+(seq_height*(0.5-Math.pow(selected_disease.length,pow_scale)/2))+")")
            .append("rect")
            .attr("name", function(d) { return d['data']['name']; })
            .attr("x",function(d){return d.x0; })
            .attr("y",function(d){return d.y0; })
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr("id", function(d) { 
              if(d['data']['name'].split('-').length){
                return d['data']['name'].split('-')[0]
              }
            })
            .attr('fill',function(d){
              if(d['data']['name'].split('-').length){
                return diseaseColors[d['data']['name'].split('-')[2]]
              }
            })
            .attr('stroke-width',0.5)
            .attr('stroke',"#FFFFFF")
            .attr('opacity', (d)=>{
                return d['data'].confidence;
            })

        // var in_tip_flag = false;
        // $('.tipsy').remove();

        $('.result_origin').tipsy({
          gravity: 'w',
            html: true,
            fade: false,
            opacity: 0.7,
          title:function(){
            var cur_event = this.__data__.data
            cur_event.icd_code = cur_event.name.split('-')[1]
            cur_event.event_type = cur_event.name.split('-')[0]
            
            let confidence = eventCount[cur_event.icd_code];
            var tip = ''
            
            tip += "<div class='rect-tooltip'>"
            tip += "<div class='tooltip-item'>Prediction</div>"
            tip += "<div class='tooltip-item'>ICD-9: "+cur_event.icd_code+"</div>"
            tip += "<div class='tooltip-item'>Name: "+disease[cur_event.icd_code]+"</div>"
            tip += "<div class='tooltip-item'>Probability: "+Math.round(cur_event.size*1000)/10+"%</div>"
            tip += "<div class='tooltip-item'>Confidence: "+Math.round(confidence*1000)/10+"%</div>"
            tip += "</div>"
            
            return tip
          }
        });

        $( ".result_origin" ).on('mouseenter', function() {
            if(show_flag=='sequence'){
                var current_icd = this.__data__.data['name'].split("-")[1]
                var current_code = type[current_icd]
                var current_stage = 0
                d3.selectAll("#resultstage_"+current_stage+" .result_node rect").style("fill-opacity",0.1).style("stroke-opacity",0.1)
                d3.selectAll("#resultstage_"+current_stage+" .result_node text").style("fill-opacity",function(d){
                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                    if(num==1){
                      return 0.1
                    }else{
                      return 0
                    }
                  })
                var start_icd = parseInt(current_icd.split("|")[0])
                var end_icd = parseInt(current_icd.split("|")[1])
                for(var index=start_icd; index<=end_icd; index++){
                    if(type[index]){
                        var current_code = type[index]
                        d3.selectAll("#resultstage_"+current_stage+" #tree_"+current_code+" rect").style("fill-opacity",1).style("stroke-opacity",1)
                        d3.selectAll("#resultstage_"+current_stage+" #tree_"+current_code+" text").style("fill-opacity",function(d){
                            var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                        cur_list = _.uniq(cur_list,function(item,key,a){
                          return item.icd_code
                        })
                        let num = cur_list.length
                            if(num==1){
                              return 1
                            }else{
                              return 0
                            }
                        })
                    }
                }

                
            }

            if(show_flag=="cluster"){
                // highlight sankey node
                // var current_icd = this.__data__.data['name'].split("-")[1]
                // var current_code = type[current_icd]
                // var current_stage = stage_num
                // // var current_stage = this.__data__.data['name'].split("-")[2]
                // d3.selectAll("#sankey_"+current_stage+" rect").style("fill-opacity",0.1).style("stroke-opacity",0.1)
                // d3.selectAll("#sankey_"+current_stage+" g text").style("fill-opacity",function(d){
                //                     if(d.dy>9){
                //                         return 0.1
                //                     }else{
                //                         return 0
                //                     }
                //                 })
                // d3.selectAll("#text_"+current_stage+" text").style("fill-opacity",function(d){
                //                     if(d.dy<10){
                //                         return 0
                //                     }else{
                //                         return 0.1
                //                     }
                //                 })

                // d3.selectAll(".duration_"+current_stage).style("fill-opacity",0.1).style("stroke-opacity",0.1)

                // d3.selectAll("#sankey_"+current_stage+" #box_"+current_code).style("fill-opacity",1).style("stroke-opacity",1)
                // d3.selectAll("#sankey_"+current_stage+" #rect_"+current_code).style("fill-opacity",1).style("stroke-opacity",1)
                // d3.selectAll("#sankey_"+current_stage+" g #text_"+current_code).style("fill-opacity",function(d){
                //                     if(d.dy>9){
                //                         return 1
                //                     }else{
                //                         return 0
                //                     }
                //                 })
                // d3.selectAll("#text_"+current_stage+" #t_"+current_code).style("fill-opacity",function(d){
                //                     if(d.dy<10){
                //                         return 0
                //                     }else{
                //                         return 1
                //                     }
                //                 })
                // d3.selectAll("#duration_"+current_stage+"_"+current_code).style("fill-opacity",1).style("stroke-opacity",1)
            
                let icdcode = d3.select(this).select('rect').attr('name').split('-')[1];
                let current_eventcode = type[icdcode];
                let sankeyNode = container
                .selectAll('#sankey_'+stage_num)
                .filter(function(d){
                    let compare_eventcode = d3.select(this).attr('label');
                    if(compare_eventcode === current_eventcode) {
                        return true;
                    } else{
                        return false;
                    }
                })
                if(!sankeyNode.empty()) {
                    let nodeData = sankeyNode.data()[0];
                    var getForward = find_forwards(nodeData, {'node':[nodeData.name],'link':[]} )
                    var getBackward = find_backwards(nodeData, {'node':[],'link':[]} )
                    var getResult = {'node': getForward['node'].concat(getBackward['node']), 'link': getForward['link'].concat(getBackward['link'])}
                    var result_node = {}
                    var result_link = {}

                    graph.nodes.forEach(function(d){
                        result_node[d['name']] = 0
                    })
                    graph.links.forEach(function(d){
                        result_link[d['source']['name']+'-'+d['target']['name']] = 0
                    })

                    getResult.node.forEach(function(d){
                        result_node[d] = 1
                    })
                    getResult.link.forEach(function(d){
                        result_link[d] = 1
                    })


                    d3.selectAll(".sankey_node rect")
                        .style("fill-opacity",function(d){
                            if(result_node[d.name]){
                                return 1
                            }else{
                                return 0.1
                            }
                        })
                        .style("stroke-opacity",function(d){
                            if(result_node[d.name]){
                                return 1
                            }else{
                                return 0.1
                            }
                        })

                    d3.selectAll(".sankey_node g text").style("fill-opacity",function(d){
                            if(result_node[d.name]){
                                if(d.dy>9){
                                    return 1
                                }else{
                                    return 0
                                }
                            }else{
                                return 0.1
                            }
                        })
                        
                    d3.selectAll(".sankey_link line")
                        .style("stroke-opacity",function(d){
                            if(result_link[d['source'].name+'-'+d['target'].name]){
                                return 1
                            }else{
                                return 0
                            }
                        })

                    d3.selectAll(".node_duration rect").style("fill-opacity",function(d){
                            if(result_node[d['source'].name]){
                                return 1
                            }else{
                                return 0
                            }
                        })
                        .style("stroke-opacity",function(d){
                            if(result_node[d['source'].name]){
                                return 1
                            }else{
                                return 0
                            }
                        })

                    d3.selectAll(".sankey_text text")
                        .style("fill-opacity",function(d){
                            if(result_node[d.name]){
                                if(d.dy<10){
                                    return 0
                                }else{
                                    return 1
                                }
                            }else{
                                return 0.1
                            }
                        })

                    Object.keys(node_mark).forEach(function(key){
                        node_mark[key]=0
                    })
                }
            }

        });
        
        $( ".result_origin" ).on('mouseleave', function(d) {
            if(show_flag=='sequence'){
                var current_icd = this.__data__.data['name'].split("-")[1]
                var current_code = type[current_icd]
                var current_stage = 0
                d3.selectAll("#resultstage_"+current_stage+" .result_node rect").style("fill-opacity",1).style("stroke-opacity",1)

                d3.selectAll("#resultstage_"+current_stage+" .result_node text").style("fill-opacity",function(d){
                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                    if(num==1){
                      return 1
                    }else{
                      return 0
                    }
                  })
               
            }

            if(show_flag=="cluster"){
                // highlight sankey node part
                // var current_icd = this.__data__.data['name'].split("-")[1]
                // var current_code = type[current_icd]
                // var current_stage = stage_num
                // d3.selectAll("#sankey_"+current_stage+" rect").style("fill-opacity",function(d){
                //                 if(d3.select(this.parentNode).classed("highlight")){
                //                     return 1
                //                 }else{
                //                     return 0.1
                //                 }
                //             })
                //             .style("stroke-opacity",function(d){
                //                 if(d3.select(this.parentNode).classed("highlight")){
                //                     return 1
                //                 }else{
                //                     return 0.1
                //                 }
                //             })

                // d3.selectAll("#sankey_"+current_stage+" g text").style("fill-opacity",function(d){
                //                     if(d.dy>9){
                //                         if(d3.select(this.parentNode.parentNode).classed("highlight")){
                //                             return 1
                //                         }else{
                //                             return 0.1
                //                         }
                //                     }else{
                //                         return 0
                //                     }
                //                 })
                // d3.selectAll("#text_"+current_stage+" text").style("fill-opacity",function(d){
                //                     if(d.dy<10){
                //                         return 0
                //                     }else{
                //                         if(d3.select(this.parentNode).classed("highlight")){
                //                             return 1
                //                         }else{
                //                             return 0.1
                //                         }
                //                     }
                //                 })
                // d3.selectAll(".duration_"+current_stage).style("fill-opacity",function(d){
                //                     if(d3.select(this.parentNode).classed("highlight")){
                //                         return 1
                //                     }else{
                //                         return 0.1
                //                     }
                //                 })
                //                 .style("stroke-opacity",function(d){
                //                     if(d3.select(this.parentNode).classed("highlight")){
                //                         return 1
                //                     }else{
                //                         return 0.1
                //                     }
                //                 })

                d3.selectAll(".sankey_node rect")
                    .style("fill-opacity",0.1)
                    .style("stroke-opacity",0.1)

                d3.selectAll(".sankey_node g text")
                .style("fill-opacity",function(d){
                    if(d.dy>9){
                        return 0.1
                    }else{
                        return 0
                    }
                })
                d3.selectAll(".sankey_link line")
                .style("stroke-opacity",0)
                d3.selectAll(".node_duration rect")
                .style("fill-opacity",0)
                .style("stroke-opacity",0)
                d3.selectAll(".sankey_text text")
                .style("fill-opacity",function(d){
                    if(d.dy<10){
                        return 0
                    }else{
                        return 0
                    }
                })

                d3.selectAll(".sankey_node.highlight rect")
                    .style("fill-opacity",1)
                    .style("stroke-opacity",1)

                d3.selectAll(".sankey_node.highlight g text")
                .style("fill-opacity",function(d){
                    if(d.dy>9){
                        return 1
                    }else{
                        return 0
                    }
                })
                d3.selectAll(".sankey_link.highlight line")
                .style("stroke-opacity",1)
                d3.selectAll(".node_duration.highlight rect")
                .style("fill-opacity",1)
                .style("stroke-opacity",1)
                d3.selectAll(".sankey_text.highlight text")
                .style("fill-opacity",function(d){
                    if(d.dy<10){
                        return 0
                    }else{
                        return 1
                    }
                })
                

            }
        });

        $( ".result_origin" ).on('click', function() {
            if(show_flag=="cluster"){
                let icdcode = d3.select(this).select('rect').attr('name').split('-')[1];
                let current_eventcode = type[icdcode];
                let sankeyNode = container
                .selectAll('#sankey_'+stage_num)
                .filter(function(d){
                    let compare_eventcode = d3.select(this).attr('label');
                    if(compare_eventcode === current_eventcode) {
                        return true;
                    } else{
                        return false;
                    }
                })
                if(!sankeyNode.empty()) {
                    onRect = 1;
                    let nodeData = sankeyNode.data()[0];
                    var getForward = find_forwards(nodeData, {'node':[nodeData.name],'link':[]} )
                    var getBackward = find_backwards(nodeData, {'node':[],'link':[]} )
                    var getResult = {'node': getForward['node'].concat(getBackward['node']), 'link': getForward['link'].concat(getBackward['link'])}
                    var result_node = {}
                    var result_link = {}
    
                    graph.nodes.forEach(function(d){
                        result_node[d['name']] = 0
                    })
                    graph.links.forEach(function(d){
                        result_link[d['source']['name']+'-'+d['target']['name']] = 0
                    })
    
                    getResult.node.forEach(function(d){
                        result_node[d] = 1
                    })
                    getResult.link.forEach(function(d){
                        result_link[d] = 1
                    })
    
                    d3.selectAll(".sankey_node")
                    .classed("highlight",function(d){
                        if(result_node[d.name]){
                            return true
                        }else{
                            return false
                        }
                    })
                        
                    d3.selectAll(".sankey_link")
                    .classed("highlight",function(d){
                        if(result_link[d['source'].name+'-'+d['target'].name]){
                            return true
                        }else{
                            return false
                        }
                    })
    
                    d3.selectAll(".node_duration")
                        .classed("highlight",function(d){
                            if(result_node[d['source'].name]){
                                return true
                            }else{
                                return false
                            }
                        })
    
                    d3.selectAll(".sankey_text")
                        .classed("highlight",function(d){
                            if(result_node[d.name]){
                                return true
                            }else{
                                return false
                            }
                        })
                    Object.keys(node_mark).forEach(function(key){
                        node_mark[key]=0
                    })
    
                }
    
            }

        })
        return simvis.update()
    }

    simvis.update = function(){

        // d3.selectAll(".seq_group").remove()
        // d3.selectAll(".sankey_node_dura").remove()
        // d3.selectAll(".sankey_link").remove()
        // d3.selectAll(".sankey_node").remove()
        d3.selectAll(".seq-container").remove()
        seqCanvas = Canvas.append("g")
            .attr("class","seq-container")
            .attr("transform","translate(50,90)")

        originCanvas.append("g")
            .append("text")
            .attr("x",-5)
            .attr("y",seq_height/2)
            .style("font-size",11)
            .style("text-anchor","end")
            .style("alignment-baseline","middle")
            .style("pointer-events","none")
            .style("fill",'#696969')
            .style("fill-opacity",1)
            .text(currentPid)


        originCanvas.append("g")
            .attr("transform","translate(0,40)")
            .append("line")
            .attr("x1",0)
            .attr("x2", stage_num*stage_width + event_width) 
            .attr("y1", 0)
            .attr("y2", 0)
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width',2)
            .attr('stroke-dasharray', '2,2')

        originCanvas
            .append('rect')
            .attr('x1', 0)
            .attr('width', stage_num*stage_width-stage_width)
            .attr('y',seq_height/2-1.5)
            .attr('height', 3)
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width',1)
            .attr("fill","white")

        let origin_stage = originCanvas.selectAll(".origin_stage")
            .data(data["current_align"])
            .enter()
            .append("g")
            .attr("class","origin_stage")
            .attr("id",function(d,i){
                return "stage_" + i
            })
            .attr("transform",function(d,i){    
                // let height = eventRectSize[1]*Math.pow(d.length,pow_scale)
                // return `translate(${eventRectStep * i+eventRectPadding}, ${-height/2})`;
                return `translate(${i*stage_width},0)`
            })


        origin_stage.append("text")
            .attr('x',event_width/2)
            .attr('y', -28)
            .attr("font-size",11)
            .style("text-anchor","middle")
            .style("alignment-baseline","middle")
            .style("pointer-events","none")
            .style("fill",'#696969')
            .style("fill-opacity",1)
            .text(function(d,i){
                return '# '+i
            })
        
        let origin_node = origin_stage.selectAll(".origin_node")
            .data(function(d){
                let cur_list = d;
                treemap.size([event_width, seq_height*Math.pow(cur_list.length,pow_scale)]);
                // treemap.size([eventRectSize[0], eventRectSize[0]])
                var cur_obj=_.countBy(cur_list,function(e){
                  return e['event_type']+'-'+e['event_code']+'-'+e['stage']
                });
      
                var count=[];
                for(var key in cur_obj){
                  count.push([key,cur_obj[key]]);
                }
                var t_data=treemapData(count);
                var tree_root = d3.hierarchy(t_data)
                    .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
                    .sum(function sumBySize(d) {
                      return d.size
                    })
                    .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
                  treemap(tree_root);
                  return tree_root.leaves();
            })
            .enter()
            .append("g")
            .attr("class","origin_node")
            .attr("transform",function(d){
                let cur = d3.select(this.parentNode).data()[0].length
                return "translate(0,"+(seq_height*(0.5-Math.pow(cur,pow_scale)/2))+")"
            })

            origin_node
                .append("rect")
                .attr("name", function(d) { return d['data']['name']; })
                .attr("x",function(d){return d.x0; })
                .attr("y",function(d){return d.y0; })
                .attr("width", function(d) { return d.x1 - d.x0; })
                .attr("height", function(d) { return d.y1 - d.y0; })
                .attr("id", function(d) { 
                  if(d['data']['name'].split('-').length){
                    return d['data']['name'].split('-')[1]
                  }
                })
                .attr('fill',function(d){
                  if(d['data']['name'].split('-').length){
                    return typeColor2[d['data']['name'].split('-')[0]]
                  }
                })
                .attr('stroke-width',0.5)
                .attr('stroke',function(d){
                  if(d['data']['name'].split('-').length){
                    return typeColor3[d['data']['name'].split('-')[0]]
                  }
                })

            origin_node
              .append('text')
              .attr('class', 'event_text')
              .attr('x',function(d2,i){
                var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                if(num==1){
                  return (d2.x0+d2.x1)/2
                }else{
                  return (d2.x0+d2.x1)/2
                }
              })
              .attr('y', function(d2){
                return d2.y0 + seq_height/2
              })
              .attr("font-size",function(d2){
                return 11
              })
              .style("text-anchor","middle")
              .style("alignment-baseline","middle")
              .style("pointer-events","none")
              .style("fill",function(d){
                  if(d['data']['name'].split('-').length){
                    return typeColor3[d['data']['name'].split('-')[0]]
                  }
                })
              .style("fill-opacity",function(d2){
                var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                if(num==1){
                  return 1
                }else{
                  return 0
                }
              })
              .text(function(d2){
                var cur_data = d3.select(this.parentNode.parentNode).data()[0]
                let cur_text = ''
                if(cur_data[0]['event_type']=='Treatments'){
                  cur_text = treatment[cur_data[0]['icd_code']]
                }else{
                  cur_text = disease[cur_data[0]['icd_code']]
                }
                return cur_text[0] + cur_text[1] + cur_text[2]
              })

        let progress_origin = originCanvas.selectAll(".progress_origin")
            .data(data["current_time"])
            .enter()
            .append("g")
            .attr("class","progress_origin")
            .attr("transform",function(d,i){    
                // let height = eventRectSize[1]*Math.pow(d.length,pow_scale)
                // return `translate(${eventRectStep * i+eventRectPadding}, ${-height/2})`;
                return `translate(${i*stage_width+29},0)`
            })

        progress_origin.append("text")
          .attr('x', connect/2)
          .attr('y', seq_height/4-2)
          .attr("font-size",function(d2){
            return 9
          })
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .style("pointer-events","none")
          .style("fill",'#696969')
          .style("fill-opacity",1)
          .text(function(d){
            var cur_d = d['time']/(3600*24)
            return Math.ceil(cur_d*10)/10 + 'D'
          })

        progress_origin.append("rect")
            .attr("x",0)
            .attr("width",function(d,i){
                if(stage_min_max[1]==stage_min_max[0]||d['time']===0){
                    return 0
                }else{
                    let width = ((Math.log(d['time'])-Math.log(stage_min_max[0]))/(Math.log(stage_min_max[1])-Math.log(stage_min_max[0])))*(connect-3)
                    return width;
                }
                
            })
            .attr('y',seq_height/2-1.5)
            .attr('height', 3)
            .attr('fill', function(d){
                return typeColor2[d['type']]
            })
            .attr('stroke', function(d){
                return typeColor2[d['type']]
            })
            .attr('stroke-width', 1)
        

/*----------------------------------------------------------*/
        let bar_origin = originCanvas.selectAll(".bar_origin")
            .data(current_bar)
            .enter()
            .append("g")
            .attr("class","bar_origin")
            

        bar_origin.append("text")
          .attr('x', function(d){
            return d[0]*stage_width+29/2
          })
          .attr('y', -seq_height*0.5)
          .attr("font-size",function(d2){
            return 9
          })
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .style("pointer-events","none")
          .style("fill",'#696969')
          .style("fill-opacity",1)
          .text(function(d,i){
            return 'Visit-'+ i
          })


        bar_origin.append("line")
            .attr("x1",function(d){
                return d[0]*stage_width
            })
            .attr("x2",function(d,i){
                return d[1]*stage_width+29
            })
            .attr('y1',seq_height*1.5)
            .attr('y2', seq_height*1.5)
            .attr('stroke', "#7C7C7C")
            .attr('stroke-width',1)

/*----------------------------------------------------------*/

        let seq_group = seqCanvas.selectAll(".seq_group")
            .data(seq_data)
            .enter()
            .append("g")
            .attr("class","seq_group")
            .attr("id",function(d,i){
                return "patient_"+i
            })
            .attr("transform",function(d,i){
                return "translate(0,"+i*(threadHeight)+")"
            })

        let seq_pid = seqCanvas.selectAll(".seq_pid")
            .data(similar_set)
            .enter()
            .append("g")
            .attr("class","seq_pid")
            .attr("transform",function(d,i){
                return "translate(0,"+i*(threadHeight)+")"
            })
            .append("text")
            .attr("x",-5)
            .attr("y",seq_height/2)
            .style("font-size",11)
            .style("text-anchor","end")
            .style("alignment-baseline","middle")
            .style("pointer-events","none")
            .style("fill",'#696969')
            .style("fill-opacity",1)
            .text(function(d){
                return d
            })

/*----------------------------------------------------------*/
        let bar_group = seqCanvas.selectAll(".bar_group")
            .data(seq_bar)
            .enter()
            .append("g")
            .attr("class","bar_group")
            .attr("transform",function(d,i){
                return "translate(0,"+i*(threadHeight)+")"
            })

        let bar_day = bar_group.selectAll(".bar_day")
            .data(function(d){
                return d
            })
            .enter()
            .append("g")
            .attr("id",function(d,i){
                return "day_"+i
            })
            .attr("class","bar_day")
            

        bar_day.append("text")
          .attr('x', function(d){
            return d[0]*stage_width+29/2
          })
          .attr('y', -seq_height*0.5)
          .attr("font-size",function(d2){
            return 9
          })
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .style("pointer-events","none")
          .style("fill",'#696969')
          .style("fill-opacity",1)
          .text(function(d,i){
            
            return 'Visit-'+ i
          })


        bar_day.append("line")
            .attr("x1",function(d){
                return d[0]*stage_width
            })
            .attr("x2",function(d,i){
                return d[1]*stage_width+29
            })
            .attr('y1',seq_height*1.5)
            .attr('y2', seq_height*1.5)
            .attr('stroke', "#7C7C7C")
            .attr('stroke-width',1)
/*----------------------------------------------------------*/

        let progress_group = seqCanvas.selectAll(".progress_group")
            .data(seq_time)
            .enter()
            .append("g")
            .attr("class","progress_group")
            .attr("transform",function(d,i){
                return "translate(0,"+i*(threadHeight)+")"
            })
        let progress_stage = progress_group.selectAll(".progress_stage")
            .data(function(d){
                return d
            })
            .enter()
            .append("g")
            .attr("id",function(d,i){
                return "progress_"+i
            })
            .attr("class","progree_stage")
            .attr("transform",function(d,i){    
                // let height = eventRectSize[1]*Math.pow(d.length,pow_scale)
                // return `translate(${eventRectStep * i+eventRectPadding}, ${-height/2})`;
                return `translate(${i*stage_width+29},0)`
            })

        progress_stage.append("text")
          .attr('x', connect/2)
          .attr('y', seq_height/4-2)
          .attr("font-size",function(d2){
            return 9
          })
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .style("pointer-events","none")
          .style("fill",'#696969')
          .style("fill-opacity",1)
          .text(function(d){
            var cur_d = d['time']/(3600*24)
            return Math.ceil(cur_d*10)/10 + 'D'
          })

        progress_stage.append("rect")
            .attr("x",0)
            .attr("width",function(d,i){
                if(stage_min_max[1]==stage_min_max[0]){
                    return 0
                }else{
                    return ((Math.log(d['time'])-Math.log(stage_min_max[0]))/(Math.log(stage_min_max[1])-Math.log(stage_min_max[0])))*(connect-3)
                }
                
            })
            .attr('y',seq_height/2-1.5)
            .attr('height', 3)
            .attr('fill',function(d){
                return typeColor2[d['type']]
            })
            .attr('stroke-width',1)
            .attr('stroke',function(d){
                return typeColor2[d['type']]
            })

        seq_group.append('rect')
            .attr('class', 'sim-timeline')
            .attr('x', 0)
            .attr('width', stage_num*stage_width-stage_width)
            .attr('y',seq_height/2-1.5)
            .attr('height', 3)
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width',1)
            .attr("fill","white")


            
        let seq_stage = seq_group.selectAll(".seq_stage")
            .data(function(d){
                return d
            })
            .enter()
            .append("g")
            .attr("class","seq_stage")
            .attr("id",function(d,i){
                return "stage_" + i
            })
            .attr("transform",function(d,i){    
                // let height = eventRectSize[1]*Math.pow(d.length,pow_scale)
                // return `translate(${eventRectStep * i+eventRectPadding}, ${-height/2})`;
                return `translate(${i*stage_width},0)`
            })

        
        let seq_node = seq_stage.selectAll(".seq_node")
            .data(function(d){
                let cur_list = d;
                treemap.size([event_width, seq_height*Math.pow(cur_list.length,pow_scale)]);
                // treemap.size([eventRectSize[0], eventRectSize[0]])
                var cur_obj=_.countBy(cur_list,function(e){
                  return e['event_type']+'-'+e['event_code']+'-'+e['cluster']+'-'+e['stage']
                });
      
                var count=[];
                for(var key in cur_obj){
                  count.push([key,cur_obj[key]]);
                }
                var t_data=treemapData(count);
                var tree_root = d3.hierarchy(t_data)
                    .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
                    .sum(function sumBySize(d) {
                      return d.size
                    })
                    .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
                  treemap(tree_root);
                  return tree_root.leaves();
            })
            .enter()
            .append("g")
            .attr("class","seq_node")
            .attr("transform",function(d){
                let cur = d3.select(this.parentNode).data()[0].length
                return "translate(0,"+(seq_height*(0.5-Math.pow(cur,pow_scale)/2))+")"
            })
            .attr("id",function(d){
                return "tree_"+d['data']['name'].split('-')[1]
            })
            

        seq_node
            .append("rect")
            .attr("name", function(d) { return d['data']['name']; })
            .attr("x",function(d){return d.x0; })
            .attr("y",function(d){return d.y0; })
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr("id", function(d) { 
              if(d['data']['name'].split('-').length){
                return d['data']['name'].split('-')[0]
              }
            })
            .attr('fill',function(d){
              let cur_stage = parseInt(d['data']['name'].split('-')[3])
                if(cur_stage < data['current_align'].length){
                    let cur_list = data['current_align'][cur_stage].map(function(d){return d['event_code']})
                    if(cur_list.indexOf(parseInt(d['data']['name'].split('-')[1]))>=0){
                        // return typeColors[d.type]
                        return highlight_color
                    }
                    else{
                        return typeColor2[d['data']['name'].split('-')[0]]
                    }
                }
            })
            .attr('stroke-width',0.5)
            .attr('stroke',function(d){
              if(d['data']['name'].split('-').length){
                return typeColor3[d['data']['name'].split('-')[0]]
              }
            })

        seq_node
          .append('text')
          .attr('class', 'event_text')
          .attr('x',function(d2,i){
            var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
            if(num==1){
              return (d2.x0+d2.x1)/2
            }else{
              return (d2.x0+d2.x1)/2
            }
          })
          .attr('y', function(d2){
            return d2.y0 + seq_height/2
          })
          .attr("font-size",function(d2){
            return 11
          })
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .style("pointer-events","none")
          .attr('fill',function(d){
              if(d['data']['name'].split('-').length){
                return typeColor3[d['data']['name'].split('-')[0]]
              }
            })
          .style("fill-opacity",function(d2){
            var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
            if(num==1){
              return 1
            }else{
              return 0
            }
          })
          .text(function(d2){
            var cur_data = d3.select(this.parentNode.parentNode).data()[0]
            let cur_text = ''
            if(cur_data[0]['event_type']=='Treatments'){
              cur_text = treatment[cur_data[0]['icd_code']]
            }else{
              cur_text = disease[cur_data[0]['icd_code']]
            }
            
            return cur_text[0] + cur_text[1] + cur_text[2]
          })

        let result_group = seqCanvas.selectAll(".pre_group")
            .data(result_data)
            .enter()
            .append("g")
            .attr("class","pre_group")
            .attr("id",function(d,i){
                return "resultpatient_"+i
            })
            .attr("transform",function(d,i){
                return "translate("+his_width+","+i*(threadHeight)+")"
            })

        result_group.append('line')
            .attr('class', 'connect-timeline')
            .attr('x1', 0)
            .attr('x2', connect)
            .attr('y1',seq_height/2)
            .attr('y2', seq_height/2)
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width',2)
            .attr('stroke-dasharray', '2,2')

        result_group.append('rect')
            .attr('class', 'result-timeline')
            .attr('x', connect)
            .attr('width', function(d,i){
                if(d.length>1){
                    return (d.length-1)*(stage_width)
                }else{
                    return 0
                }
                    
            })
            .attr('y',seq_height/2-1.5)
            .attr('height', 3)
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width',1)
            .attr("fill","white")
            
        let result_stage = result_group.selectAll(".result_stage")
            .data(function(d){
                return d
            })
            .enter()
            .append("g")
            .attr("class","result_stage")
            .attr("id",function(d,i){return "resultstage_"+i})
            .attr("transform",function(d,i){    
                // let height = eventRectSize[1]*Math.pow(d.length,pow_scale)
                // return `translate(${eventRectStep * i+eventRectPadding}, ${-height/2})`;
                return `translate(${i*stage_width+connect},0)`
            })

        let result_node = result_stage.selectAll(".result_node")
                .data(function(d){
                    let cur_list = d;
                    treemap.size([event_width, seq_height*Math.pow(cur_list.length,pow_scale)]);
                    // treemap.size([eventRectSize[0], eventRectSize[0]])
                    var cur_obj=_.countBy(cur_list,function(e){
                      return e['event_type']+'-'+e['event_code']+'-'+e['cluster']+'-'+e['stage']
                    });
          
                    var count=[];
                    for(var key in cur_obj){
                      count.push([key,cur_obj[key]]);
                    }
                    var t_data=treemapData(count);
                    var tree_root = d3.hierarchy(t_data)
                        .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
                        .sum(function sumBySize(d) {
                          return d.size
                        })
                        .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
                      treemap(tree_root);
                      return tree_root.leaves();
                })
                .enter()
                .append("g")
                .attr("class","result_node")
                .attr("transform",function(d){
                    let cur = d3.select(this.parentNode).data()[0].length
                    return "translate(0,"+(seq_height*(0.5-Math.pow(cur,pow_scale)/2))+")"
                })
                .attr("id",function(d){
                    return "tree_"+d['data']['name'].split('-')[1]
                })     

        result_node
            .append("rect")
            .attr("id",function(d,i){return "resultrect_"+i})
            .attr("name", function(d) { return d['data']['name']; })
            .attr("x",function(d){return d.x0; })
            .attr("y",function(d){return d.y0; })
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr("id", function(d) { 
              if(d['data']['name'].split('-').length){
                return d['data']['name'].split('-')[0]
              }
            })
            .attr('fill',function(d){
              
                    // var index_code = selected_code.indexOf(parseInt(d['data']['name'].split('-')[1]))
                    var index_code = -1
                    for(var ii = 0; ii<selected_code.length; ii++){
                        var start_code = parseInt(selected_code[ii].split("|")[0])
                        var end_code = parseInt(selected_code[ii].split("|")[1])
                        if(parseInt(type_reves[d['data']['name'].split('-')[1]])>start_code&& parseInt(type_reves[d['data']['name'].split('-')[1]])<end_code){
                            index_code = ii
                        }
                    }
                    if(index_code>=0){
                        // return typeColors[d.type]
                        return diseaseColors[index_code]
                    }
                    else{
                        return typeColor2[d['data']['name'].split('-')[0]]
                    }
            })
            .attr('stroke-width',0.5)
            .attr('stroke',function(d){
                return typeColor3[d['data']['name'].split('-')[0]]
            })

        result_node
          .append('text')
          .attr('class', 'result_text')
          .attr('x',function(d2,i){
              return (d2.x0+d2.x1)/2
          })
          .attr('y', function(d2){
            return d2.y0 + seq_height/2
          })
          .attr("font-size",function(d2){
            return 11
          })
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .style("pointer-events","none")
          .style("fill",function(d){
                  if(d['data']['name'].split('-').length){
                    return typeColor3[d['data']['name'].split('-')[0]]
                  }
                })
          .style("fill-opacity",function(d2){
            var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
            if(num==1){
              return 1
            }else{
              return 0
            }
          })
          .text(function(d2){
            var cur_data = d3.select(this.parentNode.parentNode).data()[0]
            let cur_text = ''
            if(cur_data[0]['event_type']=='Treatments'){
              cur_text = treatment[cur_data[0]['icd_code']]
            }else{
              cur_text = disease[cur_data[0]['icd_code']]
            }
            
            return cur_text[0] + cur_text[1] + cur_text[2]
          })

        /*----------------------------------------------------------*/
        let result_bar_group = seqCanvas.selectAll(".result_bar_group")
            .data(result_bar)
            .enter()
            .append("g")
            .attr("class","result_bar_group")
            .attr("transform",function(d,i){
                return "translate("+(his_width+connect)+","+i*(threadHeight)+")"
            })
            .attr("id",function(d,i){
                return 'pBar-'+i
            })

        let result_bar_day = result_bar_group.selectAll(".result_bar_day")
            .data(function(d){
                return d
            })
            .enter()
            .append("g")
            .attr("id",function(d,i){
                return "result_day_"+i
            })
            .attr("class","result_bar_day")
            

        result_bar_day.append("text")
          .attr('x', function(d){
            return d[0]*stage_width+29/2
          })
          .attr('y', -seq_height*0.5)
          .attr("font-size",function(d2){
            return 9
          })
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .style("pointer-events","none")
          .style("fill",'#696969')
          .style("fill-opacity",1)
          .text(function(d,i){
            
            return 'Visit-'+ (i+seq_bar[parseInt(d3.select(this.parentNode.parentNode).attr("id").split("-")[1])].length)
          })


        result_bar_day.append("line")
            .attr("x1",function(d){
                return d[0]*stage_width
            })
            .attr("x2",function(d,i){
                return d[1]*stage_width+29
            })
            .attr('y1',seq_height*1.5)
            .attr('y2', seq_height*1.5)
            .attr('stroke', "#7C7C7C")
            .attr('stroke-width',1)
/*----------------------------------------------------------*/

        let result_progress_group = seqCanvas.selectAll(".result_progress_group")
            .data(result_time)
            .enter()
            .append("g")
            .attr("class","result_progress_group")
            .attr("transform",function(d,i){
                return "translate("+(his_width+connect)+","+i*(threadHeight)+")"
            })
        let result_progress_stage = result_progress_group.selectAll(".result_progress_stage")
            .data(function(d){
                return d
            })
            .enter()
            .append("g")
            .attr("id",function(d,i){
                return "result_progress_"+i
            })
            .attr("class","result_progree_stage")
            .attr("transform",function(d,i){    
                // let height = eventRectSize[1]*Math.pow(d.length,pow_scale)
                // return `translate(${eventRectStep * i+eventRectPadding}, ${-height/2})`;
                return `translate(${i*stage_width+29},0)`
            })

        result_progress_stage.append("text")
          .attr('x', connect/2)
          .attr('y', seq_height/4-2)
          .attr("font-size",function(d2){
            return 9
          })
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .style("pointer-events","none")
          .style("fill",'#696969')
          .style("fill-opacity",1)
          .text(function(d){
            var cur_d = d['time']/(3600*24)
            return Math.ceil(cur_d*10)/10 + 'D'
          })


        result_progress_stage.append("rect")
            .attr("x",0)
            .attr("width",function(d,i){
                if(result_min_max[1]==result_min_max[0]){
                    return 0
                }else{
                    return ((Math.log(d['time'])-Math.log(stage_min_max[0]))/(Math.log(stage_min_max[1])-Math.log(stage_min_max[0])))*(connect-3)
                }
                
            })
            .attr('y',seq_height/2-1.5)
            .attr('height', 3)
            .attr('fill', function(d){
                return typeColor2[d['type']]
            })
            .attr('stroke', function(d){
                return typeColor2[d['type']]
            })
            .attr('stroke-width', 1)
            

        addtipsy()



        return simvis.drawcluster()
    }

    simvis.clearAll = function(){

        d3.selectAll("#sim-canvas").remove()
        Canvas=null

        return simvis
    }

    function draw_switch () {
        container.classed('contain', false)
        if(show_flag == "sequence"){
            d3.selectAll('.sankey_node').style('pointer-events','none');
            d3.selectAll( ".seq_node" ).style('pointer-events','auto')
            d3.selectAll('.result_stage').style('pointer-events','auto')

            setTimeout(function(){
                d3.selectAll(".node_duration rect")
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',0)
                    .style("fill-opacity",0)
                

                d3.selectAll(".sankey_link line")
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',0)

                d3.selectAll(".sankey_circle_1 circle")
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',0)
                    .style("fill-opacity",0)

                d3.selectAll(".sankey_circle_2 circle")
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',0)
                    .style("fill-opacity",0)
                },500)
            
                for(var j=0; j<seq_data[0].length; j++){
                    (function(index){
                        setTimeout(function(){

                            d3.selectAll("#sankey_"+index+" rect")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",0)
                                .style('stroke-opacity',function(d){
                                    return 0
                                })

                             d3.selectAll("#sankey_"+index+" g text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",0)

                            d3.selectAll("#text_"+index+" text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",0)

                            d3.selectAll("#stage_"+index+" .seq_node rect")
                                .transition()
                                .duration(1000)
                                .attr("x",function(d){return d.x0})
                                .attr("y",function(d){return d.y0})
                                .style('fill-opacity',function(d){
                                    return 1
                                })
                                .style('stroke-opacity',function(d){
                                    return 1
                                })

                            d3.selectAll("#stage_"+index+" .seq_node text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",function(d2){
                                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                                    if(num==1){
                                      return 1
                                    }else{
                                      return 0
                                    }
                                  })
                            d3.selectAll("#progress_"+index+" rect")
                                .transition()
                                .duration(1000)
                                .style("stroke-opacity",1)
                                .style("fill-opacity",1)

                            d3.selectAll("#progress_"+index+" text")
                                .transition()
                                .duration(500)
                                .style("fill-opacity",1)

                        },j*100)

                    })(j);

                }
                for(var j=0; j< max_re_length; j++){
                    (function(index){
                        setTimeout(function(){

                            d3.selectAll("#sankey_"+(seq_data[0].length+index)+" rect")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",0)
                                .style('stroke-opacity',function(d){
                                    return 0
                                })

                            d3.selectAll("#sankey_"+(seq_data[0].length+index)+" g text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",0)
                                .style('stroke-opacity',function(d){
                                    return 0
                                })

                            d3.selectAll("#text_"+(seq_data[0].length+index)+" text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",0)

                             d3.selectAll("#resultstage_"+ index +" .result_node rect")
                                .transition()
                                .duration(1000)
                                .attr("x",function(d){return d.x0})
                                .attr("y",function(d){return d.y0})
                                .style('fill-opacity',function(d){
                                    return 1
                                })
                                .style('stroke-opacity',function(d){
                                    return 1
                                })

                            d3.selectAll("#resultstage_"+ index +" .result_node text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",function(d2){
                                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                                    if(num==1){
                                      return 1
                                    }else{
                                      return 0
                                    }
                                  })

                            d3.selectAll("#result_progress_"+index+" text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",1)
                                .style("stroke-opacity",1)

                            d3.selectAll("#result_progress_"+index+" text")
                                .transition()
                                .duration(500)
                                .style("fill-opacity",1)

                        },(seq_data[0].length+j)*100)

                    })(j);
                }
                
            

            setTimeout(function(){

                if(show_flag == 'sequence'){
                    d3.selectAll(".seq_pid text")
                        .transition()
                        .duration(1000)
                        .style('fill-opacity',function(d){
                            return 1
                        })

                    d3.selectAll('.sim-timeline')
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',function(d){
                            return 1
                        })

                    d3.selectAll('.connect-timeline')
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',function(d){
                            return 1
                        })

                    d3.selectAll('.result-timeline')
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',function(d){
                            return 1
                        })
                    d3.selectAll(".bar_day line")
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',function(d){
                            return 1
                        })

                    d3.selectAll(".bar_day text")
                        .transition()
                        .duration(1000)
                        .style('fill-opacity',function(d){
                            return 1
                        })
                    d3.selectAll(".result_bar_day line")
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',function(d){
                            return 1
                        })

                    d3.selectAll(".result_bar_day text")
                        .transition()
                        .duration(1000)
                        .style('fill-opacity',function(d){
                            return 1
                        })
                }
                

            },(seq_data.length+max_re_length)*100)

            
        }else{
            d3.selectAll('.sankey_node').style('pointer-events','auto');
            d3.selectAll( ".seq_node" ).style('pointer-events','none')
            d3.selectAll('.result_stage').style('pointer-events','none')

            d3.selectAll(".sankey_node")
                .classed("highlight",true)
                
            d3.selectAll(".sankey_link")
                .classed("highlight",true)

            d3.selectAll(".node_duration")
                .classed("highlight",true)

            d3.selectAll(".sankey_text")
                .classed("highlight",true)

            setTimeout(function(){
                d3.selectAll(".seq_pid text")
                        .transition()
                        .duration(1000)
                        .style('fill-opacity',function(d){
                            return 0
                        })

                d3.selectAll('.sim-timeline')
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',function(d){
                        return 0
                    })

                d3.selectAll('.connect-timeline')
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',function(d){
                        return 0
                    })

                d3.selectAll('.result-timeline')
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',function(d){
                        return 0
                    })

                d3.selectAll(".bar_day line")
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',function(d){
                        return 0
                    })

                d3.selectAll(".bar_day text")
                    .transition()
                    .duration(1000)
                    .style('fill-opacity',function(d){
                        return 0
                    })
                d3.selectAll(".result_bar_day line")
                    .transition()
                    .duration(1000)
                    .style('stroke-opacity',function(d){
                        return 0
                    })

                d3.selectAll(".result_bar_day text")
                    .transition()
                    .duration(1000)
                    .style('fill-opacity',function(d){
                        return 0
                    })
            },500)

            // d3.selectAll(".result_stage text")
            //     .transition()
            //     .duration(1000)
            //     .style("fill-opacity",0)

            
                for(var j=0; j<seq_data[0].length; j++){
                    (function(index){
                        setTimeout(function(){

                            // var test = d3.selectAll("#patient_" + index +" .seq_stage .seq_node rect")
                            // console.log(test)
                            // test = d3.selectAll("#patient_" + index)
                            // console.log(test)
                            // test = d3.selectAll("#patient_" + index + " .seq_stage")
                            // console.log(test)
                            d3.selectAll("#progress_"+index+" rect")
                                .transition()
                                .duration(500)
                                .style("stroke-opacity",0)
                                .style("fill-opacity",0)

                            d3.selectAll("#progress_"+index+" text")
                                .transition()
                                .duration(500)
                                .style("fill-opacity",0)

                            d3.selectAll("#stage_"+index+" .seq_node text")
                                .transition()
                                .duration(500)
                                .style("fill-opacity",0)

                            d3.selectAll("#stage_"+index+" .seq_node rect")
                                .transition()
                                .duration(1000)
                                .attr("y",function(d){
                                    let id = d3.select(this.parentNode.parentNode.parentNode).attr("id")
                                    id = parseInt(id.split("_")[1])
                                    let cur_string = d3.select(this).data()[0].data.name
                                    let cluster = cur_string.split('-')[2]
                                    let stage = cur_string.split('-')[3]
                                    let y_pos = d3.selectAll('[name=c'+cluster+'t'+stage+']').data()[0].y - id*threadHeight
                                    return y_pos
                                })
                                .style('fill-opacity',function(d){
                                    return 0
                                })
                                .style('stroke-opacity',function(d){
                                    return 0
                                })

                                // .attr('fill-opacity',function(d){
                                //     return 0
                                // })
                                // .attr('stroke-opacity',function(d){
                                //     return 0
                                // })
                            
                            d3.selectAll("#sankey_"+index+" rect")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",1)
                                .style('stroke-opacity',function(d){
                                    return 1
                                })
                            d3.selectAll("#sankey_"+index+" g text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",function(d){
                                    if(d.dy>9){
                                        return 1
                                    }else{
                                        return 0
                                    }
                                })
                                

                            d3.selectAll("#text_"+index+" text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",function(d){
                                    if(d.dy<10){
                                        return 0
                                    }else{
                                        return 1
                                    }
                                })

                            // d3.selectAll("#resultpatient_"+ index +" .result_stage rect")
                            //     .transition()
                            //     .duration(1000)
                                // .attr("y",function(d){
                                //     let cluster = d3.select(this).data()[0].cluster
                                //     let stage = d3.select(this).data()[0].stage
                                //     let y_pos = d3.selectAll('[name=c'+cluster+'t'+stage+']').data()[0].y-index*threadHeight
                                //     return y_pos
                                // })
                                

                        },j*100) 
                               
                    })(j)
                }

                for(var j=0; j< max_re_length; j++){
                    (function(index){
                        setTimeout(function(){

                            d3.selectAll("#result_progress_"+index+" rect")
                                .transition()
                                .duration(500)
                                .style("fill-opacity",0)
                                .style("stroke-opacity",0)

                            d3.selectAll("#result_progress_"+index+" text")
                                .transition()
                                .duration(500)
                                .style("fill-opacity",0)

                            d3.selectAll("#resultstage_"+ index +" .result_node text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",0)

                             d3.selectAll("#resultstage_"+ index +" .result_node rect")
                                .transition()
                                .duration(1000)
                                .style("y",function(d){
                                    let id = d3.select(this.parentNode.parentNode.parentNode).attr("id")


                                    id = parseInt(id.split("_")[1])
                                    let cur_string = d3.select(this).data()[0].data.name
                                    let cluster = cur_string.split('-')[2]
                                    let stage = cur_string.split('-')[3]
                                    let y_pos = d3.selectAll('[name=c'+cluster+'t'+stage+']').data()[0].y-id*threadHeight
                                    return y_pos
                                })
                                .style('fill-opacity',function(d){
                                    return 0
                                })
                                .style('stroke-opacity',function(d){
                                    return 0
                                })

                            d3.selectAll("#sankey_"+(index+seq_data[0].length)+" rect")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",1)
                                .style('stroke-opacity',function(d){
                                    return 1
                                })

                            d3.selectAll("#sankey_"+(index+seq_data[0].length)+" g text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",function(d){
                                    if(d.dy>9){
                                        return 1
                                    }else{
                                        return 0
                                    }
                                })

                            d3.selectAll("#text_"+(index+seq_data[0].length)+" text")
                                .transition()
                                .duration(1000)
                                .style("fill-opacity",function(d){
                                    if(d.dy<10){
                                        return 0
                                    }else{
                                        return 1
                                    }
                                })

                        },(seq_data[0].length+j)*100)
                    })(j);
                }
                
        
            setTimeout(function(){

                // d3.selectAll(".seq_node rect")
                //     .transition()
                //     .duration(1000)
                //     .style('fill-opacity',function(d){
                //         return 0
                //     })
                //     .style('stroke-opacity',function(d){
                //         return 0
                //     })
                // d3.selectAll(".result_stage rect")
                //     .transition()
                //     .duration(1000)
                //     .style('fill-opacity',function(d){
                //         return 0
                //     })
                //     .style('stroke-opacity',function(d){
                //         return 0
                //     })
                
                if(show_flag != "sequence"){
                    d3.selectAll(".node_duration rect")
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',function(d){
                            if(d.connect.type=='nothing'){
                                return 0
                            }else{
                                return 1
                            }
                        })
                        .style("fill-opacity",1)
                    

                    d3.selectAll(".sankey_link line")
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',function(d){
                            if(d.connect.type=='nothing'){
                                return 0
                            }else{
                                return 1
                            }
                        })


                    // d3.selectAll(".sankey_node rect")
                    //     .transition()
                    //     .duration(1000)
                    //     .attr('stroke-opacity',function(d){
                    //         return 1
                    //     })
                    //     .attr("fill-opacity",1)
                    //     .attr('stroke-opacity',function(d){
                    //         return 1
                    //     })

                    // d3.selectAll(".sankey_text text")
                    //     .transition()
                    //     .duration(1000)
                    //     .attr("fill-opacity",function(d){
                    //         if(d.dy<20){
                    //             return 0
                    //         }else{
                    //             return 1
                    //         }
                    //     })

                    d3.selectAll(".sankey_circle_1 circle")
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',1)
                        .style("fill-opacity",1)

                    d3.selectAll(".sankey_circle_2 circle")
                        .transition()
                        .duration(1000)
                        .style('stroke-opacity',1)
                        .style("fill-opacity",1)
                }

                

            },(seq_data.length+max_re_length)*100)


            // setTimeout(function(){

            //     d3.selectAll("#stage_" + i +" .seq_node rect")
            //         .transition()
            //         .duration(3000)
            //         .attr("y",function(d,i){
            //             let id = d3.select(this.parentNode.parentNode.parentNode).attr("id")
            //             id = parseInt(id.split("_")[1])
            //             let cur_string = d3.select(this).data()[0].data.name
            //             let cluster = cur_string.split('-')[2]
            //             let stage = cur_string.split('-')[3]
            //             let y_pos = d3.selectAll('[name=c'+cluster+'t'+stage+']').data()[0].y - id*threadHeight
            //             return y_pos
            //         })
            //         // .attr('fill-opacity',function(d){
            //         //     return 0
            //         // })
            //         // .attr('stroke-opacity',function(d){
            //         //     return 0
            //         // })

            //     d3.selectAll(".result_stage rect")
            //         .transition()
            //         .duration(3000)
            //         .attr("y",function(d,i){

            //             let id = d3.select(this.parentNode.parentNode).attr("id")
            //             id = parseInt(id.split("_")[1])
                        
            //             let cluster = d3.select(this).data()[0].cluster
            //             let stage = d3.select(this).data()[0].stage
            //             let y_pos = d3.selectAll('[name=c'+cluster+'t'+stage+']').data()[0].y-id*threadHeight
            //             return y_pos
            //         })
            //         // .attr('fill-opacity',function(d){
            //         //     return 0
            //         // })
            //         // .attr('stroke-opacity',function(d){
            //         //     return 0
            //         // })
                    
            //     },1*1000)

                // setTimeout(function(){
                    
                    
                // },6*1000)

        }
    }

    function addtipsy() {
        var in_tip_flag = false;
        $('.tipsy').remove();

        $('.origin_node').tipsy({
            gravity: 'w',
            html: true,
            fade: false,
            opacity: 0.7,
            title:function(){
                var cur_event = this.__data__.data
                cur_event.icd_code = type_reves[cur_event.name.split('-')[1]]
                cur_event.event_type = cur_event.name.split('-')[0]

                var tip = ''
                // console.log(cur_list[e])
                if(cur_event.event_type=='Treatments'){
                    tip += "<div class='rect-tooltip'><div class='tooltip-item'>Treatment</div><div class='tooltip-item'>Name: "+treatment[cur_event.icd_code]+"</div><div class='tooltip-item'>Frequency: "+cur_event.size+"</div></div>"

                } else {
                    tip += "<div class='rect-tooltip'><div class='tooltip-item'>Diagnosis</div><div class='tooltip-item'>ICD-9: "+cur_event.icd_code+"</div><div class='tooltip-item'>Name: "+disease[cur_event.icd_code]+"</div><div class='tooltip-item'>Frequency: "+cur_event.size+"</div></div>"
                }
                return tip
            }
        })

        $( ".origin_node" ).on('mouseenter', function() {

            if(show_flag=='sequence'){
                var current_icd = this.__data__.data['icd_code']
                var current_code = type[current_icd]
                var current_stage = this.__data__.data['name'].split("-")[2]
                d3.selectAll("#stage_"+current_stage+" .seq_node rect").style("fill-opacity",0.1).style("stroke-opacity",0.1)
                d3.selectAll("#stage_"+current_stage+" .seq_node text").style("fill-opacity",function(d){
                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                    if(num==1){
                      return 0.1
                    }else{
                      return 0
                    }
                  })

                d3.selectAll("#stage_"+current_stage+" #tree_"+current_code+" rect").style("fill-opacity",1).style("stroke-opacity",1)
                d3.selectAll("#stage_"+current_stage+" #tree_"+current_code+" text").style("fill-opacity",function(d){
                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                    if(num==1){
                      return 1
                    }else{
                      return 0
                    }
                  })
            }
            
            if(show_flag=="cluster"){
                var current_icd = this.__data__.data['icd_code']
                var current_code = type[current_icd]
                var current_stage = this.__data__.data['name'].split("-")[2]



                d3.selectAll("#sankey_"+current_stage+" rect").style("fill-opacity",0.1).style("stroke-opacity",0.1)
                d3.selectAll("#sankey_"+current_stage+" g text").style("fill-opacity",function(d){
                                    if(d.dy>9){
                                        return 0.1
                                    }else{
                                        return 0
                                    }
                                })
                d3.selectAll("#text_"+current_stage+" text").style("fill-opacity",function(d){
                                    if(d.dy<10){
                                        return 0
                                    }else{
                                        return 0.1
                                    }
                                })

                d3.selectAll(".duration_"+current_stage).style("fill-opacity",0.1).style("stroke-opacity",0.1)

                d3.selectAll("#sankey_"+current_stage+" #box_"+current_code).style("fill-opacity",1).style("stroke-opacity",1)
                d3.selectAll("#sankey_"+current_stage+" #rect_"+current_code).style("fill-opacity",1).style("stroke-opacity",1)
                d3.selectAll("#sankey_"+current_stage+" g #text_"+current_code).style("fill-opacity",function(d){
                                    if(d.dy>9){
                                        return 1
                                    }else{
                                        return 0
                                    }
                                })
                d3.selectAll("#text_"+current_stage+" #t_"+current_code).style("fill-opacity",function(d){
                                    if(d.dy<10){
                                        return 0
                                    }else{
                                        return 1
                                    }
                                })
                d3.selectAll("#duration_"+current_stage+"_"+current_code).style("fill-opacity",1).style("stroke-opacity",1)
            }
            
        });


        
        $( ".origin_node" ).on('mouseleave', function(d) {

            if(show_flag=='sequence'){
                var current_icd = this.__data__.data['icd_code']
                var current_code = type[current_icd]
                var current_stage = this.__data__.data['name'].split("-")[2]
                d3.selectAll("#stage_"+current_stage+" .seq_node rect").style("fill-opacity",1).style("stroke-opacity",1)
                d3.selectAll("#stage_"+current_stage+" .seq_node text").style("fill-opacity",function(d){
                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                    if(num==1){
                      return 1
                    }else{
                      return 0
                    }
                  })
            }

            if(show_flag=="cluster"){
                var current_icd = this.__data__.data['icd_code']
                var current_code = type[current_icd]
                var current_stage = this.__data__.data['name'].split("-")[2]
                d3.selectAll("#sankey_"+current_stage+" rect")
                    .style("fill-opacity",function(d){
                        if(d3.select(this.parentNode).classed("highlight")){
                            return 1
                        }else{
                            return 0.1
                        }
                    })
                    .style("stroke-opacity",function(d){
                        if(d3.select(this.parentNode).classed("highlight")){
                            return 1
                        }else{
                            return 0.1
                        }
                    })

                d3.selectAll("#sankey_"+current_stage+" g text").style("fill-opacity",function(d){
                                    if(d.dy>9){
                                        if(d3.select(this.parentNode.parentNode).classed("highlight")){
                                            return 1
                                        }else{
                                            return 0.1
                                        }
                                    }else{
                                        return 0
                                    }
                                })
                d3.selectAll("#text_"+current_stage+" text").style("fill-opacity",function(d){
                                    if(d.dy<10){
                                        return 0
                                    }else{
                                        if(d3.select(this.parentNode).classed("highlight")){
                                            return 1
                                        }else{
                                            return 0.1
                                        }
                                    }
                                })

                d3.selectAll(".duration_"+current_stage)
                    .style("fill-opacity",function(d){
                        if(d3.select(this.parentNode).classed("highlight")){
                            return 1
                        }else{
                            return 0.1
                        }
                    })
                    .style("stroke-opacity",function(d){
                        if(d3.select(this.parentNode).classed("highlight")){
                            return 1
                        }else{
                            return 0.1
                        }
                    })
            }
        });



        $('.seq_node').on('mouseenter', function(){
            if(show_flag=='sequence'){
                let current_eventcode = d3.select(this).attr('id').split('_')[1];
                let current_stage = d3.select(this.parentNode).attr('id').split('_')[1]
                d3.selectAll("#stage_"+current_stage+" .origin_node rect").style("fill-opacity",0.1).style("stroke-opacity",0.1)
                d3.selectAll("#stage_"+current_stage+" .origin_node text").style("fill-opacity",function(d){
                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                    if(num==1){
                      return 0.1
                    }else{
                      return 0
                    }
                  })
                let selectedNodes = d3.selectAll("#stage_"+current_stage+" .origin_node")
                .filter(function(){
                    let compare_eventcode = d3.select(this).select('rect').attr('id')
                    if (compare_eventcode === current_eventcode) {
                        return true;
                    } else {
                        return false;
                    }
                })
                selectedNodes
                .select('rect')
                .style("fill-opacity",1).style("stroke-opacity",1)
                selectedNodes
                .selectAll("text").style("fill-opacity",function(d){
                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                    if(num==1){
                        return 1
                    }else{
                        return 0
                    }
                })
            }
            
        })


        $( ".seq_node" ).on('mouseleave', function(d) {

            if(show_flag=='sequence'){
                var current_stage = d3.select(this.parentNode).attr('id').split('_')[1];
                d3.selectAll("#stage_"+current_stage+" .origin_node rect").style("fill-opacity",1).style("stroke-opacity",1)
                d3.selectAll("#stage_"+current_stage+" .origin_node text").style("fill-opacity",function(d){
                    var cur_list = d3.select(this.parentNode.parentNode).data()[0]
                cur_list = _.uniq(cur_list,function(item,key,a){
                  return item.icd_code
                })
                let num = cur_list.length
                    if(num==1){
                      return 1
                    }else{
                      return 0
                    }
                  })
            }
        })

        $('#resultstage_0 .result_node').on('mouseenter', function(d){
            if(show_flag=='sequence'){
                let current_eventcode = d3.select(this).attr('id').split('_')[1];
                d3.selectAll('.result_origin rect').style("fill-opacity",0.1).style("stroke-opacity",0.1)
                let selectedNodes = d3.selectAll('.result_origin')
                .filter(function(){
                    let icdcode = d3.select(this).select('rect').attr('name').split('-')[1];
                    let current_icd = parseInt(type_reves[current_eventcode])
                    let start_icd = parseInt(icdcode.split("|")[0])
                    let end_icd = parseInt(icdcode.split("|")[1])
                    if (current_icd>start_icd&&current_icd<end_icd) {
                        return true;
                    } else {
                        return false;
                    }
                })
                selectedNodes
                .select('rect')
                .style("fill-opacity",1).style("stroke-opacity",1)
            }
        })

        $( "#resultstage_0 .result_node" ).on('mouseleave', function(d) {
            if(show_flag=='sequence'){
                d3.selectAll(".result_origin rect").style("fill-opacity",1).style("stroke-opacity",1)
            }
        })

        $('.seq_stage .seq_node').tipsy({
          gravity: 'w',
            html: true,
            fade: false,
            opacity: 0.7,
          title:function(){
            var cur_event = this.__data__.data
            cur_event.icd_code = type_reves[cur_event.name.split('-')[1]]
            cur_event.event_type = cur_event.name.split('-')[0]

            var tip = ''
            // console.log(cur_list[e])
            if(cur_event.event_type=='Treatments'){
                tip += "<div class='rect-tooltip'><div class='tooltip-item'>Treatment</div><div class='tooltip-item'>Name: "+treatment[cur_event.icd_code]+"</div><div class='tooltip-item'>Number: "+cur_event.size+"</div></div>"

            } else {
                tip += "<div class='rect-tooltip'><div class='tooltip-item'>Diagnosis</div><div class='tooltip-item'>ICD-9: "+cur_event.icd_code+"</div><div class='tooltip-item'>Name: "+disease[cur_event.icd_code]+"</div><div class='tooltip-item'>Number: "+cur_event.size+"</div></div>"
            }
            return tip
          }
        });

        $('.result_stage .result_node').tipsy({
          gravity: 'w',
            html: true,
            fade: false,
            opacity: 0.7,
          title:function(){
            var cur_event = this.__data__.data
            cur_event.icd_code = type_reves[cur_event.name.split('-')[1]]
            cur_event.event_type = cur_event.name.split('-')[0]

            var tip = ''
            // console.log(cur_list[e])
            if(cur_event.event_type=='Treatments'){
                tip += "<div class='rect-tooltip'><div class='tooltip-item'>Treatment</div><div class='tooltip-item'>Name: "+treatment[cur_event.icd_code]+"</div><div class='tooltip-item'>Number: "+cur_event.size+"</div></div>"

            } else {
                tip += "<div class='rect-tooltip'><div class='tooltip-item'>Diagnosis</div><div class='tooltip-item'>ICD-9: "+cur_event.icd_code+"</div><div class='tooltip-item'>Name: "+disease[cur_event.icd_code]+"</div><div class='tooltip-item'>Number: "+cur_event.size+"</div></div>"
            }
            return tip

          }
        });


      }

    function find_forwards(node, find){
        var targetLinks = node.targetLinks
        node_mark[node.name] = 1

        targetLinks.forEach(function(d){
            if(!node_mark[d['source'].name]){
                find= find_forwards(d['source'],find)

                find['node'].push(d['source'].name)
            }
            find['link'].push(d['source'].name+"-"+d['target'].name)
        })
        return find
    }
    function find_backwards(node, find){
        var sourceLinks = node.sourceLinks
        node_mark[node.name] = 1
        sourceLinks.forEach(function(d){
            if(!node_mark[d['target'].name]){
                find= find_backwards(d['target'],find)
                // console.log(d['target'].name)
                find['node'].push(d['target'].name)
            }
            find['link'].push(d['source'].name+"-"+d['target'].name)
        })
        return find
    }

    function sortWithIndices(toSort) {
        for (var i = 0; i < toSort.length; i++) {
            toSort[i] = [toSort[i], i];
        }
        toSort.sort(function(left, right) {
            return left[0] < right[0] ? -1 : 1;
        });
        toSort.sortIndices = [];
        for (var j = 0; j < toSort.length; j++) {
            toSort.sortIndices.push(toSort[j][1]);
            toSort[j] = toSort[j][0];
        }
        return toSort;
    }

    function treemapData(arr){
        var obj={
          'name':'obj',
          'children':[]
        };
    
        let eventTypes = ["Treatments","diagnose"]
    
        eventTypes.forEach(function(type){
          var typeObj={
            'name':type,
            'children':[]
          }
          obj['children'].push(typeObj);
        })
    
        arr.forEach(function(event){
          var e_type=event[0].split('-')[0];
          var e_code=event[0].split('-')[1];
          
          var eventObj={
            'name':event[0],
            'size':event[1]
          }
          obj['children'][_.indexOf(eventTypes,e_type)]['children'].push(eventObj);
        })
        obj['children'].forEach(function(etype,index){
          if(!etype['children'].length){
            obj['children'].splice(index,1);
          }
        })
        return obj;
      }


    function dragstart() {
        // console.log('---------------start-------------')
        var offsetX = 0;
        // console.log(d3.mouse(this))
        offsetX = d3.mouse(this)[0];
        let curX = d3.select(this).attr('x');
        offsetX = offsetX-Number(curX);
        let selectionWidth = d3.select(this).attr('width');
        let maxX = sliderLength - selectionWidth;
        var w = d3.select(window)
        .on("mousemove", ()=>{
            let curOffsetX = d3.mouse(this)[0];
            let newX = curOffsetX - offsetX;
            newX = Math.max(newX, 0);
            newX = Math.min(newX, maxX)
            d3.select(this).attr('x', newX);
            document.getElementById('similar-container').scrollLeft = sliderScale.invert(newX);
        })
        .on("mouseup", mouseup);
  
        d3.event.preventDefault(); // disable text dragging
    
        function mouseup() {
            w.on("mousemove", null).on("mouseup", null);
        }
    }




    return simvis
}