// DATA ARRAYS
var alldata = [],           // loaded data from CSV
    workingdata = [],       // filtered data
    filters = [],           // filters set
    aConnections = [],      // arc lines between source and destiny
    resonatingPoints = [];  // target points, to animate radar

// FLAGS:
var bDataLoaded = false;    // flag so we only read the CSV file once

// STATUS VARIABLES
var currentZoom = 1,
    iAnimateConnection = 0,
    connectionAnimations;

// SVG OBJECTS
var gDataPoints,
    gConnections,
    radar,
    menu;

// SETTINGS
var setting = {
    dataFile: 'languages.csv'       // the source data file
    , svgHeight: '100vh'            // SVG area height
    , svgWidth: '100vw'             // SVG area width
    , maxLong: 188                  // the limit of world longitude (180)
    , maxLat: 93                    // the limit of world latitude (90)
    , mapImageRatio: 0.5            // ration between width and height
    , projectionScale: 200          // scale for projection (automatically updated when printing)
    , mapWidth: 960                 // map Width
    , mapHeight: 480                // map Height
    , targetRadio: 5                // radio of the target circle
    , radarWidth: 150               // width of the radar's tail
    , radarMaxOpacity: 0.15         // opacity of the radar at the brightest line
    , radarDuration: 7500           // milliseconds for the radar to complete a loop
    , connectionFadeOut: 5000       // milliseconds for the connection lines to fade out
    , connectionRefresh: 300        // milliseconds factor for the connection lines to refresh after fadeout
    , animateRadar: false           // flag to turn on/off the radar
    , animateConnections: true      // flag to turn on/off the data connection fadeout and refresh
    , menuWidht: 140                // filter menu width
    , menuFontSize: '12px'          // font size in filter menu
    , menuSubtitleFontSize: '14px'  // title font size in filter menu
}

// PROFICIENCY COLOUR MAPPING
var proficiencyColor = [];
proficiencyColor[1] = '#f2a900';
proficiencyColor[2] = '#63666a';
proficiencyColor[3] = '#00859b';
proficiencyColor[4] = '#cca1a6';
proficiencyColor[5] = '#9398cc';
proficiencyColor[6] = '#6ad1e3';
proficiencyColor[7] = '#b52555';
proficiencyColor[8] = '#e03c31';
proficiencyColor[9] = '#a4d65e';
proficiencyColor[10] = '#5c068c';
proficiencyColor[11] = '#f0e1cf';

// PARAMETERS
var bPrinting = QueryString.p == "1" ? true : false;

// PRINTING / VIEW RECONFIGURATION
if (bPrinting) {
    setting.svgWidth = '200vw';
    setting.svgHeight = '200vh';
    setting.projectionScale = 400;
} else {
    setting.svgWidth = '100vw';
    setting.svgHeight = '100vh';
    setting.projectionScale = 200;
}

var theSVG = d3.select('#chart')
    .append('svg')
    .attr('id', 'svg')
    .style('width', setting.svgWidth)
    .style('height', setting.svgHeight)

if (bPrinting) {
    theSVG.style('display', 'none');
}

// get the width from the screen (so remove the 'px' at the end)
setting.mapWidth = theSVG.style("width").replace('px', '');
// calculate the height based on the weight, preserverving the ratio (make it an int)
setting.mapHeight = parseInt(parseFloat(setting.mapWidth) * parseFloat(setting.mapImageRatio));

theSVG
    .attr('width', setting.mapWidth)
    .attr('height', setting.mapHeight)
    .attr("xmlns", "http://www.w3.org/2000/svg")

var projection = d3.geo.equirectangular()
    .scale(setting.projectionScale)
    .translate([setting.mapWidth / 2, setting.mapHeight / 2])

var path = d3.geo.path()
    .projection(projection);

// zoom and pan
var zoom = d3.behavior.zoom()
    .on("zoom", function () {
        currentZoom = zoom.scale();

        g.attr("transform", "translate(" +
            d3.event.translate.join(",") + ")scale(" + d3.event.scale + ")");

        d3.selectAll('.target')
            .style('r', setting.targetRadio / currentZoom)

        g.selectAll("path")
            .style("stroke-width", function (d) {
                var nStrokeWidth = $(this).css("stroke-width").replace("px", "");
                nStrokeWidth = nStrokeWidth != 0 ? 1 : nStrokeWidth;
                return nStrokeWidth / currentZoom + "px";
            })

        g.selectAll("#country-borders")
            .style('stroke-width', 0.2 / currentZoom + "px")

    });
theSVG.call(zoom)

var g = theSVG.append("g")
    .call(zoom);

g.append("rect")
    .attr("class", "background")
    .attr("width", setting.mapWidth)
    .attr("height", setting.mapHeight);

var graticule = d3.geo.graticule();

