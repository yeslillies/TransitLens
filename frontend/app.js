const API = "http://localhost:3000/api";

console.log("APP JS VERSION 2");

async function loadDashboard() {

    const response = await fetch(`${API}/dashboard`);
    const data = await response.json();
    console.log(data);

    document.getElementById("avgDelay").innerText =
        data.avgDelay.toFixed(2) + " min";

    document.getElementById("mostDelayedLine").innerText =
        data.mostDelayedLine || "--";

    document.getElementById("mostActiveStation").innerText =
        data.mostActiveStation || "--";

    document.getElementById("peakTrafficHour").innerText =
        data.peakTrafficHour || "--";

    document.getElementById("lastUpdated").innerText =
    "Last updated: " + new Date(data.asOf).toLocaleTimeString();
}

let lineChartInstance;

async function loadChart() {

    const response =
        await fetch(`${API}/lines`);

    const data =
        await response.json();

    if (lineChartInstance) {
        lineChartInstance.destroy();
    }

    lineChartInstance = new Chart(
        document.getElementById("lineChart"),
        {
            type:"bar",
            data:{
                labels:data.map(x=>x.name),
                datasets:[
                    {
                        label:"Average Delay (min)",
                        data:data.map(x=>x.avgDelay)
                    }
                ]
            }
        }
    );
}

loadDashboard();
loadChart();
loadPunctualityTables();


async function loadPunctualityTables() {

    const response = await fetch(`${API}/line-ranking?period=week&type=all`);
    const lines = await response.json();

    // Already sorted by punctuality DESC from the backend
    const mostPunctual = lines.slice(0, 5);
    const leastPunctual = [...lines].reverse().slice(0, 5);

    const mostBody = document.querySelector("#mostPunctualTable tbody");
    const leastBody = document.querySelector("#leastPunctualTable tbody");

    mostBody.innerHTML = "";
    leastBody.innerHTML = "";

    mostPunctual.forEach((line, i) => {
        mostBody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${line.name}</td>
                <td>${line.punctuality}%</td>
            </tr>
        `;
    });

    leastPunctual.forEach((line, i) => {
        leastBody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${line.name}</td>
                <td>${line.punctuality}%</td>
            </tr>
        `;
    });
}


// Auto-refresh dashboard every 10 minutes
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
    console.log("Refreshing dashboard data...");
    loadDashboard();
    loadChart();
    loadPunctualityTables();
}, REFRESH_INTERVAL_MS);


const searchBox =
    document.getElementById("searchBox");

const searchResults =
    document.getElementById("searchResults");

let stationsCache = [];

async function loadSearchStations(){

    const response =
        await fetch(
            "http://localhost:3000/api/allstations"
        );

    stationsCache =
        await response.json();
}

searchBox.addEventListener("input", () => {

    const query =
        searchBox.value.toLowerCase();

    searchResults.innerHTML = "";

    if(query.length < 2){
        return;
    }

    const matches =
        stationsCache.filter(station =>
            station.name
                .toLowerCase()
                .includes(query)
        );

    matches.forEach(station => {

        const div =
            document.createElement("div");

        div.className =
            "search-item";

        div.textContent =
            station.name;

        div.onclick = () => {

            localStorage.setItem(
                "selectedStation",
                station.station_id
            );

            window.location =
                "stations.html";
        };

        searchResults.appendChild(div);
    });

});

loadSearchStations();