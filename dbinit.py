import sqlite3
connecting=sqlite3.connect('telemetry.db')
cursorobj=connecting.cursor()
cursorobj.execute("DROP TABLE IF EXISTS TELEMETRY")

cursorobj.execute("""
                CREATE TABLE telemetry(
                ID INTEGER PRIMARY KEY AUTOINCREMENT,
                unitid TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                turbidity NUMERIC NOT NULL,
                atp NUMERIC NOT NULL,
                temperature NUMERIC NOT NULL,
                synced INT DEFAULT 0
                );"""
                    )

print("table done")
connecting.close()