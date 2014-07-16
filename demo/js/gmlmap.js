/*
    GML Map Tool v1.0
    copyright: Alexander Perucci
    license: Mozilla Public License Version 2.0
*/

var map;
var geocoder;
var xml_gml;
var originMarker;
var markers = [];

google.maps.event.addDomListener(window, 'load', initialize);
function initialize() {
    var oirigin_marker_position = new google.maps.LatLng(42.35001701860846, 13.401266455078144);

    var mapOptions = {
        zoom: 12,
        center: oirigin_marker_position,
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
        }

    };

    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    // set origin marker in maps
    originMarker = new google.maps.Marker({
        id: 0,
        position: oirigin_marker_position,
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        raiseOnDrag: true,
        icon: 'http://mt.google.com/vt/icon?psize=30&font=fonts/arialuni_t.ttf&color=ff304C13&name=icons/spotlight/spotlight-waypoint-a.png&ax=43&ay=48&text=%E2%80%A2'
    });

    // This event listener will call addMarker() when the map is clicked.
    google.maps.event.addListener(map, 'click', function (event) {
        addMarker(event.latLng);
    });

    // add control menu
    var menu = /** @type {HTMLInputElement} */ (document.getElementById('custom_menu'));
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(menu);
    // add control search
    var search = /** @type {HTMLInputElement} */ (document.getElementById('inputsearch'));
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(search);

    var autocomplete = new google.maps.places.Autocomplete(search);
    autocomplete.bindTo('bounds', map);


    google.maps.event.addListener(autocomplete, 'place_changed', function () {

        var place = autocomplete.getPlace();
        if (!place.geometry) {
            return;
        }

        // If the place has a geometry, then present it on a map.
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17); // Why 17? Because it looks good.
        }
        addMarker(place.geometry.location);

        geocoder = new google.maps.Geocoder();

    });



    /*per generare la linea nella mappa*/
    var polyOptions = {
    strokeColor: '#000000',
    strokeOpacity: 1.0,
    strokeWeight: 3
  };
  poly = new google.maps.Polyline(polyOptions);
  poly.setMap(map);

}

var guid = (function () {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return function () {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };
})();



// Add a marker to the map and push to the array.
function addMarker(location) {
    var marker = new google.maps.Marker({
        id: guid(),
        position: location,
        map: map,
        draggable: true,
        animation: google.maps.Animation.DROP,
        raiseOnDrag: true
    });
    markers.push(marker);

    google.maps.event.addListener(marker, 'rightclick', function (event) {
        //remove marker array
        var index = markers.indexOf(this);
        markers.splice(index, 1);
        this.setMap(null);
    });

}

// Sets the map on all markers in the array.
function setAllMap(map) {
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(map);
    }
}

// Removes the markers from the map, but keeps them in the array.
function hideMarkers() {
    setAllMap(null);
}

// Shows any markers currently in the array.
function showMarkers() {
    setAllMap(map);
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
    hideMarkers();
    markers = [];
}

// calcolate distanze marker
function get_origin() {
    origin = [new google.maps.LatLng(originMarker.position.lat(), originMarker.position.lng())];
    for (var key in markers) {

        var mark = new google.maps.LatLng(markers[key].position.lat(), markers[key].position.lng());
        origin.push(mark);
    }
    return origin;
}

function calculateDistances() {
    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({

        origins: get_origin(),
        destinations: get_origin(),
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
    }, callback);
}

function callback(response, status) {
    if (status != google.maps.DistanceMatrixStatus.OK) {
        alert('Error was: ' + status);
    } else {
       writeResultsNodes(response);
        writeResultsDistances(response);
         writeResultsGML(response);
    }
}

function writeResultsNodes(response){
    var origins = response.originAddresses;
     var jsonArr = [];
        for (var i = 0; i < origins.length; i++) {
            jsonArr.push({
                id: i + 1,
                name: origins[i]
            });
        }
        $('#resultsNode').val(JSON.stringify(jsonArr)).format({method: 'json'}); 
}

function writeResultsDistances(response){
    var origins = response.originAddresses;
    var resultsDistance = '';
    var distanceType = $('.distanceType input:checked').val();
    for (var i = 0; i < origins.length; i++) {
        var results = response.rows[i].elements;
        for (var j = 0; j < results.length; j++) {
            if (results[j].status == google.maps.GeocoderStatus.OK){
                resultsDistance += '--- FROM  node_ [' + (i + 1) + '] TO node_ [' + (j + 1) + '] : ' + results[j][distanceType].value + '\n';
            }
        }
    }
    $('#resultsDistances').val(resultsDistance);
}

function writeResultsGML(response){
    $('#resultsGML').val(createGML(response)).format({method: 'xml'});
}


function getJSONNodes() {
    var jsonArr = [];

    for (var i = 0; i < markers.length + 1; i++) {
        jsonArr.push({
            id: (i + 1),
            x: (i == 0) ? 43 : (Math.floor(Math.random() * 100) + 1),
            y: (i == 0) ? 50 : (Math.floor(Math.random() * 100) + 1)
        });
    }
    return jsonArr;
}

