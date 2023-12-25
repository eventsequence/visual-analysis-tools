Vis.controls = function() {

    var controls = {},
        container = null,
        data = null,
        size = [960, 800],
        margin = { left: 10, top: 10, right: 10, bottom: 10 },
        dispatch = d3.dispatch("packdiff",
            "updateProb",
            "updateConf",
            "updateSankey",
            'sankey2seq',
            'sankey2sum',
            'sum2seq',
            'sum2sankey',
            'seq2sankey',
            'seq2sum',
            'splitAnomaly',
            'overlayAnomaly');

    let probFormat=d3.format(".2f");
    let confFormat=d3.format(".1%")
    let nodeFormat=d3.format(".1f");

    controls.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return controls;
    };

    controls.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return controls;
    };

    controls.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return controls;
    };

    controls.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return controls;
    };

    controls.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters

    ///////////////////////////////////////////////////
    // Public Function
    controls.layout = function() {

        return controls;
    };

    controls.render = function() {

        if (!container) {
            return;
        }

        drawDiffbarSwitch();
        initMeanSlider(Data.prop_range);
        initConfSlider(Data.conf);
        initNodeFilter();
        initTriSwitch();

        return controls.update();
    };

    controls.update = function() {
        return controls;
    };

    controls.updateSlider = function(){
        //calculate node range
        let node_size=Data.flowObj.nodes.map(x=>d3.sum(x.info.props));
        Data.minNode=d3.min(node_size);
        let maxNode=d3.max(node_size)
        updateNodeFilter(Data.minNode,maxNode)
    }

    controls.updateNodeFilter = function(d){
        updateNodeFilter(d[0],d[1]);
    }

    controls.updateSwitch = function(){
        if(Data.viewStatus!='overlay'){
            $('.switch input').prop('checked',false);
            Data.overlay=false;
        }else{
            $('input#sankey').trigger('click');
        }
    }

    controls.activateFilters = function(){
        $('#meanSlider').slider({
            disabled:false
        })
        $('#confSlider').slider({
            disabled:false
        })
    }

    controls.deactivateFilters = function(){
        $('#meanSlider').slider({
            disabled:true
        })
        $('#confSlider').slider({
            disabled:true
        })
    }

    ///////////////////////////////////////////////////
    // Private Functions
    function drawDiffbarSwitch(){

        let buttonContainer = container.append("div").attr("id","diffpack");

        buttonContainer.append('label')
                .attr('id','switch_lab')
                .text('Overlay Anomaly');

        var repeat_switch = buttonContainer.append('label')
            .attr('class','switch');

        repeat_switch.append('input')
            .attr('type','checkbox');

        repeat_switch.append('span').attr('class','slider round')

        $('.switch input').prop('checked',Data.overlay);

        d3.select('.switch').select('input').on('click',function(d){
            Data.overlay = $(this).is(':checked');
            if($(this).is(':checked')){
                dispatch.call('overlayAnomaly',this,{});
            }else{
                dispatch.call('splitAnomaly',this,{});
            }
        })
    }

    function initConfSlider(val){
        container.append('label')
            .attr('id','confSlider_lab')
            .text('Support >');

        container.append('label')
            .attr('id','confSlider_val');

        let confSlider=container.append('div').attr('id','confSlider');

        $('#confSlider').slider({
            range:false,
            step:0.01,
            min:0,
            max:1,
            value:val,
            disabled:true,
            slide:function(event,ui){
                d3.select('#confSlider_val').text(confFormat(ui.value));
            },
            stop:function(event,ui){
                dispatch.call('updateConf',this,ui.value);
            }
        })
        d3.select('#confSlider_val').text(confFormat(val));
    }

    function initMeanSlider(val){

        container.append("label")
            .attr("id","meanSlider_lab")
            .text('Anomaly Score >')

        container.append("label")
            .attr("id","meanSlider_val");

        let meanSlider=container.append("div").attr("id","meanSlider");

        $('#meanSlider').slider({
          range: false,
          step:0.01,
          min: 0,
          max: 1,
          value: val,
          disabled: true,
          slide:function(event,ui){
            d3.select('#meanSlider_val').text(probFormat(ui.value));
          },
          stop:function(event,ui){
            dispatch.call('updateProb',this,ui.value);
          }
        });

        d3.select('#meanSlider_val').text(probFormat(val));
    }

    function initNodeFilter(){
        container.append("label")
            .attr("id","nodeFilter_lab")
            .text("Node Filter:");
        container.append("label")
            .attr("id","nodeFilter_val");
        let nodeFilter=container.append("div").attr("id","nodeFilter");
        $("#nodeFilter").slider({
            range:false,
            step:1,
            disabled:true
        })
        d3.select('#nodeFilter_val').text('-');
    }

    function initTriSwitch(){
        $('input#seq').click(function(){
            if( $(this).is(':checked') && Data.triSwitch!='seq'){
                let cur_switch=Data.triSwitch;
                let dispatch_event=cur_switch+'2'+'seq';
                console.log(dispatch_event);
                dispatch.call(dispatch_event,this,{});
                Data.triSwitch='seq';
            };
        })
        $('input#sankey').click(function(){
            if( $(this).is(':checked') && Data.triSwitch!='sankey'){
                let cur_switch=Data.triSwitch;
                let dispatch_event=cur_switch+'2'+'sankey';
                console.log(dispatch_event);
                dispatch.call(dispatch_event,this,{});
                Data.triSwitch='sankey';
            };
        })
        $('input#sum').click(function(){
            if( $(this).is(':checked') && Data.triSwitch!='sum'){
                let cur_switch=Data.triSwitch;
                let dispatch_event=cur_switch+'2'+'sum';
                console.log(dispatch_event);
                dispatch.call(dispatch_event,this,{});
                Data.triSwitch='sum';
            };
        })
    }

    function updateNodeFilter(min,max){
        $("#nodeFilter").slider({
            range: false,
              step:1,
              min: min,
              max: max,
              value: Data.minNode,
              disabled: false,
              slide:function(event,ui){
                d3.select('#nodeFilter_val').text(ui.value+'-'+max);
              },
              stop:function(event,ui){
                dispatch.call('updateSankey',this,ui.value);
              }
        });
        d3.select('#nodeFilter_val').text(Data.minNode+'-'+max)
    }

    return controls;
};
