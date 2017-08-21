$(document).ready(function () {
    function onVehicleClick(e) {
        selected_ref = this.options.properties.line;
        currentVehicleRoute = L.geoJSON(linedata.waypoints, {filter: filterLine});
        routeLayer.addLayer(currentVehicleRoute);
    }

    function onPopupClose(e) {
        routeLayer.removeLayer(currentVehicleRoute);
    }

    function filterLine(feature) {
        var corresponding_relations = [];
        for (var i = 0; i < linedata.relations.length; i++) {
            if (linedata.relations[i].reference === selected_ref) {
                corresponding_relations = corresponding_relations.concat(linedata.relations[i].members);
            }
        }
        return corresponding_relations.indexOf(feature.properties.id) > -1;
    }

    function updateLineplans() {
        $.ajax("/lineplans")
            .done(function (data) {
                linedata = data;
            })
    }

    function updateVehicles() {
        $.ajax("/vehicledata")
            .done(function (data) {
                data.vehicles.forEach(function (item, index) {
                    var class_name, vehicle_type;
                    if (item.category == 5) {
                        // Bus
                        class_name = 'vehicle vehicle-bus';
                        vehicle_type = "Bus"
                    } else if (item.category == 1) {
                        // Tram
                        class_name = 'vehicle vehicle-tram';
                        vehicle_type = "Tram"
                    } else {
                        class_name = 'vehicle vehicle-other';
                        vehicle_type = "Line"
                    }
                    var popup_content = "<strong>" + vehicle_type + " " + item.line + " - " + item.lastStop + "</strong><br>" +
                        "Vehicle: " + item.vehicleId + "<br>Bearing: " + item.bearing + "<br><span class='popup-cordinates'>" + item.latitude + ", " + item.longitude + "</span>";
                    var icon = L.divIcon({
                        className: class_name,
                        iconSize: [22, 22],
                        iconAnchor: [11, 11],
                        popupAnchor: [0, -11],
                        html: '<div class="vehicle-bearing" id="vehicle-' + item.vehicleId + '"></div>' + item.line
                    });

                    if (!(item.vehicleId in vehicles)) {
                        var marker = L.marker([item.latitude, item.longitude], {
                            icon: icon,
                            properties: {line: item.line}
                        })
                            .bindPopup(popup_content)
                            .on('popupopen', onVehicleClick)
                            .on('popupclose', onPopupClose);
                        vehicles[item.vehicleId] = {
                            lastAppearance: update_count,
                            marker: marker,
                            rawData: item
                        };
                        vehicle_layer.addLayer(vehicles[item.vehicleId].marker);
                    } else {
                        var position = new L.LatLng(item.latitude, item.longitude);
                        vehicles[item.vehicleId].marker._popup.setContent(popup_content);
                        vehicles[item.vehicleId].marker.setLatLng(position);
                        vehicles[item.vehicleId].marker.setIcon(icon);
                        vehicles[item.vehicleId].lastAppearance = update_count;
                    }
                    $(".vehicle-bearing#vehicle-" + item.vehicleId).css("transform", "rotate(" + item.bearing + "deg)");
                });

                for (var vehicleId in vehicles) {
                    // Remove inactive vehicle
                    if (vehicles.hasOwnProperty(vehicleId)) {
                        if (vehicles[vehicleId].lastAppearance < update_count) {
                            vehicle_layer.removeLayer(vehicles[vehicleId].marker);
                            delete vehicles[vehicleId];
                        }
                    }
                }

                var timestamp = new Date(data.last_updated * 1000);

                $('#last-update-time').html(timestamp.toLocaleString('de-DE'));

                update_count++;
            })
            .fail(function () {
                var timestamp = new Date();
                $('#last-update-status').html("Failed to query from Server at ");
                $('#last-update-time').html(timestamp.toLocaleString('de-DE'));
            })
    }

    function updateStops() {
        $.ajax("/mapobjects")
            .done(function (data) {
                map_objects = [];
                data.forEach(function (item, idx) {
                    if (item.type === 'stop') {
                        var popup_content = "<strong>" + item.name + "</strong><br>" +
                            "<span class='popup-cordinates'>" + item.id + "</span>";
                        var icon = L.icon({
                            iconUrl: '/static/stop.png',
                            iconSize: [22, 22],
                            iconAnchor: [11, 11],
                            popupAnchor: [0, -11],
                        });
                        var marker = L.marker([item.lat, item.lon]).bindPopup(popup_content);
                        marker.setIcon(icon);
                        var ao = {marker: marker};
                        map_objects.push(ao);
                        map_object_layer.addLayer(ao.marker);
                    }
                })
            })
    }

    var map;
    var vehicle_layer = new L.FeatureGroup();
    var map_object_layer = new L.FeatureGroup();
    var routeLayer = new L.FeatureGroup();
    var currentVehicleRoute;

    var update_count = 0;
    var update_interval = 30; // Update Interval in seconds
    var update_interval_id;

    var vehicles = {};
    var map_objects = [];

    var selected_ref = null;
    var linedata = null;

    $('#automatic-updates-enabled').on('click', function () {
        if (this.checked && update_interval_id == undefined) {
            update_interval_id = setInterval(updateVehicles, update_interval * 1000);
        } else {
            clearInterval(update_interval_id);
            update_interval_id = undefined;
        }
    });

    var osm_layer = new L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        minZoom: 3, maxZoom: 18,
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });

    var opnv_layer = new L.TileLayer('http://tile.memomaps.de/tilegen/{z}/{x}/{y}.png', {
        minZoom: 3, maxZoom: 18,
        attribution: '&copy; <a href="http://memomaps.de/">ÖPNV Karte</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
    });

    map = L.map('map', {center: [49.872906, 8.651617], zoom: 10, layers: [opnv_layer]});

    var map_pos_params = /[#]([0-9]+[\.][0-9]*)[;]([0-9]+[\.][0-9]*)[;]([0-9]+)/g.exec(window.location.href);

    map.on('moveend', function () {
        var mapPos = map.getCenter();
        var mapZoom = map.getZoom();
        var url = window.location.href.split('#')[0] + '#' + mapPos.lat + ';' + mapPos.lng + ';' + mapZoom;
        history.pushState('', '', url);
    });

    if (map_pos_params !== null) {
        map.panTo([map_pos_params[1], map_pos_params[2]]);
        map.setZoom(map_pos_params[3]);
    }

    L.control.layers({"ÖPNV Karte": opnv_layer, "OpenStreetMap": osm_layer}, {}).addTo(map);
    map.addLayer(vehicle_layer);
    map.addLayer(map_object_layer);
    map.addLayer(routeLayer);

    updateVehicles();
    updateStops();
    updateLineplans();
    update_interval_id = setInterval(updateVehicles, update_interval * 1000);
});