import sqlite3

conn = sqlite3.connect("transport.db")
cursor = conn.cursor()

print("\n=== Average Delay per Line ===\n")

cursor.execute("""
SELECT
    Linie.name,
    ROUND(AVG(Abfahrt.verspaetung_sek), 2) AS avg_delay
FROM Abfahrt
JOIN Fahrt ON Abfahrt.fahrt_id = Fahrt.fahrt_id
JOIN Linie ON Fahrt.linie_id = Linie.linie_id
WHERE Abfahrt.verspaetung_sek IS NOT NULL
GROUP BY Linie.name
ORDER BY avg_delay DESC
LIMIT 10
""")

for row in cursor.fetchall():
    print(row)

print("\n=== Average Delay per Station ===\n")

cursor.execute("""
SELECT
    Station.name,
    ROUND(AVG(Abfahrt.verspaetung_sek), 2) AS avg_delay
FROM Abfahrt
JOIN Station ON Abfahrt.station_id = Station.station_id
GROUP BY Station.name
ORDER BY avg_delay DESC
LIMIT 10
""")

for row in cursor.fetchall():
    print(row)

conn.close()