import requests

stations = [
    "Alexanderplatz",
    "Friedrichstrasse",
    "Hauptbahnhof",
    "Ostkreuz",
    "Warschauer Strasse",
    "Zoologischer Garten",
    "Gesundbrunnen",
    "Suedkreuz"
]

for station in stations:
    url = f"https://v6.bvg.transport.rest/locations?query={station}&results=1"

    try:
        response = requests.get(url, timeout=20)
        data = response.json()

        if len(data) > 0:
            print(
                station,
                "->",
                data[0]["id"],
                "|",
                data[0]["name"]
            )

    except Exception as e:
        print(station, "ERROR:", e)