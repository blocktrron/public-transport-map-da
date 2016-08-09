#!/usr/bin/env python
# -*- coding: utf-8 -*-
from flask import Flask, send_from_directory, send_file
import json
import time
import requests

app = Flask(__name__, static_url_path='/static')
vehicle_data = {"last_updated": 0, "data": {}}
failed_attempts = 0


@app.route('/')
def show_page():
    return app.send_static_file("app.html")


@app.route("/vehicledata")
def load_vehicledata():
    global vehicle_data, failed_attempts
    if vehicle_data["last_updated"] + 14 < time.time():
        r = requests.get('https://routing.geomobile.de/v4/vehiclelivedata?bundleIdentifier=de.ivanto.heagmobilo')
        if r.status_code is 200:
            root_obj = json.loads(r.text)
            if "vehicles" in root_obj:
                for vehicle in root_obj["vehicles"]:
                    del vehicle["encodedPath"]
                    vehicle["latitude"] = round(vehicle["latitude"], 6)
                    vehicle["longitude"] = round(vehicle["longitude"], 6)
                vehicle_data["data"] = root_obj
                vehicle_data["last_updated"] = time.time()
            return json.dumps(vehicle_data["data"], ensure_ascii=False), 200, {
                'Content-Type': 'application/json; charset=utf-8'}
        else:
            failed_attempts = + 1
            if (failed_attempts > 8):
                vehicle_data["data"] = {}
            return json.dumps({}, ensure_ascii=False), 500, {'Content-Type': 'application/json; charset=utf-8'}
    else:
        return json.dumps(vehicle_data["data"], ensure_ascii=False), 200, {
            'Content-Type': 'application/json; charset=utf-8'}


if __name__ == "__main__":
    # app.debug = True
    app.run(port=42523)
