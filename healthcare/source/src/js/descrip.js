
// import * as _ from '../lib/underscore'

export const Descrip = function() {
    var descrip = {},
    container = null,
    data = {},
    size = [232, 265],
    margin = {top:10, right: 0, bottom: 10, left:30},
    // typeColors = ["#75C1D5", "#AA97DA", "#93DC16", "#F19EC2", "#66B66F"],
    dispatch = d3.dispatch(),
    disease = null

    descrip.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        return descrip;
    }

    descrip.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return descrip;
    }

    descrip.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return descrip;
    }

    descrip.margin = function(_) {
        if(!arguments.length) return margin;
        margin = _;
        return descrip;
    }

    descrip.disease = function(_) {
        if(!arguments.length) return disease;
        disease = _;
        return descrip;
    }

    descrip.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters


    ///////////////////////////////////////////////////

    descrip.loading = function() {
        console.log('loading')
        if (container !== null) {
            console.log('loading')
            container.selectAll("*").remove();
            container.append('div')
            .attr('class', 'load')
            .attr("position","fixed")
            .style('width', '100%')
            .style('height', '100%')
            .html(function(){
                return  "<div class = 'loading' ><div class='loader'><div class='loader-inner ball-clip-rotate-pulse'><div></div><div></div></div><p>Loading...</p ></div></div>"
    
            })
            container.select('.loading').style('display', 'block');
        }
        return descrip;
    }


    descrip.show = function() {
        
        if(data[disease]){
            let link = data[disease]+'?printable=yes';
            link = link.replace('en.m.wikipedia.org', 'en.wikipedia.org')
            container
            .html(function(){
                let hf = '<iframe id="player" frameborder=0 scrolling=yes src="'+link+'"></iframe>'
                return hf
            })
        } else {
            container
            .html(function(){
                let hf = '<div></div>'
                return hf
            })
        }
        
        container.select('.loading').style('display', 'none');
        return descrip
    }
    
    return descrip
}
