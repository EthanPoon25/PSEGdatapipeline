import sqlite3
import json
import time
import threading
import paho.mqtt.client as mqtt
import requests

brokeradd = "localhost"
port = 1883
topic = "trailer_01/sensors/telemetry"
dbpath = "telemetry.db"
keys = set()


def onconnect(client, userdata, flags, rc):
    print("Connected with result code:", rc)
    client.subscribe(topic)


def onmessage(client, userdata, msg):
    try:
        receiveddata = json.loads(msg.payload.decode('utf-8'))
        print(f"Received JSON data from `{msg.topic}`: {receiveddata}")

        connecting = sqlite3.connect(dbpath)
        cursorobj = connecting.cursor()
        cursorobj.execute(
            "INSERT INTO telemetry (unitid, timestamp, turbidity, atp, temperature) VALUES (?, ?, ?, ?, ?)",
            (receiveddata["unitid"], receiveddata["timestamp"],
             receiveddata["turbidity"], receiveddata["atp"], receiveddata["temperature"])
        )
        connecting.commit()
        connecting.close()

        response = requests.post("http://localhost:8080/telemetry", json=receiveddata)
        print("POST status:", response.status_code)

        command = requests.get("http://localhost:8080/command").json()
        if command["command"] == "NONE" or command.get("idempotency_key", "") in keys:
            print("✓ No command or duplicate — skipping")
        else:
            print("⚠️ COMMAND RECEIVED: INCREASE_CHLORINE +2ppm — activating Venturi injector")
            keys.add(command["idempotency_key"])

    except json.JSONDecodeError:
        print(f"Received non-JSON message from `{msg.topic}`: {msg.payload.decode()}")
    except KeyError as e:
        print(f"Missing key in JSON data: {e}")
    except Exception as e:
        print("Unexpected error:", e)


def sync_unsynced():
    try:
        connecting = sqlite3.connect(dbpath)
        connecting.row_factory = sqlite3.Row
        cursorobj = connecting.cursor()
        cursorobj.execute(
            "SELECT id, unitid, timestamp, turbidity, atp, temperature FROM telemetry WHERE synced = 0"
        )
        rows = cursorobj.fetchall()

        for row in rows:
            payload = {
                "unitid": row["unitid"],
                "timestamp": row["timestamp"],
                "turbidity": row["turbidity"],
                "atp": row["atp"],
                "temperature": row["temperature"]
            }
            try:
                response = requests.post("http://localhost:8080/telemetry", json=payload, timeout=5)
                if response.status_code == 200:
                    cursorobj.execute("UPDATE telemetry SET synced = 1 WHERE id = ?", (row["id"],))
                    print(f"✓ Synced row {row['id']}")
                else:
                    print(f"✗ Failed to sync row {row['id']} — status {response.status_code}")
            except requests.exceptions.RequestException as e:
                print(f"✗ Network error syncing row {row['id']}: {e}")

        connecting.commit()
        connecting.close()

    except Exception as e:
        print(f"Sync error: {e}")


def start_sync_loop():
    while True:
        sync_unsynced()
        time.sleep(10)


client = mqtt.Client()
client.on_connect = onconnect
client.on_message = onmessage
client.connect(brokeradd, port)

t = threading.Thread(target=start_sync_loop, daemon=True)
t.start()

client.loop_forever()