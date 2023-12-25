var Util = {};

Util.post = function(url, params, callback) {
    d3.json(url, {
        method: "POST",
        body: JSON.stringify(params),
        headers: {
            "Content-type": "application/json; charset=UTF-8"
        }
    }).then(function(data) {
        callback(data);
    });
};

Util.get = function(url, params, callback) {
    if (params == null) params = "";
    else params = "?" + params;
    d3.json(url + params,{
        method:"GET"
    }).then(function(data){
        callback(data);
    });
};

Util.getSync = function(url, params, callback) {
    $.ajax({
        type:'GET',
        data:params,
        contentType:"application/json; charset=UTF-8",
        url: url,
        success: function (data) {
            callback(data);
        },
        async: false
    });
};

Util.postSync = function(url, params, callback) {
    console.log('start post request')
    $.ajax({
        type:'POST',
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        url: url,
        data: JSON.stringify(params),
        success: function (data) {
            console.log('post success')
            callback(data);
        },
        async: true
    });
};

Util.getTranslate=function(transform){
    return transform.substring(transform.indexOf("(")+1, transform.indexOf(")")).split(",");
}

Util.second2Days=function(secs){
    return secs/86400;
}

Util.second2Minute=function(secs){
    return secs/60;
}

Util.second2Year=function(secs){
    return secs/(86400*365);
}

Util.unix2Date=function(unix){
    let date=new Date(unix*1000).toDateString();
    return date;
}

Util.getRandomInt=function(max){
    return Math.floor(Math.random() * Math.floor(max));
}

Util.getRandomPic=function(gender){
    var picnumFormat=d3.format("03d");
    if(gender=="F"){
        pic_num=Util.getRandomInt(Data.femalePics+1);
        direct="Female";
    }else{
        pic_num=Util.getRandomInt(Data.malePics+1);
        direct="Male";
    }
    return "../../static/img/face/"+direct+"/"+picnumFormat(pic_num)+gender.toLowerCase()+".jpg";
}

Util.getProfilePic=function(){
    return "../../static/img/face/Male/071m.jpg";
}

Util.createArray=function(length){
    var arr = new Array(length || 0),
        i = length;
    if (arguments.length > 1) {
        var args = Array.prototype.slice.call(arguments, 1);
        while(i--) arr[length-1 - i] = Util.createArray.apply(this, args);
    }
    return arr;
}

Util.getTooltipHtml = function(obj){
    let html="<div class='tooltip-div'>"
    for(let key in obj){
        let item_html="<div class='tooltip-item'>"+key+":"+obj[key]+"</div>"
        html+=item_html;
    }
    html+="</div>"
    return html;
}

