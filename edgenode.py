import sqlite3
import json
import paho.mqtt.client as mqtt
import requests

brokeradd="localhost"
port=1883
topic="trailer_01/sensors/telemetry"
dbpath="telemetry.db"


def onconnect(client, userdata, flags, rc):
    print("Connected with result code: ",rc)
    client.subscribe(topic)

def onmessage(client, userdata,msg):
    try:
        receiveddata=json.loads(msg.payload.decode('utf-8'))
        print("here")
        print(f"Received JSON data from `{msg.topic}`: {receiveddata}")
        connecting=sqlite3.connect('telemetry.db')
        cursorobj=connecting.cursor()
        cursorobj.execute("INSERT INTO telemetry (unitid, timestamp,turbidity, atp, temperature) VALUES (?, ?,?,?,?)", (receiveddata["unitid"], receiveddata["timestamp"], receiveddata["turbidity"], receiveddata["atp"], receiveddata["temperature"]))
        connecting.commit()
        connecting.close()
        response = requests.post("http://localhost:8080/telemetry", json=receiveddata)
        print("POST status:", response.status_code)
    except json.JSONDecodeError:
        print(f"Received non-JSON message from `{msg.topic}`: {msg.payload.decode()}")
    except KeyError as e:
        print(f"Missing key in JSON data: {e}")
    except Exception as e:
        print("Unexpected error:", e)

client = mqtt.Client()
client.on_connect=onconnect
client.on_message=onmessage
client.connect(brokeradd,port)
client.loop_forever()