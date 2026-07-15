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
    cursor.execute("SELECT unitid, timestamp, turbidity, atp, temperature FROM telemetry WHERE timestamp > NOW() - INTERVAL '24 hours'")
    rows = cursor.fetchall()
    conn.close()
    return rows

def writecsv(rows):
    date = datetime.now().strftime("%Y-%m-%d")
    filename = f"data/mobilelab-{date}.csv"
    f = open(filename, 'w')
    writer=csv.writer(f)
    writer.writerow(["unitid", "timestamp", "turbidity", "atp", "temperature"])
    writer.writerows(rows)
    f.close()
    return filename

def minioupload(filename):
    s3_client = boto3.client('s3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='minioadmin',
    aws_secret_access_key='minioadmin'
)
    s3_client.upload_file(filename, "awms", filename)
