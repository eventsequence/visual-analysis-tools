Vis.overview = function() {

    var overview = {},
        container = null,
        data = null,
        size = [960, 800],
        margin = { left: 10, top: 10, right: 10, bottom: 10 },
        dispatch = d3.dispatch("select", "mouseover", "mouseout");

    overview.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return overview;
    };

    overview.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return overview;
    };

    overview.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return overview;
    };

    overview.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return overview;
    };

    overview.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters
    var force = null
    var canvas = null
    var graph = null

    ///////////////////////////////////////////////////
    // Public Function
    overview.layout = function() {
        size=[$("#outcome").width()-margin.left-margin.right,
                $("#outcome").height()-margin.top-margin.bottom];

        graph = data2Graph(data)
        force = d3
        .forceSimulation(graph.nodes)
        .force('link', d3.forceLink(graph.links))
        .force('charge', d3.forceManyBody())
        .force('center', d3.forceCenter(size[0]/2,size[1]/2))



        return overview;
    };

    overview.render = function() {

        if (!container) {
            return;
        }
    	canvas = container.append("g")
    		.attr("transform","translate("+margin.top+","+margin.left+")");

        const link = canvas.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(graph.links)
        .enter().append("line")
        .attr("stroke-width", 1);

        const node = canvas.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("r", 5)
        .attr("fill", 'black')
        .call(drag(force));

        force.on("tick", () => {
            link
                .attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node
                .attr("cx", d => d.x)
                .attr("cy", d => d.y);
            });
            // var myChart = echarts.init(document.getElementById("outcome"));
            // var option = {
            //     tooltip: {},
            //     series : [
            //         {
            //             type: 'graph',
            //             layout: 'force',
            //             symbolSize: 30,
            //             edgeSymbol: ['none', 'arrow'],
            //             data: graph.data,
            //             links: graph.links,
            //             roam: true,
            //             label: {
            //                 normal: {
            //                     show: false,
            //                     formatter: function (e) {
            //                         return e['data']['value'];
            //                     }
            //                 }
            //             },
            //             edgeLabel: {
            //                 normal: {
            //                     show: false,
            //                     position: 'middle'
            //                 }
            //             },
            //             force: {
            //                 repulsion: 1000,
            //                 edgeLength: 200
            //             }
            //         }
            //     ]
            // };
            // myChart.setOption(option);

        return overview.update();
    };

    overview.update = function() {
        return overview;
    };

    ///////////////////////////////////////////////////
    // Private Functions

    function data2Graph(data) {
        var graph = {}
        var vertices = {}
        var links = [];
        for (var i = 0; i < data.length; i++) {
            for(var j=0; j<data[0].length; j++){
                var s = String(i);
                var t = String(j);
                var v = data[i][j];
                if(v>0){
                    links.push({'source' : s, 'target' : t, 'value' : v});
                }
            }
            vertices[s] = String(i);
        }
        var nodes = [];
        $.each(vertices, function(k, v) {
            nodes.push({'name' : v, 'value' : v});
        });
        graph['links'] = links;
        graph['nodes'] = nodes;
        return graph;
    }

    drag = simulation => {

        function dragstarted(d) {
          if (!d3.event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        }

        function dragged(d) {
          d.fx = d3.event.x;
          d.fy = d3.event.y;
        }

        function dragended(d) {
          if (!d3.event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
      }

    function private_function2() {

    };

    function private_function3() {

    };

    return overview;
};
