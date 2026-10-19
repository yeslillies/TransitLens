import os
import sqlite3

conn = sqlite3.connect(os.environ.get("DB_PATH", "transport.db"))
cursor = conn.cursor()

# =====================
# Linie
# =====================
cursor.execute("""
CREATE TABLE IF NOT EXISTS Linie (
    linie_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    typ TEXT NOT NULL,
    betreiber TEXT
)
""")

# =====================
# Station
# =====================
cursor.execute("""
CREATE TABLE IF NOT EXISTS Station (
    station_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    typ TEXT,
    latitude REAL,
    longitude REAL,
    zone TEXT
)
""")

# =====================
# Linie_Station
# =====================
cursor.execute("""
CREATE TABLE IF NOT EXISTS Linie_Station (
    linie_id INTEGER,
    station_id TEXT,
    reihenfolge INTEGER,
    PRIMARY KEY (linie_id, station_id),
    FOREIGN KEY (linie_id) REFERENCES Linie(linie_id),
    FOREIGN KEY (station_id) REFERENCES Station(station_id)
)
""")

# =====================
# Fahrt
# =====================
cursor.execute("""
CREATE TABLE IF NOT EXISTS Fahrt (
    fahrt_id INTEGER PRIMARY KEY AUTOINCREMENT,
    linie_id INTEGER,
    richtung TEXT,
    service_date TEXT,
    FOREIGN KEY (linie_id) REFERENCES Linie(linie_id)
)
""")

# =====================
# API_Abruf
# =====================
cursor.execute("""
CREATE TABLE IF NOT EXISTS API_Abruf (
    api_abruf_id INTEGER PRIMARY KEY AUTOINCREMENT,
    abruf_zeitpunkt TEXT,
    status INTEGER,
    anzahl_datensaetze INTEGER,
    nachricht TEXT
)
""")

# =====================
# Abfahrt
# =====================
cursor.execute("""
CREATE TABLE IF NOT EXISTS Abfahrt (
    abfahrt_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fahrt_id INTEGER,
    station_id TEXT,
    planzeit TEXT,
    istzeit TEXT,
    verspaetung_sek INTEGER,
    api_abruf_id INTEGER,
    FOREIGN KEY (fahrt_id) REFERENCES Fahrt(fahrt_id),
    FOREIGN KEY (station_id) REFERENCES Station(station_id),
    FOREIGN KEY (api_abruf_id) REFERENCES API_Abruf(api_abruf_id)
)
""")

conn.commit()

print("All tables created successfully!")

conn.close()