Vis.tsne = function() {

    var tsne = {},
        container = null,
        data = null,
        size = [960, 800],
        margin = { left: 20, top: 20, right: 10, bottom: 10 },
        dispatch = d3.dispatch("displayAnomaly","clearAnomaly");

    let xAxisScale=d3.scaleLinear();
    let yAxisScale=d3.scaleLinear();
    let sizeScale=d3.scalePow();
    let scoreScale=d3.scaleLinear();
    let anomalyColorScale=d3.scaleSequential(d3.interpolate("#fcbba1","#cb181d"));

    let minR=3,
        maxR=9;

    let contour_colors=['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929'];
    let strokeScale=d3.scaleLinear();

    // let colorScale=d3.scaleQuantize().range(contour_colors);

    tsne.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return tsne;
    };

    tsne.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return tsne;
    };

    tsne.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return tsne;
    };

    tsne.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return tsne;
    };

    tsne.dispatch = dispatch;

    // tip
    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-8,0])
        .html(function(d) {
            return d;
        });

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    tsne.layout = function() {

        this.size([$("#tsne_div").width()-margin.left-margin.right,
                    $("#tsne_div").height()-margin.top-margin.bottom])

        xAxisRange=[margin.left,size[0]];
        yAxisRange=[margin.top,size[1]];

        xAxisScale.domain(d3.extent(data['coords'],function(d){return d[0]}))
            .range(xAxisRange);

        yAxisScale.domain(d3.extent(data['coords'],function(d){return d[1]}))
            .range(yAxisRange);

        let coords=_.map(data['coords'],function(d){return [xAxisScale(d[0]),yAxisScale(d[1])]})

        let anomaly=_.map(data['pids'],function(d){return _.contains(Data.anomaly_id,d)});

        let seq_length=_.map(data['pids'],function(d){return Math.random();})

        anomalyColorScale.domain(d3.extent(seq_length));

        zipped_data=_.zip(data['pids'],coords,anomaly,data['scores'],seq_length);

        // this.data(zipped_data);

        this.data(_.filter(zipped_data,function(d){return d[2]==true&&_.contains(Data.passid,d[0])==false}));

        sizeScale.domain(d3.extent(_.unzip(data)[3]))
            .range([maxR,minR]);

        scoreScale.domain(d3.extent(_.unzip(data)[3]))
            .range([1,0.1]);

        return tsne;
    };

    tsne.render = function() {

        if (!container) {
            return;
        }

        container.append('rect')
            .attr('class','rect_bg')
            .attr('id','tsne_bg')
            .attr('width','100%')
            .attr('height','100%')
            .style('fill','#fcc520');

        let coords=_.map(data,function(d){return {'x':d[1][0],'y':d[1][1]}});
        let contours=d3.contourDensity()
            .x(d=>d.x)
            .y(d=>d.y)
            .bandwidth(40)(coords);

        let interpolate=d3.interpolate("#ffcf54","#ffffff")
        let colorScale= d3.scaleSequential(interpolate).domain(d3.extent(contours,(d)=>d.value));
        // strokeScale.domain(d3.extent(contours,(d)=>d.value)).range([1,3])
        // colorScale.domain(d3.extent(contours,(d)=>d.value));

        let anomalyColor=d3.scaleSequential(d3.interpolate("#2171b5","#FFFFFF"))
            .domain()

        container.append("g")
            .attr("fill",'none')
              .attr("stroke-linejoin", "round")
            .selectAll("path")
            .data(contours)
            .enter()
            .append("path")
            .filter((d,i)=>i%3==0)
            .attr('class','contour')
            .attr('d',d3.geoPath());

        container.selectAll('.contour').attr("fill", function(d){return colorScale(d.value)})
                .attr('stroke','grey')
                .attr('stroke-width',1)
                .attr('stroke-opacity',1)
                .attr('fill-opacity',1);

        container.selectAll('.tsne_plot')
            .data(data)
            .enter()
            .append('circle')
            .attr('class','tsne_plot')
            .attr('cx',(d)=>d[1][0])
            .attr('cy',(d)=>d[1][1])
            .attr('r',(d)=>sizeScale(d[3]))
            .attr('fill',function(d){
                if(d[2]){
                    return anomalyColorScale(d[4]);
                }else{
                    return '#dddddd';
                }
            })
            .classed('anomaly',(d)=>d[2])
            .call(tip);

        d3.selectAll('.tsne_plot.anomaly').raise();

        return tsne.update();
    };

    tsne.update = function() {

        d3.selectAll('.tsne_plot').on('mouseover',function(d){
            d3.select(this).attr('r',(d)=>sizeScale(d[3])+2)
                .classed('highlight',true);
            tip.show(getTooltip(d[0],scoreScale(d[3])));
        })

        d3.selectAll('.tsne_plot').on('mouseout',function(d){
            d3.selectAll('.tsne_plot').attr('r',(d)=>sizeScale(d[3]))
                .classed('highlight',false);

            tip.hide();
        })

        d3.selectAll('.tsne_plot').on('click',function(d){
            d3.select(this).classed('select',true);
            dispatch.call('displayAnomaly',this,d[0]);
        })

        d3.select('#tsne_bg').on('dblclick',function(d){
            d3.selectAll('.tsne_plot').classed('select',false);
            dispatch.call('clearAnomaly',this,null);
        })

        return tsne;
    };

    ///////////////////////////////////////////////////
    // Private Functions
    function getTooltip(pid,score){
        obj={}
        obj['Patient ID']=pid;
        obj['Anomaly Score']=d3.format('.2f')(score);
        return Util.getTooltipHtml(obj);
    }


    return tsne;
};
