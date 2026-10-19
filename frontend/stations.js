console.log("stations.js loaded");
const API =
    "http://localhost:3000/api";

const stationSelect =
    document.getElementById("stationSelect");

let currentStationId = null;
let trendChartInstance = null;

async function loadStations(){

    const response =
        await fetch(`${API}/allstations`);

    const stations =
        await response.json();

    stations.forEach(station => {

        const option =
            document.createElement("option");

        option.value =
            station.station_id;

        option.textContent =
            station.name;

        stationSelect.appendChild(option);

    });

    if(stations.length > 0){

        currentStationId = stations[0].station_id;
        loadDepartures(currentStationId);
        loadTrend(currentStationId);

    }

}

async function loadDepartures(id){

    currentStationId = id;

    const response =
        await fetch(`${API}/station/${id}`);

    const departures =
        await response.json();

    const tbody =
        document.querySelector(
            "#departuresTable tbody"
        );

    tbody.innerHTML = "";

    departures.forEach(dep => {

        const statusClass =
            dep.status === "delayed" ? "status-delayed" : "status-ontime";

        tbody.innerHTML += `
            <tr>
                <td>${dep.line}</td>
                <td>${dep.direction}</td>
                <td>${dep.delay}</td>
                <td><span class="${statusClass}">${dep.status}</span></td>
            </tr>
        `;

    });

    const lastUpdatedEl = document.getElementById("lastUpdated");
    if (lastUpdatedEl) {
        lastUpdatedEl.innerText =
            "Last updated: " + new Date().toLocaleTimeString();
    }

}

async function loadTrend(id){

    const response =
        await fetch(`${API}/station/${id}/trend`);

    const trend =
        await response.json();

    if (trendChartInstance) {
        trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(
        document.getElementById("trendChart"),
        {
            type: "line",
            data: {
                labels: trend.map(row => row.day),
                datasets: [
                    {
                        label: "Average Delay (min)",
                        data: trend.map(row => row.avgDelay),
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true
            }
        }
    );

}

stationSelect.addEventListener(
    "change",
    () => {
        loadDepartures(stationSelect.value);
        loadTrend(stationSelect.value);
    }
);

loadStations().then(() => {

    const selected =
        localStorage.getItem(
            "selectedStation"
        );

    if(selected){

        stationSelect.value =
            selected;

        loadDepartures(selected);
        loadTrend(selected);
    }

});

// Auto-refresh the currently selected station's data every 10 minutes
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
    if (currentStationId) {
        console.log("Refreshing station departures...");
        loadDepartures(currentStationId);
        loadTrend(currentStationId);
    }
}, REFRESH_INTERVAL_MS);


// =====================================
// Station search box (unrelated to the dropdown above)
// =====================================

const searchBox = document.getElementById("searchBox");
const searchResults = document.getElementById("searchResults");

let stationsCache = [];

async function loadSearchStations(){

    const response =
        await fetch(`${API}/allstations`);

    stationsCache =
        await response.json();
}

if (searchBox) {

    searchBox.addEventListener("input", () => {

        const query = searchBox.value.toLowerCase();

        searchResults.innerHTML = "";

        if (query.length < 2) {
            return;
        }

        const matches = stationsCache.filter(station =>
            station.name.toLowerCase().includes(query)
        );

        matches.forEach(station => {

            const div = document.createElement("div");
            div.className = "search-item";
            div.textContent = station.name;

            div.onclick = () => {
                stationSelect.value = station.station_id;
                loadDepartures(station.station_id);
                loadTrend(station.station_id);
                searchResults.innerHTML = "";
                searchBox.value = "";
            };

            searchResults.appendChild(div);
        });

    });

    loadSearchStations();
}