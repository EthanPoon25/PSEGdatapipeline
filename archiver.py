import csv
import boto3
import schedule
import time
import psycopg2
from datetime import datetime

def getreadings():
    conn = psycopg2.connect(
    host="localhost",
    port=5432,
    database="postgres",
    user="postgres",
    password="greenteams"
)
    cursor = conn.cursor()
    cursor.execute("rows = SELECT unitid, timestamp, turbidity, atp, temperature FROM telemetry WHERE timestamp > NOW() - INTERVAL '24 hours'")
    rows = cursor.fetchall()
    conn.close()
    return rows