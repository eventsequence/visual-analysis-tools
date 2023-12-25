Vis.similarity = function() {

    var similarity = {},
        container = null,
        data = null,
        size = [960, 800],
        margin = { left: 45, top: 20, right: 10, bottom: 70 },
        dispatch = d3.dispatch("drawSimPatient");

    var step=0.05;

    var scaleX=d3.scaleLinear(),
        scaleY=d3.scaleLinear(),
        binScale=d3.scaleQuantize(),
        mbinScale=d3.scaleQuantize();

    var onselect="meandis";

    var group,mgroup;

    //bind brush
    let brush = d3.brushX()
        .on("start", brushstart)
        .on("brush", brushmove)
        .on("end", brushend);

    let handle_path="M -01 0 a 4 4 0 0 0 -4 4 l 0 12 a 4 4 0 0 0 4 4 l 0 -20";

    similarity.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return similarity;
    };

    similarity.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return similarity;
    };

    similarity.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return similarity;
    };

    similarity.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return similarity;
    };

    similarity.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    similarity.layout = function() {

        //scale distances
        let bins=d3.range(0,1,step)
        binScale.domain(d3.extent(data['latent_dis'])).range(d3.range(bins.length-1));
        mbinScale.domain(d3.extent(data['distance'])).range(d3.range(bins.length-1));

        //group into bins
        group=Util.createArray(bins.length,0);
        data_group=_.zip(data['pids'],data['latent_dis'])
        data_group.forEach(function(d){
            let index=binScale(d[1]);
            group[index].push(d[0]);
        })

        mgroup=Util.createArray(bins.length,0);
        data_mgroup=_.zip(data['pids'],data['distance'])
        data_mgroup.forEach(function(d){
            let index=mbinScale(d[1]);
            mgroup[index].push(d[0]);
        })

        this.size([$("#tsne_svg").width()-margin.left-margin.right,
                    $("#tsne_svg").height()-margin.top-margin.bottom]);

        brush.extent([[0, 0], [size[0],size[1]]])

        scaleX.domain([0,1]).range([0,size[0]]);
        scaleY.domain([0,d3.max(group.concat(mgroup),function(d){return d.length;})])
                .range([size[1],0]);

        drawAxis();

        drawBars(group,"latent");
        drawBars(mgroup,"meandis");

        drawLegend();

        return similarity.update();
    };

    similarity.render = function() {

        if (!container) {
            return;
        }
        return similarity.update();
    };

    similarity.update = function() {
        let t=d3.transition().duration(1000);
        d3.selectAll('#latent_dis_legend,#mean_dis_legend').on('mouseover',function(d){
            d3.select(this).attr('stroke','black')
                .attr('stroke-width',2);
        })

        d3.selectAll('#latent_dis_legend,#mean_dis_legend').on('mouseout',function(d){
            d3.select(this).attr('stroke','none');
        })

        d3.select('#latent_dis_legend').on('click',function(d){
            if(d3.select(this).classed('notselect')){
                d3.selectAll('.barchart').selectAll('.brush').selectAll('.resize').attr('d', null)
                onselect="latent_dis";
                d3.select(this).classed('notselect',false)
                d3.select(this).transition(t)
                    .style('fill','#7f7f7f')
                    .style('fill-opacity',1);

                d3.selectAll('.barchart.latent').transition(t)
                    .style('fill','#7f7f7f')
                    .style('fill-opacity',1);

                d3.select('#barchart_canvas_latent').raise();

                d3.select('#mean_dis_legend').transition(t).style('fill','#d2d2d2')
                    .style('fill-opacity',1);

                d3.selectAll('.barchart.meandis').transition(t)
                    .style('fill','#d2d2d2')
                    .style('fill-opacity',1);

                d3.select('#mean_dis_legend').classed('notselect',true)
                d3.select('.barchart.latent').select('.brush').call(brush);

                d3.select('.legend').raise();
            }
        })

        d3.select('#mean_dis_legend').on('click',function(d){
            if(d3.select(this).classed('notselect')){
                d3.selectAll('.barchart').selectAll('.brush').selectAll('.resize').attr('d', null)
                onselect="meandis";
                d3.select(this).classed('notselect',false);
                d3.select(this).transition(t)
                    .style('fill','#7f7f7f')
                    .style('fill-opacity',1);

                 d3.selectAll('.barchart.meandis').transition(t)
                    .style('fill','#7f7f7f')
                    .style('fill-opacity',1);

                d3.select('#barchart_canvas_meandis').raise();

                d3.select('#latent_dis_legend').transition(t).style('fill','#d2d2d2')
                    .style('fill-opacity',1);

                d3.selectAll('.barchart.latent').transition(t)
                    .style('fill','#d2d2d2')
                    .style('fill-opacity',1);

                d3.select('#latent_dis_legend').classed('notselect',true);

                d3.select('.barchart.meandis').select('.brush').call(brush);
                d3.select('.legend').raise();
            }
        })

        return similarity;
    };

    ///////////////////////////////////////////////////
    // Private Functions
    function drawLegend(){
        let legends=container.append('g')
            .attr('class','legend')
            .attr('transform',function(){
                let xpos=30;
                let ypos= margin.top;
                return 'translate('+xpos+','+ypos+')';
            })

        legends.append('rect')
            .attr('id','mean_dis_legend')
            .attr('width',13)
            .attr('height',13)
            .attr('x',0)
            .attr('y',154)
            .style('fill','#7f7f7f')
            .style('fill-opacity',1);

        legends.append('rect')
            .attr('id','latent_dis_legend')
            .attr('width',13)
            .attr('height',13)
            .attr('y',154)
            .attr('x',size[0]/2+15)
            .style('fill','#d2d2d2')
            .classed('notselect',true);

        legends.append('text')
            .attr('x',17)
            .attr('y',165)
            .text('Dist to Mean Vec')
            .style('font-size',11)

        legends.append('text')
            .attr('x',size[0]/2+32)
            .attr('y',165)
            .text('Dist to Anomaly')
            .style('font-size',11)
    }

    function drawAxis(){

        let xaxis=container.append('g')
            .attr('class','x axis')
            .attr('transform',function(){
                let xpos=margin.left;
                let ypos=margin.top+size[1];
                return 'translate('+xpos+','+ypos+')';
            })
            .call(d3.axisBottom(scaleX));

        let yaxis=container.append('g')
            .attr('class','y axis')
            .attr('transform','translate('+margin.left+','+margin.top+')')
            .call(d3.axisLeft(scaleY).ticks(10));

        d3.select('.y.axis').append('text')
            .attr('transform','rotate(270)')
            .attr('class','axis-label')
            .text('# of records')
            .attr('x',-size[1]/2)
            .attr('y',-30);

        d3.select('.x.axis').append('text')
            .attr('class','axis-label')
            .text('distance')
            .attr('x',size[0]/2)
            .attr('y',margin.bottom/2);

        d3.select('.x.axis').append('text')
            .text('(most similar)')
            .attr('x',margin.left/2)
            .attr('y',margin.bottom/2);

        d3.select('.x.axis').append('text')
            .text('(least similar)')
            .attr('x',size[0]-margin.left/2)
            .attr('y',margin.bottom/2);

    }
    function drawBars(dat,type){

        let canvas=container.append('g')
            .attr('id','barchart_canvas_'+type)
            .attr('transform','translate('+margin.left+','+margin.top+')');

        canvas.selectAll('.bars')
            .data(dat)
            .enter()
            .append('rect')
            .attr('class','barchart '+type)
            .attr('x',function(d,i){
                let bar_width=size[0]/(1/step);
                return i*bar_width;
            })
            .attr('y',function(d){
                let bar_height=scaleY(d.length);
                return bar_height;
            })
            .attr('width',size[0]/(1/step))
            .attr('height',function(d){return size[1]-scaleY(d.length)});

        brushg = canvas.append("g")
          .attr("class", "brush")
          .call(brush);

        brushg.selectAll(".resize")
            .data([{type:"w"}, {type:"e"}])
            .enter()
            .append("path")
            .attr("class","resize");
    }

    function brushstart() {
        d3.select(this).classed("selecting", true);
        d3.select(this).selectAll('.resize').attr('d', null);
    }

    function brushmove() {
        var p = d3.brushSelection(d3.select(this).node()),
        s = p.map(scaleX.invert); 

      d3.select(this).selectAll('.resize')
         .attr('transform', function(d,i){ 
            if(d.type=='w'){
                return 'translate(' + [p[i], 1] + ')';
            }else{
                return 'translate(' + [p[i], 21] + ')'+'rotate(180)'
            }
        })
        .attr('d',handle_path);
    }

    function brushend() {
        d3.select(this).classed("selecting", d3.event.selection);
        if (!d3.event.selection){
            d3.select(this).selectAll('.resize').attr('d', null)
            return
        }

        let v1=scaleX.invert(d3.event.selection[0]),
            v2=scaleX.invert(d3.event.selection[1]);

        let bin_n1=Math.floor(v1/step),
            bin_n2=Math.floor(v2/step);

        plist=[]
        let select_dat;
        console.log(onselect);
        if(onselect=="meandis"){
            select_dat=mgroup;
        }else{
            select_dat=group;
        }
        for(let i=bin_n1;i<bin_n2;i++){
            plist.push(select_dat[i])
        }

        dispatch.call("drawSimPatient",this,plist);
    }

    return similarity;
};
