// import * as d3 from 'd3'

export const Correlation = function() {

    var correlation = {},
    container = null,
    data = {},
    size = [252, 505],
    margin = {top:-2, right: 0, bottom: 1, left: 15},
    typeColors = ["#75C1D5", "#AA97DA", "#93DC16", "#F19EC2", "#66B66F"]
    // dispatch = d3.dispatch('');

    var columnNum = 0, rowNum = 0;
    var eventNames = [], resultNames = [];
    var canvas = null;
    var splitLines = null;
    var treatment = {};

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

    // correlation.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters
    var cellWidth = 46, cellHeight = 66;
    // var lineChartWidth = 30,lineChartHeight = 44, linesPadding=3, textBias=2;
    var lineChartWidth = 31,lineChartHeight = 44, linesPadding=3, textBias=0;
    var cellPaddingX = (cellWidth-lineChartWidth)/2 + textBias, cellPaddingY = (cellHeight-lineChartHeight)/2
    var xscale = d3.scaleLinear().domain([0,1]).range([0,lineChartWidth]),
        yscale = d3.scaleLinear().range([3,lineChartHeight])
    ///////////////////////////////////////////////////

    correlation.init = function() {
        let chartMatrix = [];
        resultNames = data['result_names'];
        data = data['correlation'];
        rowNum = data.length;

        for (let i =0; i < resultNames.length; i++) {
            chartMatrix.push([])
        }

        for (let i = 0; i < data.length; i++) {
            let curData = data[i];
            let curPos = curData['cur_pos'];
            eventNames.push(curData['icd_code']);
            for (let j =0; j < resultNames.length; j++) {
                let probs = curData['results'][j];
                chartMatrix[j].push({
                    'cur_pos': curPos,
                    'prob': probs
                })
            }
        }
        data = chartMatrix
        return correlation;
    }


    correlation.layout = function() {

        container.selectAll('*').remove();

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
            // .attr("d", "M 0 0 12 6 0 12 3 6")
            .attr('d', 'M0,0 L0,4 L6,2 z')
            .attr('fill', (d, i)=>typeColors[i]);
        

        splitLines = container.append('g')
            .attr('class', 'split-lines')
            .attr('transform', `translate(${margin.left},${margin.top})`)

        splitLines.append('line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', cellHeight*eventNames.length)
        splitLines.selectAll('.horizon-line')
            .data(eventNames)
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('y1', (d,i)=>(i+1)*cellHeight)
            .attr('y2', (d,i)=>(i+1)*cellHeight)
            .attr('class', 'horizon-line')

        canvas = container.append('g')
            .attr('class', 'correlation-canvas')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

        
        canvas.append('g')
            .selectAll('text')
            .data(eventNames)
            .enter()
            .append('text')
            .text((d)=>{
                let label = treatment[d];
                if (label.length >=10) label = label.slice(0,8) + '...'
                return label;
            })
            .attr('x', (d,i)=>-cellHeight/2-cellHeight*i)
            .attr('y', -4)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .attr('class','event_text')
        
        $(".event_text").tipsy({
            gravity: 'n',
            html: true,
            fade: false,
            opacity: 0.7,
            title: function() {
                var d = this.__data__;
                var tip = treatment[d];
                return tip;
            }
        });


        container.selectAll('.split-lines').attr('display', 'none');
        canvas.selectAll('.event_text').attr('display', 'none');
        return correlation;
    }

    correlation.update = function(selectedIdxList) {

        canvas.selectAll('.line-charts').remove();

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

        let maxPro = 0, minPro = Infinity;
        let columnData = [];
        for (let i = 0; i < selectedIdxList.length; i++){
            let idx = selectedIdxList[i];
            columnData.push(data[idx]);
        }

        for (let i =0; i < columnData.length; i++){
            let item = columnData[i];
            for (let j = 0; j < item.length; j++){
                let max = Math.max(...item[j]['prob']);
                let min = Math.min(...item[j]['prob']);
                if (maxPro < max) maxPro = max;
                if (minPro > min) minPro = min;
            }
        }
        yscale.domain([minPro, maxPro])
        console.log(columnData)


        let colCharts = canvas.selectAll('.line-charts')
            .data(columnData)
        colCharts.enter().append('g')
            .attr('class', 'line-charts')
            .attr('id', (d,i)=> `result_${selectedIdxList[i]}_charts`)
            .attr('transform', (d,i)=>`translate(${cellWidth*i},0)`)
        let linechart = canvas.selectAll('.line-charts').selectAll('.line-chart')
        .data((d,i)=>{
            let celldata = [];
            // console.log(d)
            for (let j = 0; j < d.length; j++){
                celldata.push({
                    'res_idx':i,
                    'cur_pos':d[j]['cur_pos'],
                    'prob':d[j]['prob']
                })
            }
            return celldata;
        })
            .enter()
            .append('g')
            .attr('class', 'line-chart')
            .attr('transform', (d,i)=>`translate(${cellPaddingX}, ${(i+1)*cellHeight-cellPaddingY})`)

        linechart.append('line')
        .attr('x1', 0)
        .attr('x2', lineChartWidth)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', (d)=> typeColors[d['res_idx']])
        .attr('stroke-width', 1)
        .attr('marker-end', (d)=>`url(#${typeColors[d['res_idx']]}_triangle)`)
        linechart.append('line')
        .attr('x1',0)
        .attr('y1', 0)
        .attr('x2', 0)
        .attr('y2', -lineChartHeight)
        .attr('stroke', (d)=>typeColors[d['res_idx']])
        .attr('stroke-width', 1)
        .attr('marker-end', (d,i)=>`url(#${typeColors[d['res_idx']]}_triangle)`)
            
        // linechart.append('line')
        //     .attr('x1', (d) => linesPadding+ xscale(d['cur_pos']))
        //     .attr('x2', (d) => linesPadding+xscale(d['cur_pos']))
        //     .attr('y1', 0)
        //     .attr('y2', -lineChartHeight)
        //     .attr('stroke', '#7d7d7d')
        //     .attr('stroke-width', 1)
        //     .attr('stroke-dasharray', '3,2')

        //     // lineChart.append('text')
        //     //     .text((d)=>Math.floor(Math.min(...d)*100)/100)
        //     //     .attr('transform', 'rotate(-90)')
        //     //     .style('fill', (d,j)=> typeColors[j])
        //     //     .attr('font-size', 9)
        //     //     .attr('y', -2)


        let lines = linechart.append('g')
            .attr('transform', `translate(${linesPadding},0)`)
            .selectAll('.chart-line')
            .data((d,j)=>{
                let linePos = []
                let probs = d['prob']
                for (let k = 0; k < probs.length-1; k++){
                    linePos.push({
                        'y1': yscale(probs[k]),
                        'y2': yscale(probs[k+1]),
                        'color': typeColors[d['res_idx']]
                    })
                }
                // console.log(linePos)
                return linePos
            })

        lines
            .enter()
            .append('line')
            .attr('class', 'chart-line')
            .attr('y1', (d)=>-d['y1'])
            .attr('y2', (d)=>-d['y2'])
            .attr('x1', (d,j)=>xscale(j))
            .attr('x2', (d,j)=>xscale(j+1))
            .attr('stroke', (d)=>d['color'])
            .attr('stroke-width', 1.5)

        return correlation;
    }

    // correlation.filter = function (pickedResults) {
    //     if (pickedResults.length === 0) pickedResults = resultNames.slice(0,5)

    //     splitLines.selectAll('.horizon-line')
    //     .attr('x2', cellWidth * pickedResults.length)

    //     let verticalLines = splitLines.selectAll('.vertical-line')
    //         .data(pickedResults)
    //     verticalLines.exit().remove()
    //     verticalLines.enter()
    //     .append('line')
    //     .attr('x1', (d,i)=>(i+1)*cellWidth)
    //     .attr('x2', (d, i)=>(i+1)*cellWidth)
    //     .attr('y1', 0)
    //     .attr('y2', cellHeight*rowNum)
    //     .attr('class', 'vertical-line')

    //     canvas.selectAll('.line-charts')
    //     .filter(function(d) {
    //         let resCode = d3.select(this).attr('id').split('_')[1];
    //         if(pickedResults.includes(resCode)){
    //             return true;
    //         }else{
    //             return false;
    //         }
    //     })
    //     .attr('transform', function(d){
    //         let currentY = d3.select(this).attr('transform').split(/[\(,\)]/)[2];
    //         let resCode = d3.select(this).attr('id').split('_')[1];
    //         let newX = cellWidth * _.indexOf(pickedResults, resCode);
    //         return `translate(${newX},${currentY})`;
    //     })

    //     canvas.selectAll('.line-charts')
    //     .attr('display', function(){
    //         let resCode = d3.select(this).attr('id').split('_')[1];
    //         if (pickedResults.includes(resCode)) {
    //             return 'block';
    //         } else {
    //             return 'none';
    //         }
    //     })
    //     return correlation;
    // }


    /////////////////////
    // private function

    return correlation
}
