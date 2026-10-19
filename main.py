import os
import sqlite3
import requests
from datetime import datetime

# =====================
# Database Connection
# =====================

conn = sqlite3.connect(os.environ.get("DB_PATH", "transport.db"))
cursor = conn.cursor()

# =====================
# Stations to monitor
# =====================

STATIONS = {
    "Alexanderplatz": "900100003",
    "Hauptbahnhof": "900003201",
    "Ostkreuz": "900120003",
    "Warschauer Strasse": "900120004",
    "Zoologischer Garten": "900023201",
    "Gesundbrunnen": "900007102",
    "Suedkreuz": "900058101"
}
# =====================
# API Call
# =====================

for station_name, station_id in STATIONS.items():

    url = f"https://v6.bvg.transport.rest/stops/{station_id}/departures?duration=10"

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        data = response.json()

        # Save API call
        cursor.execute("""
            INSERT INTO API_Abruf
            (abruf_zeitpunkt, status, anzahl_datensaetze, nachricht)
            VALUES (?, ?, ?, ?)
        """, (
            datetime.now().isoformat(),
            response.status_code,
            len(data["departures"]),
            "Success"
        ))

        api_abruf_id = cursor.lastrowid

        print(f"\n{station_name}: {len(data['departures'])} departures")

        for dep in data["departures"]:

            product = dep["line"]["product"]

            # Only U-Bahn and S-Bahn
            if product not in ["subway", "suburban"]:
                continue

           
            # Save Linie
            cursor.execute("""
                INSERT OR IGNORE INTO Linie
                (name, typ, betreiber)
                VALUES (?, ?, ?)
            """, (
                dep["line"]["name"],
                dep["line"]["product"],
                dep["line"].get("operator", {}).get("name", "Unknown")
            ))

            # Get linie_id
            cursor.execute("""
                SELECT linie_id
                FROM Linie
                WHERE name = ?
            """, (dep["line"]["name"],))

            linie_id = cursor.fetchone()[0]

        
            # Save Station
            # NOTE: use the station_id we actually requested (the key from
            # STATIONS), not dep["stop"]["id"]. The BVG API often echoes back
            # a platform/sub-stop-specific id per departure (e.g. Hauptbahnhof
            # "Gleis 1-8"), which fragments a single station's data across
            # multiple rows in the Station/Abfahrt tables.
            stop = dep["stop"]

            cursor.execute("""
                INSERT OR IGNORE INTO Station
                (station_id, name, latitude, longitude)
                VALUES (?, ?, ?, ?)
            """, (
                station_id,
                stop["name"],
                stop["location"]["latitude"],
                stop["location"]["longitude"]
            ))

            # Save relation between line and station
            cursor.execute("""
                INSERT OR IGNORE INTO Linie_Station
                (linie_id, station_id)
                VALUES (?, ?)
                """, (
                linie_id,
                station_id
            ))
            
            # Save Fahrt
            cursor.execute("""
                INSERT INTO Fahrt
                (linie_id, richtung, service_date)
                VALUES (?, ?, ?)
            """, (
                linie_id,
                dep["direction"],
                dep["plannedWhen"][:10]
            ))

            fahrt_id = cursor.lastrowid

            
            # Save Abfahrt
            cursor.execute("""
                INSERT INTO Abfahrt
                (
                    fahrt_id,
                    station_id,
                    planzeit,
                    istzeit,
                    verspaetung_sek,
                    api_abruf_id
                )
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                fahrt_id,
                station_id,
                dep["plannedWhen"],
                dep["when"],
                dep.get("delay") or 0,
                api_abruf_id
            ))

        conn.commit()

    except Exception as e:

        cursor.execute("""
            INSERT INTO API_Abruf
            (abruf_zeitpunkt, status, anzahl_datensaetze, nachricht)
            VALUES (?, ?, ?, ?)
        """, (
            datetime.utcnow().isoformat(),
            500,
            0,
            str(e)
        ))

        conn.commit()

        print("Error:", e)

conn.close()

print("\nImport finished!")