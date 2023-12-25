/*
    List View
    
    This view displays a list of twitter users
    
    Author : Nan Cao (nancao.org)
*/

// const _ = require('../lib/underscore')

export const Patientinfo = function() {
    //public variables///////////////////////////////////////////////////////////
    var patientinfo = {},
        container = null,
        data = [],
        patient = [],
        patient_select = [],
        filter = [],
        currentid = null,
        glyph = null,
        single = true,
        treatment = {},
        disease = {},
        curPicIdx = 0,
        dispatch = d3.dispatch("select", "unselect", "mousemove", "mouseout");

    var syplist

    patientinfo.container = function(_) {
        if (!arguments.length) return container;
        container = _;
        return patientinfo;
    };
    patientinfo.initfilter = function(_) {
        if (!arguments.length) return initfilter;
        initfilter = _;
        return patientinfo;
    };


    patientinfo.patient = function(_) {
        if (!arguments.length) return patient;
        patient = _;
        return patientinfo;
    };

    patientinfo.patient_select = function(_) {
        if (!arguments.length) return patient_select;
        patient_select = _;
        return patientinfo;
    };

    patientinfo.filter = function(_) {
        if (!arguments.length) return filter;
        filter = _;
        return patientinfo;
    };
    patientinfo.data = function(_) {
        if (!arguments.length) return data;
        data = _;
        return patientinfo;
    };

    patientinfo.disease = function(_) {
        if (!arguments.length) return disease;
        disease = _;
        return patientinfo;
    };

    patientinfo.currentid = function(_) {
        if (!arguments.length) return currentid;
        currentid = _;
        return patientinfo;
    };

    patientinfo.curPicIdx = function(_) {
        if (!arguments.length) return curPicIdx;
        curPicIdx = _;
        return patientinfo;
    };

    patientinfo.signleSelect = function(_) {
        if (!arguments.length) return single;
        single = _;
        return patientinfo;
    };

    patientinfo.treatment = function(_) {
        if(!arguments.length) return treatment;
        treatment = _;
        return patientinfo;
    }

    patientinfo.clean = function() {
        container.selectAll(".box").remove();
        return patientinfo;
    }

    patientinfo.dispatch = dispatch;


    // var datef = d3.time.format("%Y-%m-%d %H:%M:%S"),
    //     numf = d3.format(".4f"),
    //     glyph_size = 72;

    var type_color = {
        'diagnose': '#7D7D7D',
        'Treatments': '#bfbfbf'
    }

    //public methods///////////////////////////////////////////////////////////
    patientinfo.typeColors = function (_) {
        if (!arguments.length) return type_color
        type_color = _
        return patientinfo
    }

    patientinfo.highlight = function(d, flag) {
        container.select("#r" + d.id).classed("highlighted", flag);
        return patientinfo;
    };

    patientinfo.loading = function() {
        if (container !== null) {
            container.selectAll(".box").remove();
            container.select('.load').remove();
            container.append('div')
            .attr('class', 'load')
            .style('width', '100%')
            .style('height', '100%')
            .html(function (){
                return "<div class = 'loading' ><div class='loader'><div class='loader-inner ball-clip-rotate-pulse'><div></div><div></div></div><p>Query...</p ></div></div>"
            })
            container.select('.loading').style('display', 'block');
        }

        return patientinfo;
    }
    patientinfo.layout = function() {

        return patientinfo;
    }

    patientinfo.select = function(d, flag) {
        if (arguments.length == 1) {
            container.selectAll(".selected").classed("selected", function(x) {
                if (d.id != x.id) {
                    d.selected = false;
                    return false;
                } else {
                    return true;
                }
            });
        } else {
            container.select("#r" + d).classed("selected", flag);
            container.select("#r" + d).datum().selected = flag
        }
        return patientinfo;
    };

    patientinfo.reshow1 = function(){
        container.selectAll(".box")
            .style("display","block")

        patient.forEach(function(d){
            container.select("#r"+d)
                .style("display","none")
        })

        return patientinfo
    }

    patientinfo.reshow2 = function(){
        container.selectAll(".box")
            .style("display","none")
        
        patient_select.forEach(function(d){
            container.select("#r"+d)
                .style("display","block")
        })
        return patientinfo
    }


    patientinfo.show = function() {

        // var start = patient.split(',')[2]
        // var end = patient.split(',')[3]
        var oldlist = Object.keys(data)

        var boxdata = []
        var datain = data

        _.each(oldlist, function(d) {
            if (datain[d]) {
                var elem = {
                    id: d,
                    syp: [],
                    gender: (Math.floor(Math.random() * 100) % 2) ? 'M' : 'F'
                }

                syplist = _.uniq(datain[d],function(item,key,a){
                    return item.event_type+'-'+item.event_code
                })
                elem['syp']=syplist
                // console.log('elem is')
                // console.log(elem)
                boxdata.push(elem)
            }
        })

        container.selectAll("*").remove();
        // container.select('.loading').style('display', 'none');
        
        var tabs = container
            .selectAll(".box").data(boxdata)
            .enter().append("div")
            .attr("class", "box")
            .attr("id", function(d) {
                return 'r' + d.id;
            })
            .on("mousemove", function(d, i) {
                patientinfo.highlight(d, true);
                // dispatch.mousemove(d, i);
            })
            .on("mouseout", function(d, i) {
                patientinfo.highlight(d, false);
                // dispatch.mouseout(d, i);
            })
            .on("click", function(d, i) {
                // if (single) patientinfo.select(d);
                d.selected = !d.selected;
                patientinfo.select(d.id, d.selected);
                dispatch.call("select",this,{'data':d.id,'flag':d.selected})
                // dispatch.select(d, i);
            });

        tabs.html(function(d, i) {
            var picnum = 0;
            for (let i =0; ; i++) {
                picnum = Math.floor(Math.random() * 87);
                if (picnum !== curPicIdx) {
                    break;
                }
            }
            var pic = ''
            if (d['gender'] == 'M') {
                let info = "<div class='patient-info'><label>Name</label><label>PID: "+d.id+"</label></div>"
                pic = "<div class='patient-img' style=\"background-image: url(\'../../static/lib/face/Male/" + ("000" + picnum).slice(-3) + "m.jpg\')\">" + info+ "</div>"
            } else {
                let info = "<div class='patient-info'><label>Name</label><label>PID: "+d.id+"</label></div>"
                pic = "<div class='patient-img' style=\"background-image: url(\'../../static/lib/face/Female/" + ("000" + picnum).slice(-3) + "f.jpg\')\">" + info+ "</div>"
            }
            var height = 125
            if (d['syp'].length > 15) {
                height = ((Math.ceil(d['syp'].length / 3)) * 20+10)
            }
            return "<div id='div-design' style='height:"+height+"px'>" + pic + "<div class='patient-svg'><svg class='syplink' width='124px' height='125px'></svg></div></div>"

        });

        var defs = container.append('svg:defs')
        var markerdata = [
            { id: 0, name: 'circle', path: 'M 0, 0  m -5, 0  a 5,5 0 1,0 10,0  a 5,5 0 1,0 -10,0', viewbox: '-6 -6 12 12' },
            { id: 1, name: 'square', path: 'M 0,0 m -5,-5 L 5,-5 L 5,5 L -5,5 Z', viewbox: '-5 -5 10 10' },
            { id: 2, name: 'arrow', path: 'M 0,0 m -5,-5 L 5,0 L -5,5 Z', viewbox: '-5 -5 10 10' },
            { id: 2, name: 'stub', path: 'M 0,0 m -1,-5 L 1,-5 L 1,5 L -1,5 Z', viewbox: '-1 -5 2 10' }
        ]


        var marker = defs.selectAll('marker')
            .data(markerdata)
            .enter()
            .append('svg:marker')
            .attr('id', function(d) {
                return 'marker_' + d.name
            })
            .attr('markerHeight', 5)
            .attr('markerWidth', 5)
            .attr('markerUnits', 'strokeWidth')
            .attr('orient', 'auto')
            .attr('refX', 0)
            .attr('refY', 0)
            .attr('viewBox', function(d) {
                return d.viewbox
            })
            .append('svg:path')
            .attr('d', function(d) {
                return d.path
            })
            .attr('fill', function(d, i) {
                return '#bbb'
            });



        tabs.each(function(d, i) {
            var element = d3.select(this).select('.syplink')
            var link = element.append('g')
                .attr('class', 'clink')
            link.selectAll('.link')
                .data(d['syp'])
                .enter()
                .append('path')
                .attr('class', 'link')
                .attr('d', function(syp, idx) {
                    if (d['syp'].length > 15) {
                        d3.select(this.parentNode.parentNode).attr('height', function(syp, idx) {
                            return ((Math.ceil(d['syp'].length / 3)) * 20+10)
                        })
                        // console.log(this.parentNode.parentNode.parentNode.parentNode)
                        // d3.select(this.parentNode.parentNode.parentNode.parentNode).style('height', function(){
                        //     return ((Math.ceil(d['syp'].length / 6)) * 40)
                        // })
                    }

                    var remainder_pre = (idx - 1) % 6;
                    var floor_pre = Math.floor((idx - 1) / 3);
                    var remainder = (idx) % 6;
                    var floor = Math.floor(idx / 3);

                    if (idx == 0) {
                        return;
                    } else if (remainder == 0) {
                        var sourceX = 181 - remainder_pre * 31;
                        var sourceY = floor_pre * 19 + 15;
                        var targetX = remainder * 31 + 26;
                        var targetY = floor * 19+ 15;
                        var dx = targetX - sourceX;
                        var dy = targetY - sourceY;
                        var dr = Math.sqrt(dx * dx + dy * dy)
                        return "M" + sourceX + "," + sourceY + "L" + targetX + ',' + targetY;
                    } else if (remainder == 3) {
                        var sourceX = remainder_pre * 31 + 26;
                        var sourceY = floor_pre * 19 + 15;
                        var targetX = 181 - remainder * 31;
                        var targetY = floor * 19 + 15;
                        var dx = targetX - sourceX;
                        var dy = targetY - sourceY;
                        var dr = Math.sqrt(dx * dx + dy * dy)
                        return "M" + sourceX + "," + sourceY + "L" + targetX + ',' + targetY;

                    } else if (remainder < 3) {
                        var sourceX = remainder_pre * 31 + 26;
                        var sourceY = floor_pre * 19 + 15;
                        var targetX = remainder * 31 + 26;
                        var targetY = floor * 19 + 15;
                        return "M" + (sourceX + 8) + "," + sourceY + "L" + (targetX - 8) + "," + targetY;
                    } else {
                        var sourceX = 181 - remainder_pre * 31;
                        var sourceY = floor_pre * 19 + 15;
                        var targetX = 181 - remainder * 31;
                        var targetY = floor * 19 + 15;
                        return "M" + (sourceX - 8) + "," + sourceY + "L" + (targetX + 8) + "," + targetY;
                    }

                    // if (d['syp'].length < 16) {
                    // } else if (d['syp'].length > 15 && d['syp'].length < 25) {
                    //     var remainder_pre = (idx - 1) % 8;
                    //     var floor_pre = Math.floor((idx - 1) / 4);
                    //     var remainder = (idx) % 8;
                    //     var floor = Math.floor(idx / 4);

                    //     if (idx == 0) {
                    //         return;
                    //     } else if (remainder == 0) {
                    //         var sourceX = 235 - remainder_pre * 30;
                    //         var sourceY = floor_pre * 25 + 12.5;
                    //         var targetX = remainder * 30 + 25;
                    //         var targetY = floor * 25 + 12.5;
                    //         var dx = targetX - sourceX;
                    //         var dy = targetY - sourceY;
                    //         var dr = Math.sqrt(dx * dx + dy * dy)
                    //         return "M" + (sourceX) + "," + sourceY +'L' + (targetX) + "," + targetY;
                    //     } else if (remainder == 4) {
                    //         var sourceX = remainder_pre * 30 + 25;
                    //         var sourceY = floor_pre * 25 + 12.5;
                    //         var targetX = 235 - remainder * 30;
                    //         var targetY = floor * 25 + 12.5;
                    //         var dx = targetX - sourceX;
                    //         var dy = targetY - sourceY;
                    //         var dr = Math.sqrt(dx * dx + dy * dy)
                    //         return "M" + (sourceX) + "," + sourceY +'L' + (targetX) + "," + targetY;

                    //     } else if (remainder < 4) {
                    //         var sourceX = remainder_pre * 30 + 25;
                    //         var sourceY = floor_pre * 25 + 12.5;
                    //         var targetX = remainder * 30 + 25;
                    //         var targetY = floor * 25 + 12.5;
                    //         return "M" + (sourceX + 7.5) + "," + sourceY + "L" + (targetX - 7.5) + "," + targetY;
                    //     } else {
                    //         var sourceX = 235 - remainder_pre * 30;
                    //         var sourceY = floor_pre * 25 + 12.5;
                    //         var targetX = 235 - remainder * 30;
                    //         var targetY = floor * 25 + 12.5;
                    //         return "M" + (sourceX - 7.5) + "," + sourceY + "L" + (targetX + 7.5) + "," + targetY;
                    //     }


                    // } else {
                    //     var remainder_pre = (idx - 1) % 12;
                    //     var floor_pre = Math.floor((idx - 1) / 6);
                    //     var remainder = (idx) % 12;
                    //     var floor = Math.floor(idx / 6);

                    //     if (idx == 0) {
                    //         return;
                    //     } else if (remainder == 0) {
                    //         var sourceX = 240 - remainder_pre * 20;
                    //         var sourceY = floor_pre * 15 + 10;
                    //         var targetX = remainder * 20 + 20;
                    //         var targetY = floor * 15 + 10;
                    //         var dx = targetX - sourceX;
                    //         var dy = targetY - sourceY;
                    //         var dr = Math.sqrt(dx * dx + dy * dy)
                    //         return "M" + (sourceX) + "," + sourceY +'L' + (targetX) + "," + targetY;
                    //     } else if (remainder == 6) {
                    //         var sourceX = remainder_pre * 20 + 20;
                    //         var sourceY = floor_pre * 15 + 10;
                    //         var targetX = 240 - remainder * 20;
                    //         var targetY = floor * 15 + 10;
                    //         var dx = targetX - sourceX;
                    //         var dy = targetY - sourceY;
                    //         var dr = Math.sqrt(dx * dx + dy * dy)
                    //         return "M" + (sourceX) + "," + sourceY +'L' + (targetX) + "," + targetY;

                    //     } else if (remainder < 6) {
                    //         var sourceX = remainder_pre * 20 + 20;
                    //         var sourceY = floor_pre * 15 + 10;
                    //         var targetX = remainder * 20 + 20;
                    //         var targetY = floor * 15 + 10;
                    //         return "M" + (sourceX + 5) + "," + sourceY + "L" + (targetX - 5) + "," + targetY;
                    //     } else {
                    //         var sourceX = 240 - remainder_pre * 20;
                    //         var sourceY = floor_pre * 15 + 10;
                    //         var targetX = 240 - remainder * 20;
                    //         var targetY = floor * 15 + 10;
                    //         return "M" + (sourceX - 5) + "," + sourceY + "L" + (targetX + 5) + "," + targetY;
                    //     }

                    // }
                })
                .style('fill', 'none')
                .style("stroke", '#bbb')
                .style("stroke-width", 2)
                .filter(function(syp, idx) {
                    if (idx == 0) return 1
                    else return 0
                })

            // var end = link
            //     .selectAll('.linkend')
            //     .data(d['syp'])
            //     .enter()
            //     .append('path')
            //     .attr('class', 'linkend')
            //     .attr('d', function(syp, idx) {
            //         if (idx == d['syp'].length - 1) {
            //             if (d['syp'].length < 16) {
            //                 var remainder_pre = (idx - 1) % 6;
            //                 var floor_pre = Math.floor((idx - 1) / 3);
            //                 var remainder = (idx) % 6;
            //                 var floor = Math.floor(idx / 3);

            //                 if (remainder < 3) {
            //                     return "M" + (remainder * 40 + 40) + "," + (floor * 30 + 15) + "L" + (remainder * 40 + 50) + "," + (floor * 30 + 15);
            //                 } else {
            //                     return "M" + (220 - remainder * 40) + "," + (floor * 30 + 15) + "L" + (210 - remainder * 40) + "," + (floor * 30 + 15);
            //                 }
            //             } else if (d['syp'].length > 15 && d['syp'].length < 25) {
            //                 var remainder_pre = (idx - 1) % 8;
            //                 var floor_pre = Math.floor((idx - 1) / 4);
            //                 var remainder = (idx) % 8;
            //                 var floor = Math.floor(idx / 4);
            //                 if (remainder < 4) {
            //                     return "M" + (remainder * 30 + 32.5) + "," + (floor * 25 + 12.5) + "L" + (remainder * 30 + 40) + "," + (floor * 25 + 12.5);
            //                 } else {
            //                     return "M" + (227.5 - remainder * 30) + "," + (floor * 25 + 12.5) + "L" + (220 - remainder * 30) + "," + (floor * 25 + 12.5);
            //                 }
            //             } else {
            //                 var remainder_pre = (idx - 1) % 12;
            //                 var floor_pre = Math.floor((idx - 1) / 6);
            //                 var remainder = (idx) % 12;
            //                 var floor = Math.floor(idx / 6);
            //                 if (remainder < 6) {
            //                     return "M" + (remainder * 20 + 25) + "," + (floor * 15 + 10) + "L" + (remainder * 20 + 30) + "," + (floor * 15 + 10);
            //                 } else {
            //                     return "M" + (235 - remainder * 20) + "," + (floor * 15 + 10) + "L" + (230 - remainder * 20) + "," + (floor * 15 + 10);
            //                 }
            //             }

            //         } else return;

            //     }).style('fill', 'none')
            //     .style("stroke", '#bbb')
            //     .style("stroke-width", 2)

            // var endarrow = link
            //     .selectAll('.endarrow')
            //     .data(d['syp'])
            //     .enter()
            //     .append('path')
            //     .attr('class', 'endarrow')
            //     .attr('d', function(syp, idx) {
            //         if (idx == d['syp'].length - 1) {
            //             if (d['syp'].length < 16) {
            //                 var remainder_pre = (idx - 1) % 6;
            //                 var floor_pre = Math.floor((idx - 1) / 3);
            //                 var remainder = (idx) % 6;
            //                 var floor = Math.floor(idx / 3);

            //                 if (remainder < 3) {
            //                     return "M" + (remainder * 40 + 45) + "," + (floor * 30 + 10) + "L" + (remainder * 40 + 50) + "," + (floor * 30 + 15) + "L" + (remainder * 40 + 45) + "," + (floor * 30 + 20);
            //                 } else {
            //                     return "M" + (215 - remainder * 40) + "," + (floor * 30 + 10) + "L" + (210 - remainder * 40) + "," + (floor * 30 + 15) + "L" + (215 - remainder * 40) + "," + (floor * 30 + 20);
            //                 }
            //             } else if (d['syp'].length > 15 && d['syp'].length < 25) {
            //                 var remainder_pre = (idx - 1) % 8;
            //                 var floor_pre = Math.floor((idx - 1) / 4);
            //                 var remainder = (idx) % 8;
            //                 var floor = Math.floor(idx / 4);
            //                 if (remainder < 4) {
            //                     return "M" + (remainder * 30 + 36.25) + "," + (floor * 25 + 8.75) + "L" + (remainder * 30 + 40) + "," + (floor * 25 + 12.5) + "L" + (remainder * 30 + 36.25) + "," + (floor * 25 + 16.25);
            //                 } else {
            //                     return "M" + (223.75 - remainder * 30) + "," + (floor * 25 + 8.75) + "L" + (220 - remainder * 30) + "," + (floor * 25 + 12.5) + "L" + (223.75 - remainder * 30) + "," + (floor * 25 + 16.25);
            //                 }
            //             } else {
            //                 var remainder_pre = (idx - 1) % 12;
            //                 var floor_pre = Math.floor((idx - 1) / 6);
            //                 var remainder = (idx) % 12;
            //                 var floor = Math.floor(idx / 6);
            //                 if (remainder < 6) {
            //                     return "M" + (remainder * 20 + 27.5) + "," + (floor * 15 + 7.5) + "L" + (remainder * 20 + 30) + "," + (floor * 15 + 10) + "L" + (remainder * 20 + 27.5) + "," + (floor * 15 + 12.5);
            //                 } else {
            //                     return "M" + (232.5 - remainder * 20) + "," + (floor * 15 + 7.5) + "L" + (230 - remainder * 20) + "," + (floor * 15 + 10) + "L" + (232.5 - remainder * 20) + "," + (floor * 15 + 12.5);
            //                 }
            //             }

            //         } else return;

            //     }).style('fill', 'none')
            //     .style("stroke", '#bbb')
            //     .style("stroke-width", 2)

            // var startnode = link
            //     .selectAll('.startnode')
            //     .data(d['syp'])
            //     .enter()
            //     .append('circle')
            //     .attr('class', 'startnode')
            //     .attr('cy', function(syp, idx) {
            //         if (idx == 0) {
            //             if (d['syp'].length < 16) {
            //                 return 15
            //             } else if (d['syp'].length > 15 && d['syp'].length < 25) {
            //                 return 12.5
            //             } else {
            //                 return 10
            //             }

            //         } else return;
            //     })
            //     .attr('cx', function(syp, idx) {
            //         if (idx == 0) {
            //             return 10

            //         } else return;

            //     }).attr('r', function(syp, idx) {
            //         if (idx != 0) return 0;
            //         if (d['syp'].length < 16) {
            //             return 5
            //         } else if (d['syp'].length > 15 && d['syp'].length < 25) {
            //             return 4
            //         } else {
            //             return 3
            //         }
            //     })
            //     .style('fill', '#bbb')

            var node = element
                .append('g')
                .attr('class', 'cgroup')
                .selectAll('.node')
                .data(d['syp'].slice(0, d['syp'].length-1))
                .enter()
                .append('g')
                .attr('class', "node")
                .attr("transform", function(syp, idx) {
                    var remainder = idx % 6;
                    var floor = (Math.floor(idx / 3) * 19) + 15;
                    if (remainder < 3) return "translate(" + (remainder * 31 + 26) + "," + floor + ")";
                    else return "translate(" + (181 - remainder * 31) + "," + floor + ")";
                    // if (d['syp'].length < 16) {
                    //     var remainder = idx % 6;
                    //     var floor = (Math.floor(idx / 3) * 30) + 15;
                    //     if (remainder < 3) return "translate(" + (remainder * 40 + 30) + "," + floor + ")";
                    //     else return "translate(" + (230 - remainder * 40) + "," + floor + ")";
                    // } else if (d['syp'].length > 15 && d['syp'].length < 25) {
                    //     var remainder = idx % 8;
                    //     var floor = (Math.floor(idx / 4) * 25) + 12.5;
                    //     if (remainder < 4) return "translate(" + (remainder * 30 + 25) + "," + floor + ")";
                    //     else return "translate(" + (235 - remainder * 30) + "," + floor + ")";
                    // } else {
                    //     var remainder = idx % 12;
                    //     var floor = (Math.floor(idx / 6) * 15) + 10;
                    //     if (remainder < 6) return "translate(" + (remainder * 20 + 20) + "," + floor + ")";
                    //     else return "translate(" + (240 - remainder * 20) + "," + floor + ")";
                    // }

                });

            node.append('rect')
                .attr('class', 'node')
                .attr("x", function(syp, idx) {
                    // if (d['syp'].length < 16) {
                    //     return -12
                    // } else if (d['syp'].length > 15 && d['syp'].length < 25) {
                    //     return -10
                    // } else {
                    //     return -8
                    // }
                    return -12
                })
                .attr("y", function(syp, idx) {
                    // if (d['syp'].length < 16) {
                    //     return -6
                    // } else if (d['syp'].length > 15 && d['syp'].length < 25) {
                    //     return -5
                    // } else {
                    //     return -4
                    // }
                    return -6
                })
                .attr('width', function(syp, idx) {
                    // if (d['syp'].length < 16) {
                    //     return 24
                    // } else if (d['syp'].length > 15 && d['syp'].length < 25) {
                    //     return 20
                    // } else {
                    //     return 16
                    // }
                    return 24
                })
                .attr('height', function(syp, idx) {
                    // if (d['syp'].length < 16) {
                    //     return 12
                    // } else if (d['syp'].length > 15 && d['syp'].length < 25) {
                    //     return 10
                    // } else {
                    //     return 8
                    // }
                    return 12
                })
                .attr('fill', function(syp) {
                    var key = syp.event_type;
                    return type_color[key];
                })
                .style('fill-opacity', 1)

            node.append('text')
            .text(function(syp, idx) {
                var icdcode = syp.icd_code;
                var type = syp.event_type;
                let label = '';
                if (type === 'Treatments') {
                    label = treatment[icdcode];
                } else {
                    label = disease[icdcode];
                }
                return label.slice(0,3).replace(/(^\s*)|(\s*$)/g,"");
            })
            .attr('fill', '#FFFFFF')
            .attr('font-size', 10)
            .attr('font-family', 'PingFangSC-Thin')
            .style("pointer-events","none")
            .style('-webkit-user-select','none')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')

            var endNode = element.select('.cgroup')
                .append('g')
                .attr('class', 'node')
                .datum(d['syp'][d['syp'].length-1])
                .attr("transform", function(syp) {
                    let idx = d['syp'].length-1
                    var remainder = idx % 6;
                    var floor = (Math.floor(idx / 3) * 19) + 15;
                    if (remainder < 3) return "translate(" + (remainder * 31 + 26) + "," + floor + ")";
                    else return "translate(" + (181 - remainder * 31) + "," + floor + ")";

                    // if (d['syp'].length < 16) {
                    //     var remainder = idx % 6;
                    //     var floor = (Math.floor(idx / 3) * 30) + 15;
                    //     if (remainder < 3) return "translate(" + (remainder * 40 + 30) + "," + floor + ")";
                    //     else return "translate(" + (230 - remainder * 40) + "," + floor + ")";
                    // } else if (d['syp'].length > 15 && d['syp'].length < 25) {
                    //     var remainder = idx % 8;
                    //     var floor = (Math.floor(idx / 4) * 25) + 12.5;
                    //     if (remainder < 4) return "translate(" + (remainder * 30 + 25) + "," + floor + ")";
                    //     else return "translate(" + (235 - remainder * 30) + "," + floor + ")";
                    // } else {
                    //     var remainder = idx % 12;
                    //     var floor = (Math.floor(idx / 6) * 15) + 10;
                    //     if (remainder < 6) return "translate(" + (remainder * 20 + 20) + "," + floor + ")";
                    //     else return "translate(" + (240 - remainder * 20) + "," + floor + ")";
                    // }
                })
            // endNode.append('circle')
            //     .attr('class', 'end-node')
            //     .attr("cx", 0)
            //     .attr("cy", 0)
            //     .attr('r', function() {
            //         return 8;
            //     })
            //     .attr('fill', function(syp) {
            //         var key = syp.event_type;
            //         return type_color[key];
            //     })
            endNode.append('rect')
            .attr("x", function(syp, idx) {
                return -12
            })
            .attr("y", function(syp, idx) {
                return -6
            })
            .attr('width', function(syp, idx) {
                return 24
            })
            .attr('height', function(syp, idx) {
                return 12
            })
            .attr('fill', function(syp) {
                var key = syp.event_type;
                return type_color[key];
            })

            endNode.append('text')
            .text(function(syp, idx) {
                var icdcode = syp.icd_code;
                var type = syp.event_type;
                let label = '';
                if (type === 'Treatments') {
                    label = treatment[icdcode];
                } else {
                    label = disease[icdcode];
                }
                return label.slice(0,3).replace(/(^\s*)|(\s*$)/g,"");
            })
            .attr('fill', '#FFFFFF')
            .attr('font-size', 10)
            .attr('font-family', 'PingFangSC-Thin')
            .style("pointer-events","none")
            .style('-webkit-user-select','none')
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            

        $('.cgroup g.node').tipsy({
            gravity: 'n',
            html: true,
            fade: false,
            opacity: 0.7,
            title:function(){
                var syp = this.__data__
    
                var tip = '';
                if(syp.event_type=='Treatments'){
                    tip += "<div class='rect-tooltip'><div class='tooltip-item'>Treatment</div><div class='tooltip-item'>Name: "+treatment[syp.icd_code]+"</div></div>"
    
                } else {
                    tip += "<div class='rect-tooltip'><div class='tooltip-item'>Diagnosis</div><div class='tooltip-item'>ICD-9: "+syp.icd_code+"</div><div class='tooltip-item'>Name: "+disease[syp.icd_code]+"</div></div>"
                }
                return tip;
    
            }
            });
        })
        return patientinfo;
    };

    function show_time(time_value) {
        var parse = d3.time.format("%a %b %d %H:%M:%S +0000 %Y");
        var d = parse.parse(time_value).getTime();
        var a = new Date(d - 4 * 60 * 60 * 1000);
        var timeformat = d3.time.format("%H:%M:%S");
        return timeformat(a);
    };

    return patientinfo;
};
