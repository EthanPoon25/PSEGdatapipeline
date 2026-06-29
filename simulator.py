from datetime import datetime, timezone
import random
import time
import json
import paho.mqtt.client as mqtt

def sensorreading():
    reading = {
        "unitid": "trailer01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "turbidity": random.uniform(0.5, 3.0),
        "atp": random.randint(1, 50),
        "temperature": random.uniform(34.0, 38.0)
    }
    return reading

def badsensorread():
    reading = {
        "unitid": "trailer_01",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "turbidity":random.uniform(6.0,12.0),
        "atp":random.randint(200,500),
        "temperature" : random.uniform(45.0,55.0)
    }
    return reading

client = mqtt.Client()
client.connect("localhost", 1883)
counter = 0
while True:
    counter += 1
    if counter % 15 == 0:
        reading = badsensorread()
    else:
        reading = sensorreading()
    print(reading)
    data = json.dumps(reading)
    client.publish("trailer_01/sensors/telemetry", data)
    time.sleep(1)