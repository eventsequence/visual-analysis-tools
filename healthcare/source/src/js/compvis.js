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
    var eventRectSize = [29, 16], eventPadding = 28, resultPadding=15;
    var eventRectStep = eventRectSize[0] + eventPadding
    var predictRectSize = [235, 65]
    var connectLength = 23;
    var threadHeight = predictRectSize[1]+27;
    var durationScale = d3.scaleSqrt();
    var seqTimesliceNumStack = [];
    var selectedIdxList = [];
    var line = d3.line()
    .x(function(d){ return d[0]; })
    .y(function(d){ return d[1]; })
    .curve(d3.curveBundle.beta(0.85));
    var seqWidth = 484;
    var predCanvasX = seqWidth + margin.left;
    var sliderScale = d3.scaleLinear().range([0, seqWidth]);
    var sequenceScale = d3.scaleLinear().range([0,seqWidth]);

    var brush = d3.brushX()
    .extent([[0, -4], [seqWidth, 4]])
    .on('brush end', brushed)
    var minScale = 1;
    var zoomEvent = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([[0,0], [seqWidth, Infinity]])
    .extent([[0, 0], [seqWidth, Infinity]])
    .on('zoom',zoomed)

    // var resultsMargin = (predictRectSize[0]-eventRectSize[0]*5-resultPadding*4)/2;
    var predXScale = d3.scaleLinear().domain([1,0]).range([0, predictRectSize[0]-2]);
    var predAxis = d3.axisBottom(predXScale).ticks(5).tickFormat(d=> (Math.round(d*1000)/1000).toFixed(2));
    var predResultsShowStatus = 'showrow';

    var predzoom = d3.zoom()
    .scaleExtent([1,Infinity])
    .translateExtent([[0,-predictRectSize[1]/2], [predictRectSize[0],predictRectSize[1]/2]])
    .extent([[0,-predictRectSize[1]/2], [predictRectSize[0],predictRectSize[1]/2]])
    .on('zoom', predzoomed)
    var treemapWidth = 32;

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
        container
        .attr('height', size[1])
        let maxtimeSlice = Math.floor(seqWidth/(eventRectSize[0]+eventPadding));
        seqTimesliceNumStack=[];
        seqTimesliceNumStack.push(maxtimeSlice);
        sliderScale.domain([-1, maxtimeSlice])
        return compvis;
    }

    compvis.layout = function() {

        container.attr('id', 'comp-container')
        .attr('width', size[0])
        .attr('height', size[1])
        let maxtimeSlice = Math.floor(seqWidth/(eventRectSize[0]+eventPadding));
        seqTimesliceNumStack.push(maxtimeSlice);
        sliderScale.domain([-1, maxtimeSlice])


        sliderCanvas = d3.select('#comp-slider').append('svg')
        .attr('height', 25)
        .attr('width', size[0])
        .append('g')
        .attr('transform', 'translate(19,12)')
        .attr('id', 'slider-canvas')
        .attr('display', 'none')

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


        container.append('defs')
        .append('clipPath')
        .attr('id', 'seq-canvas-clip')
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('height', size[1])
        .attr('width', seqWidth)
        container.select('defs')
        .append('clipPath')
        .attr('id', 'comp-pred-clip')
        .append('rect')
        .attr('x',0-1)
        .attr('y',-predictRectSize[1]/2-1)
        .attr('width', predictRectSize[0]+2)
        .attr('height', predictRectSize[1]+2)
        container.select('defs')
        .append('clipPath')
        .attr('id', 'path-canvas-clip')
        .append('rect')
        .attr('x',connectLength)
        .attr('y',0)
        .attr('width', predictRectSize[0])
        .attr('height', size[1])

        let back =container
        .select('defs')
        .append('linearGradient')
        .attr("id",'back')
        .attr("x1",0)
        .attr("x2",1)
        .attr("y1",0)
        .attr("y2",0)

        back.append("stop")
        .attr("stop-color","#7d7d7d")
        .attr("offset",0)

        back.append("stop")
        .attr("stop-color","#FFFFFF")
        .attr("offset",1)


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
        .attr('clip-path', 'url(#path-canvas-clip)')

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

        seqCanvas
        .append('rect')
        .attr('class', 'zoom-panel')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', seqWidth)
        .attr('height', size[1])
        .attr('fill', 'transparent')
        .call(zoomEvent)
        .on('dblclick.zoom', null)

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

        let curTimesliceNum = record['origin'].length;
        let canvasMaxTimeSlice = seqTimesliceNumStack[seqTimesliceNumStack.length-1];
        if(curTimesliceNum >= canvasMaxTimeSlice) {
            seqTimesliceNumStack.push(curTimesliceNum);
            canvasMaxTimeSlice = curTimesliceNum;
            sequenceScale.domain([0, curTimesliceNum]);
            sliderScale.domain([-1, curTimesliceNum])
            let maxShowNum = Math.floor(seqWidth/(eventRectSize[0]+eventPadding));
            minScale = Math.ceil(seqTimesliceNumStack[seqTimesliceNumStack.length-1]/maxShowNum);
            zoomEvent.scaleExtent([minScale, Infinity])
        }


        let timelineLength = eventRectStep * curTimesliceNum - eventPadding;
        let currentWidth = timelineLength;
        let seqCanvasWidth = eventRectStep * canvasMaxTimeSlice-eventPadding;
        // if (currentWidth>=seqCanvasWidth){
        //     seqCanvasWidthStack.push(currentWidth);
        //     seqCanvasWidth = currentWidth;
        // }

        let currentHeight = threadHeight * (threadNum+1) + margin.top;
        let canvasHeight = container.attr('height');
        if (currentHeight > canvasHeight){
            container.attr('height', currentHeight)
            container.select('#seq-canvas-clip rect').attr('height', currentHeight);
            container.select('#path-canvas-clip rect').attr('height', currentHeight);
            seqCanvas.select('.zoom-panel')
            .attr('height', currentHeight)
        }

        let thread = seqCanvas.append('g')
            .attr('class', 'comp-thread comp-record')
            .attr('id', `comp_record_${threadNum}`)
            .attr('transform', `translate(0, ${threadHeight*threadNum})`)

        thread.append('rect')
            .attr('class', 'timeline')
            .attr('x', 0)
            .attr('y', -1.5 + predictRectSize[1]/2)
            .attr('width', seqWidth)
            .attr('height', 3)
            .attr('fill', 'transparent')
            .attr('stroke', '#BFBFBF')
            .attr('stroke-width', 1)
    
        // thread.append('line')
        // .attr('class', 'thread-connect-line')
        // .attr('x1', timelineLength)
        // .attr('x2', timelineLength + (seqCanvasWidth - currentWidth))
        // .attr('y1',predictRectSize[1]/2)
        // .attr('y2', predictRectSize[1]/2)
        // .attr('stroke', '#BFBFBF')
        // .attr('stroke-width',2)
        // .attr('stroke-dasharray', '2,2')


        //  Draw prediction
        let prediction = predCanvas.append('g')
        .attr('class', 'comp-pred comp-record')
        .attr('id', `comp_record_${threadNum}`)
        .attr('transform', `translate(0, ${threadHeight * threadNum})`)
        .datum(()=>{
            
            // for (let i = 0; i < record['pre'].length; i++) {
            //     let item = record['pre'][i]
            //     let time = item['time_index'];
            //     let endDate = record.seq[record.seq.length-1]['event_time'];
            //     endDate= new Date(endDate);
            //     endDate.setMonth(endDate.getMonth()+1+time);
            //     let endDatef = [endDate.getFullYear(),(endDate.getMonth()+1).padLeft(),
            //         endDate.getDate().padLeft()].join('-') +' ' +
            //         [endDate.getHours().padLeft(),
            //         endDate.getMinutes().padLeft(),
            //         endDate.getSeconds().padLeft()].join(':');
            //     item.time = endDatef
            //     let duration = new Date(endDatef)- new Date(record.seq[record.seq.length-1]['event_time']);
            //     duration = duration/(1000*60*60*24);
            //     item.duration = Math.ceil(duration);
            // }
            // console.log(record['pre'])
            return record['pre'];
        })

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
        .attr('fill', 'none')

        selectedIdxList = record['selected'];
        let results = prediction.append('g')
        .attr('class', 'comp-pre-results')
        .datum(function(d) {
            return d;
        })
        .attr('transform', `translate(${connectLength}, ${predictRectSize[1]/2})`)
        .attr('clip-path', 'url(#comp-pred-clip)')

        results
        .append('rect')
        .attr('class', 'background-rect')
        .attr('y', -predictRectSize[1]/2)
        .attr('width', predictRectSize[0])
        .attr('height', predictRectSize[1])
        // .attr('fill', 'url(#back)')
        .attr('fill', 'transparent')
        .attr('opacity', 0.3)

        results
        .append('rect')
        .attr('x',0)
        .attr('y', -1.5)
        .attr('width', predictRectSize[0])
        .attr('height', 3)
        .attr('fill', '#bfbfbf')
        .attr('class', 'probline')

        results
        .append('g')
        .attr('class', 'pred-axis')
        .attr('transform', 'translate(1,1)')
        .call(predAxis)
        results.select('.pred-axis')
        .select('path')
        .attr('stroke', '#BFBFBF')
        results.select('.pred-axis')
        .selectAll('text')
        .attr('fill', '#696969')
        .style('font-family', 'PingFangSC-Thin')
        .attr('text-anchor', 'start')
        .attr('x', 2)
        .attr('y', 17)
        results.select('.pred-axis')
        .selectAll('line')
        .attr('y2', 24)
        .attr('stroke', '#bfbfbf')

        // let predXScaleDomain = predXScale.domain()
        // console.log(d3.zoomIdentity.scale(1/(predXScaleDomain[0]-predXScaleDomain[1])).translate(probscale(predXScale(1)),0))
        results
        .append('rect')
        .attr('width', predictRectSize[0])
        .attr('height', predictRectSize[1])
        .attr('y',-predictRectSize[1]/2)
        .attr('fill', 'transparent')
        .attr('class', 'pred-zoom-panel')
        .call(predzoom)
        // .call(predzoom.transform, d3.zoomIdentity.scale(1/(predXScaleDomain[0]-predXScaleDomain[1])).translate((predXScale(1)),0))
        .on('dblclick.zoom', dbclickResultsRect)

        prediction.select('.predict-results').raise();

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
        .selectAll('.duration')
        .data(durationData)
        .enter()
        .append('g')
        .attr('class', 'duration')
        .attr('id', (d,i)=>`duration_${i}`)
        .attr('transform', (d,i)=>`translate(${eventRectSize[0]+sequenceScale(i)}, 0)`)
        durations
        .append('line')
        .attr('class', 'duration-bar')
        .attr('x1', 0)
        .attr('x2', 0)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke-width', 4)
        .attr('stroke', (d)=>typeColors[d['type']])
        durations
        .append('text')
        .attr('class', 'duration-text')
        .text((d)=>{
            let duration = d['duration']/(1000*60*60*24);
            return Math.ceil(duration *10)/10 + 'D';
        })
        .attr('text-anchor', 'middle')
        .attr('x', durationScale.range()[1]/2)
        .attr('y', -3)
        .style('font-size', '9px')
        .attr('fill', '#696969')
        .style('-webkit-user-select','none')

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
            return `translate(${sequenceScale(i)}, ${-height/2})`;
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
                label = disease[icdcode];
            }
            return label.slice(0,3).replace(/(^\s*)|(\s*$)/g,"")
        })
        .attr('font-size', 11)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', '#FFFFFF')
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
                currentSeq
                .select('#duration_'+(eventRectIdx-1))
                .select('line')
                .attr('stroke', '#fc9272')
                currentSeq
                .select('#duration_'+(eventRectIdx-1))
                .select('text')
                .attr('fill', '#fc9272')
            }
            if (eventRectIdx !== record['origin'].length-1) {
                currentSeq
                .select('#duration_'+(eventRectIdx))
                .select('line')
                .attr('stroke', '#fc9272')
                currentSeq
                .select('#duration_'+(eventRectIdx))
                .select('text')
                .attr('fill', '#fc9272')
            }
            
        })

        thread.select('#seq-events').raise();

        if(threadNum===0) {
            sliderCanvas.select('.brush')
            .call(brush.move, [(1-1/minScale)*seqWidth, seqWidth])
        } else {
            sliderCanvas.select('.brush')
            .call(brush.move, saveSelection)
        }
        pathCanvas.raise();

        
        threadNum++;

        compvis.drawPrediction(selectedIdxList);
        compvis.update()
        addtipsy();
        return compvis;
    }

    compvis.drawPrediction = function(selectedIdxList) {
        // console.log('selectedIdxList',selectedIdxList)
        let results = container.selectAll('.comp-pre-results')

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



        results.select('.pre-results-nodes').remove()

        let resultNodes = results.append('g')
        .attr('class', 'pre-results-nodes')
        .attr('transform', (d)=>{
            let sumpro = 0;
            for (let i =0; i< selectedIdxList.length; i++) {
                let idx = selectedIdxList[i]
                sumpro += d[idx]['prob'];
            }
            let avgpro = sumpro/ selectedIdxList.length;
            let transx = predXScale(avgpro)-treemapWidth/2;
            return `translate(${transx}, ${-treemapWidth/2})`;
        })
        let resultItems =resultNodes.selectAll('.pre-result-item')
        .data((d)=>{
            let results = [];
            for (let i =0; i< selectedIdxList.length; i++) {
                let idx = selectedIdxList[i];
                let time = d[idx]['time'];
                let duration = d[idx]['duration'];
                let icdcode = icdCodeList[idx];
                let confidence = eventCount[icdcode];
                results.push({
                    'pro': d[idx]['prob'],
                    'confidence': confidence,
                    'idx': idx,
                    'time': time,
                    'duration': duration
                })
            }
            let obj={
                'name':'obj',
                'children':[]
            };
            for (let i=0; i < results.length; i++) {
                let item = results[i];
                obj['children'].push({
                    'name': 'diagnose-'+icdCodeList[item.idx]+'-'+item.idx,
                    'pro': item.pro,
                    'confidence': item.confidence,
                    'time': item.time,
                    'idx': item.idx,
                    'duration': item.duration
                })
            }
            treemap.size([treemapWidth, treemapWidth]);
            var tree_root = d3.hierarchy(obj)
            .eachBefore(function(d) { d.data.id = d.data.name; })
            .sum(function (d) {
                return d.pro;
            })
            .sort(function(a, b) { return b.pro-a.pro; });
            treemap(tree_root);
            return tree_root.leaves();
        })
        .enter()
        .append('g')
        .attr('class', 'pre-result-item')
        .attr('id', (d,i)=> 'pre-result-item_'+i)


        resultItems
        .attr('transform', function(d,i){
            let baseTrans = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
            let basex = Number(baseTrans[1]), basey = Math.abs(Number(baseTrans[2]));
            let transX = -basex + predXScale(d['data'].pro)-eventRectSize[0]/2;
            let transY = basey - eventRectSize[1]/2;
            return `translate(${transX},${transY})`
        })

        let preRect = resultItems
        .append('g')
        .attr('class', 'comp-pre-result-rect')
        .attr('id', (d)=>{
            let idx = d['data']['name'].split('-')[2];
            return 'resultrect_' + idx;
        })
        .on('click', function(d){
            let idx = d['data']['name'].split('-')[2];
            highlightLineClick(idx, selectedIdxList.indexOf(Number(idx)))
        })
        .on('mouseover', function(d){
            let idx = d['data']['name'].split('-')[2];
            highlightLineHover(idx, selectedIdxList.indexOf(Number(idx)));
        })
        .on('mouseout', function(d){
            let idx = d['data']['name'].split('-')[2];
            let eventpath = d3.selectAll('#eventpath_'+idx+'_hover');
            eventpath.remove();
        })

        preRect
        .append('rect')
        .attr('width', eventRectSize[0])
        .attr('height', eventRectSize[1])
        .attr('fill', (d)=>{
            let coloridx = selectedIdxList.indexOf(d['data'].idx);
            let color = diseaseColors[coloridx];
            let colorscale = d3.scaleLinear().domain([0,1]).range(['#FFFFFF', color]);
            return colorscale(Math.pow(d['data'].confidence, 2));
        })
        .attr('stroke', (d)=>{
            let coloridx = selectedIdxList.indexOf(d['data'].idx);
            return diseaseColors[coloridx];
        })
        .attr('stroke-width', 1.5)

        preRect
        .append('text')
        .text(function(d){
            let icdcode = icdCodeList[d['data'].idx];
            let label = disease[icdcode];
            return label.slice(0,3).replace(/(^\s*)|(\s*$)/g,"");
        })
        .attr('class','pred-text')
        .attr('x',eventRectSize[0]/2)
        .attr('y', eventRectSize[1]/2)
        .attr('font-size', 11)
        .attr('fill', 'transparent')
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style("pointer-events","none")
        .style('-webkit-user-select','none')
        .attr('fill', '#7d7d7d')

        resultItems
        .append('text')
        .text(function(d){
            return "+"+ d['data'].duration+'D';
        })
        .attr('class','pred-duration-text')
        .attr('x', eventRectSize[0]/2)
        .attr('y', -3)
        .attr('fill', '#7D7D7D')
        .attr('font-size', 9)
        .attr('font-family', 'PingFangSC-Thin')
        .attr('text-anchor', 'middle')

        if (predResultsShowStatus==='showtreemap') {
            let resultItem = container.selectAll('.pre-result-item')
            resultItem
            .attr('transform', function(d){
                return 'translate('+(d.x0)+','+(d.y0)+')';
            })
            resultItem
            .select('rect')
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
            .attr('stroke-width',0.5)
            .attr('stroke','#FFFFFF')
            resultItem
            .selectAll('text')
            .attr('fill', 'transparent')
            .attr('display', 'none')
        }

        // .data((d)=>{
        //     let results = {};
        //     for (let i =0; i< selectedIdxList.length; i++) {
        //         let idx = selectedIdxList[i];

        //         let time = d[idx]['time_index'];
        //         if (typeof results[time] !== 'object') {
        //             results[time] = [];
        //         }
        //         let icdcode = icdCodeList[idx];
                
        //         let confidence = eventCount[icdcode];
        //         results[time].push({
        //             'pro': d[idx]['prob'],
        //             'confidence': confidence,
        //             'idx': idx
        //         })
        //     }


        //     let resultList = [];
        //     let itemCount = 0;
        //     for (let time in results) {
        //         let xpos = itemCount * eventRectSize[0] + resultPadding *itemCount;
        //         itemCount+= results[time].length;
        //         resultList.push({
        //             'time': time,
        //             'results': results[time],
        //             'xpos':xpos
        //         })
        //     }
        //     return resultList;
        // })
        // .enter()
        // .append('g')
        // .attr('class', 'result-item treemap')
        // .attr('id', (d,i) => 'result-item_'+i)
        // .attr('transform',(d,i)=>{
        //     let grouplength = eventRectSize[0]* d['results'].length + resultPadding* (d['results'].length-1)
        //     let transX = d['xpos']+grouplength/2-eventRectSize[0]/2+resultsMargin;
        //     let height = eventRectSize[1]*Math.pow(d['results'].length,pow_scale);
        //     return `translate(${transX},${-height/2})`
        // })

        // container
        // .selectAll('.result-item')
        // .filter((d)=>{
        //     if(d['results'].length>1){
        //         return true;
        //     } else {
        //         return false;
        //     }
        // })
        // .append('rect')
        // .attr('class', 'result-border')
        // .attr('x',(d)=>{
        //     let grouplength = eventRectSize[0]* d['results'].length + resultPadding* (d['results'].length-1) +2*2;
        //     let baseX = eventRectSize[0]/2-grouplength/2;
        //     return baseX;
        // })
        // .attr('y', (d)=>{
        //     let groupheight = eventRectSize[1]*Math.pow(d['results'].length,pow_scale);
        //     let baseY = groupheight/2;
        //     let pros = [];
        //     for (let i =0; i < d['results'].length; i++) {
        //         pros.push(d['results'][i]['pro']);
        //     }
        //     let maxpro = Math.max(...pros);
        //     let height = Math.pow(maxpro*10,pow_scale)*eventRectSize[1]+2*2;
        //     return baseY-height/2;
        // })
        // .attr('width', (d)=>{
        //     return eventRectSize[0]* d['results'].length + resultPadding* (d['results'].length-1) + 2 * 2;
        // })
        // .attr('height', (d)=>{
        //     let pros = [];
        //     for (let i =0; i < d['results'].length; i++) {
        //         pros.push(d['results'][i]['pro']);
        //     }
        //     let maxpro = Math.max(...pros);
        //     return Math.pow(maxpro*10,pow_scale)*eventRectSize[1]+2*2;
        // })
        // .attr('fill', 'none')
        // .attr('stroke', '#7d7d7d')
        // .attr('stroke-width', 1)
        // .attr('stroke-dasharray', '5,3')

        // container
        // .selectAll('.result-item')
        // .each(function(d, dataIdx){
        //     let grouplength = eventRectSize[0]* d['results'].length + resultPadding* (d['results'].length-1)
        //     let baseX = eventRectSize[0]/2-grouplength/2;
        //     let groupheight = eventRectSize[1]*Math.pow(d['results'].length,pow_scale);
        //     let baseY = groupheight/2;

        //     let predict_draw = d['results'];
        //     var obj={
        //         'name':'obj',
        //         'children':[]
        //     };
        //     let eventTypes = ["diagnose"]
        //     eventTypes.forEach(function(type){
        //         var typeObj={
        //           'name':type,
        //           'children':[]
        //         }
        //         obj['children'].push(typeObj);
        //     })
        //     console.log(obj)
        //     predict_draw.forEach(function(event,index){
        //         var e_type='diagnose'
        //         var eventObj={
        //             'name':'diagnose'+'-'+icdCodeList[event['idx']]+'-'+event['idx'],
        //             'size':event['pro'],
        //             'confidence': event['confidence']
        //         }
        //         obj['children'][_.indexOf(eventTypes,e_type)]['children'].push(eventObj);
        //     })
        //     console.log(obj)
        //     var tree_root = d3.hierarchy(obj)
        //     .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
        //     .sum(function sumBySize(d) {
        //       return d.size
        //     })
        //     .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
        //     treemap(tree_root);
        //     var tree_origin = tree_root.leaves()
        //     console.log(tree_origin)
        //     let resSubnode = d3.select(this)
        //     .selectAll('.pre-result-rect')
        //     .data(tree_origin)
        //     .enter()
        //     .append('g')
        //     .attr('class', 'pre-result-rect')
        //     .attr('id', (d)=>{
        //         let idx = d['data']['name'].split('-')[2];
        //         return 'resultrect_'+idx;
        //     })
        //     .attr('transform',function(d,i){
        //         let newX = baseX + i * eventRectSize[0] + i*resultPadding;
        //         let newY = baseY - Math.pow(d['data'].size*10,pow_scale)*eventRectSize[1]/2;
        //         return 'translate('+(newX)+','+(newY)+')';
        //     })
        //     .on('click', function(d){
        //         let idx = d['data']['name'].split('-')[2];
        //         highlightLineClick(idx, selectedIdxList.indexOf(Number(idx)))
        //     })
        //     .on('mouseover', function(d){
        //         let idx = d['data']['name'].split('-')[2];
        //         highlightLineHover(idx, selectedIdxList.indexOf(Number(idx)));
        //     })
        //     .on('mouseout', function(d){
        //         let idx = d['data']['name'].split('-')[2];
        //         let eventpath = d3.selectAll('#eventpath_'+idx+'_hover');
        //         eventpath.remove();
        //     })

            
        //     resSubnode
        //     .append("rect")
        //     .attr("name", function(d) { return d['data']['name']; })
        //     .attr("width", eventRectSize[0])
        //     .attr("height", function(d) { return Math.pow(d['data'].size*10,pow_scale)*eventRectSize[1]; })
        //     .attr('fill',function(d){
        //         if(d['data']['name'].split('-').length){
        //             let idx = d['data']['name'].split('-')[2];
        //             let coloridx = selectedIdxList.indexOf(Number(idx));
        //             return diseaseColors[coloridx];
        //         }
        //     })
        //     .attr('stroke-width',0.5)
        //     .attr('stroke',"#FFFFFF")
        //     .attr('opacity',(d)=>{
        //         return d['data'].confidence;
        //     })

        //     if (d['results'].length > 1) {
        //         resSubnode
        //         .append('text')
        //         .text(function(d){
        //             let icdcode = d['data']['name'].split('-')[1];
        //             let label = disease[icdcode];
        //             return label.slice(0,3).replace(/(^\s*)|(\s*$)/g,"");
        //         })
        //         .attr('class','result-text')
        //         .attr('x', eventRectSize[0]/2)
        //         .attr('y', (d)=>{
        //             let height = Math.pow(d['data'].size*10,pow_scale)*eventRectSize[1];
        //             return height/2;
        //         })
        //         .attr('font-size', 11)
        //         .attr('fill', 'transparent')
        //         .attr('text-anchor', 'middle')
        //         .attr('alignment-baseline', 'middle')
        //         .style("pointer-events","none")
        //         .style('-webkit-user-select','none')
        //         .attr('fill', '#7d7d7d')
        //     }

        //     resSubnode
        //     .each(function(d,i){
        //         d3.select(this.parentNode)
        //         .append('text')
        //         .text(()=>{
        //             let pro = d['data'].size;
        //             return Math.round(pro*100)+ '%';
        //         })
        //         .attr('class', 'pro-text')
        //         .attr('text-anchor', 'middle')
        //         .attr('alignment-baseline', 'hanging')
        //         .attr('y', ()=>{
        //             return baseY+eventRectSize[1]-2;
        //         })
        //         .attr('x', baseX + i * eventRectSize[0] + i*resultPadding+eventRectSize[0]/2)
        //         .attr('fill', '#7D7D7D')
        //         .attr('font-size', 10)
        //         .attr('font-family', 'PingFangSC-Thin')
        //         .style("pointer-events","none")
        //         .style('-webkit-user-select','none')
        //     })

        // })
        // .append('text')
        // .text((d)=>{
        //     return "+"+(Number(d['time'])+1)* 30+'D';
        // })
        // .attr('text-anchor', 'middle')
        // .attr('y',-7)
        // .attr('x', eventRectSize[0]/2)
        // .attr('fill', '#7D7D7D')
        // .attr('font-size', 10)
        // .attr('font-family', 'PingFangSC-Thin')
        // .style("pointer-events","none")
        // .style('-webkit-user-select','none')


        // container
        // .selectAll('.result-item')
        // .filter((d)=>{
        //     if(d['results'].length>1){
        //         return false;
        //     } else {
        //         return true;
        //     }
        // })
        // .append('text')
        // .text(function(d){
        //     let idx = d['results'][0]['idx'];
        //     let icdcode = icdCodeList[idx];
        //     let label = disease[icdcode];
        //     return label.slice(0,3).replace(/(^\s*)|(\s*$)/g,"");
        // })
        // .attr('class','result-text')
        // .attr('x', eventRectSize[0]/2)
        // .attr('y', (d)=>{
        //     let height = Math.pow(d['results'].length,pow_scale)*eventRectSize[1];
        //     return height/2+1;
        // })
        // .attr('font-size', 11)
        // .attr('text-anchor', 'middle')
        // .attr('alignment-baseline', 'middle')
        // .style("pointer-events","none")
        // .style('-webkit-user-select','none')
        // .attr('fill', '#7d7d7d')

        $('.comp-pre-results .comp-pre-result-rect').tipsy({
            gravity: 'w',
            html: true,
            fade: false,
            opacity: 0.7,
            title:function(){
                var cur_index = this.__data__['data'].idx;
                var cur_confidence = this.__data__['data'].confidence;
                var cur_pro = this.__data__['data'].pro;
                var time = this.__data__['data'].time;
                var tip = ''
                tip += "<div class='rect-tooltip'>"
                tip += "<div class='tooltip-item'>Prediction</div>"
                tip += "<div class='tooltip-item'>ICD-9: "+icdCodeList[cur_index]+"</div>"
                tip += "<div class='tooltip-item'>Name: "+disease[icdCodeList[cur_index]]+"</div>"
                tip += "<div class='tooltip-item'>Probability: "+ Math.round(cur_pro*1000)/10+"%</div>"
                tip += "<div class='tooltip-item'>Prevalence: "+ Math.round(cur_confidence*1000)/10+"%</div>"
                tip += "<div class='tooltip-item'>Date: "+ time.split(' ')[0] +"</div>"
                tip += "</div>"
                return tip;
            }
        });

        return compvis;
    }

    compvis.update = function() {
        compvis.updateDuartion();
        // compvis.updateConnect();
        updateHighlightLine(selectedIdxList);
        return compvis;
    }

    compvis.updateDuartion = function() {
        let maxDuration = 0;
        container.selectAll('.duration')
        .each((d)=>{
            if (maxDuration < d['duration']) maxDuration = d['duration'];
        })
        durationScale.domain([0,maxDuration]).range([0, sequenceScale(1)-sequenceScale(0)-eventRectSize[0]]);

        container.selectAll('.duration')
        .attr('transform', function(){
            let idx = d3.select(this).attr('id').split('_')[1];
            return `translate(${eventRectSize[0]+sequenceScale(idx)},0)`
        })

        container.selectAll('.duration-bar')
        .attr('x2', (d)=>durationScale(d['duration']))
        container.selectAll('.duration-text')
        .attr('x', durationScale.range()[1]/2)

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
        let seqEvents = seqCanvas.select('#comp_record_'+threadid).select('.seq-events');
        let curTimesliceNum = seqEvents['_groups'][0][0].childNodes.length;
        
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


        let canvasMaxTimeSlice = seqTimesliceNumStack[seqTimesliceNumStack.length-1];
        if (canvasMaxTimeSlice === curTimesliceNum) {
            seqTimesliceNumStack.pop();
            let maxShowNum = Math.floor(seqWidth/(eventRectSize[0]+eventPadding));
            minScale = Math.ceil(seqTimesliceNumStack[seqTimesliceNumStack.length-1]/maxShowNum);
            zoomEvent.scaleExtent([minScale, Infinity])
            sliderCanvas.select('.brush')
            .call(brush.move, saveSelection)
        }
        threadNum--;
        if (threadNum===0){
            sliderCanvas.attr('display', 'none');
        }

        let currentCanvasHeight = container.attr('height');
        let recalculateCanvasHeight = threadHeight * threadNum + margin.top;
        if (currentCanvasHeight > recalculateCanvasHeight && currentCanvasHeight > size[1]){
            container.attr('height', recalculateCanvasHeight)
            container.select('#seq-canvas-clip rect').attr('height', recalculateCanvasHeight);
            container.select('#path-canvas-clip rect').attr('height', recalculateCanvasHeight);
            seqCanvas.select('.zoom-panel')
            .attr('height', recalculateCanvasHeight)
        }

        compvis.update();
        return compvis;
    }

    compvis.selectType = function(select_type) {
        selectedIdxList = select_type;
        // console.log('selected')
        // console.log(selectedIdxList)
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
                    // console.log(indexList)
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
                        // console.log(indexList)
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
        // console.log(originSeq);
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
        // console.log(indexList)
    }

    function deleteIndexList(itemIdx) {
        indexList.splice(itemIdx,1);
        for (let i = itemIdx; i < indexList.length; i++) {
            if (indexList[i] !== -1) {
                indexList[i]--;
            }
        }
        // console.log(indexList)
    }

    function indexlistSetDelete(index) {
        indexList[index] = -1;
        for (let i = index +1; i < indexList.length; i++) {
            if (indexList[i] !== -1) {
                indexList[i]--;
            }
        }
        // console.log(indexList)
    }

    function drawMovePath(source, target, seqIndex) {
        if(source === target) return;

        let movePath = seqCanvas
        .select('#comp_record_'+seqIndex)
        .select('.move-paths')
        .append('g')
        .attr('id', 'movepath_'+target)
        .attr('class', 'movepath')
        .datum(()=>{
            return {
                source: source, 
                target: target
            }
        })

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

    function updateMovePath(){
        seqCanvas
        .selectAll('.movepath')
        .each(function(d){
            let xpos1 = 0, xpos2 = 0;
            let seqIndex = d3.select(this.parentNode.parentNode).attr('id').split('_')[2];
            let targetTransform = seqCanvas.select('#comp_record_'+seqIndex)
            .select('#eventrect_'+d.target)
            .attr('transform').split(/[\(,\)]/)
            let xTargetTrans = targetTransform[1], yTargetTrans = targetTransform[2];
            let ypos = Math.abs(Number(yTargetTrans))+3;
            xpos2 = Number(xTargetTrans) + eventRectSize[0]/2;
            let eventsStep = sequenceScale(1)-sequenceScale(0)+ eventRectSize[0]
            let xSource = sequenceScale(d.source);
            // xSource = Number(xSource) +eventRectSize[0]/2;
            xpos1 = Number(xSource) + eventsStep/2;
            let points = [];
            points.push([xpos1,ypos])
            points.push([(xpos1+xpos2)/2, ypos+25])
            points.push([xpos2, ypos])
            d3.select(this).select('circle')
            .attr('cx', xpos1)
            d3.select(this).select('path')
            .attr('d', line(points))
        })
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
            var event_time = this.parentNode.__data__.event_time;
            var tip = '';
            if(cur_list[e].event_type=='Treatments'){
                tip += "<div class='rect-tooltip'>"
                tip += "<div class='tooltip-item'>Treatment</div>"
                tip += "<div class='tooltip-item'>Name: "+treatment[cur_list[e].icd_code]+"</div>"
                tip += "<div class='tooltip-item'>Time: "+event_time+"</div>"
                tip += "</div>"

            } else {
                tip += "<div class='rect-tooltip'>"
                tip += "<div class='tooltip-item'>Diagnosis</div>"
                tip += "<div class='tooltip-item'>ICD-9: "+cur_list[e].icd_code+"</div>"
                tip += "<div class='tooltip-item'>Name: "+disease[cur_list[e].icd_code]+"</div>"
                tip += "<div class='tooltip-item'>Time: "+event_time+"</div>"
                tip += "</div>"
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
        container.selectAll('#resultrect_'+eventname)
        .each(function(){
            let trans1 = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
            let x1 = Number(trans1[1]), y1 = Number(trans1[2]);
            let trans2 = d3.select(this.parentNode.parentNode).attr('transform').split(/[\(,\)]/);
            let x2 = Number(trans2[1]), y2 = Number(trans2[2]);
            let trans3 = d3.select(this.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/);
            let x3 = Number(trans3[1]), y3 = Number(trans3[2]);
            let trans4 = d3.select(this.parentNode.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/);
            let x4 = Number(trans4[1]), y4 = Number(trans4[2]);
            let x = x1+x2+x3+x4, y = y1+y2+y3+y4;
            let width = d3.select(this).select('rect').attr('width');
            let height = d3.select(this).select('rect').attr('height');
            width = Number(width), height = Number(height);

            positionList.push({
                x: x + width/2,
                y: y
            })
            positionList.push({
                x: x + width/2,
                y: y + height
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
        container.selectAll('#resultrect_'+eventname)
        .each(function(){
            let trans1 = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
            let x1 = Number(trans1[1]), y1 = Number(trans1[2]);
            let trans2 = d3.select(this.parentNode.parentNode).attr('transform').split(/[\(,\)]/);
            let x2 = Number(trans2[1]), y2 = Number(trans2[2]);
            let trans3 = d3.select(this.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/);
            let x3 = Number(trans3[1]), y3 = Number(trans3[2]);
            let trans4 = d3.select(this.parentNode.parentNode.parentNode.parentNode).attr('transform').split(/[\(,\)]/);
            let x4 = Number(trans4[1]), y4 = Number(trans4[2]);
            let x = x1+x2+x3+x4, y = y1+y2+y3+y4;
            let width = d3.select(this).select('rect').attr('width');
            let height = d3.select(this).select('rect').attr('height');
            width = Number(width), height = Number(height);

            positionList.push({
                x: x + width/2,
                y: y
            })
            positionList.push({
                x: x + width/2,
                y: y + height
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

    var saveSelection = [];
    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
        if (!d3.event.selection|| d3.event.selection.length <2) {
            sliderCanvas.select('.brush')
            .call(brush.move, [(1-1/minScale)*seqWidth, seqWidth]);
            return;
        }
        var s = d3.event.selection;
        saveSelection = s;
        if((s[1]-s[0])>seqWidth/minScale){
            let brushCenter = s[0] + 0.5 * (s[1] - s[0])
            sliderCanvas.select('.brush')
            .call(brush.move, [brushCenter - 0.499 * seqWidth/minScale, brushCenter + 0.499 * seqWidth/minScale]);
            return
        }

        
        sliderScale.domain([-1, seqTimesliceNumStack[seqTimesliceNumStack.length-1]])
        let startIdx = sliderScale.invert(s[0]), endIdx = sliderScale.invert(s[1]);
        sequenceScale.domain([startIdx, endIdx]);

        seqCanvas.select('.zoom-panel').call(zoomEvent.transform, d3.zoomIdentity.scale(seqWidth/(s[1]-s[0])).translate(-s[0], 0))

        container.selectAll('.events-rect')
        .attr('transform', function(){
            let idx = d3.select(this).attr('id').split('_')[1];
            let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
            return `translate(${sequenceScale(idx)},${height})`
        })
        compvis.updateDuartion();
        updateMovePath();
    }

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
        let t = d3.event.transform;
        sliderScale.domain([-1, seqTimesliceNumStack[seqTimesliceNumStack.length-1]])
        sequenceScale = t.rescaleX(sliderScale);

        sliderCanvas.select('.brush')
        .call(brush.move, sequenceScale.range().map(t.invertX,t));

        container.selectAll('.events-rect')
        .attr('transform', function(){
            let idx = d3.select(this).attr('id').split('_')[1];
            let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
            return `translate(${sequenceScale(idx)},${height})`
        })
        compvis.updateDuartion();
        updateMovePath();
    }

    function dbclickResultsRect(){
        if (predResultsShowStatus==='showtreemap') {
            showRow();
            predResultsShowStatus = 'showrow';
        } else {
            showTreemap();
            predResultsShowStatus = 'showtreemap';
        }
        setTimeout(() => {
            updateHighlightLine(selectedIdxList);
        }, 750);
        
    }


    function showRow() {
        let resultItem = container.selectAll('.pre-result-item')
        resultItem
        .transition()
        .duration(750)
        .attr('transform', function(d,i){
            let baseTrans = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
            let basex = Number(baseTrans[1]), basey = Math.abs(Number(baseTrans[2]));
            let transX = -basex + predXScale(d['data'].pro)-eventRectSize[0]/2;
            let transY = basey - eventRectSize[1]/2;
            return `translate(${transX},${transY})`
        })

        resultItem
        .selectAll('rect')
        .transition()
        .duration(750)
        .attr('width', eventRectSize[0])
        .attr('height', eventRectSize[1])
        .attr('stroke', (d)=>{
            let coloridx = selectedIdxList.indexOf(d['data'].idx);
            return diseaseColors[coloridx];
        })
        .attr('stroke-width', 1.5)

        resultItem
        .selectAll('text')
        .transition()
        .duration(10)
        .attr('display', 'block')
        .transition()
        .duration(750)
        .attr('fill', '#7d7d7d')

    }

    function showTreemap() {
        let resultItem = container.selectAll('.pre-result-item')
        resultItem
        .transition()
        .duration(750)
        .attr('transform', function(d){
            return 'translate('+(d.x0)+','+(d.y0)+')';
        })
        resultItem
        .select('rect')
        .transition()
        .duration(750)
        .attr("width", function(d) { return d.x1 - d.x0; })
        .attr("height", function(d) { return d.y1 - d.y0; })
        .attr('stroke-width',0.5)
        .attr('stroke','#FFFFFF')
        resultItem
        .selectAll('text')
        .transition()
        .duration(750)
        .attr('fill', 'transparent')
        .transition()
        .duration(750)
        .attr('display', 'none')

    }
    
    var probscale = d3.scaleLinear().domain([1,0]).range([0, predictRectSize[0]-2])
    function predzoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
        let t = d3.event.transform;
        predXScale = t.rescaleX(probscale)
        predAxis = d3.axisBottom(predXScale).ticks(5).tickFormat(d=> (Math.round(d*1000)/1000).toFixed(2));
        if (t.k>32)         predAxis = d3.axisBottom(predXScale).ticks(5).tickFormat(d=> (Math.round(d*1000)/1000).toFixed(3));

        container.selectAll('.pred-axis')
        .call(predAxis)
        container.selectAll('.pred-axis')
        .select('path')
        .attr('stroke', '#BFBFBF')

        container.selectAll('.pred-axis')
        .selectAll('text')
        .attr('fill', '#696969')
        .style('font-family', 'PingFangSC-Thin')
        .attr('text-anchor', 'start')
        .attr('x', 2)
        .attr('y', 17)
        container.selectAll('.pred-axis')
        .selectAll('line')
        .attr('y2', 24)
        .attr('stroke', '#bfbfbf')

        container.selectAll('.pre-results-nodes')
        .attr('transform', (d)=>{
            let sumpro = 0;
            for (let i =0; i< selectedIdxList.length; i++) {
                let idx = selectedIdxList[i]
                sumpro += d[idx]['prob'];
            }
            let avgpro = sumpro/ selectedIdxList.length;
            let transx = predXScale(avgpro)-treemapWidth/2;
            return `translate(${transx}, ${-treemapWidth/2})`;
        })

        if (predResultsShowStatus === 'showrow') {
            container
            .selectAll('.pre-result-item')
            .attr('transform', function(d,i){
                let baseTrans = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
                let basex = Number(baseTrans[1]), basey = Math.abs(Number(baseTrans[2]));
                let transX = -basex + predXScale(d['data'].pro)-eventRectSize[0]/2;
                let transY = basey - eventRectSize[1]/2;
                return `translate(${transX},${transY})`
            })
        } 

        if (predResultsShowStatus === 'showtreemap') {
            container
            .selectAll('.pre-result-item')
            .attr('transform', function(d){
                return 'translate('+(d.x0)+','+(d.y0)+')';
            })
        }

        updateHighlightLine(selectedIdxList);
        container.selectAll('.pred-zoom-panel').call(predzoom.transform, t);

    }


    return compvis
}
