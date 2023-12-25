// import * as d3 from 'd3'

export const Correlation = function() {

    var correlation = {},
    container = null,
    data = {},
    size = [252, 505],
    margin = {top:1, right: 0, bottom: 1, left: 15},
    typeColors = ['#68bde1','#aa97da','#93dc16','#fdca3d','#fd94b4'];
    // dispatch = d3.dispatch('');

    var columnNum = 0, rowNum = 0;
    var eventNames = [], resultNames = [];
    var canvas = null;
    var splitLines = null;
    var treatment = {};
    var treatment_set = null;
    var disease = null;
    var diseaseDict = null;

    correlation.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return correlation;
    }

    correlation.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return correlation;
    }

    correlation.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return correlation;
    }

    correlation.margin = function(_) {
        if(!arguments.length) return margin;
        margin = _;
        return correlation;
    }

    correlation.typeColors = function(_) {
        if(!arguments.length) return typeColors;
        typeColors = _;
        return correlation;
    }

    correlation.treatment = function(_) {
        if(!arguments.length) return treatment;
        treatment = _;
        return correlation;
    }

    correlation.treatment_set = function(_) {
        if(!arguments.length) return treatment_set;
        treatment_set = _;
        return correlation;
    }

    correlation.disease = function(_) {
        if(!arguments.length) return disease;
        disease = _;
        return correlation;
    }

    correlation.diseaseDict = function(_) {
        if(!arguments.length) return diseaseDict;
        diseaseDict = _;
        return correlation;
    }

    // correlation.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters
    var cellWidth = 46, cellHeight = 66;
    // var lineChartWidth = 30,lineChartHeight = 44, linesPadding=3, textBias=2;
    var chartWidth = 31,chartHeight = 44, boxplotPadding=5, boxplotWidth = 10, textBias=0;
    var linemargin =2;
    var cellPaddingX = (cellWidth-chartWidth)/2 + textBias, cellPaddingY = (cellHeight-chartHeight)/2
    var xscale = d3.scaleLinear().domain([0,1]).range([0,chartWidth])

    var yscale_list = []
    ///////////////////////////////////////////////////

    correlation.init = function() {

        return correlation;
    }


    correlation.layout = function() {

        container.selectAll('*').remove();

        //eventNames = Object.keys(data);
        rowNum = data.length;

        if(size[1]<margin.top+cellHeight*rowNum +1) {
            size[1] = margin.top+cellHeight*rowNum +1
        }

        container
            .attr('width', size[0])
            .attr('height', size[1])
        container.selectAll().remove();     

        container.append("svg:defs")
            .selectAll("marker")
            .data(typeColors)
            .enter()
            .append("svg:marker")
            .attr("id", (d,i)=> typeColors[i] + "_triangle")
            .attr("refX", 2)
            .attr("refY", 2)
            .attr("markerWidth", 10)
            .attr("markerHeight", 10)
            .attr("markerUnits","userSpaceOnUse")
            .attr("orient", "auto")
            .append("path")
            .attr('d', 'M0,0 L0,4 L6,2 z')
            .attr('fill', (d, i)=>typeColors[i]);


        splitLines = container.append('g')
            .attr('class', 'split-lines')
            .attr('transform', `translate(${margin.left},${margin.top})`)

        splitLines.append('line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', cellHeight*rowNum)

        splitLines.selectAll('.horizon-line')
            .data(data)
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('y1', (d,i)=>(i+1)*cellHeight)
            .attr('y2', (d,i)=>(i+1)*cellHeight)
            .attr('class', 'horizon-line')

        splitLines.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('y2', 0)
            .attr('class', 'horizon-line')

        canvas = container.append('g')
            .attr('class', 'correlation-canvas')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

        container.selectAll('.split-lines').attr('display', 'none');
        canvas.selectAll('.event_text').attr('display', 'none');
        return correlation;
    }

    correlation.update = function(selectedIdxList) {

        canvas.selectAll('.boxplots').remove();
        canvas.selectAll('text').remove()

        if(selectedIdxList.length===0) {
            container.selectAll('.split-lines').attr('display', 'none');
            canvas.selectAll('.event_text').attr('display', 'none');
            return correlation;
        }

        container.selectAll('.split-lines').attr('display', 'block');
        canvas.selectAll('.event_text').attr('display', 'block');


        splitLines.selectAll('.horizon-line')
        .attr('x2', cellWidth * selectedIdxList.length)
        let verticalLines = splitLines.selectAll('.vertical-line')
            .data(selectedIdxList)
        verticalLines.exit().remove()
        verticalLines.enter()
        .append('line')
        .attr('x1', (d,i)=>(i+1)*cellWidth)
        .attr('x2', (d, i)=>(i+1)*cellWidth)
        .attr('y1', 0)
        .attr('y2', cellHeight*rowNum)
        .attr('class', 'vertical-line')

        var matrixData = []
        var newIdxList = []
        var newDisease = []
        var disease_index = {}
        for (var i=0; i<selectedIdxList.length; i++){
            disease_index[selectedIdxList[i]] = i
        }
        for(var i=0; i<data[0].length; i++){
            if(selectedIdxList.includes(data[0][i]['disease'])){
                newIdxList.push(i)
                newDisease.push(data[0][i]['disease'])
            }
        }

        for(var i=0; i<data.length; i++){
            var newRow = []
            for(var j=0; j<newIdxList.length; j++){
                newRow.push(data[i][newIdxList[j]])
            }
            matrixData.push(newRow)
        }

        matrixData.sort(function(a,b){
            var a_sum_isig = 0
            a.forEach(function(b){
                if(b['sig']>0.01){
                    a_sum_isig = a_sum_isig + 1
                }
            })

            var b_sum_isig = 0
            b.forEach(function(b){
                if(b['sig']>0.01){
                    b_sum_isig = b_sum_isig + 1
                }
            })

            return a_sum_isig - b_sum_isig
        })

        canvas.append('g')
            .selectAll('text')
            .data(matrixData)
            .enter()
            .append('text')
            .text((d)=>{
                let label = treatment[treatment_set[d[0]['lab']][0]];
                label = label.slice(0,8) + '...'
                return label;
            })
            .attr('x', (d,i)=>-cellHeight/2-cellHeight*i)
            .attr('y', -4)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .attr('class','event_text')

        var in_tip_flag = false
        
        $(".event_text").tipsy({
            gravity: 'n',
            html: true,
            fade: false,
            opacity: 0.7,
            trigger: 'manual',

            title: function() {
                var d = this.__data__;
                var t_set = treatment_set[d[0]['lab']];
                var tip = "<div style='height: 80px; font-size: 12px; margin:1px; overflow-y: scroll; overflow-x: hidden'> <div style='display: flex; flex-wrap: wrap; list-style:none; width: 185px; padding: 2px; margin: 2px'>"
                for(var t=0; t<t_set.length; t++){
                    tip += "<li style='height:20px'> <div style='margin: 1px; padding: 0px 1px; border: 1px solid rgb(125, 125, 125); border-radius: 2px;'>" +treatment[t_set[t]].slice(0,25)+ "</div></li>"
                }

                tip += "</div></div>"
                return tip;
            }
        });

        $( ".event_text" ).on('mouseenter', function() {
            $('.tipsy').remove();
            var dd = $(this);
            
            dd.tipsy('show');
            
            $('.tipsy').on("mouseenter", function(d){
                clearTimeout(in_tip_flag);
            })          
            $('.tipsy').on("mouseleave", function(d){
                dd.tipsy('hide');
            });
        })

        $( ".event_text" ).on('mouseleave', function(d) {
            var dd = $(this);
            in_tip_flag = setTimeout(function(){
                dd.tipsy('hide');
            }, 80);
        });

        // for (let i =0; i < matrixData.length; i++) {
        //     let item = matrixData[i];
        //     for (let j = 0; j < item.length; j++){
        //         let max = Math.max(...item[j]['prob']);
        //         let min = Math.min(...item[j]['prob']);
        //         if (maxPro < max) maxPro = max;
        //         if (minPro > min) minPro = min;

        //         max = Math.max(...item[j]['del_prob']);
        //         min = Math.min(...item[j]['del_prob']);
        //         if (maxPro < max) maxPro = max;
        //         if (minPro > min) minPro = min;
        //     }
        // }
        yscale_list = []
        for(let j=0; j<matrixData[0].length; j++){
            let min = Math.min(...matrixData.map(function(d){
                return Math.min(d[j]['prob'][0], d[j]['del_prob'][0])
            }))
            let max = Math.max(...matrixData.map(function(d){
                return Math.max(d[j]['prob'][2], d[j]['del_prob'][2])
            }))
            var yscale = d3.scaleLinear().range([3,chartHeight]).domain([min, max])

            // console.log([min,max])
            yscale_list.push(yscale)
        }

        d3.select("#correlation-titles").selectAll("svg").remove()

        d3.select("#correlation-titles").append("svg")
        .attr("width",size[0])
        .attr("height",18)
        .append("g")
        .selectAll('.d_text')
        .data(newDisease)
        .enter()
        .append('g')
        .attr("class",'d_text')
        .attr('transform', (d,i)=>`translate(${cellPaddingX + i * cellWidth},12)`)
        .append("text")
        .text((d)=>{
            let label = diseaseDict[disease[d]];
            label = label.slice(0,4) + '...'
            return label;
        })
        .attr('x', cellWidth/2)
        .attr('y', -4)
        .attr("alignment-baseline","middle")
        .attr('text-anchor', 'middle')
        .attr('fill','#696969')
        .attr('font-size',12)
        
        $(".d_text text").tipsy({
            gravity: 'n',
            html: true,
            fade: false,
            opacity: 0.7,
            title: function() {
                var d = this.__data__;
                var t_set = diseaseDict[disease[d]];
                var tip = t_set
                
                return tip;
            }
        });



        let rowCharts = canvas.selectAll('.boxplots')
        .data(matrixData)

        rowCharts.enter().append('g')
        .attr('class', 'boxplots')
        .attr('id', (d,i)=> `result_charts`)
        .attr('transform', (d,i)=>`translate(0,${cellHeight*i})`)

        let boxplotChart = canvas.selectAll('.boxplots').selectAll('.boxplot-chart')
        .data((d)=>{
            var data = []
            for(var i=0; i<d.length; i++){
                data.push({'data':d[i], 'index':i})
            }
            return data
        })
        .enter()
        .append('g')
        .attr("class","boxplot-chart")
        .attr('id',(d,i) => 'boxplot-chart-'+i)
        .attr('transform', (d,i)=>`translate(${cellPaddingX + i * cellWidth}, ${cellHeight-cellPaddingY})`)

        boxplotChart.append('line')
        .attr('x1', 0)
        .attr('x2', chartWidth)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', (d, i)=> typeColors[disease_index[d['data']['disease']]])
        .attr('stroke-width', 1)
        .attr('marker-end', (d,i)=>`url(#${typeColors[disease_index[d['data']['disease']]]}_triangle)`)
        boxplotChart.append('line')
        .attr('x1',0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', -chartHeight)
        .attr('stroke', (d,i)=>typeColors[disease_index[d['data']['disease']]])
        .attr('stroke-width', 1)
        .attr('marker-end', (d,i)=>`url(#${typeColors[disease_index[d['data']['disease']]]}_triangle)`)

        boxplotChart.append('line')
            .attr("x1",boxplotPadding+boxplotWidth/2)
            .attr("x2",boxplotPadding*2 + 3*boxplotWidth/2)
            .attr("y1",function(d){
                return -yscale_list[d['index']](d['data']['prob'][1])
            })
            .attr("y2",function(d){
                return -yscale_list[d['index']](d['data']['del_prob'][1])
            })
            .attr('stroke-width', 1)
            .attr('stroke', 'black')
            .style('stroke-dasharray','2,2')

        // yscale.domain([0.34,0.42])
        let boxplot = boxplotChart
        .selectAll('.boxplot')
        .data((d, i)=> {
            let data = [];
            data.push({'data':d['data']['prob'], 'index':d['index']})

            data.push({'data':d['data']['del_prob'], 'index':d['index']})

            return data;
        })
        .enter()
        .append('g')
        .attr('transform', (d,i) => `translate(${boxplotPadding*(i+1) + i * boxplotWidth},0)`)

        boxplot
        .append('line')
        .attr('y1', (d)=>{
            let index = d['index']
            let prob = d['data'][0];
            return -yscale_list[index](prob);
        })
        .attr('y2', (d)=>{
            let index = d['index']
            let prob = d['data'][2];
            return -yscale_list[index](prob);
        })
        .attr('x1', boxplotWidth/2)
        .attr('x2', boxplotWidth/2)
        .attr('stroke-width', 1)
        .attr('stroke', 'black')

        boxplot
        .append('circle')
        .attr('cx', boxplotWidth/2)
        .attr('cy', (d)=>{
            let index = d['index']
            let prob = d['data'][1];
            return -yscale_list[index](prob);
        })
        .attr("r",2)
        .attr("fill","white")
        .attr('stroke', 'black')
        .attr('stroke-width', 1)

        boxplot
        .append('line')
        .attr('y1', (d)=>{
            let index = d['index']
            let prob = d['data'][0];
            return -yscale_list[index](prob);
        })
        .attr('y2', (d)=>{
            let index = d['index']
            let prob = d['data'][0];
            return -yscale_list[index](prob);
        })
        .attr('x1', boxplotWidth/2-linemargin)
        .attr('x2', boxplotWidth/2 + linemargin)
        .attr('stroke-width', 1)
        .attr('stroke', 'black')

        boxplot
        .append('line')
        .attr('y1', (d)=>{
            let index = d['index']
            let prob = d['data'][2];
            return -yscale_list[index](prob);
        })
        .attr('y2', (d)=>{
            let index = d['index']
            let prob = d['data'][2];
            return -yscale_list[index](prob);
        })
        .attr('x1', boxplotWidth/2 - linemargin)
        .attr('x2', boxplotWidth/2 + linemargin)
        .attr('stroke-width', 1)
        .attr('stroke', 'black')


        boxplotChart.append("rect")
        .attr("x",-cellPaddingX+1)
        .attr("y",cellPaddingY-cellHeight+1)
        .attr("width",cellWidth-2)
        .attr("height",cellHeight-2)
        .style("fill","#7C7C7C")
        .style("fill-opacity",function(d){
            if(d['data'].sig>0.01){
                return 0.3
            }else{
                return 0
            }
        })


        $(".boxplot-chart").tipsy({
            gravity: 'n',
            html: true,
            fade: false,
            opacity: 0.7,
            title: function() {
                var d = this.__data__.data
                var tip = ''
                tip += "<div class='rect-tooltip'>"
                if(d['sig']<0.01){
                    tip += "<div class='tooltip-item'>P-value: \< 1%</div>"
                }else{
                    tip += "<div class='tooltip-item'>P-value: "+Math.round(d['sig']*1000)/1000+"</div>"
                }
                tip += "<div class='tooltip-item'>Mean with Treatments: "+Math.round(d['prob'][1]*1000)/1000+"</div>"
                tip += "<div class='tooltip-item'>Mean without Treatments: "+Math.round(d['del_prob'][1]*1000)/1000+"</div>"
                tip += "<div class='tooltip-item'>Std with Treatments: "+Math.round(d['prob'][3]*1000)/1000+"</div>"
                tip += "<div class='tooltip-item'>Std without Treatments: "+Math.round(d['del_prob'][3]*1000)/1000+"</div>"
                tip += "</div>"
                
                return tip;
            }
        });
        

        // boxplot
        // .append('line')
        // .attr('y1', (d)=>{
        //     let prob = d[0];
        //     return -yscale(prob);
        // })
        // .attr('y2', (d)=>{
        //     let prob = d[1];
        //     return -yscale(prob);
        // })
        // .attr('x1', boxplotWidth/2)
        // .attr('x2', boxplotWidth/2)
        // .attr('stroke-width', 1)
        // .attr('stroke', 'black')

        // boxplot
        // .append('line')
        // .attr('y1', (d)=>{
        //     let prob = d[3];
        //     return -yscale(prob);
        // })
        // .attr('y2', (d)=>{
        //     let prob = d[4];
        //     return -yscale(prob);
        // })
        // .attr('x1', boxplotWidth/2)
        // .attr('x2', boxplotWidth/2)
        // .attr('stroke-width', 1)
        // .attr('stroke', 'black')

        // boxplot
        // .append('rect')
        // .attr('x', 0)
        // .attr('y', (d) =>{
        //     let prob = d[3];
        //     return  -yscale(prob);
        // })
        // .attr('width', boxplotWidth)
        // .attr('height', (d)=> {
        //     let prob1 = d[3];
        //     let prob2 = d[1];
        //     return yscale(prob1) - yscale(prob2);
        // })
        // .attr('fill', function() {
        //     let idx = d3.select(this.parentNode.parentNode).data()[0]['disease']
        //     return typeColors[disease_index[idx]];
        // })

        // boxplot
        // .append('line')
        // .attr('x1', 0)
        // .attr('x2', boxplotWidth)
        // .attr('y1', (d)=>{
        //     let prob = d[2];
        //     return -yscale(prob);
        // })
        // .attr('y2', (d)=> {
        //     let prob = d[2];
        //     return -yscale(prob);
        // })
        // .attr('stroke', 'black')
        // .attr('stroke-width', 1)

        // boxplot
        // .append('line')
        // .attr('y1', (d)=>{
        //     let prob = d[0];
        //     return -yscale(prob);
        // })
        // .attr('y2', (d)=>{
        //     let prob = d[0];
        //     return -yscale(prob);
        // })
        // .attr('x1', linemargin)
        // .attr('x2', boxplotWidth - linemargin *2)
        // .attr('stroke-width', 1)
        // .attr('stroke', 'black')

        // boxplot
        // .append('line')
        // .attr('y1', (d)=>{
        //     let prob = d[4];
        //     return -yscale(prob);
        // })
        // .attr('y2', (d)=>{
        //     let prob = d[4];
        //     return -yscale(prob);
        // })
        // .attr('x1', linemargin)
        // .attr('x2', boxplotWidth - linemargin *2)
        // .attr('stroke-width', 1)
        // .attr('stroke', 'black')

 

        return correlation;
    }

    /////////////////////
    // private function

    return correlation
}
