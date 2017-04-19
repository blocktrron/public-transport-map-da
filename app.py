#!/usr/bin/env python
# -*- coding: utf-8 -*-
from flask import Flask, send_from_directory, send_file
import json
import time
import requests

app = Flask(__name__, static_url_path='/static')
vehicle_data = {"last_updated": 0, "successful": False, "vehicles": []}
update_interval = 30


@app.route('/')
def show_page():
    return app.send_static_file("app.html")


@app.route("/vehicledata")
def load_vehicledata():
    r = requests.get('https://routing.geomobile.de/v4/vehiclelivedata?bundleIdentifier=de.ivanto.heagmobilo')
    vehicle_data = {"last_updated": int(time.time()), "vehicles": []}
    if r.status_code is 200:
        root_obj = json.loads(r.text)
        for vehicle in root_obj.get("vehicles", []):
            del vehicle["encodedPath"]
            vehicle["latitude"] = round(vehicle["latitude"], 6)
            vehicle["longitude"] = round(vehicle["longitude"], 6)
        vehicle_data["vehicles"] = root_obj.get("vehicles", [])

    return json.dumps(vehicle_data, ensure_ascii=False), 200, {
        'Content-Type': 'application/json; charset=utf-8'}


@app.after_request
def add_header(response):
    response.cache_control.max_age = update_interval
    return response


if __name__ == "__main__":
    # app.debug = True
    app.run(port=42523)
