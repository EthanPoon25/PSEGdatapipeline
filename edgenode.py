import sqlite3
import json
import paho.mqtt.client as mqtt

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
        print(f"Received JSON data from `{msg.topic}`: {receiveddata}")
        connecting=sqlite3.connect('telemetry.db')
        cursorobj=connecting.cursor()
        cursorobj.execute("INSERT INTO telemetry (unit_id, timestamp,turbidity, atp, temperature) VALUES (?, ?,?,?,?)", (receiveddata["unit_id"], receiveddata["timestamp"], receiveddata["turbidity"], receiveddata["atp"], receiveddata["temperature"]))
        connecting.commit()
        connecting.close()
    except json.JSONDecodeError:
        print(f"Received non-JSON message from `{msg.topic}`: {msg.payload.decode()}")
    except KeyError as e:
        print(f"Missing key in JSON data: {e}")

client = mqtt.Client()
client.on_connect=onconnect
client.on_message=onmessage
client.connect(brokeradd,port)
client.loop_forever()