g.append("path")
    .datum(graticule)
    .attr("d", path)
    .style('fill', 'none')
    .style('stroke', '#336')
    .style('stroke-width', '.5px')
    .style('stroke-opacity', '.5')

d3.select(self.frameElement).style("height", setting.mapHeight + "px");

d3.json("world-50m.json", function (error, world) {
    if (error) throw error;

    g.append("g")
        .attr("id", "countries")
        .selectAll("path")
        .data(topojson.feature(world, world.objects.countries).features)
        .enter().append("path")
        .attr("d", path)
        .style('stroke', '#333')
        .style('fill', '#161616')          //#111
        .style('stroke-width', '1px')

    g.append("path")
        .datum(topojson.mesh(world, world.objects.countries, function (a, b) {
            return a !== b;
        }))
        .attr("id", "country-borders")
        .attr("d", path)
        .style('stroke', '#666') //#044
        .style('fill', 'none')
        .style('stroke-width', '0.2px')
        .style('stroke-linejoin', 'round')
        .style('stroke-linecap', 'round')
        .style('pointer-events', 'none')

    radar = g.append("rect")
        .attr("width", setting.radarWidth)
        .attr("height", setting.mapHeight)
        .style("fill", "url(#gradient)")
        .style("display", "inline")
        .attr("x", -setting.radarWidth)


    menu = theSVG.append('g')

    var menuBackground = menu.append('rect')
        .attr('width', setting.menuWidht)
        .attr('height', setting.mapHeight)
        .style('fill', 'rgba(50,50,50,0.7)')
    var menuline = menu.append('line')
        .attr('x1', setting.menuWidht)
        .attr('x2', setting.menuWidht)
        .attr('y1', 0)
        .attr('y2', setting.mapHeight)
        .style('stroke', 'white')
        .style('stroke-width', '1px')

    svgButton(20, 10, 'reset', function () {
        location.reload();
    });
    svgButton(20, 35, 'export', function () {
        $('.loading').show();
        document.getElementById('printingIFrame').src = "index.html?p=1";
    });
    svgLabel(0, 60, 'Animations:');

    var radarCheckbox = new D3Checkbox(20, 85, 'Radar', setting.animateRadar, function () {
        setting.animateRadar = radarCheckbox.status;
        animateRadar();
    });

    var connectionsCheckbox = new D3Checkbox(20, 105, 'Connections', setting.animateConnections, function () {
        setting.animateConnections = connectionsCheckbox.status;
        animationsManager(setting.animateConnections);
        displayData();
    });
    svgLabel(0, 125, 'Languages Filter:');

    loadData();
});

var gradient = theSVG.append("defs")
    .append("linearGradient")
    .attr("id", "gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0")
    .attr("spreadMethod", "pad");

gradient.append("stop")
    .attr("offset", "0")
    .attr("stop-color", "white")
    .attr("stop-opacity", 0);

gradient.append("stop")
    .attr("offset", "1")
    .attr("stop-color", "white")
    .attr("stop-opacity", setting.radarMaxOpacity);

var tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')


function loadData(filterBy, filterValue) {

    // update the filters array
    if (filterBy != null) {
        filters[filterBy] = filterValue;
    }

    if (!bDataLoaded) {
        // --- load the data set
        workingdata = [];
        d3.csv(setting.dataFile, function (data) {

            data = data.map(initItem);

            // populate filters
            populateFilter(data, 'Language', 'Language');

            for (key in data) {
                alldata.push(data[key])
            }

            workingdata = alldata.slice(0);
            bDataLoaded = true;

            $(".loading").hide();
            $(".container").show();

            setting.connectionRefresh = 10000 / data.length;
            // start animations
            animationsManager(true);

            displayData();
        });
    } else {
        workingdata = [];

        for (var iRow = 0; iRow < alldata.length; iRow++) {

            // row will tentatively be selected
            var bSelectRow = true;

            //for (var iFilter=0; iFilter<filters.length; iFilter++) {
            for (key in filters) {

                // if the filter is empty, then we don't check against it
                if (filters[key] == "") continue;

                if (alldata[iRow][key] != filters[key]) {
                    bSelectRow = false;
                }
            }

            // if passed the filters, then add it to the working data set
            if (bSelectRow) {
                workingdata.push(alldata[iRow]);
            }
        }
        displayData();
    }
    animateRadar();
}


function createConnection(connection, iRow) {
    var pathConnection = gConnections.append('path')
        .attr("id", "connection" + iRow)
        .attr("d", "M"
            + parseFloat(connection.sourceX)
            + "," + parseFloat(connection.sourceY)
            + "A" + parseInt(connection.dr) + "," + parseInt(connection.dr)
            + " 0 " + connection.arcOrientation + " "
            + parseFloat(connection.destinyX) + ","
            + parseFloat(connection.destinyY)
        )
        .classed('connection', true)
        .classed(connection.Name.split(' ').join('_'), true)
        .style('stroke-width', (1 / currentZoom) + 'px')
        .style('stroke', proficiencyColor[connection.proficiency])
        .style('fill', 'rgba(0, 0, 0, 0)')

    if (!bPrinting) animateConnection(pathConnection, iRow);

    return pathConnection;
}


