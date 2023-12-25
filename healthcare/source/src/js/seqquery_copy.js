

export const seqquery = function() {
    var seqquery = {},
    container = null,
    data = {},
    size = [232, 235],
    margin = {top:3, right: 0, bottom: 3, left: 0},
    typeColors = {
        'Treatments': '#75C1D5',
        'diagnose': '#93DC16'
    },
    count=0,
    eventList = [],
    dispatch = d3.dispatch('select')

    seqquery.container = function (_) {
        if (!arguments.length) return container;
        container = _;
        container.attr('width', size[0])
            .attr('height', size[1])
        return seqquery;
    }

    seqquery.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return seqquery;
    }

    seqquery.size = function(_) {
        if (!arguments.length) return size;
        size = _;
        return size;
    }

    seqquery.margin = function(_) {
        if(!arguments.length) return margin;
        margin = _;
        return seqquery;
    }

    seqquery.dispatch = dispatch;

    ///////////////////////////////////////////////////
    // Private Parameters
    var itemboxHeight = 40,itemboxPadding=9
    var strokeWidth = 3
    var textPadding = 1, textHeight = 9
    var maxBarHeight = itemboxHeight-strokeWidth-textPadding*2-textHeight
    var barHeightScale = d3.scaleLinear().range([0,maxBarHeight])
    var barWidth = 24
    var barPadding = 8
    ///////////////////////////////////////////////////
    seqquery.addEvent = function(item) {
        eventList.push(item);
        let containHeight = itemboxHeight * (count + 1) + itemboxPadding * count
        if(containHeight > size[1]) container.attr('height', containHeight)
        if (count===0) {
            console.log(item['contain_num']+item['not_contain_num'])
            barHeightScale.domain([0,item['contain_num']+item['not_contain_num']])
        }
        let itembox = container
            .append('g')
            .attr('class', 'itembox selected')
            .attr('id', 'itembox_'+count)
            .attr('transform', `translate(${strokeWidth/2},${strokeWidth/2+ count*(itemboxHeight+itemboxPadding)})`)
            .datum(item)
        itembox.append('path')
            .attr('d', itemboxPath)
            .attr('stroke', (d)=>typeColors[d['event_type']])
            .attr('stroke-width', strokeWidth)
        itembox.append('text')
            .attr('class', 'event-text')
            .text(item['icd_code'])
            .attr('x', '9')
            .attr('y', itemboxHeight/2)
            .attr('fill', (d)=>typeColors[d['event_type']])
        let itemboxBar = itembox.append('g')
            .attr('class', 'itembox-bar')
            .attr('transform', `translate(146,${itemboxHeight - strokeWidth*1.5})`)

        itemboxBar.append('rect')
            .attr('x', 0)
            .attr('y', (d)=> -barHeightScale(d['contain_num']))
            .attr('height', (d)=> barHeightScale(d['contain_num']))
            .attr('width', barWidth)
            .attr('fill', (d)=>typeColors[d['event_type']])
        itemboxBar.append('text')
            .attr('class', 'amount-text')
            .attr('x', barWidth/2)
            .attr('y', (d)=> -(barHeightScale(d['contain_num'])+textPadding))
            .text((d)=>d['contain_num'])
            .attr('fill', (d)=>typeColors[d['event_type']])
        if (barHeightScale(itemboxBar.datum()['contain_num'])>textHeight) {
            itemboxBar.append('text')
                .attr('class', 'percentage-text')
                .text((d)=>{
                    let ptg = d['contain_num']/(d['contain_num']+d['not_contain_num'])
                    return Math.floor(ptg*100) + '%'
                })
                .attr('x', barWidth/2)
                .attr('y', (d)=>-barHeightScale(d['contain_num'])/2)
        }
        itemboxBar.append('rect')
            .attr('x', barPadding + barWidth)
            .attr('y', (d)=> -barHeightScale(d['not_contain_num']))
            .attr('height', (d)=> barHeightScale(d['not_contain_num']))
            .attr('width', barWidth)
            .attr('fill', '#7D7D7D')
        itemboxBar.append('text')
            .attr('class', 'amount-text')
            .attr('x', barWidth*1.5+barPadding)
            .attr('y', (d)=> -(barHeightScale(d['not_contain_num'])+textPadding))
            .text((d)=>d['not_contain_num'])
            .attr('fill', '#7D7D7D')
        if (barHeightScale(itemboxBar.datum()['not_contain_num'])>textHeight) {
            itemboxBar.append('text')
                .attr('class', 'percentage-text')
                .text((d)=>{
                    let ptg = d['not_contain_num']/(d['contain_num']+d['not_contain_num'])
                    return Math.floor(ptg*100)+'%';
                })
                .attr('x', barWidth*1.5+barPadding)
                .attr('y', (d)=>-barHeightScale(d['not_contain_num'])/2)
        }
        let btns = itembox.append('g')
            .attr('class', 'btns')
            .attr('transform', 'translate(214, 0)')

        btns.append('svg')
            .attr('class', 'eye-btn')
            .attr('width',12)
            .attr('height', 12)
            .attr('viewBox', '0 0 1024 1024')
            .attr('cursor', 'pointer')
            .attr('x', 0)
            .attr('y', 22)
            .append('path')
            .attr('d', getEyePath)
            .attr('fill', (d)=>typeColors[d['event_type']])
        btns.append('svg')
            .attr('class', 'delete-btn')
            .attr('width',12)
            .attr('height', 12)
            .attr('viewBox', '0 0 1024 1024')
            .attr('cursor', 'pointer')
            .attr('x', 0)
            .attr('y', 5)
            .append('path')
            .attr('d', getCancelPath)
            .attr('fill', (d)=>typeColors[d['event_type']])
        btns.select('.eye-btn')
            .on('click', function(d){
                if(d3.select(this.parentNode.parentNode).classed('disppear')){
                    d3.select(this.parentNode.parentNode).classed('disppear', false).classed('selected', true)
                } else {
                    d3.select(this.parentNode.parentNode).classed('disppear', true).classed('selected', false)
                }
            })
        btns.select('.delete-btn')
            .on('click', function(){
                let curItembox = d3.select(this.parentNode.parentNode)
                let itemboxIdx = curItembox.attr('id').split('_')[1]
                eventList.splice(itemboxIdx,1);
                console.log(itemboxIdx)
                console.log(eventList)
                curItembox.remove()
                seqquery.update()
            })
        count++
        return seqquery
    }
    seqquery.getPatterns = function() {
        let patterns = []
        let events = d3.selectAll('.itembox.selected').data()
        for (let idx in events) {
            patterns.push(events[idx]['event_code'])
        }
        return patterns
    }
    seqquery.update = function() {
        count = 0
        container.selectAll('*').remove();
        container.attr('width', size[0])
            .attr('height', size[1])
        let tmpList = eventList
        eventList = []
        for (let idx in tmpList) {
            seqquery.addEvent(tmpList[idx]);
        }
        return seqquery;
    }
    seqquery.deleteItem = function(deleteIdx) {


        return seqquery;
    }


    /////////////////////
    // private function
    const itemboxPath = function(d){
        let itemboxRadius = 2
        let widthLineLength = size[0] - itemboxRadius*2- strokeWidth
        let heightLineLength = itemboxHeight - itemboxRadius*2-strokeWidth
        return `M${itemboxRadius},0 l${widthLineLength},0 a${itemboxRadius},${itemboxRadius} 0 0,1 ${itemboxRadius},${itemboxRadius} ` +
            `l0,${heightLineLength} a${itemboxRadius},${itemboxRadius} 0 0,1 ${-itemboxRadius},${itemboxRadius} ` + 
            `l${-widthLineLength},0 a${itemboxRadius},${itemboxRadius} 0 0,1 ${-itemboxRadius},${-itemboxRadius} ` + 
            `l0,${-heightLineLength} a${itemboxRadius},${itemboxRadius} 0 0,1 ${itemboxRadius},${-itemboxRadius} z`
    }
    const getEyePath = function(){
        return 'M512 209.403241c-201.731514 0-374.009206 125.476783-443.808922 302.596759 69.798692 177.119977 242.077408 302.596759 443.808922 302.596759 201.933105 0 374.010229-125.476783 443.808922-302.596759C886.009206 334.880023 713.933105 209.403241 512 209.403241zM512 713.731514c-111.355157 0-201.731514-90.375334-201.731514-201.731514s90.375334-201.731514 201.731514-201.731514 201.731514 90.375334 201.731514 201.731514S623.355157 713.731514 512 713.731514zM512 390.961296c-66.772776 0-121.038704 54.265928-121.038704 121.038704s54.265928 121.038704 121.038704 121.038704 121.038704-54.265928 121.038704-121.038704S578.772776 390.961296 512 390.961296z'
    }
    const getCancelPath = function(){
        return 'M786.7392 333.42464 608.17408 512 786.7392 690.57536c26.56256 26.56256 26.56256 69.61152 0 96.17408-13.27104 13.27104-30.6688 19.9168-48.06656 19.9168-17.408 0-34.80576-6.63552-48.0768-19.9168L512 608.16384l-178.5856 178.5856c-13.27104 13.27104-30.6688 19.9168-48.0768 19.9168-17.39776 0-34.78528-6.63552-48.06656-19.9168-26.56256-26.55232-26.56256-69.60128 0-96.17408L415.82592 512 237.2608 333.42464c-26.56256-26.56256-26.56256-69.61152 0-96.17408 26.55232-26.54208 69.5808-26.54208 96.14336 0L512 415.83616l178.5856-178.5856c26.56256-26.54208 69.59104-26.54208 96.14336 0C813.30176 263.81312 813.30176 306.86208 786.7392 333.42464z'
    }
    return seqquery
}