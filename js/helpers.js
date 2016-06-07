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
    d.LatDD = parseFloat(convertDEGtoDD(latTmp[0], latTmp[1]) + (Math.random() * 0.5 - 0.25)).toFixed(4);

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


    // fill side menu
    if (selector_id == 'Language') {

        // the "All languages" item
        listLanguage("ALL", 0);

        for (var iLanguage = 1; iLanguage <= filteredData.length; iLanguage++) {
            listLanguage(filteredData[iLanguage-1], iLanguage);
        }
    }
}

function listLanguage(language, iLanguage) {

    if (language === undefined) return;

    var thisLanguage = menu.append('g')
        .style('cursor', 'pointer')

    thisLanguage.append('rect')
        .classed('menu-language', true)
        .attr('x', 0)
        .attr('y', iLanguage * (parseInt(setting.menuFontSize.replace('px')) + 10) + 150)
        .attr('width', setting.menuWidht)
        .attr('height', 20)
        .style('fill', 'rgba(200,200,120,0.0)')
        .on('mouseover', function () {
            d3.selectAll('.menu-language')
                .attr('fill', '#ccc')
                .style('font-weight', 'normal')
                .style('fill', 'rgba(200,200,120,0.0)')

            d3.select(this)
                .attr('fill', '#ffa')
                .style('font-weight', 'bold')
                .style('fill', 'rgba(200,200,120,0.4)')

            //var language = $(this).html() == "ALL" ? "" : $(this).html();
            language = language == "ALL" ? "" : language;
            loadData("Language", language);

        })

    thisLanguage.append('text')
        .attr('font-family', 'sans-serif')
        .attr('font-size', setting.menuFontSize)
        .attr('fill', '#ccc')
        .attr('x', 10)
        .attr("y", iLanguage * (parseInt(setting.menuFontSize.replace('px')) + 10) + 165)
        .text(language)
        .style('cursor', 'pointer')
        .on('mouseover', function () {

        })

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

    parent.document.getElementsByClassName('loading')[0].style.display = 'none';
}


function svgLabel(x, y, text) {
    var lbl_height = 20;

    var thisLabel = menu.append('g')
        .classed('svgLabel', true)
        .style("cursor", "default")

    thisLabel.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', setting.menuWidht)
        .attr('height', lbl_height)
        .style('fill', '#00859b')


    thisLabel.append('text')
        .attr('font-family', 'sans-serif')
        .attr('font-size', setting.menuSubtitleFontSize)
        .attr('fill', '#ccf')
        .attr('x', x + 5)
        .attr("y", y + 15)
        .text(text)

}

function D3Checkbox(x, y, name, initialStatus, method) {
    this.x = x;
    this.y = y;
    this.name = name;
    this.status = initialStatus || false;

    var thisCheckbox = this;

    this.clicked = function () {
        thisCheckbox.status = !thisCheckbox.status;
        thisCheckbox.d3object = svgCheckbox(x, y, name, method, thisCheckbox.status, thisCheckbox);
        method();
    }
    this.d3object = svgCheckbox(x, y, name, method, this.status, this);

}

function svgCheckbox(x, y, text, method, checked, caller) {

    menu.select('#language_' + text.split(' ').join('_')).remove()

    var thisCheckbox = menu.append('g')
        .attr('id', 'language_' + text.split(' ').join('_'))
        .classed('svgCheckbox', true)
        .style("cursor", "pointer")
        .on('click', caller.clicked)

    thisCheckbox.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', 'rgba(200,200,200,0.9)')


    if (checked) {
        thisCheckbox.append('path')
            .attr('d', 'M' + x + ' ' + (y + 5) + ' L' + (x + 5) + ' ' + (y + 10) + ' L' + (x + 12) + ' ' + (y -2))
            .style('stroke', 'gray')
            .style('stroke-width', '4px')
            .style('fill', 'rgba(0,0,0,0)')


        thisCheckbox.append('path')
            .attr('d', 'M' + x + ' ' + (y + 5) + ' L' + (x + 5) + ' ' + (y + 10) + ' L' + (x + 12) + ' ' + (y -2))
            .style('stroke', '#33F')
            .style('stroke-width', '2px')
            .style('fill', 'rgba(0,0,0,0)')
    }

    thisCheckbox.append('text')
        .attr('font-family', 'sans-serif')
        .attr('font-size', setting.menuFontSize)
        .attr('fill', '#ccc')
        .attr('x', x + 15)
        .attr("y", y + 10)
        .text(text)

    return thisCheckbox;

}

function svgSeparator(x, y) {
    var thisSeparator = menu.append('line')
        .attr('x1', x + 10)
        .attr('y1', y)
        .attr('x2', x + setting.menuWidht - 10)
        .attr('y2', y)
        .style('stroke', '#666')

}

function svgButton(x, y, text, method) {
    var btn_height = 20;

    var thisButton = menu.append('g')
        .classed('svgButton', true)
        .style("cursor", "pointer")
        .on('click', method)

    thisButton.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', setting.menuWidht - 40)
        .attr('height', btn_height)
        .style('fill', 'rgba(150,150,150,0.9)')

    thisButton.append('line')
        .attr('x1', x)
        .attr('y1', y)
        .attr('x2', x + setting.menuWidht - 40)
        .attr('y2', y)
        .style('stroke', 'white')

    thisButton.append('line')
        .attr('x1', x)
        .attr('y1', y)
        .attr('x2', x)
        .attr('y2', y + btn_height)
        .style('stroke', 'white')

    thisButton
        .append('text')
        .attr('font-family', 'sans-serif')
        .attr('font-size', setting.menuFontSize)
        .attr('fill', '#000')
        .attr('x', setting.menuWidht / 2)
        .attr("y", y + 15)
        .attr('font-weight', 'bold')
        .text(text)
        .style("text-anchor", "middle")
}

function closetooltip() {
    tooltip.transition()
        .style('opacity', 0)
        .style('display', 'none');

    d3.selectAll('.target')
        .style('r', setting.targetRadio / currentZoom)

    // restores the width of all the connections
    d3.selectAll('.connection')
        .style('stroke-width', (1 / currentZoom) + 'px')

    // restart connection animations
    animationsManager(true);

    bTooltipActive = false;
}
