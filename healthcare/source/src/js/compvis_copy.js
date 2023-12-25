import * as _ from '../../static/lib/underscore'
export const Compvis = function() {
    var compvis = {},
        container = null,
        sliderCanvas = null,
        predCanvas = null,
        seqCanvas = null,
        pathCanvas = null,
        data = [],
        treatment = {},
        disease = {},
        eventCount = {},
        icdCodeList = [],
        predSize = [338, 499],
        seqSize = [439, 499],
        size = [796, 499], 
        margin = {top: 4, right: 0, bottom: 10, left: 19},
        typeColors = {
            'diagnose': '#7D7D7D',
            'Treatments': '#bfbfbf'
        },
        diseaseColors = [],
        threadNum = 0,
        dispatch = d3.dispatch('select')

    compvis.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return compvis;
    }

    compvis.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return compvis;
    }

    compvis.treatment = function(_) {
        if(!arguments.length) return treatment;
        treatment = _;
        return compvis;
    }
    compvis.disease = function(_) {
        if(!arguments.length) return disease;
        disease = _;
        return compvis;
    }

    compvis.eventCount = function(_) {
        if(!arguments.length) return eventCount;
        eventCount = _;
        return compvis;
    }

    compvis.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return size;
    }

    compvis.margin = function(_) {
        if(!arguments.length) return margin;
        margin = _;
        return compvis;
    }

    compvis.diseaseColors = function(_) {
        if(!arguments.length) return diseaseColors;
        diseaseColors = _;
        return compvis;
    }

    compvis.icdCodeList = function(_) {
        if(!arguments.length) return icdCodeList;
        icdCodeList = _;
        return compvis;
    }

    compvis.dispatch = dispatch;


    ///////////////////////////////////////////////////
    // Private Parameters

    var treemap = d3.treemap()
    .tile(d3.treemapResquarify)
    .round(false)
    .paddingInner(0.3)
    var pow_scale = 0.1
    var eventRectSize = [29, 16], eventPadding = 28;
    var eventRectStep = eventRectSize[0] + eventPadding
    var predictRectSize = [280, 33]
    var connectLength = 23;
    var threadHeight = 50;
    var durationScale = d3.scaleSqrt().range([4, eventPadding])
    var predictionPosScale = d3.scaleLinear().domain([-1, 12]).range([27, predictRectSize[0]-27])
    var seqCanvasWidthStack = [];
    var selectedIdxList = [];
    var circlePadding = 4;
    var line = d3.line()
    .x(function(d){ return d[0]; })
    .y(function(d){ return d[1]; })
    .curve(d3.curveBundle.beta(0.85));
    var seqWidth = 439;
    var sliderScale = d3.scaleLinear().range([0, seqWidth]);
    var predCanvasX = 439 + margin.left

    var brush = d3.brushX()
    .extent([[0, -4], [seqWidth, 4]])
    .on('brush end', brushed)

    ///////////////////////////////////////////////////
    // Public Function
    compvis.remove = function() {
        if(!predCanvas) return;
        predCanvas
        .selectAll('.comp-record')
        .each(function(){
            let threadid = d3.select(this).attr('id').split('_')[2];
            compvis.delete(threadid);
        });
        return compvis;
    }

    compvis.layout = function() {

        container.attr('id', 'comp-container')
        .attr('width', size[0])
        .attr('height', size[1])
        seqCanvasWidthStack.push(seqWidth);

        sliderCanvas = d3.select('#comp-slider').append('svg')
        .attr('height', 25)
        .attr('width', size[0])
        .append('g')
        .attr('transform', 'translate(19,12)')
        .attr('id', 'slider-canvas')
        // .attr('display', 'none')

        sliderCanvas
        .append('line')
        .attr('class', 'overall-slider-line')
        .attr('x1', 0)
        .attr('x2', seqWidth)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', '#BFBFBF')
        .attr('stroke-width', 4)

        sliderCanvas
        .append('g')
        .attr('class', 'brush')
        .call(brush)

        sliderCanvas
        .select('rect.selection')
        .attr('fill-opacity', 1)
        .attr('fill', '#7d7d7d')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('stroke-width', 0)


        // sliderCanvas
        // .append('rect')
        // .attr('class', 'slider-selection')
        // .attr('y', -4)
        // .attr('height', 8)
        // .attr('width',0)
        // .attr('rx', 4)
        // .attr('ry', 4)
        // .attr('fill', '#7d7d7d')
        // .call(d3.drag().on('start', sliderDragStart).on('drag', sliderDragging))


        container.append('defs')
        .append('clipPath')
        .attr('id', 'seq-canvas-clip')
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', size[1])
        .attr('width', seqWidth)

        seqCanvas = container
        .append('g')
        .attr('id', 'seq-container')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .attr('clip-path', 'url(#seq-canvas-clip)')

        predCanvas = container
        .append('g')
        .attr('id', 'pred-canvas')
        .attr('transform', `translate(${predCanvasX}, ${margin.top})`)

        pathCanvas = predCanvas
        .append('g')
        .attr('id', 'path-canvas')
        .attr('transform', `translate(0, 0)`)


        // $('#seq-container').scroll(function () {
        //     var sl = this.scrollLeft;
        //     // $(this).attr()
        //     // var width = this.clientWidth;
        //     // var sw = this.scrollWidth;
        //     sliderCanvas
        //     .select('rect')
        //     .attr('x', sliderScale(sl));
        //     // if (sl + width >= sw){
        //     //     console.log("到底了..");
        //     // }
        // });
        
        seqCanvas.append("svg:defs")
        .append("svg:marker")
        .attr("id", "path_triangle")
        .attr("refX", 5)
        .attr("refY", 3)
        .attr("markerWidth", 10)
        .attr("markerHeight", 10)
        .attr("markerUnits","userSpaceOnUse")
        .attr("orient", "auto")
        .append("path")
        .attr('d', 'M0,0 L0,6 L6,3 z')
        .attr('fill', '#fc9272');

        return compvis
    }

    compvis.drawSequence = function(record) {
        if (!record['pre']) return compvis;
        if (record['pre'].length===0) return compvis;
        indexList = [];
        calculateSeq(record['origin'], record['op_record'])

        console.log('-----------')
        console.log(record)

        sliderCanvas.attr('display', 'block');

        let timesliceNum = record['origin'].length;
        let timelineLength = eventRectStep * timesliceNum - eventPadding;
        let currentWidth = margin.left + timelineLength;
        let seqCanvasWidth = seqCanvasWidthStack[seqCanvasWidthStack.length-1];
        let currentHeight = threadHeight * (threadNum+1) + margin.top;
        let canvasHeight = container.attr('height');
        if (currentWidth>=seqCanvasWidth){
            seqCanvasWidthStack.push(currentWidth);
            seqCanvasWidth = currentWidth;

            // sliderScale.domain([0, currentWidth]);
            // console.log(sliderCanvas)
            // sliderCanvas.select('.slider-selection')
            // .transition(1000)
            // .attr('width', sliderScale(seqSize[0]))
        }
        if (currentHeight > canvasHeight){
            container.attr('height', currentHeight)
            container.select('#seq-canvas-clip rect').attr('height', currentHeight);
        }

        let thread = seqCanvas.append('g')
            .attr('class', 'comp-thread comp-record')
            .attr('id', `comp_record_${threadNum}`)
            .attr('transform', `translate(0, ${threadHeight*threadNum})`)

        thread.append('rect')
            .attr('class', 'timeline')
            .attr('x', 0)
            .attr('y', -1.5 + predictRectSize[1]/2)
            .attr('width', timelineLength)
            .attr('height', 3)
            .attr('fill', 'transparent')
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width', 1)
    
        thread.append('line')
        .attr('class', 'thread-connect-line')
        .attr('x1', timelineLength)
        .attr('x2', timelineLength + (seqCanvasWidth - currentWidth))
        .attr('y1',predictRectSize[1]/2)
        .attr('y2', predictRectSize[1]/2)
        .attr('stroke', '#BFBFBF')
        .attr('stroke-width',2)
        .attr('stroke-dasharray', '2,2')

        let prediction = predCanvas.append('g')
        .attr('class', 'comp-pred comp-record')
        .attr('id', `comp_record_${threadNum}`)
        .attr('transform', `translate(0, ${threadHeight * threadNum})`)
        .datum(record['pre'])

        prediction.append('line')
            .attr('class', 'connect')
            .attr('x1', 0)
            .attr('y1', predictRectSize[1]/2)
            .attr('x2',connectLength)
            .attr('y2', predictRectSize[1]/2)
            .attr('stroke-dasharray', '2,2')
        prediction.append('rect')
            .attr('class', 'predict-results')
            .attr('x', connectLength)
            .attr('y', 0)
            .attr('width', predictRectSize[0])
            .attr('height', predictRectSize[1])
            .attr('stroke', '#BFBFBF')

        selectedIdxList = record['selected'];
        let results = prediction.append('g')
        .attr('class', 'results')
        .datum(function(d) {
            return d;
        })
        .attr('transform', `translate(${connectLength}, ${predictRectSize[1]/2})`)



        prediction.append('image')
        .attr('class', 'thread_delete_btn')
        .attr('xlink:href', '../static/img/delete_big.png')
        .attr('width', 15)
        .attr('height', 15)
        .attr('x', predictRectSize[0]+connectLength+12)
        .attr('y', (predictRectSize[1]-15)/2)
        .on('click', function(){
            let threadid = d3.select(this.parentNode).attr('id').split('_')[2];
            compvis.delete(threadid);
        })

        let durationData = calculateDuration(record['origin']);
        let durations = thread.append('g')
        .attr('class', 'durations')
        .attr('transform', `translate(0,${predictRectSize[1]/2})`)
        .selectAll('.duration-line')
        .data(durationData)
        .enter()
        .append('line')
        .attr('class', 'duration-line')
        .attr('id', (d,i)=>`duration_${i}`)
        .attr('x1', (d,i)=>i*eventRectStep+ eventRectSize[0])
        .attr('x2',  (d,i)=>i*eventRectStep+ eventRectSize[0])
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke-width', 4)
        .attr('stroke', (d)=>typeColors[d['type']])

        let events = thread.append('g')
            .attr('transform', `translate(0,${predictRectSize[1]/2})`)
            .attr('class', 'seq-events')
        
        let eventRects = events.selectAll('.events-rect')
        .data(record['origin'])
        .enter()
        .append('g')
        .attr('class', 'events-rect')
        .attr('id', (d,i)=> `eventrect_${i}`)
        .attr('transform', (d,i)=>{
            let cur_list = d['event_list'];
            let height = eventRectSize[1]*Math.pow(cur_list.length,pow_scale)
            return `translate(${eventRectStep * i}, ${-height/2})`;
        })


        let event_rect = eventRects.selectAll('.sub_node')
        .data(function(d){
            let cur_list = d['event_list'];
            treemap.size([eventRectSize[0], eventRectSize[1]*Math.pow(cur_list.length,pow_scale)]);
            var cur_obj=_.countBy(cur_list,function(e){
              return e['event_type']+'-'+e['event_code']+'-'+e['event_index']
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

        event_rect
        .enter()
        .append('g')
        .attr('transform',function(d){
          return 'translate('+(d.x0)+','+(d.y0)+')';
        })
        .attr("class","sub_node")
        .append("rect")
        .attr("name", function(d) { return d['data']['name']; })
        .attr("width", function(d) { return d.x1 - d.x0; })
        .attr("height", function(d) { return d.y1 - d.y0; })
        .attr("id", function(d) { 
          if(d['data']['name'].split('-').length){
            return d['data']['name'].split('-')[0]
          }
        })
        .attr('fill',function(d){
          if(d['data']['name'].split('-').length){
            return typeColors[d['data']['name'].split('-')[0]]
          }
        })
        .attr('stroke-width',0.5)
        .attr('stroke','#FFFFFF')
        .attr('class','treemap')



        thread.selectAll('.durations')
        .selectAll('.duration-text')
        .data(durationData)
        .enter()
        .append('text')
        .attr('class', 'duration-text')
        .attr('id', (d,i)=> 'duration-text_'+i)
        .text((d)=>{
            let duration = d['duration']/(1000*60*60*24);

            return Math.ceil(duration *10)/10 + 'D';
        })
        .attr('text-anchor', 'middle')
        .attr('x', (d,i)=> i*eventRectStep + eventRectSize[0] + eventPadding/2)
        .attr('y', -3)
        .style('font-size', '9px')
        .attr('fill', '#696969')

        eventRects
        .filter((d)=>{
            if (d['event_list'].length >1) {
                return false;
            } else {
                return true;
            }
        })
        .append('text')
        .text((d)=>{
            let icdcode = d['event_list'][0]['icd_code'];
            let type = d['event_list'][0]['event_type'];
            let label = '';
            if (type === 'Treatments') {
                label = treatment[icdcode];
            } else {
                label = disease_list[icdcode];
            }
            return label.slice(0,3).replace(/(^\s*)|(\s*$)/g,"")
        })
        .attr('font-size', 11)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', (d)=>{
            let type = d['event_list'][0]['event_type'];
            if(type === 'Treatments') {
                return '#FFFFFF';
            } else {
                return '#7d7d7d'
            }
        })
        .attr('x', eventRectSize[0]/2)
        .attr('y', (d)=>{
            let cur_list = d['event_list'];
            let height = eventRectSize[1]*Math.pow(cur_list.length,pow_scale);
            return height / 2;
        })
        .style("pointer-events","none")
        .style('-webkit-user-select','none')

        eventRects
        .filter((d)=>{
            if (d['event_list'].length === 1 && d['status']=== 'added') {
                return true;
            } else {
                return false;
            }
        })
        .selectAll('rect')
        .attr('fill', '#fc9272')
        // .attr('stroke-width', 1.5)

        let deletedEventRects =  eventRects
        .filter((d)=>{
            if (d['status']=== 'deleted') {
                return true;
            } else {
                return false;
            }
        })
        deletedEventRects
        .selectAll('rect')
        .attr('stroke', '#434343')
        .attr('fill', '#FFFFFF')
        .attr('stroke-dasharray', '1,1')
        deletedEventRects
        .selectAll('text')
        .attr('fill', '#7D7D7D')
        deletedEventRects
        .append('rect')
        .attr('fill', 'none')
        .attr('stroke', '#FFFFFF')
        .attr('stroke-width', 2)
        .attr('width', eventRectSize[0])
        .attr('height', (d)=>{
            let cur_list = d['event_list'];
            return eventRectSize[1]*Math.pow(cur_list.length,pow_scale)
        })
        deletedEventRects
        .append('rect')
        .attr('fill', 'none')
        .attr('stroke', '#fc9272')
        .attr('stroke-dasharray', '2,2')
        .attr('stroke-width', 2)
        .attr('width', eventRectSize[0])
        .attr('height', (d)=>{
            let cur_list = d['event_list'];
            return eventRectSize[1]*Math.pow(cur_list.length,pow_scale)
        })

        thread.append('g')
        .attr('class', 'move-paths')
        .attr('transform', `translate(0, ${predictRectSize[1]/2})`)

        for (let i = 0; i < record['origin'].length; i++) {
            let item = record['origin'][i];
            
            if (item.status === 'moved') {
                // let originIdx = item['origin_idx'];
                // let count =0, source=0;
                // for (let j = 0; j < record['origin'].length; j++) {
                //     if (record['origin'][j].status !== 'added') {
                //         count++;
                //         if (count === (originIdx + 1)) {
                //             source = j;
                //             break;
                //         }
                //     }
                // }
                // console.log(source)
                let originTime = item['origin_time'], source = 0;
                originTime = new Date(originTime);
                let firstDate = new Date(record['origin'][0]['event_time']);
                let latestDate = new Date(record['origin'][record['origin'].length-1]['event_time']);
                if (originTime < firstDate) {
                    source = -1;
                } else if(originTime > latestDate) {
                    source = record['origin'].length-1;
                } else {
                    for (let j=0; j < record['origin'].length-1; j++) {
                        let date1 = new Date(record['origin'][j]['event_time']);
                        let date2 = new Date(record['origin'][j+1]['event_time']);
                        if (date1 < originTime && date2> originTime) {
                            source = j;
                            break;
                        }
                    }
                }
                let target = i;
                if(source+1 === target|| source === target) {
                    container
                    .select('#comp_record_'+threadNum)
                    .select('#eventrect_'+target)
                    .datum((d)=>{
                        d.status = 'adjusted';

                        return d;
                    })
                } else {
                    console.log('source is', source)
                    drawMovePath(source, target, threadNum);
                }
                
            }
        }
        eventRects
        .filter((d)=>{
            if(d.status === 'moved') {
                return true;
            } else {
                return false;
            }
        })
        .on('mouseover', function(){
            let eventRectIdx = d3.select(this).attr('id').split('_')[1];
            d3.select(this.parentNode.parentNode)
            .select('#movepath_'+eventRectIdx)
            .classed('highlight', true)
            .raise()
        })
        .on('mouseout', function(){
            let eventRectIdx = d3.select(this).attr('id').split('_')[1];
            d3.select(this.parentNode.parentNode)
            .select('#movepath_'+eventRectIdx)
            .classed('highlight', false);
            // d3.select(this.parentNode.parentNode)
            // .selectAll('.movepath')
            // .attr('display', 'block')
            // d3.selectAll('#path_triangle path').attr('fill','#ccc');
        })
        .append('rect')
        .attr('fill', 'none')
        .attr('stroke', '#fc9272')
        .attr('stroke-width', 2)
        .attr('width', eventRectSize[0])
        .attr('height', (d)=>{
            let cur_list = d['event_list'];
            return eventRectSize[1]*Math.pow(cur_list.length,pow_scale)
        })

        eventRects
        .filter((d)=>{
            if(d.status === 'adjusted') {
                return true;
            } else {
                return false;
            }
        })
        .each(function(){
            let eventRectIdx = d3.select(this).attr('id').split('_')[1];
            let currentSeq =  d3.select(this.parentNode.parentNode)
            if (eventRectIdx !== 0) {
                console.log(currentSeq
                    .select('#duration_'+(eventRectIdx-1)))
                currentSeq
                .select('#duration_'+(eventRectIdx-1))
                .attr('stroke', '#fc9272')
                currentSeq
                .select('#duration-text_'+(eventRectIdx-1))
                .attr('fill', '#fc9272')
            }
            if (eventRectIdx !== record['origin'].length-1) {
                currentSeq
                .select('#duration_'+(eventRectIdx))
                .attr('stroke', '#fc9272')
                currentSeq
                .select('#duration-text_'+(eventRectIdx))
                .attr('fill', '#fc9272')
            }
            
        })

        thread.select('#seq-events').raise();
        
        threadNum++;

        compvis.drawPrediction(selectedIdxList);
        compvis.update()
        addtipsy();
        return compvis;
    }

    var predCircleScale = d3.scaleLinear().domain([0,1]).range([6, 12])

    compvis.drawPrediction = function(selectedIdxList) {
        console.log('selectedIdxList')
        console.log(selectedIdxList)
        let results = container.selectAll('.results')

        results.each(function(d){
            let maxidx = 0, maxpro=0;
            for (let i =0; i < selectedIdxList.length; i++){
                let idx = selectedIdxList[i];
                let pro = d[idx]['prob'];
                if (maxpro < pro) {
                    maxpro = pro
                    maxidx = idx
                }
            }
            d3.select(this.parentNode).select('.predict-results')
            .attr('stroke', diseaseColors[selectedIdxList.indexOf(maxidx)])
        })

        container.selectAll('.result-item').remove()

        results.selectAll('.result-item')
        .data((d)=>{
            let results = {};
            for (let i =0; i< selectedIdxList.length; i++) {
                let idx = selectedIdxList[i];

                let time = d[idx]['time_index'];
                if (typeof results[time] !== 'object') {
                    results[time] = [];
                }
                results[time].push({
                    'pro': d[idx]['prob'],
                    'idx': idx
                })
            }


            let resultList = [];

            for (let time in results) {
                resultList.push({
                    'time': time,
                    'results': results[time]
                })
            }
            return resultList;
        })
        .enter()
        .append('g')
        .attr('class', 'result-item')
        .attr('transform', (d)=>`translate(${predictionPosScale(d['time'])},0)`)
        .each(function(d, dataIdx){


            if (d['results'].length <=1) {
                let rst = d['results'][0]
                let result = d3.select(this)
                .append('g')
                .datum(rst)
                .attr('class', 'result-circle')
                .attr('transform', 'translate(0,0)')
                .on('click', function(){
                    highlightLineClick(rst['idx'], selectedIdxList.indexOf(rst['idx']))
                })
                .on('mouseover', function(){
                    highlightLineHover(rst['idx'], selectedIdxList.indexOf(rst['idx']));
                })
                .on('mouseout', function(){
                    let eventpath = d3.selectAll('#eventpath_'+rst['idx']+'_hover');
                    eventpath.remove();
                })
                result
                .append('circle')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', predCircleScale(rst['pro']))
                .attr('fill', ()=>{
                    let idx = selectedIdxList.indexOf(rst['idx'])
                    return diseaseColors[idx];
                })
                .attr('class', 'eventname_'+rst['idx'])
                .attr('fill-opacity', ()=>{
                    let icdcode = icdCodeList[rst['idx']];
                    let num = eventCount[icdcode]['count'];
                    let sum = eventCount[icdcode]['sum'];
                    d.confidence = num/sum;
                    return num / sum;
                })
                .attr('stroke', ()=>{
                    let idx = selectedIdxList.indexOf(rst['idx']);
                    return diseaseColors[idx];
                })
                .attr('stroke-width', 1.5)
                
                result
                .append('text')
                .attr('x',0)
                .attr('y', 0)
                .text((d)=> Math.round(100*rst['pro'])/100)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .style('font-size', '9px')
            }else {
                let probList = [];
                let num = d['results'].length;
                for (let i = 0; i < num; i++) {
                    let prob = d['results'][i]['pro'];
                    probList.push(prob);
                }
                
                let maxPro = Math.max(...probList);
                let resultsWidth = circlePadding * (num+1);
                for (let i = 0; i < probList.length; i++) {
                    resultsWidth += predCircleScale(probList[i]) * 2;
                }
                let resultHeight = predCircleScale(maxPro)*2 + circlePadding* 2;
                d3.select(this).append('rect')
                .attr('class', 'result-border')
                .attr('width', resultsWidth)
                .attr('height', resultHeight)
                .attr('rx', resultHeight/2)
                .attr('rx', resultHeight/2)
                .attr('stroke', '#959595')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '5,3')
                .attr('fill', 'transparent')
                .attr('x', - (resultsWidth)/2)
                .attr('y', -resultHeight/2)
                
                let resultCir = d3.select(this)
                .selectAll('.result-circle')
                .data(d['results'])
                .enter()
                .append('g')
                .attr('class', 'result-circle')
                .attr('transform', (d,i)=> {
                    let xpos = 0;
                    if (i===0) {
                        xpos =  - resultsWidth/2 + circlePadding + predCircleScale(d['pro']);
                    }
                    let sumwidth = 0;
                    for (let j = 0; j < i; j++) {
                        sumwidth += predCircleScale(probList[j])*2;
                    }
                    xpos = -resultsWidth/2 + circlePadding * (i+1) + sumwidth + predCircleScale(d['pro'])
                    return `translate(${xpos},0)`
                })
                .on('click', function(d){
                    highlightLineClick(d['idx'], selectedIdxList.indexOf(d['idx']))
                })
                .on('mouseover', function(d){
                    highlightLineHover(d['idx'], selectedIdxList.indexOf(d['idx']));
                })
                .on('mouseout', function(d){
                    let eventpath = d3.selectAll('#eventpath_'+d['idx']+'_hover');
                    eventpath.remove();
                })

                resultCir
                .append('circle')
                .attr('cy', 0)
                .attr('r', (d)=> predCircleScale(d['pro']))
                .attr('cx', 0)
                .attr('fill', (d)=> {
                    let idx = selectedIdxList.indexOf(d['idx']);
                    return diseaseColors[idx];
                })
                .attr('fill-opacity',(d)=>{
                    let icdcode = icdCodeList[d['idx']];
                    let num = eventCount[icdcode]['count'];
                    let sum = eventCount[icdcode]['sum'];
                    d.confidence = num/sum;
                    return num / sum;
                })
                .attr('stroke', (d)=> {
                    let idx = selectedIdxList.indexOf(d['idx']);
                    return diseaseColors[idx];
                })
                .attr('stroke-width', 1.5)
                .attr('class', (d) => 'eventname_'+d['idx'])


                resultCir
                .append('text')
                .attr('x',0)
                .attr('y', 0)
                .text((d)=> Math.round(100*d['pro'])/100)
                .attr('text-anchor', 'middle')
                .attr('alignment-baseline', 'middle')
                .style('font-size', '9px')
            }
        })

        $('.results .result-circle').tipsy({
            gravity: 'w',
            html: true,
            fade: false,
            opacity: 0.7,
            title:function(){
                var cur_index = this.__data__['idx']
                var cur_confidence = this.__data__.confidence;
                var cur_pro = this.__data__.pro;
                var tip = ''
                tip += "<div class='rect-tooltip'>"
                tip += "<div class='tooltip-item'>Prediction</div>"
                tip += "<div class='tooltip-item'>ICD-9: "+icdCodeList[cur_index]+"</div>"
                tip += "<div class='tooltip-item'>Name: "+disease[icdCodeList[cur_index]]+"</div>"
                tip += "<div class='tooltip-item'>Probability: "+ Math.round(cur_pro*1000)/10+"%</div>"
                tip += "<div class='tooltip-item'>Confidence: "+ Math.round(cur_confidence*1000)/10+"%</div>"
                tip += "</div>"
                return tip;
            }
        });

        return compvis;
    }

    compvis.update = function() {
        compvis.updateDuartion();
        compvis.updateConnect();
        updateHighlightLine(selectedIdxList);
        return compvis;
    }

    compvis.updateDuartion = function() {
        let maxDuration = 0, minDuration = Infinity;

        for (let i = 0;;i++){
            let durationCol = seqCanvas.selectAll('#duration_'+i)
            if(durationCol.empty()) break;
            durationCol.each(function(d,i){
                if (maxDuration<d['duration']) {
                    maxDuration = d['duration'];
                }
                if (minDuration > d['duration']) {
                    minDuration = d['duration'];
                }
            });
        }
        durationScale.domain([minDuration,maxDuration]);
        for (let i = 0;;i++){
            let durationCol = seqCanvas.selectAll('#duration_'+i)
            if(durationCol.empty()) break;
            if(minDuration === maxDuration) {
                durationCol
                .transition()
                .duration(600)
                .attr('x2', (d)=> eventPadding+eventRectSize[0]+i*eventRectStep)                
            } else {
                durationCol
                .transition()
                .duration(600)
                .attr('x2', (d)=> durationScale(d['duration'])+eventRectSize[0]+i*eventRectStep)                
            }
        }
        // console.log(d3.select('#duration_2').empty())
        return compvis;
    }

    compvis.updateConnect = function() {
        let currentWidth = seqCanvasWidthStack[seqCanvasWidthStack.length-1];
        let pos = currentWidth - margin.left;
        seqCanvas.selectAll('.comp-thread')
        .each(function(d){
            d3.select(this).select('.thread-connect-line')
            .attr('x2', pos);
        })
        return compvis;
    }

    compvis.delete = function(threadid) {
        let currentThreadLen = container.select('#comp_record_'+threadid).select('.thread-connect-line').attr('x1');
        
        container.selectAll('#comp_record_'+threadid).remove();
        container.selectAll('.comp-record')
        .filter(function(d){
            let idx = d3.select(this).attr('id').split('_')[2];
            idx = Number(idx);
            if (idx > threadid) {
                return true;
            }else {
                return false;
            }
        })
        .attr('id', function(){
            let idx = d3.select(this).attr('id').split('_')[2];
            idx--;
            return 'comp_record_'+idx;
        })
        .attr('transform', function(){
            let idx = d3.select(this).attr('id').split('_')[2];
            return `translate(0,${threadHeight * idx})`
        })


        let currentCanvasWidth = seqCanvasWidthStack[seqCanvasWidthStack.length-1];
        if (currentCanvasWidth == Number(currentThreadLen) + margin.left) {
            let width = seqCanvasWidthStack.pop();
            // d3.select('#seq-canvas').transition(1000).attr('width', width);
            // sliderScale.domain([0, width]);
            // sliderCanvas.select('.slider-selection')
            // .transition(1000)
            // .attr('width', sliderScale(seqSize[0]))
        }
        threadNum--;
        if (threadNum===0){
            sliderCanvas.attr('display', 'none');
        }

        let currentCanvasHeight = container.attr('height');
        let recalculateCanvasHeight = threadHeight * threadNum + margin.top;
        if (currentCanvasHeight > recalculateCanvasHeight && currentCanvasHeight > size[1]){
            // d3.select('#seq-canvas').attr('height', recalculateCanvasHeight);
            // d3.select('#pred-canvas').attr('height', recalculateCanvasHeight);
            container.attr('height', recalculateCanvasHeight)
            container.select('#seq-canvas-clip rect').attr('height', recalculateCanvasHeight);
            // d3.select('#seq-container').style('height', (recalculateCanvasHeight + 6)+'px')
        }

        compvis.update();
        return compvis;
    }

    compvis.selectType = function(select_type) {
        selectedIdxList = select_type;
        console.log('selected')
        console.log(selectedIdxList)
        compvis.drawPrediction(selectedIdxList)
        updateHighlightLine(selectedIdxList)
        return compvis;
    }


    //////////////////////////

    var indexList = [];
    function calculateSeq (originSeq,opRecord) {
        
        for (let i = 0; i < originSeq.length; i++) {
            indexList.push(i);
            originSeq[i]['origin_idx'] = i;
            originSeq[i]['origin_time'] = originSeq[i]['event_time'];
        }
        for (let i = 0; i < opRecord.length; i++) {
            let recordItem = opRecord[i]
            let op = recordItem['op'];
            switch (op) {
                case 'add':
                    // let addIdx = recordItem['idx'];
                    // insertIndexList(addIdx)
                    // let index1 = indexList.indexOf(addIdx);
                    let addItem = recordItem['add_item'];
                    addItem.status = 'added';

                    let addTime = new Date(addItem['event_time']);
                    let firstDate = new Date(originSeq[0]['event_time']);
                    let latestDate = new Date(originSeq[originSeq.length-1]['event_time']);
                    let newIndex = 0;
                    if (addTime < firstDate) {
                        newIndex = 0;
                    } else if(addTime > latestDate) {
                        newIndex = originSeq.length;
                    } else {
                        for (let j=0; j < originSeq.length-1; j++) {
                            let date1 = new Date(originSeq[j]['event_time']);
                            let date2 = new Date(originSeq[j+1]['event_time']);
                            if (date1 < addTime && date2> addTime) {
                                newIndex = j+1;
                                break;
                            }
                        }
                    }

                    let itemIdx = 0;
                    for (let j = 0; j < newIndex; j++) {
                        if ( itemIdx < indexList[j]) {
                            itemIdx = indexList[j];
                        }
                    }
                    itemIdx += 1;
                    for (let j =newIndex; j < indexList.length; j++) {
                        if (indexList[j] !== -1) {
                            indexList[j]++;
                        }
                    }
                    indexList.splice(newIndex, 0, itemIdx);
                    originSeq.splice(newIndex, 0, addItem);
                    console.log(indexList)
                    break;

                case 'delete':
                    let deleteIdx = recordItem['idx'];
                    let index2 = indexList.indexOf(deleteIdx);
                    if (originSeq[index2].status === 'added') {
                        originSeq.splice(index2, 1);
                        deleteIndexList(index2);
                    } else if (originSeq[index2].status === 'moved'){
                        let moveItem = originSeq.splice(index2, 1)[0];
                        deleteIndexList(index2);
                        moveItem['event_time'] = moveItem['origin_time'];
                        let originTime = new Date(moveItem['origin_time']);
                        let firstDate = new Date(originSeq[0]['event_time']);
                        let latestDate = new Date(originSeq[originSeq.length-1]['event_time']);
                        let newIndex = 0;
                        if (originTime < firstDate) {
                            newIndex = 0;
                        } else if(originTime > latestDate) {
                            newIndex = originSeq.length;
                        } else {
                            for (let j=0; j < originSeq.length-1; j++) {
                                let date1 = new Date(originSeq[j]['event_time']);
                                let date2 = new Date(originSeq[j+1]['event_time']);
                                if (date1 < originTime && date2> originTime) {
                                    newIndex = j+1;
                                    break;
                                }
                            }
                        }
                        moveItem.status = 'deleted';
                        originSeq.splice(newIndex, 0, moveItem);
                        indexList.splice(newIndex, 0, -1);
                        console.log(indexList)
                    } else {
                        originSeq[index2].status = 'deleted';
                        indexlistSetDelete(index2);
                    }
                    break;

                case 'move':
                    let startIdx = recordItem['start_idx'], endIdx = recordItem['end_idx'], updatedTime = recordItem['updated_time'];
                    let recordStartIdx = indexList.indexOf(startIdx);
                    let moveItem = originSeq.splice(recordStartIdx,1)[0];
                    // console.log(moveItem)
                    deleteIndexList(recordStartIdx);
                    moveItem['event_time'] = updatedTime;
                    insertIndexList(endIdx);
                    let recordEndIdx = indexList.indexOf(endIdx);
                    originSeq.splice(recordEndIdx, 0, moveItem);
                    
                    if (originSeq[recordEndIdx].status !== 'added') {
                        originSeq[recordEndIdx].status = 'moved';
                    }
                    break;

                default:
                    break;
            }
        }
        console.log(originSeq);
    }

    function insertIndexList(itemIdx) {
        let index = indexList.indexOf(itemIdx);
        if (index === -1) {
            indexList.push(itemIdx);
            return;
        }
        for (let i =index; i < indexList.length; i++) {
            if (indexList[i] !== -1) {
                indexList[i]++;
            }
        }
        indexList.splice(index, 0, itemIdx);
        console.log(indexList)
    }

    function deleteIndexList(itemIdx) {
        indexList.splice(itemIdx,1);
        for (let i = itemIdx; i < indexList.length; i++) {
            if (indexList[i] !== -1) {
                indexList[i]--;
            }
        }
        console.log(indexList)
    }

    function indexlistSetDelete(index) {
        indexList[index] = -1;
        for (let i = index +1; i < indexList.length; i++) {
            if (indexList[i] !== -1) {
                indexList[i]--;
            }
        }
        console.log(indexList)
    }

    function drawMovePath(source, target, seqIndex) {
        if(source === target) return;

        let movePath = seqCanvas
        .select('#comp_record_'+seqIndex)
        .select('.move-paths')
        .append('g')
        .attr('id', 'movepath_'+target)
        .attr('class', 'movepath')

        let xpos1 = 0, xpos2 = 0;

        let targetTransform = seqCanvas.select('#comp_record_'+seqIndex)
        .select('#eventrect_'+target)
        .attr('transform').split(/[\(,\)]/)
        let xTargetTrans = targetTransform[1], yTargetTrans = targetTransform[2];
        let ypos = Math.abs(Number(yTargetTrans))+3;
        // ypos = -ypos
        xpos2 = Number(xTargetTrans) + eventRectSize[0]/2;


        // let sourceTransform = seqCanvas.select('#comp_record_'+seqIndex)
        // .select('#eventrect_'+source)
        // .attr('transform').split(/[\(,\)]/)
        let xSource = source * eventRectStep;
        xSource = Number(xSource) +eventRectSize[0]/2;
        xpos1 = Number(xSource) + eventPadding/2 + eventRectSize[0]/2;

        // if (source < target) { //右移, source前
        //     xpos1 = Number(xSource) - eventPadding/2 - eventRectSize[0]/2;
        // } else if (source > target ) { // 左移, source后
        //     xpos1 = Number(xSource) + eventPadding/2 + eventRectSize[0]/2;
        // }

        let points = [];
        points.push([xpos1,ypos])
        points.push([(xpos1+xpos2)/2, ypos+25])
        points.push([xpos2, ypos])
        movePath.append('path')
        .attr('d', line(points))
        .attr('fill', 'none')
        .attr('stroke', '#fc9272')
        .attr('stroke-width', 2)
        .attr('marker-end', 'url(#path_triangle)')
        
        movePath.append('circle')
        .attr('cx', xpos1)
        .attr('cy', ypos)
        .attr('fill', '#fc9272')
        .attr('r', 2.5)
        
    }

    function calculateDuration(sequence) {
        let durations = [];
        for (let i = 0; i < sequence.length-1; i++) {
            let eventlist = sequence[i+1]['event_list'];
            let count=_.countBy(eventlist,function(d){
                return d['event_type'];
            })
            let ftype=_.max(Object.keys(count),function (o) { return count[o]; });
            let time = sequence[i]['event_time'];
            let postTime = sequence[i + 1]['event_time'];
            durations.push({
                'type': ftype,
                'duration': new Date(postTime) - new Date(time)
            });
        }
        return durations
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


    function addtipsy() {
        $('.events-rect .sub_node').tipsy({
            gravity: 's',
            html: true,
            fade: false,
            opacity: 0.7,
          title:function(){
            var cur_list = this.parentNode.__data__.event_list
            var e = parseInt(this.__data__.data.name.split('-')[2])

            var tip = '';
            if(cur_list[e].event_type=='Treatments'){
                tip += "<div class='rect-tooltip'><div class='tooltip-item'>Treatment</div><div class='tooltip-item'>Name: "+treatment[cur_list[e].icd_code]+"</div></div>"

            } else {
                tip += "<div class='rect-tooltip'><div class='tooltip-item'>Diagnosis</div><div class='tooltip-item'>ICD-9: "+cur_list[e].icd_code+"</div><div class='tooltip-item'>Name: "+disease[cur_list[e].icd_code]+"</div></div>"
            }
            return tip;
          }
        });

      }

    
    function highlightLineClick (eventname, coloridx) {
        let eventpath = container.selectAll('#eventpath_'+eventname);
        if(eventpath.empty()) {
            drawHighlightLine(eventname, coloridx);
        }else {
            eventpath.remove();
        }

    }

    function updateHighlightLine(selectedIdxList) {
        let showedEventNames = new Set();
        container.selectAll('.eventpath')
        .each(function(){
            let name = d3.select(this).attr('id').split('_')[1];
            showedEventNames.add(Number(name));
        })
        container.selectAll('.eventpath').remove();
        showedEventNames.forEach(function(name){
            drawHighlightLine(name, selectedIdxList.indexOf(name))
        })
    }

    function drawHighlightLine(eventname, coloridx) {
        let positionList = [];
        container.selectAll('.eventname_'+eventname)
        .each(function(){
            let x1 = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/)[1]
            let x2 = d3.select(this.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[1]
            let x3 = d3.select(this.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[1]
            let y1 = d3.select(this.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[2]
            let y2 = d3.select(this.parentNode.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[2]
            let x = Number(x1) + Number(x2) + Number(x3);
            let y = Number(y1) + Number(y2);
            let prob = this.parentNode.__data__['pro'];
            let radius = predCircleScale(prob);
            positionList.push({
                x: x,
                y: y-radius
            })
            positionList.push({
                x: x,
                y: y+radius
            })
        })
        positionList.sort(function(a,b){
            return a.y - b.y;
        });
        if (positionList.length <=1) return;
        let pathlist = [];
        for (let i =1; i< positionList.length-1; i+=2) {
            let point1 = positionList[i];
            let point2 = positionList[i+1];

            pathlist.push({
                x1: point1.x,
                y1: point1.y,
                x2: point2.x,
                y2: point2.y
            })
        }
        pathCanvas.selectAll('#eventpath_'+eventname)
        .data(pathlist)
        .enter()
        .append('path')
        .attr('id', 'eventpath_'+eventname)
        .attr('class', 'eventpath')
        .attr('stroke', diseaseColors[coloridx])
        .attr('stroke-width', 2)
        .attr('fill', 'transparent')
        .attr('d', (d)=>{
            let middley = (d.y1+d.y2)/2;
            return `M${d.x1} ${d.y1} C ${d.x1} ${middley}, ${d.x2} ${middley}, ${d.x2} ${d.y2}`
        })
    }


    function highlightLineHover(eventname, coloridx) {
        let positionList = [];
        container.selectAll('.eventname_'+eventname)
        .each(function(){
            let x1 = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/)[1]
            let x2 = d3.select(this.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[1]
            let x3 = d3.select(this.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[1]
            let y1 = d3.select(this.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[2]
            let y2 = d3.select(this.parentNode.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[2]
            let x = Number(x1) + Number(x2) + Number(x3);
            let y = Number(y1) + Number(y2);
            let prob = this.parentNode.__data__['pro'];
            let radius = predCircleScale(prob);
            positionList.push({
                x: x,
                y: y-radius
            })
            positionList.push({
                x: x,
                y: y+radius
            })
        })
        positionList.sort(function(a,b){
            return a.y - b.y;
        });
        if (positionList.length <=1) return;
        let pathlist = [];
        for (let i =1; i< positionList.length-1; i+=2) {
            let point1 = positionList[i];
            let point2 = positionList[i+1];

            pathlist.push({
                x1: point1.x,
                y1: point1.y,
                x2: point2.x,
                y2: point2.y
            })
        }
        pathCanvas.selectAll('#eventpath_'+eventname+'_hover')
        .data(pathlist)
        .enter()
        .append('path')
        .attr('id', 'eventpath_'+eventname +'_hover')
        .attr('class', 'eventpath_hover')
        .attr('stroke', diseaseColors[coloridx])
        .attr('stroke-width', 2)
        .attr('fill', 'transparent')
        .attr('d', (d)=>{
            let middley = (d.y1+d.y2)/2;
            return `M${d.x1} ${d.y1} C ${d.x1} ${middley}, ${d.x2} ${middley}, ${d.x2} ${d.y2}`
        })
    }

    var dragOffsetX = 0, sliderSelectionWidth = 0;
    function sliderDragStart() {
        let transX = sliderCanvas.select('rect').attr('x');
        dragOffsetX = d3.event.x - transX;
        sliderSelectionWidth = sliderScale(seqSize[0]);
        console.log(dragOffsetX)
    }
    function sliderDragging() {
        // let transX = sliderCanvas.select('rect').attr('x');
        let xpos = d3.event.x-dragOffsetX;
        if (xpos >=0.1 && xpos <=(seqSize[0]-sliderSelectionWidth)) {
            sliderCanvas.select('rect')
            .attr('x', xpos)

            document.getElementById('seq-container').scrollLeft = sliderScale.invert(xpos);
            // sliderCanvas
            // .select('rect')
            // .attr('x', document.getElementById('seq-container').scrollLeft||xpos);
        }

    }

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
        if (!d3.event.selection|| d3.event.selection.length <2) {
            container.select('.seq-timeaxis').select('.brush')
            .call(brush.move, [(1-1/minScale)*timelineLength, timelineLength]);
            return;
        }
        var s = d3.event.selection;
        if((s[1]-s[0])>timelineLength/minScale){
            let brushCenter = s[0] + 0.5 * (s[1] - s[0])
            container.select('.seq-timeaxis').select('.brush')
                .call(brush.move, [brushCenter - 0.499 * timelineLength/minScale, brushCenter + 0.499 * timelineLength/minScale]);
            return
        }

        timelineScale.domain([0, visits.length]).range([0, timelineLength]);
        let startIdx = timelineScale.invert(s[0]), endIdx = timelineScale.invert(s[1]);
        sequenceScale.domain([startIdx, endIdx]);

        container.select('.zoom-panel').call(zoomEvent.transform, d3.zoomIdentity.scale(timelineLength/(s[1]-s[0])).translate(-s[0], 0))

        container.selectAll('.events-rect')
        .attr('transform', function(){
            let idx = d3.select(this).attr('id').split('_')[1];
            let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
            return `translate(${sequenceScale(idx)},${height})`
        })
        updateDuration();
    }


    return compvis
}
