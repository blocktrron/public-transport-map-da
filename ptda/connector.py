import json
from datetime import datetime
from time import time

import requests

from ptda.exceptions import RequestException, NoDataException
from ptda.objects import Vehicle, MapObject


class RemoteConnector:
    def __init__(self, base_url, identifier):
        self.base_url = base_url
        self.identifier = identifier

        self.vehicles = []
        self.vehicles_age = None

        self.map_objects = []

    def update_positions(self):
        r = requests.get('{base_url}/vehiclelivedata?bundleIdentifier={identifier}'.format(base_url=self.base_url,
                                                                                           identifier=self.identifier))
        if r.status_code != requests.codes.ok:
            raise RequestException()

        root_obj = json.loads(r.text)
        if len(root_obj.get('vehicles', [])) < 1:
            raise NoDataException()

        self.vehicles = []

        for v in root_obj['vehicles']:
            self.vehicles.append(
                Vehicle(v["lineId"], v['category'], v['lastStop'], v['status'], v['latitude'], v['longitude'],
                        v['bearing'], v['type'], v['line'], v['vehicleId'], v['encodedPath']))
        if 'timestamp' in root_obj:
            self.vehicles_age = datetime.strptime(root_obj["timestamp"].split('+')[0], "%Y-%m-%dT%H:%M:%S").strftime(
                '%s')
        else:
            self.vehicles_age = time()

        return True

    def update_mapobjects(self, lat, lon, distance):
        r = requests.get(
            '{base_url}/mapobjects?latitude={lat}&longitude={lon}&distance={distance}&bundleIdentifier={identifier}'.format(
                base_url=self.base_url, identifier=self.identifier, lat=str(lat), lon=str(lon), distance=str(distance)))

        if r.status_code != requests.codes.ok:
            raise RequestException()

        j = json.loads(r.content)

        self.map_objects = [MapObject(x['type'], x['id'], x['name'], x['latitude'], x['longitude']) for x in j]

        return True
