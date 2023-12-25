// const _ = require('../lib/underscore')
import {vaxios} from '../request-common'

export const Seqvis = function() {
    var seqvis = {},
        container = null,
        data = {},
        type = {},
        treatment = {},
        disease = {},
        disease_list = [],
        size = [1071, 130],
        margin = {top: 34, right: 10, bottom: 10, left: 4},
        typeColors = {
            'diagnose': '#23C5BC',
            'Treatments': '#FDCA3D',
            'C': '#66B66F',
            'D': '#75C1D5',
            'E': '#93DC16',
            'F': '#AA97DA'
        },
        typeColors2 = ['#23C5BC','#FDCA3D','#66B66F','#75C1D5','#93DC16','#AA97DA'],
        result_color = ['#75C1D5','#AA97DA','#93DC16','#F19EC2','#66B66F'],
        result_color_bak = ['#75C1D5','#AA97DA','#93DC16','#F19EC2','#66B66F'],
        dispatch = d3.dispatch('save','change','start')
        let treatment_label = {}
        let treatments = []
        let disease_index_list = {}
        let selected_disease = []
        let selected_disease_label = []


    seqvis.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return seqvis;
    }

    seqvis.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        // console.log("data")
        // console.log(data)
        return seqvis;
    }

    seqvis.type = function(_) {
        if (!arguments.length) return type;
        type = _;
        return seqvis;
    }

    seqvis.treatment = function(_) {
        if (!arguments.length) return treatment;
        treatment = _;
        for(var t in treatment){
          let label = treatment[t].replace(/ /g,"_")
          label = label.replace(/\./g,"_")
          treatments.push(label)
          treatment_label[label] = t
        }
        
        treatment_list(treatments)
        return seqvis;
    }

    seqvis.disease = function(_) {
        if (!arguments.length) return disease;
        disease = _;
        for(var d in disease){
          let icd_c = parseInt(d)
          let icd_l = disease[d]
          if(icd_c>=390&&icd_c<=459){
            $('#diag_type_1').append($('<option>', {
                value: icd_c,
                text: icd_l
            }));
          }
          else if(icd_c>=460&&icd_c<=519){
            $('#diag_type_2').append($('<option>', {
                value: icd_c,
                text: icd_l
            }));
          }else if(icd_c>=520&&icd_c<=579){
            $('#diag_type_3').append($('<option>', {
                value: icd_c,
                text: icd_l
            }));
          }else if(icd_c>=580&&icd_c<=629){
            $('#diag_type_4').append($('<option>', {
                value: icd_c,
                text: icd_l
            }));
          }
        }
        svg_select = d3.select("#pre_select")
          .append("svg")
          .attr("width",2000)
          .attr("height",50)
          .append("g")
          .attr("transform","translate(0,10)")

        for(var k=1;k<5;k++){
          $("#diag_type_"+k).on("change",function(){


            var select_text = $(this).attr("id")
            if(selected_disease.length<5&&this.options[this.options.selectedIndex].value!=select_text){
              let disease_index = this.options[this.options.selectedIndex].value
              let disease_text = this.options[this.options.selectedIndex].text
              disease_text = disease_text.split(';')[0]
              disease_text = disease_text.slice(0,28)
              console.log(disease_index)
              selected_disease_label.push({'index':disease_index, 'disease_text':disease_text})
              selected_disease.push(disease_index_list[disease_index.toString()])
              show_selected_disease()

              
              dispatch.call("change",this,{'selected':selected_disease, 'type_color':result_color})
              this.options.selectedIndex = 0
              seqvis.drawPre()
              
            }
          })
        }
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
    let predictRectSize = [388, 46]
    let timelineLength = 518
    let connectLength = 23
    let resultlineLength =410
    let eventRectSize = [29, 16]
    let scaleSqrt = d3.scaleSqrt()
        .domain([0, 1])
        .range([0, predictRectSize[1]/2])
    let colorScaleLinear = d3.scaleLinear().domain([0.4, 0.5]).range(['#fff7bc','#d95f0e'])
    let time_scale = d3.scaleTime().range([0,timelineLength])
    let result_time_scale = d3.scaleTime().range([0,resultlineLength])
    let xt = d3.scaleTime().range([0,timelineLength])
    let zoom_event = d3.zoom()
      .scaleExtent([1, Infinity])
      .translateExtent([[0, 0], [timelineLength, predictRectSize[1]]])
      .extent([[0, 0], [timelineLength, predictRectSize[1]]])
      .on('zoom',zoomEvent)
      


    let brush_inner = d3.brushX().extent([[0, 0], [timelineLength, predictRectSize[1]]]).on("end", brushInner);
    let move_flag = false

    let brush_event = d3.brushX().extent([[0, 0], [timelineLength, 8]]).on("brush end", brushEvent);
    let visits = [], new_visits = []
    let sequence
    let svg_select
    let xAxis = null
    let result_xAxis = null
    let pre=null, contribution=null
    let pre_result = []
    let drag = d3.drag()
    let draw_visit = []
    let drag_flag = false
    let plus_pos = null
    let addtype = null
    let addmark = null
    let addcode = null
    let addnum = null
    let addindex = null
    let d_index = 0

    let end_day = null

    let start_pos = 0
    let end_pos = 0

    var treemap = d3.treemap()
      .tile(d3.treemapResquarify)
      .round(false)
      .paddingInner(0.3)

    var pow_scale = 0.1

    ///////////////////////////////////////////////////
    // Public Function
    seqvis.init = function() {
        container
            .attr('width', size[0])
            .attr('height', size[1])
        container.selectAll().remove();
        typeColors2 = ['#23C5BC','#FDCA3D','#66B66F','#75C1D5','#93DC16','#AA97DA']

        // console.log(data[data.length-1]['event_time'].substring(0,10))
        
         

        // _.each(visits, function(d) {
        //   if (d) {
        //     let event_list = _.uniq(d['event_list'],function(item,key,a){
        //       return item
        //     })
            // let event_new_list = _.uniq(d['new_list'],function(item,key,a){
            //   return item
            // })
        //     // console.log('elem is')
        //     // console.log(elem)
        //     new_visits.push({'event_time':d['event_time'], 'event_list':event_list, 'new_list': event_new_list})
        //   }
        // })
        // let firstCircleR = scaleSqrt(pre[0].probability)
        
        

        

        
        $(document).mouseup(function(e){
          var _con = $('#add_button');   // 设置目标区域
          if(!_con.is(e.target) && _con.has(e.target).length === 0){ // Mark 1
            $('#add_input').hide()
            d3.selectAll(".plus_event").remove()
          }
        });
        $("#keyword").on("keyup",myFunction)
        $("#submit_add").on("click",addFunction)


        var canvas = container.append('g')
          .attr('class', 'canvas')
          .attr('transform', `translate(${margin.left}, ${margin.top})`)
        sequence = canvas.append('g')
          .attr("class","sequence")
          .attr('transform', `translate(15, 15)`)
  
      // .attr('stroke-linecap', 'round')

      $(".sequence").bind("contextmenu",function(e){
        return false;
      })

      sequence.append("line")
        .attr("class","connect")
        .attr('x1', timelineLength)
        .attr('y1', predictRectSize[1]/2)
        .attr('x2', timelineLength+connectLength)
        .attr('y2', predictRectSize[1]/2)
        
      let save_button = sequence.append("g")
        .attr("class","save")
        .attr("transform","translate("+(timelineLength+connectLength+resultlineLength + 24)+",0)")
        

      save_button
        .append("rect")
        .attr("x",0)
        .attr('y',predictRectSize[1]/2 - 20/2)
        .attr("width",50)
        .attr('height',20)
        .attr('fill',"#7D7D7D")
        .attr("stroke","#7D7D7D")
        .attr("rx",5)
        .attr("ty",5)
        .on("click",function(){
          console.log({'seq':visits, 'pre':pre_result})
          dispatch.call("save",this,{'seq':visits, 'pre':pre_result, 'selected':selected_disease})
        })
        

      save_button
        .append("text")
        .style("fill","white")
        .style("font-size",15)
        .attr("x",7)
        .attr('y',predictRectSize[1]/2 + 5)
        .text("Save")
        .style("pointer-events","none")
      

      // d3.select('.result-circles').selectAll('g')
      //     .append('text')

      return seqvis
    }

    seqvis.layout = function(){

      let timerange = [data[0]['event_time'].slice(0,10), data[data.length-1]['event_time'].slice(0,10)]

      end_day = new Date(data[data.length-1]['event_time'])
      end_day.setTime(end_day.getTime()+24*3600*1000*7)
      time_scale.domain(timerange.map(function (d,i) {
        let day = new Date(d)
        if(i==0){
          day.setTime(day.getTime())
        }else{
          day.setTime(day.getTime())
        }

        return day
      }))
      let result_start = time_scale.domain()[1]
      let result_day = new Date(result_start)
      result_day.setTime(result_day.getTime()+24*3600*1000*395)
      let result_end = result_day
      result_time_scale.domain([result_start,result_end])
      let start = 1.25*time_scale.domain()[0] - 0.25*time_scale.domain()[1]
      let end = 1.25*time_scale.domain()[1] - 0.25*time_scale.domain()[0]
      time_scale.domain([start,end])

      xt = time_scale

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

      d3.selectAll('.event-rects').remove()
      d3.selectAll('.result-rects').remove()

      sequence.append("image")
        .attr("class","plus_end")
        .attr('x', timelineLength+connectLength/2-5)
        .attr('y', predictRectSize[1]/2-5)
        .attr('width',10)
        .attr('height',10)
        .attr('xlink:href',"../static/img/plus_end.png")
        .on("click",function(){
          let x_pos = xt(end_day)
          plus_pos = x_pos
          $('#add_input').show()
    
      })

      let innerSpace = sequence.append('g')
        .attr('class', 'event-rects')
        .attr('transform', `translate(0,0)`)

      let resultSpace = sequence.append('g')
        .attr('class','result-rects')
        .attr('transform','translate('+ (timelineLength+connectLength) +',0)')

      showTimeline()

      showTimeresult()
        

      innerSpace.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("x", 0)
        .attr("y", -15)
        .attr("width", timelineLength)
        .attr("height", eventRectSize[1]*25+15);

      var view = innerSpace.append("rect")
        .attr("class", "zoom")
        .attr("width", timelineLength)
        .attr("height", 0)
        .attr("fill-opacity",0)
        .call(zoom_event)
        .on("wheel.zoom", null)

        

      innerSpace.append("g")
        .attr("class","inner_brush")
        .call(brush_inner)
        .on("dblclick",function(){
          d3.select(".pre_brush").call(brush_event.move, time_scale.range());
        })
        .on("mousedown",function(d){
          start_pos = window.event.offsetX
          move_flag = true
        })
        .on("mousemove",function(e){
          if(move_flag){
            end_pos = window.event.offsetX
            let cur_range = xt.range()
            let delta = end_pos - start_pos
            start_pos = end_pos
            console.log(delta)
            let new_domain = cur_range.map(function(d){
              return xt.invert(d-delta)
            })
            let new_range = new_domain.map(time_scale, time_scale)
            if(new_range[0]>0&&new_range[1] <timelineLength){
              d3.select(".pre_brush").call(brush_event.move, new_range)
            }
            
          }
        })

        sequence.on("mouseup",function(e){
          move_flag=false
        })

      innerSpace.append("g")
        .attr("class","pre_brush")
        .attr('transform', 'translate(0,-43)')
        .call(brush_event)
        .call(brush_event.move, time_scale.range());

      innerSpace.append('line')
        .attr('class', 'timeline')
        .attr('x1', 0)
        .attr('y1', predictRectSize[1]/2)
        .attr('x2', timelineLength)
        .attr('y2', predictRectSize[1]/2)
      $(".timeline").on("dblclick",function(e){
        let x_pos = e.offsetX-43

        plus_pos = x_pos
        d3.select(".event-rects")
          .append("g")
          .attr("class","plus_event")
          .attr("transform","translate("+x_pos+","+0+")")
          .append("rect")
          .attr("x",0)
          .attr("y",predictRectSize[1]/2 - eventRectSize[1]/2)
          .attr("width",eventRectSize[0])
          .attr("height",eventRectSize[1])
          .attr("fill","white")
          .attr("stroke","black")
        $('#add_input').show()
      })


      return seqvis.update()
    }

    seqvis.update = function(){
      let new_visits = []
      _.each(visits, function(d) {
        if (d) {
          let event_list = _.uniq(d['event_list'],function(item,key,a){
            return item['event_code']
          })
          // console.log('elem is')
          // console.log(elem)
          new_visits.push({'event_time':d['event_time'], 'event_list':event_list})
        }
      })
      
      draw_visit = []
      draw_visit.push(JSON.parse(JSON.stringify(new_visits[0])))
      for(var i=1; i< visits.length;i++){
          // if(xt(new Date(visits[i]['event_time'])) < xt(new Date(visits[i-1]['event_time']))+eventRectSize[0]){
          //   let tmp = visits[i]['event_list']
          //   console.log(tmp)
          //   draw_visit[draw_visit.length-1]["event_list"] = draw_visit[draw_visit.length-1]["event_list"].concat(tmp)
          //   console.log(visits[1]['event_list'])
          // }else{
          //   draw_visit.push(JSON.parse(JSON.stringify(visits[i])))
          // }
          draw_visit.push(JSON.parse(JSON.stringify(new_visits[i])))
      }


      d3.selectAll('.seq_part').remove()
      d3.selectAll('.event_node').remove()

      let event_node = d3.select('.event-rects').append("g")
        .attr("class","seq_part")
        .attr("clip-path", "url(#clip)")
        .selectAll('.event_node')
        .data(draw_visit)
        .enter()
        .append('g')
        .attr("class", "event_node")
        .attr('transform', function(d) {

          var cur_list = d['event_list'];
          var rect_width = eventRectSize[0]*Math.pow(cur_list.length,pow_scale)
          var rect_height = eventRectSize[1]*Math.pow(cur_list.length,pow_scale)

          return 'translate('+(xt(new Date(d['event_time']))-rect_width/2)+','+(predictRectSize[1]/2-rect_height/2) +')'
        })


      let event_rect = event_node
        // .append("rect")
        // .attr('x',function(d2, i){
        //   return i*Math.round(eventRectSize[0]/d2['total'] )- eventRectSize[0]/2
        // })
        // .attr('y', eventRectSize[1]/2)
        // .attr('width', function (d2){return Math.round(eventRectSize[0]/d2['total'])})
        // .attr('height', eventRectSize[1])
        // .attr('x',- eventRectSize[0]/2)
        // .attr('y', predictRectSize[1]/2 - eventRectSize[1]/2)
        // .attr('width', eventRectSize[0])
        // .attr('height', eventRectSize[1])
        // .attr('fill-opacity',0)
        .selectAll(".sub_node")
        // .data(function(d){
        //   let cur_list = d['event_list']
        //   let result = []
        //   if(cur_list.length>3){
        //     for(var k=0;k<3;k++){
        //       result.push({'num':3, 'event':cur_list[k]})
        //     }
        //   }else{
        //     for(var k=0;k<cur_list.length;k++){
        //       result.push({'num':cur_list.length, 'event':cur_list[k]})
        //     }
        //   }
        //   return result
        // })
        .data(function(d){
          
          var cur_list = d['event_list'];
          // var height=nheightScale(cur_list.length);
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
        .attr('stroke-width',1)
        .attr('stroke','#7d7d7d')
        .attr('class','treemap')

        // .attr('opacity',function(d){
        //   var parent_node=d3.select(this.parentNode.parentNode).data()[0];
        //   treeOpacityScale.domain(parent_node['end_minmax']);
        //   var porp=treeOpacityScale(d['data']['size']);
        //   return porp;
        // });


      // event_rect
      //   .enter()
      //   .append("rect")
      //   .attr('x',function(d2,i){
      //     return - eventRectSize[0]/2+i*eventRectSize[0]/d2['num']
      //   })
      //   .attr('y', predictRectSize[1]/2 - eventRectSize[1]/2)
      //   .attr('width', function(d2){
      //     return eventRectSize[0]/d2['num']
      //   })
      //   .attr('height', eventRectSize[1])
      //   .attr('fill', function(d2){
      //     if(d2['event']['event_type']=='Treatments'){
      //       return typeColors["B"]
      //     }else{
      //       return typeColors["A"]
      //     } 
      //   })
        // .attr("stroke","#7d7d7d")
        // .attr("stroke-width",2)
      // event_rect
      //   .enter()
      //   .append("rect")
      //   .attr('x',function(d2,i){
      //     return - eventRectSize[0]/2+(i+1)*eventRectSize[0]/d2['num']-1
      //   })
      //   .attr('y', predictRectSize[1]/2 - eventRectSize[1]/2)
      //   .attr('width', function(d2,i){
      //     if(i==d2['num']-1){
      //       return 0
      //     }else{
      //       return 2
      //     }
      //   })
      //   .attr('height', eventRectSize[1])
      //   .attr('fill', '#7d7d7d')
        

      // event_node.append("rect")
      //   .attr("class","event_cover")
      //   .attr('x',0)
      //   .attr('y', 0)
      //   .attr('width', function(d){
      //     var cur_list = d['event_list'];
      //     return eventRectSize[0]*Math.pow(cur_list.length,pow_scale)
      //   })
      //   .attr('height', function(d){
      //     var cur_list = d['event_list'];
      //     return eventRectSize[1]*Math.pow(cur_list.length,pow_scale)
      //   })
      //   .attr('fill-opacity',function(d){
      //     return 0
      //   })


        var in_tip_flag = false;
        $('.tipsy').remove();

        $('.event_node .sub_node').tipsy({
          gravity: 'n',
          trigger: 'manual',
          html:true,
          fade: false,
          title:function(){
            var cur_list = this.parentNode.__data__.event_list
            var e = parseInt(this.__data__.data.name.split('-')[2])

            var hf = ''
            
            
            if(cur_list[e].event_type=='Treatments'){

              d3.select("#tipsy-text").remove()
              d3.select(".sequence").append("text")
                .attr("id","tipsy-text")
                .style("fill","white")
                .style("fill-opacity",0)
                .style("font-size",12)
                .style("text-anchor","middle")
                .style("alignment-baseline","middle")
                .attr("x",0)
                .attr("y",0)
                .text(treatment[cur_list[e].icd_code])
                .style("pointer-events","none")

              var text_width = document.getElementById("tipsy-text").getComputedTextLength()
              console.log(text_width)
              hf += "<div class='tip_div'><svg id='tip' width="+text_width+" height="+eventRectSize[1]+" style='background:white'<g>"
              hf += "<rect data-index="+ cur_list[e].event_index +" data-num="+ cur_list[e].event_num +" data-type="+ cur_list[e].event_type +" data-mark="+ cur_list[e].event_code +" data-code="+ cur_list[e].icd_code +" x=0 y=0 width="+text_width+" height="+eventRectSize[1]+" fill="+typeColors[cur_list[e].event_type]+"></rect>"
              hf += "<text x=0 y="+(eventRectSize[1]-1)+" font-size=12 style='pointer-events:none; fill: white'>"+treatment[cur_list[e].icd_code]+"</text>"
            }else{

              d3.select("#tipsy-text").remove()
              d3.select(".sequence").append("text")
                .attr("id","tipsy-text")
                .style("fill","white")
                .style("fill-opacity",0)
                .style("font-size",12)
                .style("text-anchor","middle")
                .style("alignment-baseline","middle")
                .attr("x",0)
                .attr("y",0)
                .text(disease[cur_list[e].icd_code])
                .style("pointer-events","none")

              var text_width = document.getElementById("tipsy-text").getComputedTextLength()
              hf += "<div class='tip_div'><svg id='tip' width="+text_width+" height="+eventRectSize[1]+" style='background:white'<g>"
              hf += "<rect data-index="+ cur_list[e].event_index +" data-num="+ cur_list[e].event_num +" data-type="+ cur_list[e].event_type +" data-mark="+ cur_list[e].event_code +" data-code="+ cur_list[e].icd_code +" x=0 y=0 width="+text_width+" height="+eventRectSize[1]+" fill="+typeColors[cur_list[e].event_type]+"></rect>"
              hf += "<text x=0 y="+(eventRectSize[1]-1)+" font-size=12 style='pointer-events:none; fill: white'>"+disease[cur_list[e].icd_code]+"</text>"
            }
              
            
            hf += "</g></svg></div>"
            return hf
          }
        });


        $( ".event_node .sub_node" ).on('mouseenter', function() {
            $('.tipsy').remove();
            var dd = $(this);
            
            dd.tipsy('show');
            
            $('.tipsy').on("mouseenter", function(d){
                clearTimeout(in_tip_flag);
            })          
            $('.tipsy').on("mouseleave", function(d){
                dd.tipsy('hide');
            });

            $('#tip rect').each(function(){
              $(this).on("dblclick",function(e){
                dd.tipsy('hide');
                addtype = $(this).data('type')
                addmark = $(this).data('mark')
                addcode = $(this).data('code')
                addnum = $(this).data('num')
                addindex = $(this).data('index')

                visits[addnum]['event_list'].splice(addindex,1)
                for(var k=0;k<visits[addnum]['event_list'].length;k++){
                  visits[addnum]['event_list'][k]['event_index']=k
                }
                if(visits[addnum]['event_list'].length==0){
                  visits.splice(addnum,1)
                  for(var k=addnum; k<visits.length; k++){
                    for(var event=0; event<visits[k]['event_list'].length; event++){
                      visits[k]['event_list'][event].event_num = k
                    }
                  }
                }
                seqvis.update()
                seqvis.predict()
              })

              $(this).on('mousedown',function(e){
                dd.tipsy('hide');
                addtype = $(this).data('type')
                addmark = $(this).data('mark')
                addcode = $(this).data('code')
                addnum = $(this).data('num')
                addindex = $(this).data('index')
               
                console.log(e)
                let x_pos = e.clientX + 12

                if(e.which==1){
                  let addpart = d3.select('.event-rects').append("g")
                    .attr("class","addpart")
                    .attr("transform","translate("+(-100)+","+11+")")
                  addpart.append("rect")
                    .attr("x",0)
                    .attr("y",0)
                    .attr("width",eventRectSize[0])
                    .attr("height",eventRectSize[1])
                    .attr("fill",typeColors[addtype])
                  addpart.append("text")
                    .attr("x",2)
                    .attr("y",eventRectSize[1]-2)
                    .attr("font-size",eventRectSize[0]*0.5)
                    .style("fill","white")
                    .text(addcode)
                  drag_flag = true
                }
                
                visits[addnum]['event_list'].splice(addindex,1)
                for(var k=0;k<visits[addnum]['event_list'].length;k++){
                  visits[addnum]['event_list'][k]['event_index']=k
                }
                if(visits[addnum]['event_list'].length==0){
                  visits.splice(addnum,1)
                  for(var k=addnum; k<visits.length; k++){
                    for(var event=0; event<visits[k]['event_list'].length; event++){
                      visits[k]['event_list'][event].event_num = k
                    }
                  }
                }
                if(e.which==3){
                  seqvis.update()
                  seqvis.predict()
                }
                
              })
            })
        });

        $(".sequence").on('mousemove', function(e){
          if(drag_flag){
            let x_pos = e.offsetX-43- eventRectSize[0]/2
            let y_pos = 30 + e.offsetY
            d3.selectAll(".addpart")
              .attr("transform","translate("+x_pos+","+11+")")
          }
        })
        $(".sequence").on('mouseup', function(e){
          if(drag_flag){
            d3.selectAll(".addpart").remove()
            let x_pos = e.offsetX-43
            let current_time = xt.invert(x_pos)
            var yyyy = current_time.getFullYear();
            var mm = current_time.getMonth()+1;
            if(mm<10){
              mm = '0'+mm
            }
            var dd = current_time.getDate();
            if(dd<10){
              dd = '0'+dd
            }
            var hh = current_time.getHours();
            if(hh<10){
              hh = '0'+hh
            }
            var min = current_time.getMinutes();
            if(min<10){
              min = '0'+min
            }
            var sec = current_time.getSeconds();
            if(sec<10){
              sec = '0'+sec
            }
            console.log(xt.invert(x_pos))
            
            var time_string = yyyy + "-" + mm + "-" + dd + " " + hh + ":" + min + ":" + sec;
            console.log(time_string)
            for(var k=0; k<visits.length; k++){
              if(time_string < visits[k].event_time){
                visits.splice(k,0,{'event_time':time_string,'event_list':[{'event_index':0, 'event_num': k, "icd_code":addcode.toString(), "event_code":addmark, "event_type":addtype}]})
                console.log(visits[k])

                for(var kk=k+1; kk<visits.length; kk++){
                  for(var e=0; e<visits[kk].event_list.length; e++){
                    console.log(kk)
                    console.log(visits[kk]['event_list'][e].event_num)
                    visits[kk]['event_list'][e].event_num = kk
                  }
                }
                break;
              }else if(time_string == visits[k].event_time){
                visits[k]['event_list'].push({'event_index':visits[k]['event_list'].length, 'event_num': k, "icd_code":addcode.toString(), "event_code":addmark, "event_type":addtype})
                break;
              }else if(k==visits.length-1){
                visits.push({'event_time':time_string,'event_list':[{'event_index':0, 'event_num': k+1, "icd_code":addcode.toString(), "event_code":addmark, "event_type":addtype}]})
                break;
              }else{
                continue;
              }
            }
            drag_flag = false
            seqvis.update()
            seqvis.predict()
          }
        })

        
        $( ".event_node .sub_node" ).on('mouseleave', function(d) {
            var dd = $(this);
            in_tip_flag = setTimeout(function(){
                dd.tipsy('hide');
            }, 80);
        });

        
        // .enter()
        // .append("g")
        // .call(drag
        //   .on('start',started))

        event_rect
          .enter()
          .append('text')
          .attr('class', 'event_text')
          .attr('x',function(d2,i){
            var num = d3.select(this.parentNode).data()[0]['event_list'].length
            if(num==1){
              return 2
            }else{
              return 0
            }
          })
          .attr('y', function(d2){
            var cur_list = d3.select(this.parentNode).data()[0]['event_list'];
            return eventRectSize[1]*Math.pow(cur_list.length,pow_scale)-2
          })
          .attr("font-size",function(d2){
            return 13
          })
          .style("pointer-events","none")
          .style("fill",'white')
          .style("fill-opacity",function(d2){
            var num = d3.select(this.parentNode).data()[0]['event_list'].length
            if(num==1){
              return 1
            }else{
              return 0
            }
          })
          .text(function(d2){
            var cur_data = d3.select(this.parentNode).data()[0]['event_list']
            let cur_text = ''
            if(cur_data[0]['event_type']=='Treatments'){
              cur_text = treatment[cur_data[0]['icd_code']]
            }else{
              cur_text = disease[cur_data[0]['icd_code']]
            }
            
            return cur_text[0] + cur_text[1] + cur_text[2]
          })

      return seqvis
    }

    seqvis.predict = function () {
      let train_seq=[]
      let train_date =[[],[],[],[],[],[],[],[],[],[],[],[]]
      for(let i=0; i<visits.length; i++){
        let time_duration = (Date.parse(new Date(visits[visits.length-1]['event_time'])) - Date.parse(new Date(visits[i]['event_time'])))/(1000*3600*24)
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
      // console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!')
      // console.log(train)
      vaxios.get('/retain',{
        params: {
          train: JSON.stringify(train)
        }
      })
        .then((res) => {
        console.log(res)
        pre = res.data['pre']
        contribution = res.data['contr']

        seqvis.drawPre()
      })
        .catch((err) => {
          console.log(err)
        })

      // pre = []
      // for(var i=0; i<12;i++){
      //   let p = []
      //   for(var j=0;j<80;j++){
      //     p.push(0.5)
      //   }
      //   pre.push(p)
      // }

      return seqvis
    }

    seqvis.drawPre = function(){

      $( ".event_node .sub_node rect").attr("stroke","#7d7d7d")

      pre_result = []
      for(var j=0; j<pre[0].length; j++){
        pre_result.push({"time":0, 'pro':0})
      }
      for(var i=0; i<pre.length; i++){
        for(var j=0; j<pre[i].length; j++){
          if(pre[i][j]>pre_result[j]['pro']){
            pre_result[j]['pro'] = pre[i][j]
            let result_start = time_scale.domain()[1]
            let result_day = new Date(result_start)
            result_day.setTime(result_day.getTime()+i*30*24*3600*1000)
            pre_result[j]['time'] = i
            pre_result[j]['date'] = result_day
          }
        }
      }

      let draw_result = []
      let max_index = 5
      let min_index = 0
      let max_pro = 0
      let min_pro =1

      if(selected_disease.length==0){
        var len = pre_result.length;
        var indices = new Array(len);
        for (var i = 0; i < len; ++i) indices[i] = i;
      　indices.sort(function(a,b){ return pre_result[a]['pro'] > pre_result[b]['pro'] ? -1 : pre_result[a]['pro'] < pre_result[b]['pro'] ? 1 : 0; })
        for(var i=0; i<5; i++){
          selected_disease.push(indices[i])
          var disease_index = disease_list[indices[i]]
          var disease_text = disease[disease_index]
          disease_text = disease_text.split(';')[0]
          disease_text = disease_text.slice(0,28)
          selected_disease_label.push({'index':disease_index, 'disease_text':disease_text})
        }

        result_color = JSON.parse(JSON.stringify(result_color_bak))
        dispatch.call("start",this,{'selected':selected_disease})
        show_selected_disease()
      }

      for(var i=0 ; i<selected_disease.length; i++){
        draw_result.push(pre_result[selected_disease[i]])
      }
      let new_draw_result = []
      for(var i=0 ; i<draw_result.length; i++){
        if(draw_result[i]['pro']>max_pro){
          max_pro = draw_result[i]['pro']
          max_index = i
        }
        if(draw_result[i]['pro']<min_pro){
          min_pro = draw_result[i]['pro']
        }
      }
      if(max_pro == min_pro){
        max_pro = 1
        min_pro = 0
      }

      for(var i=0 ; i<draw_result.length; i++){
        var cur_time = draw_result[i]['time']
        var exit = false
        for(var index =0; index<new_draw_result.length; index++){
          if(new_draw_result[index]['time']==cur_time){
            new_draw_result[index]['index'].push(i)
            new_draw_result[index]['pro'].push(draw_result[i]['pro'])
            var exit  =true
            break;
          }else{
            continue;
          }
        }
        if(!exit){
          new_draw_result.push({'time':draw_result[i]['time'] ,'date':draw_result[i]['date'], 'pro':[draw_result[i]['pro']], 'index':[i] })
        }
      }

      d3.selectAll('.result_circle').remove()
      d3.selectAll('.result_block').remove()
      d3.selectAll('.result_single_node').remove()

      d3.select(".result-rects").append('g')
        .attr("class","result_block")
        .append("rect")
        .attr("x",0)
        .attr("y",0)
        .attr("width",resultlineLength+10)
        .attr("height",37)
        .attr("fill-opacity",0)
        .attr("stroke-width",3)
        .attr("stroke",result_color[max_index])

      new_draw_result.forEach(function(d,dd){
        console.log(dd)
        if(d['pro'].length<=1){
          let ppro = 0.6*(d['pro'][0]-min_pro)/(max_pro-min_pro)+0.4


          d3.select(".result-rects").append('g')
          .datum(d)
          .attr("class","result_single_node")
          .attr("transform","translate("+result_time_scale(d['date'])+','+predictRectSize[1]/2+')')
          .append("circle")
          .attr("cx",0)
          .attr('cy', 0)
          .attr('r',10*ppro)
          .attr("fill",result_color[d['index'][0]])

          $('.result_single_node').tipsy({
            gravity: 'n',
            html:true,
            fade: false,
            title:function(){
              var cur_index = this.__data__.index

              var hf = ''
                d3.select("#tipsy-text").remove()
                d3.select(".sequence").append("text")
                  .attr("id","tipsy-text")
                  .style("fill","white")
                  .style("fill-opacity",0)
                  .style("font-size",12)
                  .style("text-anchor","middle")
                  .style("alignment-baseline","middle")
                  .attr("x",0)
                  .attr("y",0)
                  .text(selected_disease_label[cur_index]['disease_text'])
                  .style("pointer-events","none")

                var text_width = document.getElementById("tipsy-text").getComputedTextLength()
                hf += "<div class='tip_div'><svg id='tip' width="+text_width+" height="+eventRectSize[1]+" style='background:white'<g>"
                hf += "<rect x=0 y=0 width="+text_width+" height="+eventRectSize[1]+" fill="+typeColors['diagnose']+"></rect>"
                hf += "<text x=0 y="+(eventRectSize[1]-1)+" font-size=12 style='pointer-events:none; fill: white'>"+selected_disease_label[cur_index]['disease_text']+"</text>"
                
              
              hf += "</g></svg></div>"
              return hf
            }
          });

        }else{
          // var obj={
          //   'name':'obj',
          //   'children':[]
          // };
          // var typeObj={
          //   'name':'result',
          //   'children':[]
          // }
          // obj['children'].push(typeObj);
          // let ppro_list = []
          // for(var k=0; k<d['pro'].length; k++){
            
          //   let ppro = 0.6*(d['pro'][0]-min_pro)/(max_pro-min_pro)+0.4
            
          //   ppro_list.push(ppro)
          //   var eventObj={
          //     'name':d['index'][k],
          //     'size':ppro
          //   }
          //   obj['children'][0]['children'].push(eventObj);
          // }
          // obj['children'].forEach(function(etype,index){
          //   if(!etype['children'].length){
          //     obj['children'].splice(index,1);
          //   }
          // })


          // let result_tree_height = 20*Math.max(...ppro_list)
          // console.log(d)
          // let result_tree_width = 20*(ppro_list.reduce((a, b) => a + b, 0))
          // treemap.size([result_tree_width,result_tree_height]);
          // var tree_root = d3.hierarchy(obj)
          //     .eachBefore(function(d2) { d2.data.id = (d2.parent ? d2.parent.data.id + "." : "") + d2.data.name; })
          //     .sum(function sumBySize(d2) {
          //       return d2.size
          //     })
          //     .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
          // treemap(tree_root);
          // let leaves = tree_root.leaves();

          // console.log(result_time_scale(d['date']))

          let pro_list_num = d['pro'].length
          let ppro_list = []
          let x_pos = 1
          

          let ppro = 0.6*(d['pro'][0]-min_pro)/(max_pro-min_pro)+0.4
          ppro_list.push({'ppro':ppro, 'index':d['index'][0], 'x_pos': x_pos+8*ppro})
          let result_tree_height = ppro*16

          for(var p=1; p<pro_list_num; p++){
            let ppro = 0.6*(d['pro'][p]-min_pro)/(max_pro-min_pro)+0.4
            ppro_list.push({'ppro':ppro, 'index':d['index'][p], 'x_pos': 8*ppro_list[p-1]['ppro']+1+ppro_list[p-1]['x_pos']+8*ppro})
            if(result_tree_height< ppro*16 ){
              result_tree_height = ppro*16
            }
          }
          let result_tree_width = ppro_list[pro_list_num-1]['x_pos'] + 8*ppro_list[pro_list_num-1]['ppro'] +1



          let result_tree = d3.select(".result-rects").append('g')
            .attr("class","result_circle")
            .attr("transform","translate("+(result_time_scale(d['date'])-result_tree_width/2)+','+(predictRectSize[1]/2)+')')

          result_tree
            .append("rect")
            .attr("x",0)
            .attr('y', -result_tree_height/2)
            .attr('width',function(d){
              return result_tree_width
            })
            .attr('height',function(d){
              return result_tree_height
            })
            .attr("fill-opacity",0)
            .attr('stroke-width',1)
            .attr('stroke','#7d7d7d')

          result_tree.selectAll(".sub_circle")
            .data(ppro_list)
            .enter()
            .append("circle")
            .attr("class","sub_circle")
            .attr("cx",function(d){
              return d['x_pos']
            })
            .attr('cy', 0)
            .attr('r',function(d){
              return d['ppro']*8
            })
            .attr("fill",function(d){
              return result_color[d['index']]
            })

          

          $('.result_circle .sub_circle').tipsy({
            gravity: 'n',
            html:true,
            fade: false,
            title:function(){
              var cur_index = this.__data__.index

              var hf = ''
                d3.select("#tipsy-text").remove()
                d3.select(".sequence").append("text")
                  .attr("id","tipsy-text")
                  .style("fill","white")
                  .style("fill-opacity",0)
                  .style("font-size",12)
                  .style("text-anchor","middle")
                  .style("alignment-baseline","middle")
                  .attr("x",0)
                  .attr("y",0)
                  .text(selected_disease_label[cur_index]['disease_text'])
                  .style("pointer-events","none")

                var text_width = document.getElementById("tipsy-text").getComputedTextLength()
                hf += "<div class='tip_div'><svg id='tip' width="+text_width+" height="+eventRectSize[1]+" style='background:white'<g>"
                hf += "<rect x=0 y=0 width="+text_width+" height="+eventRectSize[1]+" fill="+typeColors['diagnose']+"></rect>"
                hf += "<text x=0 y="+(eventRectSize[1]-1)+" font-size=12 style='pointer-events:none; fill: white'>"+selected_disease_label[cur_index]['disease_text']+"</text>"
                
              
              hf += "</g></svg></div>"
              return hf
            }
          });

          // result_tree
          //   .attr("clip-path", "url(#resultclip-"+dd+")") 
          //   .selectAll(".sub_tree")
          //   .data(leaves)
          //   .enter()
          //   .append('g')
          //   .attr("class","sub_tree")
          //   .attr('transform',function(d2){
          //     return 'translate('+(d2.x0)+','+(d2.y0)+')';
          //   })
          //   .append("rect")
          //   .attr("name", function(d2) { return d2['data']['name']; })
          //   .attr("width", function(d2) { return d2.x1 - d2.x0; })
          //   .attr("height", function(d2) { return d2.y1 - d2.y0; })
          //   .attr('fill',function(d2){
          //       return result_color[d2['data']['name']]
          //   })
          //   .attr('stroke-width',1)
          //   .attr('stroke','#7d7d7d')
          //   .attr('class','treemap')
          }
        
      })

        
        // .selectAll('g')
        // .data(function (d) {
        //   return d;
        // })
        // .enter()
        // .append('g')
        // .append('rect')
        // .attr('x', 0)
        // .attr('y', function(d2, i){
        //   return i*predictRectSize[1]/pre[0].length-predictRectSize[1]/2
        // })
        // .attr('width', predictRectSize[1]/2)
        // .attr('height', predictRectSize[1]/pre[0].length)
        // .attr('stroke', function (d,i) {
        //   return typeColors2[i]
        // })
        // .attr('stroke-opacity',0.8)
        // .attr('stroke-width', '1')
        // .attr('fill', function(d2){
        //   return colorScaleLinear(Math.pow(d2,0.4))
        // })
    }

    ///////////////////////////////////////////////////
    // Private Functions
    function drag_start(){
      alert("!!!!!!!!!!!!!!")
    }
    function started(){
      var node = d3.select(this).classed("dragging", true);

      d3.event.on("drag", dragged).on("end", ended);

      function dragged(d) {
        node.raise().attr("transform", "translate(" + d3.event.x + ','+(-d['pos']*(eventRectSize[1]+1))+')');
      }

      function ended() {
        node.classed("dragging", false);
      }
    }

    function  zoomEvent() {
      if (d3.event.sourceEvent && (d3.event.sourceEvent.which ==2 || d3.event.sourceEvent.type === "brush")) return;
      let t = d3.event.transform
      xt = t.rescaleX(time_scale)
      // d3.select(".axis--event").call(xAxis.scale(xt));
      d3.select(".pre_brush").call(brush_event.move, xt.range().map(t.invertX, t))
      seqvis.update()
    }

    function brushEvent(){
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
      var s = d3.brushSelection(document.getElementsByClassName("pre_brush")[0])
      if (!s) return;
      xt.domain(s.map(time_scale.invert, time_scale))
      d3.select(".zoom").call(zoom_event.transform, d3.zoomIdentity.scale(timelineLength/(s[1]-s[0])).translate(-s[0],0))
      //d3.select(".inner_brush").call(brush_inner.move, xt.range())
      d3.selectAll(".pre_brush rect.selection")
        .attr("rx",3)
        .attr("ry",3)
      seqvis.update()
    }

    function brushInner(){
      if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return;
      var s = d3.brushSelection(document.getElementsByClassName("inner_brush")[0])
      if(!s) return;
      console.log('inner_time')
      console.log(s.map(xt.invert, xt))
      console.log(s.map(xt.invert, xt).map(time_scale, time_scale))
      d3.select(".pre_brush").call(brush_event.move, s.map(xt.invert, xt).map(time_scale, time_scale))

      d3.select(".inner_brush").call(brush_inner.move, [0,0])

      //d3.select(".zoom").call(zoom_event.transform, d3.zoomIdentity.scale(timelineLength/(s[1]-s[0])).translate(-s[0],0))
    }

    const showTimeline = function() {
        xAxis = d3.axisBottom(time_scale).tickFormat(d3.timeFormat("%b"))
        var timeline = d3.select('.event-rects').append('g')
            .attr("class","axis--event")
            .attr('transform', 'translate(0,-40)')
            .call(xAxis)
        let axis_path = d3.selectAll(".axis--event path").attr("d")
        let new_path = ''
        for(var i=0;i<axis_path.length;i++){
          if(i==5||i==axis_path.length-1){
            new_path += 0.5
          }else{
            new_path += axis_path[i]
          }
          
        }
        d3.selectAll(".axis--event path").attr("d", new_path)

        d3.selectAll(".axis--event g.tick line")
          .attr("y2", 19);
        d3.selectAll(".axis--event g.tick text")
          .attr("transform", "translate(18,4)");
    }

    const showTimeresult = function() {
        result_xAxis = d3.axisBottom(result_time_scale).tickFormat(d3.timeFormat("%b"))
        var timeline = d3.select('.result-rects').append('g')
            .attr("class","axis--result")
            .attr('transform', 'translate(0,-40)')
            .call(result_xAxis)

        let axis_path = d3.selectAll(".axis--result path").attr("d")
        let new_path = ''
        for(var i=0;i<axis_path.length;i++){
          if(i==5||i==axis_path.length-1){
            new_path += 0.5
          }else{
            new_path += axis_path[i]
          }
          
        }
        d3.selectAll(".axis--result path").attr("d", new_path)

        d3.selectAll(".axis--result g.tick line")
          .attr("y2", 19);
        d3.selectAll(".axis--result g.tick text")
          .attr("transform", "translate(18,3)");
    }

    function show_selected_disease(){

      d3.selectAll(".selected_disease").remove()
      let text_width_list = []
      for(var d=0; d<selected_disease_label.length; d++){
        var selected = svg_select.append("g")
          .attr("class","selected_disease")
          .attr("id",'selected-'+d)
          

        selected.append("text")
          .attr("id","text-"+d)
          .style("fill","white")
          .style("fill-opacity",0)
          .style("font-size",12)
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .attr("x",0)
          .attr("y",2+24/2)
          .text(selected_disease_label[d]['disease_text'])
          .style("pointer-events","none")
        text_width_list.push(document.getElementById("text-"+d).getComputedTextLength())
      }

      let text_pos = 0

      for(var d=0; d<selected_disease_label.length; d++){

        var selected = d3.select('#selected-'+d)
          .attr("transform","translate("+text_pos+",2)")

        text_pos += text_width_list[d] + 18 
        selected.append("rect")
          .attr("width",text_width_list[d]+15)
          .attr("height",24)
          .attr("x",0)
          .attr("y",2)
          .attr("fill",result_color[d])
          .attr("rx",3)
          .attr("ry",3)
          


        selected.append("text")
          .style("fill","white")
          .style("font-size",12)
          .style("text-anchor","middle")
          .style("alignment-baseline","middle")
          .attr("x",text_width_list[d]/2+1)
          .attr("y",2+24/2)
          .text(selected_disease_label[d]['disease_text'])
          .style("pointer-events","none")

        selected.append('image')
          .attr('class', 'delete_btn')
          .attr('xlink:href', '../static/img/delete_big.png')
          .attr('width', 9)
          .attr('height', 9)
          .attr('x', text_width_list[d]+4)
          .attr('y', 24/2-3)
          .on('click', function(){
              let thisid = parseInt(d3.select(this.parentNode).attr('id').split('-')[1]);
              selected_disease_label.splice(thisid,1)
              selected_disease.splice(thisid,1)
              let delete_color = result_color.splice(thisid,1)
              result_color.push(delete_color[0])
              show_selected_disease()
              seqvis.drawPre()
              dispatch.call("change",this,{'selected':selected_disease, 'type_color': result_color})
          })
          
      }
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

    function treatment_list(event_data) {
    //console.log(event_data)

      $('#myUL').empty()
      let event_new_data = _.uniq(event_data,function(item,key,a){
              return item
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
                addFunction()

        })
      })


  }
  function addFunction() {
    $('#add_input').hide()
    var input,filter;
    input = document.getElementById("keyword")
    filter = input.value
    let pluscode = treatment_label[filter]
          let plusmark = parseInt(type[pluscode])
          let plustype = 'Treatments'
          
          let x_pos = plus_pos
          let current_time = xt.invert(x_pos)
          var yyyy = current_time.getFullYear();
          var mm = current_time.getMonth()+1;
          if(mm<10){
            mm = '0'+mm
          }
          var dd = current_time.getDate();
          if(dd<10){
            dd = '0'+dd
          }
          var hh = current_time.getHours();
          if(hh<10){
            hh = '0'+hh
          }
          var min = current_time.getMinutes();
          if(min<10){
            min = '0'+min
          }
          var sec = current_time.getSeconds();
          if(sec<10){
            sec = '0'+sec
          }
          console.log(xt.invert(x_pos))
            
          var time_string = yyyy + "-" + mm + "-" + dd + " " + hh + ":" + min + ":" + sec;
          console.log(time_string)
          for(var k=0; k<visits.length; k++){
            if(time_string < visits[k].event_time){
              visits.splice(k,0,{'event_time':time_string,'event_list':[{'event_index':0, 'event_num': k, "icd_code":pluscode.toString(), "event_code":plusmark, "event_type":plustype}]})
              // console.log(visits[k])

              for(var kk=k+1; kk<visits.length; kk++){
                for(var e=0; e<visits[kk].event_list.length; e++){
                  // console.log(kk)
                  // console.log(visits[kk]['event_list'][e].event_num)
                  visits[kk]['event_list'][e].event_num = kk
                }
              }
              break;
            }else if(time_string == visits[k].event_time){
              visits[k]['event_list'].push({'event_index':visits[k]['event_list'].length, 'event_num': k, "icd_code":pluscode.toString(), "event_code":plusmark, "event_type":plustype})
              break;
            }else if(k==visits.length-1){
              visits.push({'event_time':time_string,'event_list':[{'event_index':0, 'event_num': k, "icd_code":pluscode.toString(), "event_code":plusmark, "event_type":plustype}]})
              break;
            }else{
              continue;
            }
          }
          $('.plus_event rect').tipsy("hide")
          d3.selectAll(".plus_event").remove()
          seqvis.update()
          seqvis.predict()
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

  return seqvis
}
