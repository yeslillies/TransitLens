console.log("lines.js loaded");

const API = "/api";

const periodSelect = document.getElementById("periodSelect");
const typeSelect = document.getElementById("typeSelect");
const searchBox = document.getElementById("lineSearchBox");
const tbody = document.querySelector("#lineRankingTable tbody");
////////////
const hourLineSelect = document.getElementById("hourLineSelect");
const hourSelect = document.getElementById("hourSelect");

// Friendly labels for the "Type" column
const TYPE_LABELS = {
    subway: "U-Bahn",
    suburban: "S-Bahn"
};

let cachedLines = []; // last fetched ranking, before client-side search filtering

function typeLabel(type) {
    return TYPE_LABELS[type] || type || "--";
}

function renderTable(lines) {

    tbody.innerHTML = "";

    lines.forEach((line, index) => {

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${line.name}</td>
            <td>${typeLabel(line.type)}</td>
            <td>${line.avgDelay != null ? line.avgDelay + " min" : "--"}</td>
            <td>${line.punctuality != null ? line.punctuality + "%" : "--"}</td>
        `;

        tbody.appendChild(row);
    });
}

function applySearchFilter() {

    const query = searchBox.value.trim().toLowerCase();

    if (!query) {
        renderTable(cachedLines);
        return;
    }

    const filtered = cachedLines.filter(line =>
        line.name.toLowerCase().includes(query)
    );

    renderTable(filtered);
}

async function loadModeStats() {

    const period = periodSelect.value;
    const response = await fetch(`${API}/mode-stats?period=${period}`);
    const data = await response.json();

    document.getElementById("ubahnPunctuality").innerText =
        data.ubahnPunctuality != null ? data.ubahnPunctuality + "%" : "--";

    document.getElementById("sbahnPunctuality").innerText =
        data.sbahnPunctuality != null ? data.sbahnPunctuality + "%" : "--";

    document.getElementById("ubahnAvgDelay").innerText =
        data.ubahnAvgDelay != null ? data.ubahnAvgDelay + " min" : "--";

    document.getElementById("sbahnAvgDelay").innerText =
        data.sbahnAvgDelay != null ? data.sbahnAvgDelay + " min" : "--";
}

async function loadLineRanking() {

    const period = periodSelect.value;
    const type = typeSelect.value;

    const params = new URLSearchParams({ period, type });

    const response = await fetch(`${API}/line-ranking?${params}`);
    const data = await response.json();

   // cachedLines = data;
   // applySearchFilter();
////////////////////////////
cachedLines = data;
applySearchFilter();
loadLineOptions();
//////////////////////
    const lastUpdatedEl = document.getElementById("lastUpdated");
    if (lastUpdatedEl) {
        lastUpdatedEl.innerText =
            "Last updated: " + new Date().toLocaleTimeString();
    }
}


////////////////////////////////////
function loadHourOptions() {

    hourSelect.innerHTML =
        `<option value="">Select hour</option>`;

    for (let hour = 0; hour < 24; hour++) {

        const option = document.createElement("option");

        option.value = hour;
        option.textContent =
            `${String(hour).padStart(2, "0")}:00`;

        hourSelect.appendChild(option);
    }
}

function loadLineOptions() {

    hourLineSelect.innerHTML =
        `<option value="">Select line</option>`;

    cachedLines.forEach(line => {

        const option = document.createElement("option");

        option.value = line.name;
        option.textContent = line.name;

        hourLineSelect.appendChild(option);
    });
}

async function loadLineHourStats() {

    const line = hourLineSelect.value;
    const hour = hourSelect.value;

    if (line === "" || hour === "") {
        return;
    }

    const response = await fetch(
        `${API}/line-hour-stats?line=${encodeURIComponent(line)}&hour=${hour}`
    );

    const data = await response.json();

    const formattedHour =
        `${String(hour).padStart(2, "0")}:00`;

    document.getElementById("hourQuestion").innerText =
        `How punctual is ${line} normally at ${formattedHour}?`;

    if (data.punctuality == null) {

        document.getElementById("hourPunctuality").innerText =
            "No data available";

        document.getElementById("hourDetails").innerText =
            "No departures were stored for this line and hour.";

        return;
    }

    document.getElementById("hourPunctuality").innerText =
        `${data.punctuality}%`;

    document.getElementById("hourDetails").innerText =
        `${data.departures} departures · Average delay: ${data.avgDelay} min`;
}
/////////////////////////////////


async function loadAll() {
    await Promise.all([loadModeStats(), loadLineRanking()]);
}

periodSelect.addEventListener("change", loadAll);
typeSelect.addEventListener("change", loadLineRanking);
searchBox.addEventListener("input", applySearchFilter);



///////////////
hourLineSelect.addEventListener("change", loadLineHourStats);
hourSelect.addEventListener("change", loadLineHourStats);
////////////////////

loadHourOptions ()////////
loadAll();

// Auto-refresh every 10 minutes, matching the rest of the site
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;

setInterval(() => {
    console.log("Refreshing line ranking data...");

loadAll();

}, REFRESH_INTERVAL_MS);