function getJSONEdge(data) {
    var origins = data.originAddresses;
    var jsonArr = [];
    for (var i = 0; i < origins.length; i++) {
        var results = data.rows[i].elements;
        for (var j = 0; j < results.length; j++) {
            if (results[j].status == google.maps.GeocoderStatus.OK){
                if (results[j].distance.value != 0) {
                    jsonArr.push({
                        source: i + 1,
                        target: j + 1,
                        distance: results[j].distance.value
                    });
                }
            }
        }
    }

    return jsonArr;
}

function createGML(data) {
    var source = "<?xml version=\"1.0\" encoding=\"utf-8\"?><graphml xmlns=\"http://graphml.graphdrawing.org/xmlns\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd\">" +
        "<key attr.name= \"dist\" attr.type=\"int\" for=\"edge\" id=\"d2\" />" +
        "<key attr.name=\"x\" attr.type=\"int\" for=\"node\" id=\"d1\" />" +
        "<key attr.name=\"y\" attr.type=\"int\" for=\"node\" id=\"d0\" />" +
        "<graph edgedefault=\"directed\">" +
        "{{#each nodes}}<node id=\"{{id}}\"><data key=\"d0\">{{y}}</data><data key=\"d1\">{{x}}</data></node>{{/each}}" +
        "{{#each edges}}<edge source=\"{{source}}\" target=\"{{target}}\"><data key=\"d2\">{{distance}}</data></edge>{{/each}}" +
        "</graph>" +
        "</graphml>";
    //variables you want to replace are inside {{ }} 
    var template = Handlebars.compile(source);

    var context = {
        nodes: getJSONNodes(),
        edges: getJSONEdge(data),
    };

    var gml = template(context);
    return gml;
}


function downloadGML(strData, strFileName, strMimeType) {
    var D = document,
        a = D.createElement("a");
        strMimeType= strMimeType || "application/octet-stream";

    if (navigator.msSaveBlob) { // IE10+
        return navigator.msSaveBlob(new Blob([strData], {type: strMimeType}), strFileName);
    } /* end if(navigator.msSaveBlob) */



    if ('download' in a) { //html5 A[download]
        if(window.URL){
            a.href= window.URL.createObjectURL(new Blob([strData]));
            
        }else{
            a.href = "data:" + strMimeType + "," + encodeURIComponent(strData);
        }
        a.setAttribute("download", strFileName);
        a.innerHTML = "downloading...";
        D.body.appendChild(a);
        setTimeout(function() {
            a.click();
            D.body.removeChild(a);
            if(window.URL){setTimeout(function(){ window.URL.revokeObjectURL(a.href);}, 250 );}
        }, 66);
        return true;
    } /* end if('download' in a) */

    
    //do iframe dataURL download (old ch+FF):
    var f = D.createElement("iframe");
    D.body.appendChild(f);
    f.src = "data:" +  strMimeType   + "," + encodeURIComponent(strData);

    setTimeout(function() {
        D.body.removeChild(f);
    }, 333);
    return true;
} /* end download() */

function handleSolutionUpload(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(loadedFileEvent) {
        var solutionContent = loadedFileEvent.target.result;
        setSolutionInMap(solutionContent);
    }
    reader.readAsBinaryString(file);
}

/*
    WRITE SOLUTION IN MAP
    Note: solution is a json string.
*/
function setSolutionInMap(solution){
    var jsonSolution = jQuery.parseJSON(solution);
    var allMarkers=get_origin();
   
    if (jsonSolution.path){
        /* se e' TRUE viene messo nella mappa il percorso stradale */
        
        for (var key in jsonSolution.arcs) {
            var rendererOptions = {
                preserveViewport: true,         
                suppressMarkers:false
            };
            var directionsService = new google.maps.DirectionsService();
            var request = {
                origin: allMarkers[jsonSolution.arcs[key].source-1], 
                destination: allMarkers[jsonSolution.arcs[key].target-1],
                travelMode: google.maps.TravelMode.DRIVING
            };

            var directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
            directionsDisplay.setMap(map);

            directionsService.route(request, function(result, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                    directionsDisplay.setDirections(result);
                }
            });
        }

    } else {
        /* se e' FALSE viene disegnato nella mappa un arco */
        for (var key in jsonSolution.arcs) {
             //var lineSymbol = { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW };
             var lineSymbol = { path: google.maps.SymbolPath.FORWARD };
             var lineCoordinates = [
                    allMarkers[jsonSolution.arcs[key].source-1],
                    allMarkers[jsonSolution.arcs[key].target-1]
             ];
             var line = new google.maps.Polyline({
                path: lineCoordinates,
                icons: [{
                    icon: lineSymbol,
                    offset: '100%'
                }],
                map: map
             });
        }
    }
}

$( document ).ready(function() {
    $("#btnHideMarkers").click(hideMarkers);
    $("#btnShowMarkers").click(showMarkers);
    $("#btnDeleteMarkers").click(deleteMarkers);
    $("#btnCalculateDistances").click(calculateDistances);
    $("#btnDownloadGML").click(function(){downloadGML($("#resultsGML").val(),'graph.gml','text/xml')});
    $("#btnUploadSolution").change(function(event) {
        handleSolutionUpload(event);
        // reset the input value so to enable the retriggering of the change event if the
        // user reselects the same file
        event.target.value = null;
    });
});