function animateConnection(thisConnection, iRow) {
    if (thisConnection == undefined) return;

    var totalLength = thisConnection.node().getTotalLength();

    var thisDuration = 0,
        thisDelay = 0;
    // there are no animations if we are printing
    if (!bPrinting) {
        thisDuration = 100 * (Math.random() * iRow + 10);
        thisDelay = 100 * (Math.random() * iRow );
    }

    if (setting.animateConnections) {
        thisConnection
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(thisDuration)
            .delay(thisDelay)
            .ease("linear")
            .attr("stroke-dashoffset", 0)
            .style('opacity', 1)
            .transition()
            .duration(setting.connectionFadeOut)
            .ease("linear")
            .style('opacity', 0)
    } else {
        thisConnection
            .attr("stroke-dasharray", totalLength + " " + totalLength)
            .attr("stroke-dashoffset", totalLength)
            .transition()
            .duration(thisDuration)
            .delay(thisDelay)
            .ease("linear")
            .attr("stroke-dashoffset", 0)
    }
}


function displayData() {

    // clear previous connections
    d3.select('#datapoints').remove();
    d3.select('#dataconnections').remove();

    // Connections
    gConnections = g.append('g')
        .attr('id', 'dataconnections')

    var nTransitionsCompleted = 0;
    for (var iRow = 0; iRow < workingdata.length; iRow++) {
        aConnections[iRow] = createConnection(workingdata[iRow], iRow);
    }

    // Destiny points:
    gDataPoints = g.append('g')
        .attr('id', 'datapoints')

    gDataPoints.selectAll("circle")
        .data(workingdata)
        .enter()
        .append("circle")
        .attr("class", "target")
        .style('fill', function (d) {
            return proficiencyColor[d.proficiency];
        })
        .style('opacity', 0.5)
        .attr("cx", function (d) {
            return projection([d.LongDD, d.LatDD])[0];
        })
        .attr("cy", function (d) {
            return projection([d.LongDD, d.LatDD])[1];
        })
        .attr("r", setting.targetRadio / currentZoom)
        .on('mouseover', function (d) {

            // connection animations are stopped, so we can highlight this person connections
            animationsManager(false);

            // display the tooltip with the connection details
            bTooltipActive = true;
            tooltip.transition()
                .style('display', 'inline')
                .style('opacity', 0.9)
            var tmpHtml = '<a href="javascript:closetooltip()">close</a>' +
                '<table style="max-width:600px">'
                + '<tr><th>Name:</th><th>' + d.Name + '</th></tr>'
                + '<tr><th>Languages:</th><td>' + languagesTable(d.Name) + '</td></tr>'
                + '<tr><th>Proficiency: </th><td>' + d.proficiency + '</td></tr>'
            tmpHtml += '</table>';
            tooltip.html(tmpHtml)
                .style('left', (d3.event.pageX + 10) + 'px')
                .style('top', (d3.event.pageY + 10) + 'px')

            //reset all target radio
            d3.selectAll('.target')
                .style('r', setting.targetRadio / currentZoom)

            // makes this radio bigger
            d3.select(this)
                .style('r', setting.targetRadio * 2 / currentZoom)

            // removes the width of all the connections
            d3.selectAll('.connection')
                .style('stroke-width', '0px')

            // increase the width of all the connections for this person
            d3.selectAll('.' + d.Name.split(' ').join('_'))
                .transition()
                .delay(1)
                .attr("stroke-dashoffset", 0)
                .style('opacity', 1)
                .style('stroke-width', (1 / currentZoom) + 'px')
        })

    if (bPrinting) {
        theSVG.style('display', 'inline');
        printMap();
        theSVG.style('display', 'none');
    }
}

function languagesTable(personName) {
    var htmlTable = '';
    for (key in alldata) {
        if (alldata[key].Name == personName) {
            htmlTable += '<span style="color:' + proficiencyColor[alldata[key].proficiency] + '"><strong>' + alldata[key].Language + '</strong></span><BR />'
        }
    }
    return htmlTable;
}

$(document).ready(function () {

    $("#printingIFrame").width('100vw');
    $("#printingIFrame").height('100vh');
})

function animateConnections() {
    iAnimateConnection++;
    if (iAnimateConnection >= aConnections.length) iAnimateConnection = 0;

    animateConnection(aConnections[iAnimateConnection], iAnimateConnection);
}
