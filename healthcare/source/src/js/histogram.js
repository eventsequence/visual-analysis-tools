
// import * as _ from '../lib/underscore'

export const Histogram = function() {
    var histogram = {},
    container = null,
    data = {},
    size = [232, 265],
    margin = {top:10, right: 0, bottom: 10, left:30},
    typeColors = ["#75C1D5", "#AA97DA", "#93DC16", "#F19EC2", "#66B66F"],
    majorEvents = [],
    showAllDataset =true,
    disease = {},
    dispatch = d3.dispatch('selectpids', 'reloadpview', 'querypids','cleanpview')

    let legendData = [];

    histogram.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return histogram;
    }

    histogram.data = function(_) {
        if (!arguments.length) return data;
        data = _;

        console.log(data.length)
        return histogram;
    }

    histogram.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return histogram;
    }

    histogram.margin = function(_) {
        if(!arguments.length) return margin;
        margin = _;
        return histogram;
    }

    histogram.disease = function(_) {
        if(!arguments.length) return disease;
        disease = _;
        return histogram;
    }

    histogram.majorEvents = function(_) {
        if(!arguments.length) return majorEvents;
        majorEvents = _;
        majorEvents.sort()
        legendData = [];
        for (let i in majorEvents) {
            legendData.push({
                'type': majorEvents[i],
                'color': typeColors[i]
            })
        }
        return histogram;
    }
    histogram.changeStatus = function() {
        showAllDataset = false;
        return histogram;
    }

    histogram.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters
    var barNum = 20
    var height = 141
    var width = 186
    var barArr = Array.from(Array(barNum).keys())
    var band = d3.scaleBand().domain(barArr).range([0,width]).paddingInner(0.1).paddingOuter(0.2)
    var x = d3.scaleLinear().range([0,width]),
        y = d3.scaleLinear().range([height, 0]);
    var trans = d3.transition().duration(500)
    var legendWidth = 21, legendHeight = 8,columnPadding = 65
    var barCenterPosArr = barArr.map((item)=>band(item)+band.bandwidth()/2)
    // var barxPosArr = barArr.map((item)=>band(item))
    // barxPosArr[0] = 0
    // barxPosArr.push(width)
    var selectedPids = [];
    let rangeList = [];
    for (let i=0; i< barNum; i++) {
        rangeList.push(i)
    }
    var indexScale = d3.scaleQuantize().range(rangeList);

    ///////////////////////////////////////////////////
    histogram.init = function() {
        // console.log('data')
        // console.log(data)
        container
            .attr('width', size[0])
            .attr('height', size[1])
        container.selectAll('*').remove();
        var canvas = container.append('g')
            .attr('class', 'canvas')
            .attr('transform', `translate(${margin.left}, ${margin.top})`)

        var maxDis = -Infinity //, minDis = Infinity
        for (let idx in data) {
            let item = data[idx]
            // minDis = Math.min(minDis, item.dist)
            maxDis = Math.max(maxDis, item.dist)
        }

        var transData = []
        for (let j=0; j < barNum; j++) {
            transData.push({})
            transData[j]['sum'] = 0
            for (let i in majorEvents) {
                transData[j][majorEvents[i]] = []
            }
        }
        indexScale.domain([0, maxDis])
        for (let i in data) {
            let curData = data[i]
            let dist = curData['dist'];
            let idx = indexScale(dist);
            transData[idx]['sum'] +=1;
            for (let k = 0; k < majorEvents.length; k++) {
                if (curData['major_events'].includes(majorEvents[k])) {
                    transData[idx][majorEvents[k]].push(curData.pid)
                }
            }
        }
        // console.log('transData is ')
        // console.log(transData)
        var maxFrequency = 0;
        for (let i = 0; i < transData.length; i++) {
            let currentSum = transData[i]['sum'];
            if (currentSum > maxFrequency) {
                maxFrequency = currentSum
            }
        }
        x.domain([0, maxDis])
        y.domain([0,maxFrequency])
        var yAxis = d3.axisLeft(y).tickSizeInner(0).tickSizeOuter(2).ticks(9),
            xAxis = d3.axisBottom(x).tickSize(3)
        if (maxDis < 0.8){
            xAxis.ticks(6).tickFormat(d3.format(".2f"))
        } else {
            xAxis.ticks(10).tickFormat(d3.format(".1f"))
        }

        var panel = canvas.append('g')
            .attr('class', 'histogram-panel')
            // .call(d3.brushX()
            //     .extent([[0,0],[width,height]])
            //     .on('start brush', brushing)
            //     .on('end', brushended))

        canvas.append('g')
        .attr('class', 'histogram-brush-panel')
        .call(d3.brushX()
            .extent([[0,0],[width,height]])
            .on('start brush', brushing)
            .on('end', brushended))

        canvas.append("g")
            .attr("class", "axis axis-x")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis)
        .append('g')
            .attr('class', 'axis-labels')
            .attr('transform', 'translate(0, 25)')

        var labels = d3.select('.axis-labels')
        labels.append("text")
            .attr('class', 'axis-center-label')
            .attr('dx', width/2)
            .text("distance")
        labels.append('text')
            .attr('class', 'axis-start-label')
            .text('(most similar)')
        labels.append('text')
            .attr('class', 'axis-end-label')
            .attr('dx', width)
            .text('(least similar)')
        var legend = canvas.append('g')
            .attr('class', 'legends')
            .attr('transform', `translate(0, ${height + 40})`)

        let legendPadding = 5
        legend.selectAll('g')
            .data(legendData)
            .enter()
            .append('g')
            .attr('transform', (d, i) => {
                let columnNum = 1
                if (i % columnNum ===0) {
                    return `translate(0, ${(legendHeight + legendPadding)*parseInt(i/columnNum)})`
                } else if (i%columnNum === 1) {
                    return `translate(${columnPadding}, ${(legendHeight + legendPadding)*parseInt((i-1)/columnNum)})`
                } else {
                    return `translate(${columnPadding*2}, ${(legendHeight + legendPadding)*parseInt((i-2)/columnNum)})`
                }
                // return `translate(0, ${(legendHeight + legendPadding)*(i)})`
            })
            .attr('class', 'legend')
        d3.selectAll('.legend')
            .append('rect')
            .attr('class', 'legend-pred')
            .attr('width', legendWidth)
            .attr('height', legendHeight)
            // .attr('fill', (d)=>d['color'])
            .attr('fill', '#7d7d7d')
        d3.selectAll('.legend')
            .append('text')
            .attr('class', 'legend-text')
            .attr('x', legendWidth+8)
            .attr('y', legendHeight/2)
            .attr('alignment-baseline', 'middle')
            .text((d)=>{
                let label = disease[d['type']];
                // return label.slice(0,3) + '...'
                return label;
            })
            .style('fill', '#696969')

        d3.selectAll('.legend')
            .on('click', (d)=>{
                // console.log(d)
                histogram.selectEventType(d['type'])
            })

        canvas.append("g")
            .attr("class", "axis axis-y")
            .call(yAxis)
        .append("text")
            .attr('class', 'axis-center-label')
            .attr("transform", "rotate(-90)")
            .attr("y", -22)
            .attr('dx', -height/2)
            .text("# of patients")

        panel.selectAll(".overall-bar")
            .data(transData)
            .enter().append("rect")
            .attr("class", "overall-bar")
            .attr("x", function(d, i) {
                return band(i)
            })
            .attr("y", (d)=>y(d['sum']))
            .attr("width", band.bandwidth())
            .attr("height", function(d) {
                return height - y(d['sum']); 
            })
            .attr('id', (d,i)=>`overall-bar-${i}`)
            // .attr('dist', (d, i) => minDis + step * (i + 1))
        panel.selectAll('.prediction-bar')
            .data(transData)
            .enter().append('rect')
            .attr('class', 'prediction-bar')
            .attr('x', (d, i) => band(i))
            .attr('y', (d) => {
                let pidlist = d[majorEvents[0]];
                return y(pidlist.length);
            })
            .attr('width', band.bandwidth())
            .attr('height', (d)=>{
                let pidlist = d[majorEvents[0]];
                return height - y(pidlist.length)
            })
            // .attr('fill', typeColors[0])
            .attr('fill', '#7d7d7d')

        // d3.selectAll('.overall-bar').on('mouseover', function(){
        //     d3.select(this).classed('highlight', true)
        // }).on('mouseout', function(){
        //     d3.select(this).classed('highlight', false)
        // })
        panel.selectAll(".handle--custom")
            .data([{type: "w"}, {type: "e"}])
            .enter().append("path")
                .attr("class", "handle--custom")
                .attr("stroke", "#000")
                .attr("cursor", "ew-resize")
                .attr("d", brushResizePath)
                .attr('display', 'none')

        // $(".legend-text").tipsy({
        //     trigger: 'manual',
        //     gravity: 'n',
        //     html: true,
        //     fade: false,
        //     opacity: 0.7,
        //     title: function() {
        //         var d = this.__data__;
        //         var tip = disease[d.type];
        //         return tip;
        //     }
        // });

        // d3.selectAll('.legend')
        // .on('mouseover', function(){
        //     $(this).children('.legend-text').tipsy('show');
        // })
        // .on('mouseout', function(){
        //     $(this).children('.legend-text').tipsy('hide');
        // })

        canvas.selectAll('.domain').attr('stroke', '#959595')
        canvas.selectAll('.tick').selectAll('text').attr('fill', '#959595')
        canvas.selectAll('.tick').selectAll('line').attr('stroke', '#959595')
        canvas.selectAll('path').selectAll('.domain').attr('stroke', '#959595')
        return histogram
    }

    histogram.selectEventType = function(typeString) {
        d3.selectAll('.prediction-bar')
            .transition(trans)
            .attr('y', height)
            .attr('height', 0)
            .transition(trans)
            .attr('y', (d)=>y(d[typeString].length))
            .attr('height', (d)=>height-y(d[typeString].length))
            // .attr('fill', typeColors[majorEvents.indexOf(typeString)])
            .attr('fill', '#7d7d7d')
        return histogram
    }

    histogram.selectPids = function(minThreshold, maxThreshold){
        // d3.selectAll('.overall-bar').classed('selected', function(d,i){
        //     if(i >= startIndex &&i<endIndex){
        //         let pids = []
        //         for (let j in d){
        //             // pids.push(...d[j])
        //             pids = pids.concat(d[j])
        //         }
        //         selectedPids.push(...pids)
        //         return true
        //     }
        //     else return false
        // })
        selectedPids = []
        for (let i = 0; i < data.length; i++) {
            let patientItem = data[i];
            if (patientItem.dist >= minThreshold && patientItem.dist <=maxThreshold) {
                selectedPids.push(patientItem.pid);
            }
        }
        return histogram;
    }

    histogram.selecting = function(startIndex, endIndex){
        d3.selectAll('.overall-bar').classed('selected', function(d,i){
            if(i >= startIndex &&i<endIndex) return true
            else return false
        })
        return histogram
    }

    /////////////////////
    // private function
	function brushended(){
        if (!d3.event.sourceEvent) return; // Only transition after input.
        if (!d3.event.selection) {
            d3.selectAll('.handle--custom').attr("display", "none");
            histogram.selecting(barNum, barNum+1)
            
            if( showAllDataset) {
                dispatch.call('cleanpview', this)
            } else (
                dispatch.call('reloadpview', this)
            )
            return; // Ignore empty selections.
        } 
        // var index1 = _.sortedIndex(barCenterPosArr, d3.event.selection[0]),
        //     index2 = _.sortedIndex(barCenterPosArr, d3.event.selection[1])
        // d3.select(this).transition().call(d3.event.target.move, [barxPosArr[index1], barxPosArr[index2]]);
        var dist1 = x.invert(d3.event.selection[0])
        var dist2 = x.invert(d3.event.selection[1])

        histogram.selectPids(dist1, dist2)
        // console.log(dist1, dist2)
        console.log(selectedPids);
        if( showAllDataset) {
            dispatch.call('querypids', this, selectedPids)
        } else (
            dispatch.call('selectpids',this, selectedPids)
        )
    }
    function brushing(){
        if (!d3.event.sourceEvent) return; // Only transition after input.
        if (!d3.event.selection) {
            return
        }; // Ignore empty selections.
        d3.selectAll('.handle--custom').attr("display", null).attr("transform", function(d, i) { return "translate(" + [ d3.event.selection[i], 0] + ")"; });
        var index1 = _.sortedIndex(barCenterPosArr, d3.event.selection[0]),
            index2 = _.sortedIndex(barCenterPosArr, d3.event.selection[1])

        histogram.selecting(index1, index2)
    }
    var brushResizePath = function(d) {
        var e = +(d.type == "e"),
            x = e ? 1 : -1
        var r = 4
        return `M${0.5*x},0 a${r},${r} 0 0,${e} ${r*x},${r} l0,${3*r}, a${r},${r} 0 0,${e} ${-r*x},${r} l0,${-5*r}`
    }
    
    return histogram
}
