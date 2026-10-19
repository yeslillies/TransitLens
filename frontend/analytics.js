console.log("analytics.js loaded");

const dateInput = document.querySelector('input[type="date"]');
const timeInput = document.querySelector('input[type="time"]');

let topLinesChartInstance, hourChartInstance, distributionChartInstance;

async function loadAnalytics() {
  const params = new URLSearchParams();
  if (dateInput.value) params.set("date", dateInput.value);
  if (timeInput.value) params.set("time", timeInput.value);
  const qs = params.toString() ? `?${params}` : "";

  const lines = await fetch(`http://localhost:3000/api/lines${qs}`).then(r => r.json());
  const stations = await fetch(`http://localhost:3000/api/stations${qs}`).then(r => r.json());
  const dashboard = await fetch(`http://localhost:3000/api/dashboard${qs}`).then(r => r.json());
  const hours = await fetch(`http://localhost:3000/api/delay-by-hour${qs}`).then(r => r.json());
  const distribution = await fetch(`http://localhost:3000/api/delay-distribution${qs}`).then(r => r.json());

  document.getElementById("avgDelay").textContent = dashboard.avgDelay + " min";
  document.getElementById("worstLine").textContent = lines[0]?.name || "--";
  document.getElementById("worstLineDelay").textContent = "Ø " + (lines[0]?.avgDelay || "--") + " min delay";
  document.getElementById("worstStation").textContent = stations[0]?.name || "--";
  document.getElementById("worstStationDelay").textContent = "Ø " + (stations[0]?.avgDelay || "--") + " min delay";

  if (topLinesChartInstance) topLinesChartInstance.destroy();
  if (hourChartInstance) hourChartInstance.destroy();
  if (distributionChartInstance) distributionChartInstance.destroy();

  topLinesChartInstance = new Chart(document.getElementById("topLinesChart"), {
    type: "bar",
    data: {
      labels: lines.map(x => x.name),
      datasets: [{ label: "Average Delay (min)", data: lines.map(x => x.avgDelay) }]
    },
    options: { indexAxis: "y", responsive: true }
  });

  hourChartInstance = new Chart(document.getElementById("hourChart"), {
    type: "line",
    data: {
      labels: hours.map(x => x.hour),
      datasets: [{ label: "Average Delay (min)", data: hours.map(x => x.avgDelay), tension: 0.3 }]
    },
    options: { responsive: true }
  });

  distributionChartInstance = new Chart(document.getElementById("distributionChart"), {
    type: "doughnut",
    data: {
      labels: distribution.map(x => x.category),
      datasets: [{ data: distribution.map(x => x.percent) }]
    },
    options: { responsive: true }
  });
}

dateInput.addEventListener("change", loadAnalytics);
timeInput.addEventListener("change", loadAnalytics);

loadAnalytics();