/***
 * Converts geo location from degrees into decimal coordinates
 * @param degrees
 * @param direction
 * @returns {Number}
 */
function convertDEGtoDD(degrees, direction) {
    var dd = parseFloat(degrees);

    if (direction == "S" || direction == "W") {
        dd = dd * -1;
    } // Don't do anything for N or E
    return dd;
}



/***
 * Transform the data set into the structure we will be working with
 * @param d
 * @returns {*}
 */
function initItem(d) {
    var longTmp = d['Longitude'].replace('°', '').split(" ");
    var latTmp = d['Latitude'].replace('°', '').split(" ");

    d.LongDD = parseFloat(convertDEGtoDD(longTmp[0], longTmp[1]) + (Math.random() * 0.5 - 0.25)).toFixed(4);
    d.LatDD = parseFloat(convertDEGtoDD(latTmp[0], latTmp[1]) + (Math.random() *0.5 - 0.25)).toFixed(4);

    // London is always the source point
    d.sourceX = projection([0.1275, 51.5072])[0];
    d.sourceY = projection([0.1275, 51.5072])[1];

    d.destinyX = projection([d.LongDD, d.LatDD])[0];
    d.destinyY = projection([d.LongDD, d.LatDD])[1];

    var dx = d.destinyX - d.sourceX,
        dy = d.destinyY - d.sourceY;
    d.dr = Math.sqrt(dx * dx + dy * dy);
    d.arcOrientation = "0,1";

    // make sure arc is never upside down
    if (parseFloat(d.destinyX) < d.sourceX) {
        d.arcOrientation = "0,0";
    }

    return d;
}

function resonatePointsByRadar(radarX) {

    for (var iRow = 0; iRow < workingdata.length; iRow++) {
        if ((parseInt(workingdata[iRow].destinyX) > parseInt(radarX) ) && (parseInt(workingdata[iRow].destinyX) < parseInt(radarX) + parseInt(setting.radarWidth))) {
            if (resonatingPoints[iRow]) continue;

            gDataPoints
                .append("circle")
                .style("fill", "white")
                .style("opacity", 0.8)
                .attr("cx", workingdata[iRow].destinyX)
                .attr("cy", workingdata[iRow].destinyY)
                .attr("r", 1 / currentZoom)
                .transition()
                .duration(500)
                .ease("bounce")
                .style("opacity", 0)
                .attr("r", 10 / currentZoom)
                .remove()

            resonatingPoints[iRow] = true;
        }
    }
}

function animateRadar() {

    if (!setting.animateRadar) return;

    // clear the array of resonating points, so they can resonate again
    resonatingPoints = [];

    // transition radar from left to right
    radar
        .attr("x", -setting.radarWidth * 2)
        .transition()
        .duration(setting.radarDuration)
        .tween("side-effects", function () {
            return function () {
                resonatePointsByRadar(d3.select(this).attr('x'));
            }
        })
        .ease("linear")
        .attr("x", setting.mapWidth)
        .each("end", animateRadar)
}

function populateFilter(data, field, selector_id) {
    filteredData = [];

    for (key in data) {
        if (selector_id == 'year') {
            // add every start and end year to a single array
            if (filteredData.indexOf(data[key]['yearStart']) < 0) {
                filteredData.push(data[key]['yearStart']);
            }
            if (filteredData.indexOf(data[key]['yearEnd']) < 0) {
                filteredData.push(data[key]['yearEnd']);
            }
        } else {
            if (filteredData.indexOf(data[key][field]) < 0) {
                filteredData.push(data[key][field]);
            }
        }
    }

    // if year, fill up the intermediate years
    if (selector_id == "year") {
        var minYear = Math.min.apply(null, filteredData),
            maxYear = Math.max.apply(null, filteredData);

        for (var iYear = minYear; iYear <= maxYear; iYear++) {
            if (filteredData.indexOf(iYear.toString()) < 0) {
                filteredData.push(iYear.toString());
            }
        }
    }

    filteredData.sort(function (a, b) {
        return a.toLowerCase().localeCompare(b.toLowerCase());
    });

    var sel = document.getElementById(selector_id);
    var opt = document.createElement('option');
    opt.innerHTML = '-- All --';
    opt.value = '';
    sel.appendChild(opt);
    for (var i = 0; i < filteredData.length; i++) {
        var opt = document.createElement('option');
        opt.innerHTML = filteredData[i];
        opt.value = filteredData[i];
        sel.appendChild(opt);
    }
}


var QueryString = function () {
    // This function is anonymous, is executed immediately and
    // the return value is assigned to QueryString!
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = decodeURIComponent(pair[1]);
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            query_string[pair[0]].push(decodeURIComponent(pair[1]));
        }
    }
    return query_string;
}();

function animationsManager(flag) {

    // if it's set to not animate, abort
    if (!setting.animateConnections) flag = false;

    // we never animate if we are printing
    if (bPrinting) flag = false;

    if (flag)
        connectionAnimations = setInterval(animateConnections, (Math.random() + 0.5) * setting.connectionRefresh);
    else
        clearInterval(connectionAnimations);
}

function printMap() {
    var svg1 = jQuery('#chart').html().replace(/>\s+/g, ">").replace(/\s+</g, "<");

    canvg('cvs', svg1, {
        ignoreMouse: true,
        ignoreAnimation: true
    });

    var canvas = document.getElementById('cvs');

    img = canvas.toDataURL("image/png", 1);

    var a = document.createElement('a');
    a.href = img;
    a.download = "image.png";
    var clickEvent = new MouseEvent("click", {
        "view": window,
        "bubbles": true,
        "cancelable": false
    });
    a.dispatchEvent(clickEvent);

    parent.document.getElementById('exportImageBtn').value = 'export';
}
