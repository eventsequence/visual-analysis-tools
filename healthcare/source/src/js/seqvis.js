// const _ = require('../lib/underscore')
import {vaxios} from '../request-common'

export const Seqvis = function() {
    var seqvis = {},
        container = null,
        data = {},
        type = {},
        type_reves = {},
        type_reves = {},
        treatment = {},
        disease = {},
        disease_list = [],
        eventCount = {},
        selectedIdxList = [],
        size = [1071, 160],
        margin = {top: 8, right: 10, bottom: 10, left: 19},
        typeColors = {
            'diagnose': '#7D7D7D',
            'Treatments': '#bfbfbf'
        },
        resultColor = [],
        dispatch = d3.dispatch('save','change','start','detail')

    seqvis.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return seqvis;
    }

    seqvis.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return seqvis;
    }

    seqvis.type = function(_) {
        if (!arguments.length) return type;
        type = _;

        Object.keys(type).forEach(function(key){
            type_reves[type[key]] = key
        })
        return seqvis;
    }

    seqvis.treatment = function(_) {
        if (!arguments.length) return treatment;
        treatment = _;
        for(var t in treatment){
          let label = treatment[t].replace(/ /g,"_")
          label = label.replace(/\./g,"_")
          label = label.replace(/\%/g,"ce")
          label = label.replace(/\(/g,"")
          label = label.replace(/\)/g,"")
          label = label.replace(/\//g,"or")
          treatments.push(label)
          treatment_label[label] = t
        }

        treatmentList(treatments)
        return seqvis;
    }

    seqvis.disease = function(_) {
      if (!arguments.length) return disease;
      disease = _;
      return seqvis;
    }
    var redrawPreFlag = true;
    seqvis.selectedDisease = function(_) {
      if (!arguments.length) return selectedIdxList;
      selectedIdxList = _;
      redrawPreFlag = true;
      return seqvis;
    }

    seqvis.eventCount = function(_) {
      if(!arguments.length) return eventCount;
      eventCount = _;
      return seqvis;
    }

    seqvis.resultColor = function(_) {
        if(!arguments.length) return resultColor;
        resultColor = _;
        return seqvis;
      }

    seqvis.disease_list = function(_) {
        if (!arguments.length) return disease_list;
        disease_list = _;
        for(var k=0; k<disease_list.length; k++){
          disease_index_list[disease_list[k]] = k
        }
        return seqvis;
    }

    seqvis.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return size;
    }

    seqvis.margin = function(_) {
        if(!arguments.length) return margin;
        margin = _;
        return seqvis;
    }

    seqvis.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters
    var predictRectSize = [235, 65]
    var timelineLength = 670, overallTimelineTopmargin = 16;
    var connectLength = 23
    var eventRectSize = [29, 16];
    var treatment_label = {}
    var treatments = []
    var disease_index_list = {};
    var resultTimelineX = timelineLength + connectLength;
    var timeaxisY = overallTimelineTopmargin + 14;
    var timelineY = timeaxisY + 55;
    var saveBtnSize = [44, 22];
    var saveBtnX = resultTimelineX + predictRectSize[0] + 10;
    var resetBtnX = saveBtnX + saveBtnSize[0] + 10;
    var timeScale = d3.scaleTime(), predTimeScale = d3.scaleLinear();

    var visits = [], visitsBak = [], opRecord = [], pre = [], contribution = [],durations = [];
    var addPosition = 0
    var addEventlist = []
    var deletePosition = 0
    var maxCircleRadius = 12;
    var treemap = d3.treemap()
    .tile(d3.treemapResquarify)
    .round(false)
    .paddingInner(0.3)
    var pow_scale = 0.1
    var durationScale = d3.scaleSqrt();


    var timelineScale = d3.scaleLinear().range(0, timelineLength), sequenceScale = d3.scaleLinear().range([0, timelineLength]);

    var brush = d3.brushX()
    .extent([[0, -4], [timelineLength, 4]])
    .on('brush end', brushed)

    var zoomEvent = d3.zoom()
    .scaleExtent([1, Infinity])
    .translateExtent([[0, -50], [timelineLength, 65]])
    .extent([[0, -50], [timelineLength, 65]])
    .on('zoom',zoomed)
    var minScale = 1
    var addStatus = false
    var addEnd = false
    // var resultPadding = 15;
    // var resultsMargin = (predictRectSize[0]-eventRectSize[0]*5-resultPadding*4)/2;
    var predXScale = d3.scaleLinear().domain([1,0]).range([0, predictRectSize[0]-3]);
    var predAxis = d3.axisBottom(predXScale).ticks(5).tickFormat(d=> (Math.round(d*1000)/1000).toFixed(2));
    var predzoom = d3.zoom();
    // var rectSizeScale = d3.scaleLinear().domain([0,1]).range([17, 30]);
    var treemapWidth = 32;
    var predResultsShowStatus = 'showrow';

    ///////////////////////////////////////////////////
    // Public Function
    seqvis.init = function() {
        $(document).mouseup(function(e){
          var _con = $('#add_button');   // 设置目标区域
          if(!_con.is(e.target) && _con.has(e.target).length === 0){ // Mark 1
            $('#add_input').hide()

            if(addStatus){
                var currentSelection = d3.brushSelection(document.getElementsByClassName("brush")[0])

                timelineScale.domain([0, visits.length-1]).range([0, timelineLength]);
                var maxShowNum = Math.floor(timelineLength/(25+eventRectSize[0])) < (visits.length-1) ? Math.floor(timelineLength/(25+eventRectSize[0])): (visits.length-1)

                minScale = Math.ceil((visits.length-1)/maxShowNum)
                zoomEvent.scaleExtent([minScale, Infinity])

                // if(addEnd){
                    var currentDomain = sequenceScale.domain()
                    sequenceScale.domain(currentDomain.map(function(d){
                        return d-1
                    }))
                // }

                container.selectAll('.events-rect')
                // .filter(function(){
                //     let groupidx = d3.select(this).attr('id').split('_')[1];
                //     groupidx = Number(groupidx);

                // })
                .attr('id', function(){
                    let groupidx = d3.select(this).attr('id').split('_')[1];
                    groupidx = Number(groupidx)
                    if (groupidx > addPosition) {
                        groupidx -=1;
                    } else {
                        groupidx = groupidx
                    }

                    return 'eventrect_' + groupidx;
                })
                .transition()
                .duration(500)
                .attr('transform', function(){
                    let groupidx = d3.select(this).attr('id').split('_')[1];
                    let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
                    return `translate(${sequenceScale(Number(groupidx))},${height})`
                })

                visits.splice(addPosition+1, 1)
                seqvis.drawDuration()
                addStatus = false
                addEnd = false
            }

          }

        });
        $("#keyword").on("keyup",myFunction)
    }

    seqvis.layout = function() {

        visits = []
        let event_num = -1
        for(var i=0; i<data.length; i++){
          if(visits.length == 0){
            event_num += 1
            visits.push({'event_time':data[i]['event_time'], 'event_list':[{'event_index':0, 'event_num': event_num, "icd_code":data[i]['icd_code'], "event_code":data[i]['event_code'], "event_type":data[i]['event_type']}] })
          }else{
            if(data[i]['event_time']==visits[visits.length-1]['event_time']){
              visits[visits.length-1]['event_list'].push({'event_num': event_num, 'event_index':visits[visits.length-1]['event_list'].length, "icd_code":data[i]['icd_code'], "event_code":data[i]['event_code'], "event_type":data[i]['event_type']})
            }else{
              event_num += 1
              visits.push({'event_time':data[i]['event_time'], 'event_list':[{'event_index':0, 'event_num': event_num, "icd_code":data[i]['icd_code'], "event_code":data[i]['event_code'], "event_type":data[i]['event_type']}] })
            }
          }
        }
        visitsBak = JSON.parse(JSON.stringify(visits));
        console.log(visits)

        container.attr('width', size[0])
        .attr('height', size[1])
        container.selectAll('*').remove();
        return seqvis
    }

    seqvis.render = function(){

        var maxShowNum = Math.floor(timelineLength/(25+eventRectSize[0])) < visits.length ? Math.floor(timelineLength/(25+eventRectSize[0])): visits.length

        minScale = Math.ceil(visits.length/maxShowNum);
        zoomEvent.scaleExtent([minScale, Infinity]);
        saveBrushSelection = [];

        let startDate = new Date(data[0]['event_time']);
        // startDate.setDate(1);
        // startDate.setHours(0);
        let endDate = new Date(data[data.length - 1]['event_time']);
        // endDate.setDate(1);
        // endDate.setMonth(endDate.getMonth()+1);
        timeScale.domain([startDate,endDate]).range([0, timelineLength - eventRectSize[0]]);
        let duration = timeScale.invert(eventRectSize[0]) - startDate;
        endDate = Date.parse(endDate) + duration;
        endDate = new Date(endDate)
        timeScale.domain([startDate,endDate]).range([0, timelineLength])

        // let predStartDate = new Date(data[data.length - 1]['event_time']);
        // predStartDate.setMonth(predStartDate.getMonth() + 1)
        // let predEndDate = new Date(data[data.length - 1]['event_time']);
        // predEndDate.setMonth(predEndDate.getMonth()+12);
        // predTimeScale.domain([predStartDate, predEndDate]).range([0, predictRectSize[0]- 10 * maxCircleRadius])
        let predStartDate = 30, predEndDate = 30*12;
        predTimeScale.domain([predStartDate, predEndDate]).range([0 + 5 * maxCircleRadius, predictRectSize[0] - 5 * maxCircleRadius])
        // duration = predTimeScale.invert(maxCircleRadius*5) - predStartDate;

        // predStartDate = predStartDate - duration;
        // // predStartDate = new Date(predStartDate);
        // predEndDate = predEndDate + duration;
        // // predEndDate = new Date(predEndDate);
        // predTimeScale.domain([predStartDate, predEndDate]).range([0, predictRectSize[0]]);
        // console.log(predStartDate)
        // console.log(predEndDate)
        // let timeAxis = d3.axisBottom(timeScale).tickSize(0).tickPadding(7).tickFormat(d3.timeFormat('%b'))

        container.selectAll('*').remove();
        var canvas = container.append('g')
        .attr('class', 'canvas')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

        let seqTimeAxis = canvas
        .append('g')
        .attr('class', 'seq-timeaxis')
        .attr('transform', `translate(0, ${timeaxisY})`)
        .call(
            d3.axisBottom(timeScale).ticks(0).tickSize(20)//.tickFormat(d3.timeFormat('%b %d'))
        )
        .attr('font-family', 'PingFangSC-Thin')

        seqTimeAxis
        .selectAll('text')
        .attr('text-anchor', 'start')
        .attr('fill', '#7D7D7D')
        .attr('font-size', 10)
        .attr('y', 10)
        .attr('x', 2)
        .style("pointer-events","none")
        .style('-webkit-user-select','none')
        seqTimeAxis
        .selectAll('path')
        .attr("stroke", '#BFBFBF')
        .attr('stroke-width', 4)
        .attr('d', `M0.5,0.5V0.5H${timelineLength+0.5}V0.5`)

        seqTimeAxis
        .selectAll('line')
        .attr('stroke', '#BFBFBF')

        seqTimeAxis
        .append('g')
        .attr('class', 'brush')
        .call(brush)
        // .call(brush.move, [0, timelineLength])

        seqTimeAxis
        .select('rect.selection')
        .attr('fill-opacity', 1)
        .attr('fill', '#7d7d7d')
        .attr('rx', 4)
        .attr('ry', 4)
        .attr('stroke-width', 0)

        let predTimeAxis = canvas
        .append('g')
        .attr('class', 'pred-timeaxis')
        .attr('transform', `translate(${timelineLength + connectLength}, ${timeaxisY})`)
        .attr('font-family', 'PingFangSC-Thin')


        // let timeTicks = predTimeAxis
        // .selectAll('.pred-date-time')
        // .data([30,90, 150, 210, 270, 330, 390])
        // .enter()
        // .append('g')
        // .attr('class', 'pred-date-time')
        // .attr('transform', (d)=>`translate(${predTimeScale(d)},0)`)
        // timeTicks
        // .append('line')
        // .attr('y1', 0)
        // .attr('y2',20)
        // .attr('stroke', '#BFBFBF')
        // timeTicks
        // .append('text')
        // .attr('text-anchor', 'start')
        // .attr('fill', '#7D7D7D')
        // .attr('font-size', 10)
        // .attr('y', 18)
        // .attr('x', 2)
        // .style("pointer-events","none")
        // .style('-webkit-user-select','none')
        // .text(function(d){
        //     return "+"+ d + 'D';
        // })
        // predTimeAxis
        // .append('line')
        // .attr('x1', 0)
        // .attr('x2', predictRectSize[0])
        // .attr("stroke", '#BFBFBF')
        // .attr('stroke-width', 4)


        canvas
        .append('defs')
        .append('clipPath')
        .attr('id', 'clip')
        .append('rect')
        .attr('x', 0)
        .attr('y', -50)
        .attr('height', 100)
        .attr('width', timelineLength)

        canvas
        .select('defs')
        .append('clipPath')
        .attr('id', 'pred-clip')
        .append('rect')
        .attr('x',0-1.5)
        .attr('y',-predictRectSize[1]/2-1.5)
        .attr('width', predictRectSize[0]+3)
        .attr('height', predictRectSize[1]+3)

        let back =canvas
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

        var sequence = canvas.append('g')
            .attr("class","sequence")
            .attr('transform', `translate(0, ${timelineY})`)
            .attr('clip-path', 'url(#clip)')

        sequence
        .append('rect')
        .attr('class', 'zoom-panel')
        .attr('x', 0)
        .attr('y', -50)
        .attr('width', timelineLength)
        .attr('height', 115)
        .attr('fill', 'transparent')
        .call(zoomEvent)
        // .on('dblclick.zoom', ()=>{
        //     container.select('.seq-timeaxis').select('.brush')
        //     .call(brush.move, [(1-1/minScale)*timelineLength, timelineLength]);
        // })
        .on('dblclick.zoom', null)

        sequence.append('rect')
        .attr('class', 'seq-timeline')
        .attr('x', 0)
        .attr('y', -1.5)
        .attr('width', timelineLength)
        .attr('height', 3)
        .attr('fill', 'transparent')
        .attr('stroke', '#BFBFBF')
        .attr('stroke-width', 1)



        container.select('.sequence')
        .append('g')
        .attr('class', 'events-durations')
        sequence.append('rect')
        .attr('class', 'add-bar')
        .attr('x', 0)
        .attr('y', -2)
        .attr('width', timelineLength)
        .attr('height', 4)
        .attr('fill', 'transparent')


        $(".add-bar").on("dblclick",function(e){
            addPosition =  Math.floor(sequenceScale.invert(e.offsetX-19))
            var currentSelection = d3.brushSelection(document.getElementsByClassName("brush")[0])
            timelineScale.domain([0, visits.length+1]).range([0, timelineLength]);
            var maxShowNum = Math.floor(timelineLength/(25+eventRectSize[0])) < (visits.length+1) ? Math.floor(timelineLength/(25+eventRectSize[0])): (visits.length+1)

            minScale = Math.ceil((visits.length+1)/maxShowNum)
            zoomEvent.scaleExtent([minScale, Infinity])

            var currentDomain = sequenceScale.domain()
            sequenceScale.domain(currentDomain.map(function(d){
                return d+1
            }))

            container.selectAll('.events-rect')
            // .filter(function(){
            //     let groupidx = d3.select(this).attr('id').split('_')[1];
            //     groupidx = Number(groupidx);
                // if (groupidx > addPosition) {
                //     return true;
                // } else {
                //     return false;
                // }
            // })
            .attr('id', function(){
                let groupidx = d3.select(this).attr('id').split('_')[1];
                groupidx = Number(groupidx)
                if (groupidx > addPosition) {
                    groupidx +=1;
                } else {
                    groupidx = groupidx
                }

                return 'eventrect_' + groupidx;
            })
            .transition()
            .duration(500)
            .attr('transform', function(){
                let groupidx = d3.select(this).attr('id').split('_')[1];
                let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
                return `translate(${sequenceScale(Number(groupidx))},${height})`
            })

            let postDate = visits[addPosition]['event_time'];

            if(addPosition==visits.length-1){
                postDate = new Date(postDate)
                postDate.setTime(postDate.getTime()+24*3600*1000)
            }else{
                let lastDate = visits[addPosition+1]['event_time'];
                let dura = new Date(lastDate) - new Date(postDate);

                postDate = new Date(postDate)
                postDate.setTime(postDate.getTime()+dura/2)
            }

            let dformat = [postDate.getFullYear(),(postDate.getMonth()+1).padLeft(),
                postDate.getDate().padLeft()].join('-') +' ' +
               [postDate.getHours().padLeft(),
                postDate.getMinutes().padLeft(),
                postDate.getSeconds().padLeft()].join(':');


            visits.splice(addPosition+1,0,{'event_time':dformat, 'event_list':[]})

            seqvis.drawDuration()
            addStatus = true
            $('#add_input').show()
        })



        var results = canvas.append('g')
        .attr('class', 'pre-results')
        .attr('transform', `translate(${resultTimelineX}, ${timelineY})`)
        .attr('clip-path', 'url(#pred-clip)')


        results
        .append('rect')
        .attr('class', 'background-rect')
        .attr('y', -predictRectSize[1]/2)
        .attr('width', predictRectSize[0])
        .attr('height', predictRectSize[1])
        // .attr('fill', 'url(#back)')
        .attr('fill', 'transparent')
        .attr('opacity', 0.3)


        canvas.append('text')
        .text('Prediction')
        .attr('x', resultTimelineX + predictRectSize[0]/2)
        .attr('y', timelineY -predictRectSize[1]/2 -5)
        .attr('font-size', 15)
        .attr('fill', 'transparent')
        .attr('text-anchor', 'middle')
        // .attr('alignment-baseline', 'middle')
        .style("pointer-events","none")
        .style('-webkit-user-select','none')
        .attr('fill', '#7d7d7d')

        results.append('rect')
        .attr('class', 'result-rect')
        .attr('x', 0)
        .attr('y', -predictRectSize[1]/2)
        .attr('width', predictRectSize[0])
        .attr('height', predictRectSize[1])
        .attr('stroke', '#BFBFBF')
        .attr('stroke-width', 3)
        .attr('fill', 'none')

        results.append('rect')
        .attr('class', 'pred-loading-background')
        .attr('x', 0)
        .attr('y', -predictRectSize[1]/2)
        .attr('width', predictRectSize[0])
        .attr('height', predictRectSize[1])
        .attr('fill', '#7d7d7d')
        .attr('opacity', 0.5)
        .attr('display', 'none')

        results
        .append('svg')
        .attr('class', 'pred-loading')
        .attr('width',140)
        .attr('height', 140)
        .attr('viewBox', '0 0 100 100')
        .attr('y', -70)
        .attr('x', 45)
        .html(()=>{
            return `<g transform="translate(20 50)"><circle cx="0" cy="0" r="6" fill="#d0d0d0"><animateTransform attributeName="transform" type="scale" begin="-0.375s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform></circle></g><g transform="translate(40 50)"><circle cx="0" cy="0" r="6" fill="#969696"><animateTransform attributeName="transform" type="scale" begin="-0.25s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform></circle></g><g transform="translate(60 50)"><circle cx="0" cy="0" r="6" fill="#656565"><animateTransform attributeName="transform" type="scale" begin="-0.125s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform></circle></g><g transform="translate(80 50)"><circle cx="0" cy="0" r="6" fill="#343434"><animateTransform attributeName="transform" type="scale" begin="0s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform></circle></g>`
        })
        .attr('display', 'none')

        var connect = canvas.append('g')
        .attr('class', 'connect')
        .attr('transform', `translate(${timelineLength}, ${timelineY})`)
        connect.append('line')
        .attr('x1', 0)
        .attr('x2', connectLength)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke-width', 2)
        .attr('stroke', '#AAAAAA')
        .attr('stroke-dasharray', '2,2')

        connect.append('image')
        .attr('class', 'plus_end')
        .attr('width', 10)
        .attr('height', 10)
        .attr('x', connectLength/2-5)
        .attr('y', -5)
        .attr('xlink:href', '../../static/img/plus_end.png')
        .on("click",function(){
            addPosition = visits.length-1
            addStatus = true
            var currentSelection = d3.brushSelection(document.getElementsByClassName("brush")[0])
            timelineScale.domain([0, visits.length+1]).range([0, timelineLength]);
            var maxShowNum = Math.floor(timelineLength/(25+eventRectSize[0])) < (visits.length+1) ? Math.floor(timelineLength/(25+eventRectSize[0])): (visits.length+1)

            minScale = Math.ceil((visits.length+1)/maxShowNum)
            zoomEvent.scaleExtent([minScale, Infinity])

            var currentDomain = sequenceScale.domain()
            sequenceScale.domain(currentDomain.map(function(d){
                return d+1
            }))

            container.selectAll('.events-rect')
            .transition()
            .duration(500)
            .attr('transform', function(){
                let groupidx = d3.select(this).attr('id').split('_')[1];
                let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
                return `translate(${sequenceScale(Number(groupidx))},${height})`
            })

            let postDate = visits[addPosition]['event_time'];

            if(addPosition==visits.length-1){
                postDate = new Date(postDate)
                postDate.setTime(postDate.getTime()+24*3600*1000)
            }else{
                let lastDate = visits[addPosition+1]['event_time'];
                let dura = new Date(lastDate) - new Date(postDate);

                postDate = new Date(postDate)
                postDate.setTime(postDate.getTime()+dura/2)
            }

            let dformat = [postDate.getFullYear(),(postDate.getMonth()+1).padLeft(),
                postDate.getDate().padLeft()].join('-') +' ' +
               [postDate.getHours().padLeft(),
                postDate.getMinutes().padLeft(),
                postDate.getSeconds().padLeft()].join(':');


            visits.push({'event_time':dformat, 'event_list':[]})

            seqvis.drawDuration()
            addEnd = true

            $('#add_input').show()
        })

        var saveBtn = canvas.append('g')
        .attr('class', 'save-btn')
        .attr('transform', `translate(${saveBtnX}, ${timelineY})`)
        .on('click', function(){
            dispatch.call("save",this,{
                'seq':visits,
                'origin': JSON.parse(JSON.stringify(visitsBak)),
                'op_record': opRecord,
                'pre':pre,
                'selected':selectedIdxList})
        })
        .style("cursor","pointer")

        saveBtn.append('rect')
        .attr('y', -saveBtnSize[1]/2)
        .attr('x', 0)
        .attr('width', saveBtnSize[0])
        .attr('height', saveBtnSize[1])
        .attr('fill', '#7D7D7D')
        .attr('rx', 5)
        .attr('ry', 5)

        saveBtn.append('text')
        .text('Save')
        .attr('x', saveBtnSize[0]/2)
        .attr('y', 1)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style('fill', '#FFFFFF')
        .attr('font-size', 15)
        .style("pointer-events","none")
        .style('-webkit-user-select','none')

        var resetBtn = canvas.append('g')
        .attr('class', 'reset-btn')
        .attr('transform', `translate(${resetBtnX}, ${timelineY})`)
        .on('click', function(){
            seqvis.redraw();
        })
        .style("cursor","pointer")

        resetBtn.append('rect')
        .attr('y', -saveBtnSize[1]/2)
        .attr('x', 0)
        .attr('width', saveBtnSize[0])
        .attr('height', saveBtnSize[1])
        .attr('fill', '#7D7D7D')
        .attr('rx', 5)
        .attr('ry', 5)

        resetBtn.append('text')
        .text('Reset')
        .attr('x', saveBtnSize[0]/2)
        .attr('y', 1)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .style('fill', '#FFFFFF')
        .attr('font-size', 15)
        .style("pointer-events","none")
        .style('-webkit-user-select','none')

        return seqvis.redraw();
    }

    seqvis.redraw = function() {

        visits = JSON.parse(JSON.stringify(visitsBak));
        opRecord = [];
        var maxShowNum = Math.floor(timelineLength/(25+eventRectSize[0])) < visits.length ? Math.floor(timelineLength/(25+eventRectSize[0])): visits.length

        minScale = Math.ceil(visits.length/maxShowNum)
        zoomEvent.scaleExtent([minScale, Infinity])

        let sequence = container.select('.sequence')
        sequence.selectAll('.events-sequence').remove();
        container.select('.pre-results').select('.pred-axis').remove();
        container.select('.pre-results').select('.probline').remove();
        container.select('.pre-results').select('.pred-zoom-panel').remove();

        let eventRects = sequence
        .append('g')
        .attr('class', 'events-sequence')
        .attr('transform', 'translate(0,0)')
        .selectAll('.events-rect')
        .data(visits)
        .enter()
        .append('g')
        .attr('class', 'events-rect')
        .attr('id', (d,i)=> `eventrect_${i}`)
        .attr('transform', (d,i)=>{
            let cur_list = d['event_list'];
            let height = eventRectSize[1]*Math.pow(cur_list.length,pow_scale);
            return `translate(0, ${-height/2})`
        })

        seqvis.drawDuration();

        if (saveBrushSelection.length ===0) {
            container.select('.seq-timeaxis')
            .select('.brush')
            .call(brush.move, [(1-1/minScale)*timelineLength, timelineLength])
        } else {
            container.select('.seq-timeaxis')
            .select('.brush')
            .call(brush.move, saveBrushSelection)
        }


        eventRects
        .append('rect')
        .attr('fill', '#FFFFFF')
        .attr('width', eventRectSize[0])
        .attr('height', (d)=>{
            let cur_list = d['event_list'];
            return eventRectSize[1]*Math.pow(cur_list.length,pow_scale);
        })

        eventRects
        .filter((d)=>{
            if (d['event_list'].length >1) {
                return true;
            } else {
                return false;
            }
        })
        .append('text')
        .text((d)=>{
            let cur_list = d['event_list'];
            var cur_obj=_.countBy(cur_list,function(e){
                return e['event_type']+'-' + e['icd_code'];
            });
            var count=[];
            for(var key in cur_obj){
              count.push([key,cur_obj[key]]);
            }
            count.sort(function(a,b){return b[1]-a[1]})
            let item = count[0][0].split('-');
            let type = item[0], icdcode = Number(item[1]);
            let label = '';
            if (type === 'Treatments') {
                label = treatment[icdcode];
            } else {
                label = disease[icdcode];
            }
            return label.slice(0,3).replace(/(^\s*)|(\s*$)/g,"");
        })
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'hanging')
        .attr('y', (d)=>{
            let cur_list = d['event_list'];
            let height = eventRectSize[1]*Math.pow(cur_list.length,pow_scale);
            return height+1;
        })
        .attr('x', eventRectSize[0]/2)
        .attr('fill', '#7D7D7D')
        .attr('font-size', 10)
        .attr('font-family', 'PingFangSC-Thin')
        .style("pointer-events","none")
        .style('-webkit-user-select','none')



        let event_rect = eventRects.selectAll('.sub_node')
        .data(function(d,i){
            let cur_list = d['event_list'];
            treemap.size([eventRectSize[0], eventRectSize[1]*Math.pow(cur_list.length,pow_scale)]);
            // treemap.size([eventRectSize[0], eventRectSize[0]])
            var cur_obj=_.countBy(cur_list,function(e){
              return e['event_type']+'-'+e['event_code']+'-'+e['event_index']+'-'+i +'-'+ e['icd_code']
            });

            var count=[];
            for(var key in cur_obj){
              count.push([key,cur_obj[key]]);
            }
            var t_data=treemapData(count);
            d.t_data = t_data;
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
        .attr('id', (d)=>"sub_node_"+d['data']['name'].split('-')[2]+"_"+d['data']['name'].split('-')[3])
        .on('click', clickSubNode)
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
        .attr('stroke', ()=>{
            return '#FFFFFF';
        })
        .attr('class','treemap')
        // .call(d3.drag().on('start', dragstartedRect).on('drag', draggingRect).on('end', dragendedRect))
        .attr('opacity',1)


        container.select('.pre-results')
        .append('rect')
        .attr('x',0)
        .attr('y', -1.5)
        .attr('width', predictRectSize[0])
        .attr('height', 3)
        .attr('fill', '#bfbfbf')
        .attr('class', 'probline')

        predzoom = d3.zoom()
        .scaleExtent([1,Infinity])
        .translateExtent([[0,-predictRectSize[1]/2], [predictRectSize[0],predictRectSize[1]/2]])
        .extent([[0,-predictRectSize[1]/2], [predictRectSize[0],predictRectSize[1]/2]])
        .on('zoom', predzoomed)

        container.select('.pre-results')
        .append('g')
        .attr('class', 'pred-axis')
        .attr('transform', 'translate(1.5,1)')
        .call(predAxis)

        container.select('.pred-axis')
        .select('path')
        .attr('stroke', '#BFBFBF')

        container.select('.pred-axis')
        .selectAll('text')
        .attr('fill', '#696969')
        .style('font-family', 'PingFangSC-Thin')
        .attr('text-anchor', 'start')
        .attr('x', 2)
        .attr('y', 17)
        container.select('.pred-axis')
        .selectAll('line')
        .attr('y2', 24)
        .attr('stroke', '#bfbfbf')

        container.select('.pre-results')
        .append('rect')
        .attr('width', predictRectSize[0])
        .attr('height', predictRectSize[1])
        .attr('y',-predictRectSize[1]/2)
        .attr('fill', 'transparent')
        .attr('class', 'pred-zoom-panel')
        .call(predzoom)
        .on('dblclick.zoom', dbclickResultsRect)


        container.select('.pre-results').select('.pred-zoom-panel').lower();
        container.select('.pre-results').select('.probline').lower();
        container.select('.pre-results').select('.pred-axis').lower();
        container.select('.pre-results').select('.background-rect').lower();

        seqvis.predict();

        let eventsTreemap = container
        .selectAll('.events-rect')
        eventsTreemap
        .append('rect')
        .attr('class', 'treemap-bar')
        .attr('x', 0)
        .attr('y', -6)
        .attr('height', 6)
        .attr('width', eventRectSize[0])
        .attr('fill', '#434343')
        .attr('display', 'none')
        // .on('mouseup', groupbarMouseUp)
        // .on('mousedown', groupbarMouseDown)
        .call(d3.drag().on('start', dragstarted).on('drag', dragging).on('end', dragended))

        eventsTreemap
        .on('mouseover', function(d){
            d3.select(this).select('.treemap-bar')
            .attr('display', 'block')
        })
        .on('mouseout', function(d){
            d3.select(this).select('.treemap-bar')
            .attr('display', 'none')
        })

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

        addtipsy();
        drawDateText();

        return seqvis;
    }

    seqvis.drawDuration = function(){
        container.selectAll('.duration').remove();
        durations = calculateDuration();
        let duraItems = container.select('.events-durations')
        .selectAll('.duration')
        .data(durations)
        .enter()
        .append('g')
        .attr('class', 'duration')
        .attr('id', (d,i)=>'duration_'+i)
        .attr('transform', (d,i)=>`translate(${eventRectSize[0]+sequenceScale(i)}, 0)`)

        duraItems
        .append('line')
        .attr('class', 'duration-bar')
        .attr('id', (d,i)=>'duration-bar_'+i)
        .attr('x1',0)
        .attr('y1',0)
        .attr('x2', (d)=>durationScale(d['duration']))
        .attr('y2', 0)
        .attr('stroke', (d)=>typeColors[d['type']])
        .attr('stroke-width', 4)

        duraItems
        .append('text')
        .attr('class', 'duration-text')
        .attr('text-anchor', 'middle')
        .text((d)=>{
            let duration = d['duration']/(1000*60*60*24);
            return Math.ceil(duration *10)/10 + 'D';
        })
        .attr('x', durationScale.range()[1]/2)
        .attr('y', -3)
        .style('font-size','9px')
        .attr('fill', '#696969')
        .style('-webkit-user-select','none')

        return seqvis;
    }

    function updateDuration () {
        let maxDuration = 0;
        container.selectAll('.duration')
        .each((d)=>{
            if (maxDuration < d['duration']) maxDuration = d['duration'];
        })


        durationScale.domain([0, maxDuration]).range([0, sequenceScale(1)-sequenceScale(0)-eventRectSize[0]]);

        container.selectAll('.duration')
        .attr('transform', (d,i)=>`translate(${eventRectSize[0]+sequenceScale(i)},0)`)

        container.selectAll('.duration-bar')
        .attr('x2', (d)=>durationScale(d['duration']))

        container.selectAll('.duration-text')
        .text((d)=>{
            let duration = d['duration']/(1000*60*60*24);
            return Math.ceil(duration *10)/10 + 'D';
        })
        .attr('x', durationScale.range()[1]/2)

    }

    let  movementX = 0;
    let durationDragScale = d3.scaleLinear().range([100,1000*60*60*24])
    function updateDurationDrag(idx) {
        let increaseIdx = idx, decreaseIdx = idx;
        if (movementX > 0) {
            increaseIdx -=1;
        } else {
            decreaseIdx -=1;
        }

        durationDragScale.domain([0, (sequenceScale(1)-sequenceScale(0))])
        let duraDelta = durationDragScale(Math.abs(movementX));
        // console.log(duraDelta)
        // let percent = Math.abs(movementX) / (sequenceScale(1)-sequenceScale(0))

        container.select('#duration_'+decreaseIdx)
        .each((d)=>{
            let dura = d['duration'];
            // if (dura - duraDelta <= 0) {
            //     d['duration'] = 0;
            // } else {
            //     d['duration'] = dura - duraDelta;
            // }
            if (dura - duraDelta <= 0) {
                duraDelta = dura;
            }
            d['duration'] = dura - duraDelta;
        })

        container.select('#duration_'+increaseIdx)
        .each((d)=>{
            let dura = d['duration'];
            d['duration']  = dura + duraDelta;
        })

        updateDuration();

    }

    seqvis.drawPre = function(){
        // console.log(selectedIdxList)
        container.select('.pred-loading-background')
        .attr('display', 'none')
        container.select('.pred-loading')
        .attr('display', 'none')
        container.select('.pre-results-nodes')
        .attr('opacity', 1)

        if (selectedIdxList.length===0) {
            let indices = [];
            for (let i = 0; i < pre.length; i++) {
                indices.push(i);
            }
            indices.sort(function(a, b){
                return pre[b]['prob'] - pre[a]['prob'];
            })
            selectedIdxList = indices.slice(0,5);
            resultColor = ['#68bde1','#aa97da','#93dc16','#fdca3d','#fd94b4'];
            dispatch.call('start', this, selectedIdxList, resultColor, pre);
            drawPrediction();
            redrawPreFlag = false;
        } else if(redrawPreFlag) {
            drawPrediction();
            redrawPreFlag = false;
        } else {
            updatePrediction();
        }
        // container
        // .selectAll('.pre-result-item')
        // .filter((d)=>{
        //     if(d['results'].length>1){
        //         return true;
        //     } else {
        //         return false;
        //     }
        // })
        // .append('rect')
        // .attr('class', 'pre-result-border')
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
        // .selectAll('.pre-result-item')
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
        //             'name':'diagnose'+'-'+disease_list[event['idx']]+'-'+event['idx'],
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

        //     let resSubnode = d3.select(this)
        //     .selectAll('.pre-result-rect')
        //     .data(tree_origin)
        //     .enter()
        //     .append('g')
        //     .attr('class', 'pre-result-rect')
        //     .attr('transform',function(d,i){
        //         let newX = baseX + i * eventRectSize[0] + i*resultPadding;
        //         let newY = baseY - Math.pow(d['data'].size*10,pow_scale)*eventRectSize[1]/2;
        //         return 'translate('+(newX)+','+(newY)+')';
        //     })
        //     .on('click', function(d){
        //         let isHighlight = d3.select(this).classed('pre-highlight');
        //         container.selectAll('.pre-result-rect').classed('pre-highlight', false)
        //         let idx = d['data']['name'].split('-')[2];
        //         dispatch.call('detail', this, disease_list[idx])
        //         if(isHighlight) {
        //             updateSeqWeights();
        //         } else {
        //             updateSeqWeights(idx);
        //             d3.select(this).classed('pre-highlight', true);
        //         }
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
        //             return resultColor[coloridx];
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
        // .selectAll('.pre-result-item')
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
        //     let icdcode = disease_list[idx];
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


        $('.pre-result-rect').tipsy({
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
                tip += "<div class='tooltip-item'>ICD-9: "+disease_list[cur_index]+"</div>"
                tip += "<div class='tooltip-item'>Name: "+disease[disease_list[cur_index]]+"</div>"
                tip += "<div class='tooltip-item'>Probability: "+ Math.round(cur_pro*1000)/10+"%</div>"
                tip += "<div class='tooltip-item'>Prevalence: "+ Math.round(cur_confidence*1000)/10+"%</div>"
                tip += "<div class='tooltip-item'>Date: "+ time.split(' ')[0] +"</div>"
                tip += "</div>"
                return tip;
            }
        });

        return seqvis;
    }

    seqvis.predict = function () {
        container.select('.pred-loading-background')
        .attr('display', 'block')
        .raise();
        container.select('.pred-loading')
        .attr('display', 'block')
        .raise();
        container.select('.pre-results-nodes')
        .attr('opacity', 0.5)
        pre=[];
        let train_seq=[]
        let train_date =[[],[],[],[],[],[],[],[],[],[],[],[]]
        for(let i=0; i<visits.length; i++){
            let time_duration = (Date.parse(new Date(visits[visits.length-1]['event_time'].replace(/\-/g, "/"))) - Date.parse(new Date(visits[i]['event_time'].replace(/\-/g, "/"))))/(1000*3600*24)
            for(var t=1; t<=12; t++){
                train_date[t-1].push(time_duration+t*30)
            }
            train_seq.push(visits[i]['event_list'].map(function(d){
                return d.event_code
            }))
        }
        let train=[[],[]]
        for(var t=1; t<=12; t++){
            train[0].push(train_seq)
            train[1].push(train_date[t-1])
        }
        // console.log(train)
        vaxios.get('/retain',{
            // headers: {
            //     'Content-type': 'application/json'
            // },
          params: {
            train: JSON.stringify(train)
          },
          // transformRequest:[function () {
          //     return JSON.stringify({
          //   'train': train
          // })
          //   }],

        })
        .then((res) => {
            pre = res.data['pre']
            for (let i=0; i < pre.length; i++) {
                let item = pre[i];
                let time = item['time_index'];
                let endDate = visits[visits.length-1]['event_time'];
                endDate= new Date(endDate);
                endDate.setMonth(endDate.getMonth()+1+time);
                let endDatef = [endDate.getFullYear(),(endDate.getMonth()+1).padLeft(),
                    endDate.getDate().padLeft()].join('-') +' ' +
                    [endDate.getHours().padLeft(),
                    endDate.getMinutes().padLeft(),
                    endDate.getSeconds().padLeft()].join(':');
                item.time = endDatef
                let duration = new Date(endDatef)- new Date(visits[visits.length-1]['event_time']);
                duration = duration/(1000*60*60*24);
                item.duration = Math.ceil(duration);

            }

            contribution = res.data['contr']

            container.select('.pre-results')
            .datum(pre)
            updateSeqWeights();
            seqvis.drawPre()
        })
        .catch((err) => {
            console.log(err)
        })

        return seqvis
    }

    ///////////////////////////////////////////////////
    // Private Functions


    function drawPrediction() {
        // predResultsShowStatus = 'showrow'
        container.select('.pre-results').selectAll('.pre-results-nodes').remove();

        container
        .select('.pre-results')
        .transition()
        .duration(400)
        .each(function(d){
            let maxidx = 0, maxpro=0;
            for (let i =0; i < selectedIdxList.length; i++){
                let idx = selectedIdxList[i];
                let pro = d[idx]['prob'];
                if (maxpro < pro) {
                    maxpro = pro
                    maxidx = idx
                }
            }
            container.select('rect.result-rect')
            .attr('stroke', resultColor[selectedIdxList.indexOf(maxidx)]);
        })

        let resultItems = container
        .select('.pre-results')
        .append('g')
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
        .selectAll('.pre-result-item')
        .data((d)=>{
            let results = [];
            for (let i =0; i< selectedIdxList.length; i++) {
                let idx = selectedIdxList[i];
                let time = d[idx]['time_index'];
                let endDate = visits[visits.length-1]['event_time'];
                endDate= new Date(endDate);
                endDate.setMonth(endDate.getMonth()+1+time);
                let endDatef = [endDate.getFullYear(),(endDate.getMonth()+1).padLeft(),
                    endDate.getDate().padLeft()].join('-') +' ' +
                    [endDate.getHours().padLeft(),
                    endDate.getMinutes().padLeft(),
                    endDate.getSeconds().padLeft()].join(':');
                let icdcode = disease_list[idx];

                let confidence = eventCount[icdcode];
                results.push({
                    'pro': d[idx]['prob'],
                    'confidence': confidence,
                    'idx': idx,
                    'time': endDatef
                })
            }
            let obj={
                'name':'obj',
                'children':[]
            };
            for (let i=0; i < results.length; i++) {
                let item = results[i];
                obj['children'].push({
                    'name': 'diagnose-'+disease_list[item.idx]+'-'+item.idx,
                    'pro': item.pro,
                    'confidence': item.confidence,
                    'time': item.time,
                    'idx': item.idx
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
        .on('click', function(d){
            let isHighlight = d3.select(this).classed('pre-highlight');
            container.selectAll('.pre-result-item').classed('pre-highlight', false)
            let idx = d['data'].idx;
            dispatch.call('detail', this, disease_list[idx])
            if(isHighlight) {
                updateSeqWeights();
            } else {
                updateSeqWeights(idx);
                d3.select(this).classed('pre-highlight', true);
            }
        })

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
        .attr('class', 'pre-result-rect')

        preRect
        .append('rect')
        .attr('width', eventRectSize[0])
        .attr('height', eventRectSize[1])
        .attr('fill', (d)=>{
            let coloridx = selectedIdxList.indexOf(d['data'].idx);
            let color = resultColor[coloridx];
            let colorscale = d3.scaleLinear().domain([0,1]).range(['#FFFFFF', color]);
            return colorscale(Math.pow(d['data'].confidence, 2));
        })
        .attr('stroke', (d)=>{
            let coloridx = selectedIdxList.indexOf(d['data'].idx);
            return resultColor[coloridx];
        })
        .attr('stroke-width', 1.5)


        preRect
        .append('text')
        .text(function(d){
            let icdcode = disease_list[d['data'].idx];
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
            let curTime = d['data'].time;
            let visitsEndtime = visits[visits.length-1].event_time;
            let duration = new Date(curTime)- new Date(visitsEndtime);
            duration = duration/(1000*60*60*24);
            return "+"+ Math.ceil(duration) +'D';
        })
        .attr('class','pred-duration-text')
        .attr('x', eventRectSize[0]/2)
        .attr('y', -3)
        .attr('fill', '#7D7D7D')
        .attr('font-size', 9)
        .attr('font-family', 'PingFangSC-Thin')
        .attr('text-anchor', 'middle')
        container.select('.pre-results').select('.result-rect').raise();


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
    }

    function updatePrediction() {
        container
        .select('.pre-results')
        .transition()
        .duration(500)
        .each(function(d){
            let maxidx = 0, maxpro=0;
            for (let i =0; i < selectedIdxList.length; i++){
                let idx = selectedIdxList[i];
                let pro = d[idx]['prob'];
                if (maxpro < pro) {
                    maxpro = pro
                    maxidx = idx
                }
            }
            container.select('rect.result-rect')
            .attr('stroke', resultColor[selectedIdxList.indexOf(maxidx)]);
        })
        container.select('.pre-results-nodes')
        .transition()
        .duration(500)
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

        let resultItems = container.select('.pre-results-nodes')
        .selectAll('.pre-result-item')
        .data(()=>{
            let dataset = d3.select('.pre-results').datum();
            let results = [];
            for (let i =0; i< selectedIdxList.length; i++) {
                let idx = selectedIdxList[i];
                let time = dataset[idx]['time_index'];
                let endDate = visits[visits.length-1]['event_time'];
                endDate= new Date(endDate);
                endDate.setMonth(endDate.getMonth()+1+time);
                let endDatef = [endDate.getFullYear(),(endDate.getMonth()+1).padLeft(),
                    endDate.getDate().padLeft()].join('-') +' ' +
                    [endDate.getHours().padLeft(),
                    endDate.getMinutes().padLeft(),
                    endDate.getSeconds().padLeft()].join(':');
                let icdcode = disease_list[idx];

                let confidence = eventCount[icdcode];
                results.push({
                    'pro': dataset[idx]['prob'],
                    'confidence': confidence,
                    'idx': idx,
                    'time': endDatef
                })
            }
            let obj={
                'name':'obj',
                'children':[]
            };
            for (let i=0; i < results.length; i++) {
                let item = results[i];
                obj['children'].push({
                    'name': 'diagnose-'+disease_list[item.idx]+'-'+item.idx,
                    'pro': item.pro,
                    'confidence': item.confidence,
                    'time': item.time,
                    'idx': item.idx
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
        if (predResultsShowStatus==='showrow') {
            resultItems
            .transition()
            .duration(500)
            .attr('transform', function(d,i){
                let baseTrans = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
                let basex = Number(baseTrans[1]), basey = Math.abs(Number(baseTrans[2]));
                let transX = -basex + predXScale(d['data'].pro)-eventRectSize[0]/2;
                let transY = basey - eventRectSize[1]/2;
                return `translate(${transX},${transY})`
            })
        }

        resultItems
        .select('.pred-duration-text')
        .text(function(d){
            let curTime = d['data'].time;
            let visitsEndtime = visits[visits.length-1].event_time;
            let duration = new Date(curTime)- new Date(visitsEndtime);
            duration = duration/(1000*60*60*24);
            return "+"+ Math.ceil(duration) +'D';
        })

        if (predResultsShowStatus === 'showtreemap') {
            resultItems
            .transition()
            .duration(500)
            .attr('transform', function(d){
                return 'translate('+(d.x0)+','+(d.y0)+')';
            })
            resultItems
            .select('rect')
            .transition()
            .duration(500)
            .attr("width", function(d) { return d.x1 - d.x0; })
            .attr("height", function(d) { return d.y1 - d.y0; })
        }

        container.select('.pre-results').select('.result-rect').raise();
    }

    function treemapData(arr){
        var obj={
          'name':'obj',
          'children':[]
        };

        let eventTypes = Object.keys(typeColors)

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
          var e_idx = event[0].split('-')[2];

          var eventObj={
            'name':event[0],
            'size':event[1],
            'idx': e_idx
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
            gravity: 'w',
            html: true,
            fade: false,
            opacity: 0.7,
            trigger: 'manual',
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

        $('.events-rect .sub_node').on('mouseenter', function(){
            $(this).tipsy('show');
        })
        $('.events-rect .sub_node').on('mouseleave', function(){
            $(this).tipsy('hide');
        })

      }

      function drawDateText() {
          container.selectAll('.events-rect').selectAll('.date-text').remove();
          let yearformater = d3.timeFormat('%Y')
          let dateformater = d3.timeFormat('%b %d');
          for (let i = 0; ; i++) {
                let eventsRect = container.select('#eventrect_'+i);
                if (eventsRect.empty()) break;
                if (i === 0 ){
                    eventsRect
                    .append('text')
                    .attr('class', 'date-text')
                    .text((d)=>{
                        let date = d['event_time'].slice(0,10);
                        return yearformater(new Date(date));
                    })
                    .attr('text-anchor', 'middle')
                    // .attr('alignment-baseline', 'hanging')
                    .attr('y', (d)=>{
                        return -20;
                    })
                    .attr('x', eventRectSize[0]/2)
                    .attr('fill', '#7D7D7D')
                    .attr('font-size', 10)
                    .attr('font-family', 'PingFangSC-Thin')
                    .style("pointer-events","none")
                    .style('-webkit-user-select','none')

                    eventsRect
                    .append('text')
                    .attr('class', 'date-text')
                    .text((d)=>{
                        let date = d['event_time'].slice(0,10);
                        return dateformater(new Date(date));
                    })
                    .attr('text-anchor', 'middle')
                    .attr('y', -10)
                    .attr('x', eventRectSize[0]/2)
                    .attr('fill', '#7D7D7D')
                    .attr('font-size', 10)
                    .attr('font-family', 'PingFangSC-Thin')
                    .style("pointer-events","none")
                    .style('-webkit-user-select','none')
                } else {
                    let preData = container.select('#eventrect_'+(i-1)).data();
                    let preDate = preData[0]['event_time'].slice(0,10);
                    let curData = container.select('#eventrect_'+i).data();
                    let curDate = curData[0]['event_time'].slice(0,10);
                    if (curDate !== preDate) {
                        container.select('#eventrect_'+i)
                        .append('text')
                        .attr('class', 'date-text')
                        .text((d)=>{
                            let date = d['event_time'].slice(0,10);
                            return yearformater(new Date(date));
                        })
                        .attr('text-anchor', 'middle')
                        .attr('y',-20)
                        .attr('x', eventRectSize[0]/2)
                        .attr('fill', '#7D7D7D')
                        .attr('font-size', 10)
                        .attr('font-family', 'PingFangSC-Thin')
                        .style("pointer-events","none")
                        .style('-webkit-user-select','none')

                        container.select('#eventrect_'+i)
                        .append('text')
                        .attr('class', 'date-text')
                        .text((d)=>{
                            let date = d['event_time'].slice(0,10);
                            return dateformater(new Date(date));
                        })
                        .attr('text-anchor', 'middle')
                        // .attr('alignment-baseline', 'hanging')
                        .attr('y', -10)
                        .attr('x', eventRectSize[0]/2)
                        .attr('fill', '#7D7D7D')
                        .attr('font-size', 10)
                        .attr('font-family', 'PingFangSC-Thin')
                        .style("pointer-events","none")
                        .style('-webkit-user-select','none')
                    }
                }
          }
      }
    var saveBrushSelection = [];
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
        saveBrushSelection = s;
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

    function zoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
        let t = d3.event.transform;
        timelineScale.domain([0, visits.length]).range([0, timelineLength]);
        sequenceScale = t.rescaleX(timelineScale);

        container.select('.seq-timeaxis').select('.brush')
        .call(brush.move, sequenceScale.range().map(t.invertX,t));

        container.selectAll('.events-rect')
        .attr('transform', function(){
            let idx = d3.select(this).attr('id').split('_')[1];
            let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
            return `translate(${sequenceScale(idx)},${height})`
        })
        updateDuration();
    }

    function calculateDuration() {
        let durations = [], maxDuration = 0, minDuration = Infinity;
        for (let i = 0; i < visits.length-1; i++) {
            let eventlist = visits[i+1]['event_list'];
            let count=_.countBy(eventlist,function(d){
                return d['event_type'];
            })
            let ftype=_.max(Object.keys(count),function (o) { return count[o]; });
            let time = visits[i]['event_time'];
            let postTime = visits[i + 1]['event_time'];
            let dura = new Date(postTime) - new Date(time);
            durations.push({
                'type': ftype,
                'duration': dura
            });
            if (maxDuration < dura) {
                maxDuration = dura;
            }
            // if (minDuration > dura) {
            //     minDuration = dura;
            // }
        }
        durationScale.domain([0, maxDuration]);
        return durations
    }

    function updateVisitsDate() {

        for (let i = 0; i < visits.length-1; i++) {
            let curDate = new Date(visits[i]['event_time']);
            let duration = container.select('#duration_'+i).datum()['duration'];
            let postDate = Date.parse(curDate) + duration;
            postDate = new Date(postDate)
            let dformat = [postDate.getFullYear(),(postDate.getMonth()+1).padLeft(),
                postDate.getDate().padLeft()].join('-') +' ' +
               [postDate.getHours().padLeft(),
                postDate.getMinutes().padLeft(),
                postDate.getSeconds().padLeft()].join(':');
            visits[i+1]['event_time'] = dformat;
        }

    }

    var startPos = 0
    var movetoPos = 0
    var isPop = false, isExchangeRight = false, isExchangeLeft=false, originY=0

    function checkZeroDuration () {
        container.selectAll('.duration')
        .filter(function(d){
            if (d['duration'] == 0) {
                return true;
            } else {
                return false;
            }
        })

    }


    var dragOffsetX = 0, dragOffsetY = 0, isPop = false, dragGroup = {}, intervalCode = 0, startIdx = 0;

    function dragstarted() {
        dragOffsetX = d3.event.x;
        dragOffsetY = d3.event.y;
        isPop = false;
        isExchangeRight = false;
        isExchangeLeft = false;


        originY = d3.select(this.parentNode).attr('transform').split(/[\(,\)]/)[2]

        let idx = d3.select(this.parentNode).attr('id').split('_')[1];
        idx  = Number(idx);
        startIdx = idx;
        intervalCode = setInterval(updateDurationDrag, 100, idx);
    }



    function dragging() {
        $('.events-rect .sub_node').on('mouseenter', function(){
            $(this).tipsy('hide');
        })
        d3.select(this).attr('display', 'block')
        d3.select(this.parentNode).raise()
        .attr('transform', ()=>{
            let idx = d3.select(this.parentNode).attr('id').split('_')[1];
            let transform =  d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
            let transY = transform[2], transX = transform[1];
            let newTransX = Number(transX) -dragOffsetX +d3.event.x;

            movementX = newTransX - sequenceScale(idx);

            addPosition = Math.floor(sequenceScale.invert(newTransX))


            if(isPop) {
                let newTransY = Number(transY)-dragOffsetY +d3.event.y;
                if(Math.abs(newTransY - originY) < 10){
                    var currentSelection = d3.brushSelection(document.getElementsByClassName("brush")[0])

                    timelineScale.domain([0, visits.length+1]).range([0, timelineLength]);
                    var maxShowNum = Math.floor(timelineLength/(25+eventRectSize[0])) < (visits.length+1) ? Math.floor(timelineLength/(25+eventRectSize[0])): (visits.length+1)

                    minScale = Math.ceil((visits.length+1)/maxShowNum)
                    zoomEvent.scaleExtent([minScale, Infinity])

                    container.selectAll('.events-rect')
                    .filter(function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        groupidx = Number(groupidx);
                        if (groupidx > addPosition) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                    .attr('id', function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        groupidx = Number(groupidx)
                        groupidx +=1;
                        return 'eventrect_' + groupidx;
                    })
                    .transition()
                    .duration(500)
                    .attr('transform', function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
                        return `translate(${sequenceScale(Number(groupidx))},${height})`
                    })

                    d3.select(this.parentNode).attr('id','eventrect_'+(addPosition+1))


                    let postDate = visits[addPosition]['event_time'];

                    if(addPosition==visits.length-1){
                        postDate = new Date(postDate)
                        postDate.setTime(postDate.getTime()+24*3600*1000)
                    }else{
                        let lastDate = visits[addPosition+1]['event_time'];
                        let dura = new Date(lastDate) - new Date(postDate);

                        postDate = new Date(postDate)
                        postDate.setTime(postDate.getTime()+dura/2)
                    }


                    let dformat = [postDate.getFullYear(),(postDate.getMonth()+1).padLeft(),
                        postDate.getDate().padLeft()].join('-') +' ' +
                       [postDate.getHours().padLeft(),
                        postDate.getMinutes().padLeft(),
                        postDate.getSeconds().padLeft()].join(':');

                    visits.splice(addPosition+1,0,{'event_time':dformat, 'event_list':addEventlist})
                    isPop = false

                    seqvis.drawDuration();

                }
                return `translate(${sequenceScale(idx)+ movementX},${Number(transY)-dragOffsetY +d3.event.y})`
            }
            else if (isExchangeRight) {
                // console.log('Exchange')
                container.selectAll('.events-rect')
                    .filter(function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        groupidx = Number(groupidx);
                        if (groupidx == Number(idx)+1) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                    .attr('id', function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        groupidx = Number(groupidx)
                        groupidx = idx;
                        return 'eventrect_' + groupidx;
                    })
                    .transition()
                    .duration(500)
                    .attr('transform', function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
                        return `translate(${sequenceScale(Number(groupidx))},${height})`
                    })
                d3.select(this.parentNode).attr('id','eventrect_'+(Number(idx)+1))
                isExchangeRight = false

                visits[Number(idx)] = visits.splice(Number(idx)+1, 1, visits[Number(idx)])[0]

                let postDate = visits[Number(idx)]['event_time'];

                if(Number(idx)+1==visits.length-1){
                    postDate = new Date(postDate)
                    postDate.setTime(postDate.getTime()+24*3600*1000)
                }else{
                    let lastDate = visits[Number(idx)+2]['event_time'];
                    let dura = new Date(lastDate) - new Date(postDate);

                    postDate = new Date(postDate)
                    postDate.setTime(postDate.getTime()+dura/2)
                }


                let dformat = [postDate.getFullYear(),(postDate.getMonth()+1).padLeft(),
                    postDate.getDate().padLeft()].join('-') +' ' +
                   [postDate.getHours().padLeft(),
                    postDate.getMinutes().padLeft(),
                    postDate.getSeconds().padLeft()].join(':');


                visits[Number(idx)+1]['event_time'] = dformat

                seqvis.drawDuration();

                return `translate(${sequenceScale(idx)+ movementX},${Number(transY)-dragOffsetY +d3.event.y})`
            }else if(isExchangeLeft){

                container.selectAll('.events-rect')
                    .filter(function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        groupidx = Number(groupidx);
                        if (groupidx == Number(idx)-1) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                    .attr('id', function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        groupidx = Number(groupidx)
                        groupidx = idx;
                        return 'eventrect_' + groupidx;
                    })
                    .transition()
                    .duration(500)
                    .attr('transform', function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
                        return `translate(${sequenceScale(Number(groupidx))},${height})`
                    })
                d3.select(this.parentNode).attr('id','eventrect_'+(Number(idx)-1))

                isExchangeLeft = false

                visits[Number(idx)] = visits.splice(Number(idx)-1, 1, visits[Number(idx)])[0]

                let lastDate = visits[(Number(idx))]['event_time'];

                if(Number(idx)-2<0){
                    lastDate = new Date(lastDate)
                    lastDate.setTime(lastDate.getTime()-24*3600*1000)
                }else{
                    let postDate = visits[Number(idx)-2]['event_time'];
                    let dura = new Date(lastDate) - new Date(postDate);

                    lastDate = new Date(lastDate)
                    lastDate.setTime(lastDate.getTime()-dura/2)
                }

                let dformat = [lastDate.getFullYear(),(lastDate.getMonth()+1).padLeft(),
                    lastDate.getDate().padLeft()].join('-') +' ' +
                   [lastDate.getHours().padLeft(),
                    lastDate.getMinutes().padLeft(),
                    lastDate.getSeconds().padLeft()].join(':');

                visits[Number(idx)-1]['event_time'] = dformat

                seqvis.drawDuration();

                return `translate(${sequenceScale(idx)+ movementX},${Number(transY)-dragOffsetY +d3.event.y})`
            } else {
                let newTransY = Number(transY)-dragOffsetY +d3.event.y;
                // isPop1 = updateDurationDrag(Number(idx), movementX)
                isPop = Math.abs(newTransY - originY) > 20;
                isExchangeRight = newTransX > sequenceScale(Number(idx)+1)
                isExchangeLeft = newTransX < sequenceScale(Number(idx)-1)

                if(isExchangeRight || isExchangeLeft){
                    clearInterval(intervalCode);
                }

                if (isPop) {
                    clearInterval(intervalCode);

                    deletePosition = Number(idx)
                    dragGroup = visits.splice(deletePosition, 1);
                    addEventlist = dragGroup[0]["event_list"]

                    timelineScale.domain([0, visits.length]).range([0, timelineLength]);
                    var maxShowNum = Math.floor(timelineLength/(25+eventRectSize[0])) < visits.length ? Math.floor(timelineLength/(25+eventRectSize[0])): visits.length

                    minScale = Math.ceil(visits.length/maxShowNum)
                    zoomEvent.scaleExtent([minScale, Infinity])

                    var currentSelection = d3.brushSelection(document.getElementsByClassName("brush")[0])

                    var tempScale = timelineLength/(visits.length)

                    var newSelection = currentSelection

                    container.selectAll('.events-rect')
                    .filter(function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        groupidx = Number(groupidx);
                        if (groupidx > deletePosition) {
                            return true;
                        } else {
                            return false;
                        }
                    })
                    .attr('id', function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        groupidx = Number(groupidx)
                        groupidx -=1;
                        return 'eventrect_' + groupidx;
                    })
                    .transition()
                    .duration(500)
                    .attr('transform', function(){
                        let groupidx = d3.select(this).attr('id').split('_')[1];
                        let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
                        return `translate(${sequenceScale(groupidx)},${height})`
                    })

                    d3.select(this.parentNode).attr('id','eventrect_')

                    seqvis.drawDuration();

                    $('.events-rect .sub_node').on('mouseenter', function(){
                        $(this).tipsy('show');
                    })
                }

                return `translate(${sequenceScale(idx)+ movementX},${Number(transY)-dragOffsetY +d3.event.y})`
            }

        })
    }

    function dragended() {
        // d3.select(this).attr('display', 'none');

        clearInterval(intervalCode)
        updateVisitsDate();
        seqvis.drawDuration();
        drawDateText();
        seqvis.predict()
        d3.select(this).attr('display', 'none');

        if (isPop) {
            d3.select(this.parentNode).remove();
            opRecord.push({
                op: "delete",
                'idx': startIdx
            })
        }else{
            let idx = d3.select(this.parentNode).attr('id').split('_')[1];
            d3.select(this.parentNode).transition().duration(500).attr("transform","translate("+sequenceScale(idx)+","+originY+")")

            opRecord.push({
                op: 'move',
                'start_idx': startIdx,
                'end_idx': Number(idx),
                'updated_time': visits[idx]['event_time']
            })
        }

        $('.events-rect .sub_node').on('mouseenter', function(){
            $(this).tipsy('show');
        })
    }

    // var originIdx = 0
    // var originRectY = 0
    // var originRectX = 0
    // var isPopagin = false

    // var originX = 0
    // function dragstartedRect() {
    //     dragOffsetX = d3.event.x;
    //     dragOffsetY = d3.event.y;
    //     isPop = false;
    //     isPopagin = false;


    //     originRectX = Number(d3.select(this.parentNode).attr('transform').split(/[\(,\)]/)[1])
    //     originRectY = Number(d3.select(this.parentNode).attr('transform').split(/[\(,\)]/)[2])
    //     originY = Number(d3.select(this.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[2])
    //     originX = Number(d3.select(this.parentNode.parentNode).attr('transform').split(/[\(,\)]/)[1])


    //     let idx = Number(d3.select(this.parentNode).attr('id').split('_')[2])

    //     d3.select(this).attr("width",eventRectSize[0]).attr("height",eventRectSize[1])

    //     let originIdx = Number(d3.select(this.parentNode.parentNode).attr('id').split('_')[1])
    //     addEventlist = visits[originIdx]['event_list'].splice(idx,1)

    //     for(var k=idx; k<visits[originIdx]['event_list'].length; k++){
    //         visits[originIdx]['event_list'][k]['event_index']=k
    //     }

    //     d3.select(this.parentNode.parentNode)
    //     .datum(visits[originIdx])
    //     .selectAll('.sub_node')
    //     .filter(function(){
    //         let rectidx = d3.select(this).attr('id').split('_')[2];
    //         rectidx = Number(rectidx);
    //         if(rectidx!=idx){
    //             return true
    //         }else{
    //             return false
    //         }
    //     })
    //     .data(function(d){
    //         let cur_list = d['event_list'];
    //         treemap.size([eventRectSize[0], eventRectSize[1]*Math.pow(cur_list.length,pow_scale)]);
    //         // treemap.size([eventRectSize[0], eventRectSize[0]])
    //         var cur_obj=_.countBy(cur_list,function(e){
    //           return e['event_type']+'-'+e['event_code']+'-'+e['event_index']+'-'+originIdx
    //         });

    //         var count=[];
    //         for(var key in cur_obj){
    //           count.push([key,cur_obj[key]]);
    //         }
    //         var t_data=treemapData(count);
    //         d.t_data = t_data;
    //         var tree_root = d3.hierarchy(t_data)
    //             .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
    //             .sum(function sumBySize(d) {
    //               return d.size
    //             })
    //             .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
    //         treemap(tree_root);
    //         return tree_root.leaves();

    //     })
    //     .transition().duration(500)
    //     .attr('transform',function(d){
    //         return 'translate('+(d.x0)+','+(d.y0)+')';
    //     })
    //     .select("rect")
    //     .attr("width", function(d) { return d.x1 - d.x0; })
    //     .attr("height", function(d) { return d.y1 - d.y0; })


    // }

    // function draggingRect() {
    //     $('.events-rect .sub_node').on('mouseenter', function(){
    //         $(this).tipsy('hide');
    //     })

    //     d3.select(this).attr('display', 'block')
    //     d3.select(this.parentNode).raise()
    //     .attr('transform', ()=>{
    //         let idx = originIdx
    //         let transform =  d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
    //         let transY = transform[2], transX = transform[1];
    //         let newTransX = Number(transX) -dragOffsetX +d3.event.x;

    //         addPosition = Math.floor(sequenceScale.invert(newTransX+originX))

    //         if(isPop||isPopagin) {
    //             let newTransY = Number(transY)-dragOffsetY +d3.event.y;

    //             if(Math.abs(newTransY + originY) < 10){
    //                 var currentSelection = d3.brushSelection(document.getElementsByClassName("brush")[0])
    //                 timelineScale.domain([0, visits.length+1]).range([0, timelineLength]);
    //                 var maxShowNum = Math.floor(timelineLength/(25+eventRectSize[0])) < (visits.length+1) ? Math.floor(timelineLength/(25+eventRectSize[0])): (visits.length+1)

    //                 minScale = Math.ceil((visits.length+1)/maxShowNum)
    //                 zoomEvent.scaleExtent([minScale, Infinity])

    //                 container.selectAll('.events-rect')
    //                 .filter(function(){
    //                     let groupidx = d3.select(this).attr('id').split('_')[1];
    //                     groupidx = Number(groupidx);
    //                     if (groupidx > addPosition) {
    //                         return true;
    //                     } else {
    //                         return false;
    //                     }
    //                 })
    //                 .attr('id', function(){
    //                     let groupidx = d3.select(this).attr('id').split('_')[1];
    //                     groupidx = Number(groupidx)
    //                     groupidx +=1;
    //                     return 'eventrect_' + groupidx;
    //                 })
    //                 .transition()
    //                 .duration(500)
    //                 .attr('transform', function(){
    //                     let groupidx = d3.select(this).attr('id').split('_')[1];
    //                     let height =  d3.select(this).attr('transform').split(/[\(,\)]/)[2];
    //                     return `translate(${sequenceScale(Number(groupidx))},${height})`
    //                 })

    //                 d3.select(this.parentNode).attr('id','eventrect_'+(addPosition+1))


    //                 let postDate = visits[addPosition]['event_time'];

    //                 if(addPosition==visits.length-1){
    //                     postDate = new Date(postDate)
    //                     postDate.setTime(postDate.getTime()+24*3600*1000)
    //                 }else{
    //                     let lastDate = visits[addPosition+1]['event_time'];
    //                     let dura = new Date(lastDate) - new Date(postDate);

    //                     postDate = new Date(postDate)
    //                     postDate.setTime(postDate.getTime()+dura/2)
    //                 }

            // if (isPop) {
            //     return `translate(${newTransX},${Number(transY)-dragOffsetY +d3.event.y})`
            // } else {
            //     let newTransY = Number(transY)-dragOffsetY +d3.event.y;
            //     isPop = Math.abs(newTransY - transY) > 20 || Math.abs(newTransX - transX) > 20;
            //     if (isPop) {
            //         let plusmark = parseInt(d3.select(this).attr("name").split('-')[1])
            //         let pluscode = type_reves[plusmark]
            //         let plustype = d3.select(this).attr("name").split('-')[0]
            //         addEventlist = [{'event_index':0, 'event_num': addPosition, "icd_code":pluscode.toString(), "event_code":plusmark, "event_type":plustype}]



    //                 let dformat = [postDate.getFullYear(),(postDate.getMonth()+1).padLeft(),
    //                     postDate.getDate().padLeft()].join('-') +' ' +
    //                    [postDate.getHours().padLeft(),
    //                     postDate.getMinutes().padLeft(),
    //                     postDate.getSeconds().padLeft()].join(':');

    //                 visits.splice(addPosition+1,0,{'event_time':dformat, 'event_list':addEventlist})
    //                 isPop = false

    //                 seqvis.drawDuration();

    //             }
    //             return `translate(${newTransX},${Number(transY)-dragOffsetY +d3.event.y})`
    //         }else {
    //             let newTransY = Number(transY)-dragOffsetY +d3.event.y;
    //             // isPop1 = updateDurationDrag(Number(idx), movementX)
    //             isPop = Math.abs(newTransY - originRectY) > 20 || Math.abs(newTransX - originRectX) > 20 ;

    //             if (isPop) {

    //                 $('.events-rect .sub_node').on('mouseenter', function(){
    //                     $(this).tipsy('show');
    //                 })
    //             }

    //             return `translate(${originRectX},${originRectY})`
    //         }

    //     })

    //     seqvis.predict()

    // }

    // function dragendedRect() {
    //     d3.select(this).attr('display', 'none');

    //     if (isPop) {
    //         d3.select(this.parentNode).remove();

    //         let transform =  d3.select(this.parentNode).attr('transform').split(/[\(,\)]/);
    //         let transY = transform[2], transX = transform[1];
    //         let newTransX = Number(transX) -dragOffsetX +d3.event.x;

    //         var idx = d3.select(this.parentNode).attr('id').split('_')[3]

    //         let transformTreemap =  d3.select("#eventrect_"+idx).attr('transform').split(/[\(,\)]/);



    //         addPosition = Math.floor(sequenceScale.invert(Number(transformTreemap[1])+newTransX))
    //         let newTransY = Number(transY)-dragOffsetY +d3.event.y;
    //         if(Math.abs(newTransY - transY) <= 20){
    //             addEvent()
    //         }else{
    //             seqvis.predict()
    //         }

    //         drawDateText();
    //         return;
    //     }

    //     $('.events-rect .sub_node').on('mouseenter', function(){
    //         $(this).tipsy('show');
    //     })
    // }

    function addEvent() {
        $('#add_input').hide()

        visits[addPosition+1]['event_list'] = addEventlist

        opRecord.push({
            'op': 'add',
            'idx': addPosition + 1,
            'add_item': JSON.parse(JSON.stringify((visits[addPosition+1])))
        })

        let event_treemap = d3.select(".events-sequence").append("g")
        .datum(visits[addPosition+1])
        .attr('class', 'events-rect')
        .attr('id', `eventrect_${addPosition+1}`)
        .attr('transform', (d)=>{
            let cur_list = d['event_list'];
            let height = eventRectSize[1]*Math.pow(cur_list.length,pow_scale);
            return `translate(${sequenceScale(addPosition+1)}, ${-height/2})`
        })

        let event_rect = event_treemap
        .selectAll('.sub_node')
        .data(function(d){
            let cur_list = d['event_list'];
            treemap.size([eventRectSize[0], eventRectSize[1]*Math.pow(cur_list.length,pow_scale)]);
            var cur_obj=_.countBy(cur_list,function(e){
              return e['event_type']+'-'+e['event_code']+'-'+e['event_index']+'-'+(addPosition+1) +'-'+e['icd_code']
            });
            var count=[];
            for(var key in cur_obj){
              count.push([key,cur_obj[key]]);
            }
            var t_data=treemapData(count);
            d.t_data = t_data;
            var tree_root = d3.hierarchy(t_data)
                .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
                .sum(function sumBySize(d) {
                  return d.size
                })
              treemap(tree_root);
              return tree_root.leaves();
        })
        .enter()
        .append('g')
        .attr('transform',function(d){
          return 'translate('+(d.x0)+','+(d.y0)+')';
        })
        .attr("class","sub_node")
        .attr('id', (d)=>"sub_node_"+d['data']['name'].split('-')[2]+"_"+d['data']['name'].split('-')[3])
        .on('click', clickSubNode)
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
        .attr('stroke', ()=>{
            return '#FFFFFF';
        })
        .attr('class','treemap')
        // .call(d3.drag().on('start', dragstartedRect).on('drag', draggingRect).on('end', dragendedRect))


        event_treemap
            .append('rect')
            .attr('class', 'treemap-bar')
            .attr('x', 0)
            .attr('y', -6)
            .attr('height', 6)
            .attr('width', eventRectSize[0])
            .attr('fill', '#434343')
            .attr('display', 'none')
            .call(d3.drag().on('start', dragstarted).on('drag', dragging).on('end', dragended))

            event_treemap
            .on('mouseover', function(d){
                d3.select(this).select('.treemap-bar')
                .attr('display', 'block')
            })
            .on('mouseout', function(d){
                d3.select(this).select('.treemap-bar')
                .attr('display', 'none')
            })

        if (visits[addPosition+1]['event_list'].length <= 1) {
            event_treemap
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
        }

        addStatus = false
        addEnd = false
        seqvis.drawDuration()

        // container.select('.seq-timeaxis').select('.brush')
        //     .call(brush.move, newSelection);

        addtipsy()
        seqvis.predict()
    }

    function myFunction() {
      var input, filter, ul, li, a, i;
      input = document.getElementById("keyword");
      filter = input.value.toUpperCase();
      ul = document.getElementById("myUL");
      li = ul.getElementsByTagName("li");
      for (i = 0; i < li.length; i++) {
          a = li[i].getElementsByTagName("div")[0].innerHTML
          if (a.toUpperCase().indexOf(filter) > -1) {
              li[i].style.display = "";
          } else {
              li[i].style.display = "none";

          }
      }
    }

    function treatmentList(event_data) {
    //console.log(event_data)

      $('#myUL').empty()
      let event_new_data = _.uniq(event_data,function(item,key,a){
              return item
            })

      event_new_data.sort(function(a, b){
        if(a>b){return 1}
        else if(a<b){return -1}
        else{return 0}
      })

      event_new_data.forEach(function(d){
        var text = d
        $('#myUL').append(function(d){

          return "<li style='height:25px'><div style='margin: 2px; padding: 0px 2px 0px 2px; border:1px solid #7D7D7D; border-radius:3px' id=" + text + "_div>" + text.replace(/_/g, ' ') + '</div></li>'

          // return "<li style='height:24px'><div style='margin: 3px; border:2px solid #7D7D7D; border-radius:3px' id=" + text + "_div><span id=" + text + "_li style= 'display:block'  >" + text + '</span></div></li>'

        })

        $('#' + text + '_div').mouseover(function(d) {
                $("#" + text + '_div').css({"border":"1px solid #FDCA3D"})
        })
            $('#' + text + '_div').mouseout(function(d) {
                $("#" + text + '_div').css({"border":"1px solid #7D7D7D"})
        })

        $('#' + text + '_div').click(function(d) {
                $("#keyword").val(text)
                var input,filter;
                input = document.getElementById("keyword")
                filter = input.value
                let pluscode = treatment_label[filter]
                let plusmark = parseInt(type[pluscode])
                let plustype = 'Treatments'
                addEventlist = [{'event_index':0, 'event_num': addPosition, "icd_code":pluscode.toString(), "event_code":plusmark, "event_type":plustype}]
                addEvent()
        })
      })
    }


    var treeOpacityScale=d3.scaleLinear().range([0.3,1]);
    function updateSeqWeights(diseaseIdx) {
        if (arguments.length) {
            let maxContr = 0;
            container.selectAll('.events-rect')
            .each(function(d){
                let eventsRectIdx = d3.select(this).attr('id').split('_')[1];
                eventsRectIdx = Number(eventsRectIdx);
                let events = d.t_data['children'][0]['children'];
                for (let i = 0; i < events.length; i++) {
                    let subNodeIdx = events[i]['name'].split('-')[2];
                    subNodeIdx = Number(subNodeIdx);
                    events[i]['weight'] = contribution[diseaseIdx][eventsRectIdx][subNodeIdx];
                    let weight = Math.abs(events[i]['weight'])
                    if (maxContr < weight) {
                        maxContr = weight;
                    }
                }

            })
            treeOpacityScale.domain([0, maxContr]);

            container.selectAll('.sub_node')
            .each(function(){
                let eventsRectIdx = d3.select(this.parentNode).attr('id').split('_')[1];
                eventsRectIdx = Number(eventsRectIdx);
                let subNodeIdx = d3.select(this).attr('id').split('_')[2];
                subNodeIdx = Number(subNodeIdx);
                let weight = contribution[diseaseIdx][eventsRectIdx][subNodeIdx];
                d3.select(this).select('rect')
                .transition().duration(750)
                .attr('fill', ()=>{
                    if (weight > 0) {
                        return '#fc9272';
                    } else {
                        return '#466985';
                    }
                })
                .attr('opacity', ()=>{
                    return treeOpacityScale(Math.abs(weight));
                })
            })

            // container.selectAll('.events-rect')
            // .each(function(d){
            //     var tree_root = d3.hierarchy(d.t_data)
            //     .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
            //     .sum(function(d) {
            //         return Math.abs(d.weight);
            //     })
            //     .sort(function(a, b) { return a.data.idx - b.data.idx});
            //     treemap(tree_root);
            //     d3.select(this).selectAll('.sub_node')
            //     .data(tree_root.leaves())
            //     .transition().duration(750)
            //     .attr('transform',function(d){
            //         return 'translate('+(d.x0)+','+(d.y0)+')';
            //     })
            //     .select("rect")
            //     .attr("width", function(d) { return d.x1 - d.x0; })
            //     .attr("height", function(d) { return d.y1 - d.y0; })
            //     .attr('fill', (d)=>{
            //         if (d['data']['weight'] > 0) {
            //             return '#fc9272';
            //         } else {
            //             return '#466985';
            //         }
            //     })
            //     .attr('opacity', (d)=> {
            //         return treeOpacityScale(Math.abs(d['data']['weight']));
            //     })
            // })


        } else {

            container.selectAll('.sub_node')
            .each(function(){
                let eventsRectIdx = d3.select(this.parentNode).attr('id').split('_')[1];
                eventsRectIdx = Number(eventsRectIdx);
                let subNodeIdx = d3.select(this).attr('id').split('_')[2];
                subNodeIdx = Number(subNodeIdx);
                d3.select(this).select('rect')
                .transition().duration(750)
                .attr('fill', (d)=>{
                    let type = d['data']['name'].split('-')[0];
                    return typeColors[type];
                })
                .attr('opacity', 1)
            })

        }
    }

    function clickSubNode(d) {
        let item = d['data'].name.split('-');
        let icdcode = item[4];
        let type = item[0];
        if (type === 'diagnose') {
            dispatch.call('detail', this, icdcode)
        } else {
            dispatch.call('detail', this, -1);
        }

    }

    // function dbclickResultItem(d,i) {
    //     if (d3.select(this).classed('treemap')) {
    //         showRow(i)
    //         d3.select(this).classed('treemap', false)
    //     } else {
    //         showTreemap(i);
    //         d3.select(this).classed('treemap', true);
    //     }
    // }

    function dbclickResultsRect() {
        if (predResultsShowStatus==='showtreemap') {
            showRow();
            predResultsShowStatus = 'showrow';
        } else {
            showTreemap();
            predResultsShowStatus = 'showtreemap';
        }
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
        .select('rect')
        .transition()
        .duration(750)
        .attr('width', eventRectSize[0])
        .attr('height', eventRectSize[1])
        .attr('stroke', (d)=>{
            let coloridx = selectedIdxList.indexOf(d['data'].idx);
            return resultColor[coloridx];
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

    var probscale = d3.scaleLinear().domain([1,0]).range([0,predictRectSize[0]-3])
    function predzoomed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return;
        let t = d3.event.transform;
        console.log(t)
        console.log(t.k)
        predXScale = t.rescaleX(probscale)
        predAxis = d3.axisBottom(predXScale).ticks(5).tickFormat(d=> (Math.round(d*1000)/1000).toFixed(2));
        if (t.k > 32) {
            predAxis = d3.axisBottom(predXScale).ticks(5).tickFormat(d=> (Math.round(d*1000)/1000).toFixed(3));
        }
        container.select('.pred-axis')
        .call(predAxis)
        container.select('.pred-axis')
        .select('path')
        .attr('stroke', '#BFBFBF')

        container.select('.pred-axis')
        .selectAll('text')
        .attr('fill', '#696969')
        .style('font-family', 'PingFangSC-Thin')
        .attr('text-anchor', 'start')
        .attr('x', 2)
        .attr('y', 17)
        container.select('.pred-axis')
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

    }



  return seqvis
}

Number.prototype.padLeft = function(base,chr){
    var  len = (String(base || 10).length - String(this).length)+1;
    return len > 0? new Array(len).join(chr || '0')+this : this;
}
