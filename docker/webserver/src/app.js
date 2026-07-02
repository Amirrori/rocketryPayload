const POLL_INTERVAL_MS = 1000;
const DISPLAY_KEYS = [
    "ID",
    "Time",
    "B1",
    "B2",
    "B3",
    "B4",
    "T1",
    "T2",
    "T3",
    "H1",
    "H2",
    "H3",
    "M",
    "A",
    "X",
    "Y",
    "Z",
    "GPS_SATS_USE",
    "GPS_SATS_VIEW"
];

const UNITS = {
    B1: "Pa",
    B2: "Pa",
    B3: "Pa",
    B4: "Pa",
    T1: "C",
    T2: "C",
    T3: "C",
    H1: "%",
    H2: "%",
    H3: "%",
    M: "",
    A: "m",
    X: "deg",
    Y: "deg",
    GPS_SATS_USE: "sat",
    GPS_SATS_VIEW: "sat"
};

const LABELS = {
    B1: "Pressure 1",
    B2: "Pressure 2",
    B3: "Pressure 3",
    B4: "Pressure Avg",
    T1: "Temp 1",
    T2: "Temp 2",
    T3: "Temp 3",
    H1: "Humidity 1",
    H2: "Humidity 2",
    H3: "Humidity 3",
    M: "Sample",
    A: "GPS Altitude",
    X: "GPS Latitude",
    Y: "GPS Longitude",
    Z: "GPS Fix Status",
    GPS_SATS_USE: "Sats In Use",
    GPS_SATS_VIEW: "Sats In View"
};

const latestGrid = document.querySelector("#latest-grid");
const historyHead = document.querySelector("#history-head");
const historyBody = document.querySelector("#history-body");
const connectionStatus = document.querySelector("#connection-status");
const lastUpdate = document.querySelector("#last-update");
const rowCount = document.querySelector("#row-count");
const latestNode = document.querySelector("#latest-node");
const sampleTime = document.querySelector("#sample-time");
const themeToggle = document.querySelector("#theme-toggle");

const THEME_STORAGE_KEY = "payload-dashboard-theme";

function preferredTheme() {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    if (themeToggle) {
        themeToggle.textContent = theme === "light" ? "Dark Mode" : "Light Mode";
        themeToggle.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    }
}

function toggleTheme() {
    const nextTheme = document.documentElement.dataset.theme === "light" ? "dark" : "light";

    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
}

function setStatus(label, state) {
    connectionStatus.textContent = label;
    connectionStatus.className = `status-pill status-${state}`;
}

function formatUpdateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function displayKeysFor(rows) {
    const presentKeys = new Set();

    rows.forEach((row) => {
        Object.keys(row).forEach((key) => presentKeys.add(key));
    });

    return DISPLAY_KEYS.filter((key) => presentKeys.has(key));
}

function valueWithUnit(key, value) {
    if (value === undefined || value === null || value === "") {
        return "-";
    }

    return UNITS[key] ? `${value} ${UNITS[key]}` : value;
}

function labelFor(key) {
    return LABELS[key] || key;
}

function renderLatest(latest, keys) {
    latestGrid.replaceChildren();

    if (!latest) {
        latestGrid.classList.add("empty-state");
        const empty = document.createElement("span");
        empty.textContent = "No telemetry received";
        latestGrid.appendChild(empty);
        return;
    }

    latestGrid.classList.remove("empty-state");

    keys.forEach((key) => {
        const card = document.createElement("div");
        const label = document.createElement("span");
        const value = document.createElement("strong");

        label.className = "metric-label";
        label.textContent = labelFor(key);
        value.textContent = valueWithUnit(key, latest[key]);

        card.append(label, value);
        latestGrid.appendChild(card);
    });
}

function renderHistory(rows, keys) {
    historyHead.replaceChildren();
    historyBody.replaceChildren();

    if (!rows.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.textContent = "No telemetry received";
        row.appendChild(cell);
        historyBody.appendChild(row);
        return;
    }

    keys.forEach((key) => {
        const cell = document.createElement("th");

        cell.scope = "col";
        cell.textContent = labelFor(key);
        historyHead.appendChild(cell);
    });

    rows.forEach((entry) => {
        const row = document.createElement("tr");

        keys.forEach((key) => {
            const cell = document.createElement("td");

            cell.textContent = valueWithUnit(key, entry[key]);
            row.appendChild(cell);
        });

        historyBody.appendChild(row);
    });
}

async function updateDashboard() {
    try {
        const response = await fetch("/api/telemetry", { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const telemetry = await response.json();
        const rows = telemetry.history || [];
        const keys = displayKeysFor(rows.length ? rows : telemetry.latest ? [telemetry.latest] : []);

        setStatus(rows.length ? "Live" : "No Data", rows.length ? "live" : "waiting");
        lastUpdate.textContent = formatUpdateTime(telemetry.updatedAt);
        rowCount.textContent = String(telemetry.count || 0);
        latestNode.textContent = telemetry.latest?.ID || "-";
        sampleTime.textContent = telemetry.latest?.Time || "-";

        renderLatest(telemetry.latest, keys);
        renderHistory(rows, keys);
    } catch (error) {
        setStatus("Offline", "offline");
        console.error(error);
    }
}

applyTheme(preferredTheme());
themeToggle?.addEventListener("click", toggleTheme);
updateDashboard();
setInterval(updateDashboard, POLL_INTERVAL_MS);
