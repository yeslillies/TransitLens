import sqlite3

conn = sqlite3.connect("transport.db")
cursor = conn.cursor()

tables = [
    "Linie",
    "Station",
    "Fahrt",
    "Abfahrt",
    "API_Abruf"
]

for table in tables:
    cursor.execute(f"SELECT COUNT(*) FROM {table}")
    count = cursor.fetchone()[0]
    print(f"{table}: {count}")

conn.close()