#!/usr/bin/env python
# -*- coding: utf-8 -*-
import json

from flask import Flask

from ptda.connector import RemoteConnector

app = Flask(__name__, static_url_path='/static')
connector = RemoteConnector('https://routing.geomobile.de/v4', 'de.ivanto.heagmobilo')
update_interval = 30


@app.route('/')
def show_page():
    return app.send_static_file("app.html")


@app.route("/vehicledata")
def load_vehicledata():
    connector.update_positions()

    h = {'last_updated': connector.vehicles_age, 'vehicles': []}
    for v in connector.vehicles:
        h['vehicles'].append({'category': v.category, 'lineId': v.line_id, 'latitude': round(v.latitude, 6),
                              'longitude': round(v.longitude, 6), 'vehicleId': v.vehicle_id, 'bearing': v.bearing,
                              'lastStop': v.last_stop, 'line': v.line, })

    return json.dumps(h, ensure_ascii=False), 200, {
        'Content-Type': 'application/json; charset=utf-8'}


@app.route("/mapobjects")
def load_mapobjects():
    connector.update_mapobjects(49.872781, 8.651077, 7500)

    h = [{'type': o.type, 'id': o.id, 'name': o.name, 'lat': o.lat, 'lon': o.lon} for o in connector.map_objects]

    return json.dumps(h, ensure_ascii=False), 200, {
        'Content-Type': 'application/json; charset=utf-8'}


@app.after_request
def add_header(response):
    response.cache_control.max_age = update_interval
    return response


if __name__ == "__main__":
    # app.debug = True
    app.run(port=42523)
