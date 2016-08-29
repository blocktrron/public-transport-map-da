$(document).ready(function () {
    function updateVehicles() {
        $.ajax("/vehicledata")
            .done(function (data) {
                data.vehicles.forEach(function (item, index) {
                    var class_name;
                    if (item.category == 5) {
                        // Bus
                        class_name = 'vehicle vehicle-bus';
                    } else if (item.category == 1) {
                        // Tram
                        class_name = 'vehicle vehicle-tram';
                    } else {
                        class_name = 'vehicle vehicle-other';
                    }
                    var popup_content = "<strong> " + item.line + " - " + item.lastStop + "</strong><br>Vehicle: " + item.vehicleId + "<br>Bearing: " + item.bearing;
                    if (!(item.vehicleId in vehicles)) {
                        var icon = L.divIcon({
                            className: class_name,
                            iconSize: [22, 22],
                            iconAnchor: [11, 11],
                            popupAnchor: [0, -11],
                            html: '<div class="vehicle-bearing" id="vehicle-' + item.vehicleId + '"></div>' + item.line
                        });
                        var marker = L.marker([item.latitude, item.longitude], {icon: icon})
                            .bindPopup(popup_content);
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
                        vehicles[item.vehicleId].lastAppearance = update_count;
                    }
                    $(".vehicle-bearing#vehicle-" + item.vehicleId).css("transform", "rotate(" + item.bearing +"deg)");
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
                if (data.successful) {
                    $('#last-update-status').html("Successful at ");

                } else {
                    $('#last-update-status').html("Failed at ");
                }

                $('#last-update-time').html(timestamp.toLocaleString('de-DE'));

                update_count++;
            })
            .fail(function () {
                var timestamp = new Date();
                $('#last-update-status').html("Failed to query from Server at ");
                $('#last-update-time').html(timestamp.toLocaleString('de-DE'));
            })
    }

    var map = L.map('map').setView([49.872906, 8.651617], 13);
    var vehicle_layer = new L.FeatureGroup();

    var update_count = 0;
    var update_interval = 15; // Update Interval in seconds
    var update_interval_id;

    var vehicles = {};

    $('#automatic-updates-enabled').on('click', function () {
        if (this.checked && update_interval_id == undefined) {
            update_interval_id = setInterval(updateVehicles, update_interval * 1000);
        } else {
            clearInterval(update_interval_id);
            update_interval_id = undefined;
        }
    });

    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    map.addLayer(vehicle_layer);

    updateVehicles();
    update_interval_id = setInterval(updateVehicles, update_interval * 1000);
});