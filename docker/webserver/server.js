const express = require("express");
const fs = require("node:fs");
const path = require("node:path");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FILE_ACCESS_INTERVAL = Number(process.env.FILE_ACCESS_INTERVAL || 1000);
const MAX_HISTORY_ROWS = Number(process.env.MAX_HISTORY_ROWS || 500);

const RAW_DATA_FILE = path.resolve(
    process.env.PAYLOAD_RAW_FILE ||
    process.env.LORA_FILE ||
    path.join(__dirname, "data", "lora.txt")
);
const DATA_JSON_FILE = path.resolve(
    process.env.PAYLOAD_JSON_FILE ||
    path.join(__dirname, "data", "data.json")
);

const SENSOR_KEYS = [
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

let telemetryState = {
    rawFile: RAW_DATA_FILE,
    updatedAt: null,
    count: 0,
    latest: null,
    history: []
};

function ensureFile(filePath, initialContent = "") {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, initialContent, "utf8");
    }
}

function embeddedHeaderKeys(parts) {
    const keys = [];

    for (const value of parts.slice(2)) {
        if (!SENSOR_KEYS.includes(value)) {
            break;
        }

        keys.push(value);
    }

    return keys;
}

function stripInternalFields(row) {
    const clean = {};

    for (const [key, value] of Object.entries(row)) {
        if (!key.startsWith("_")) {
            clean[key] = value;
        }
    }

    return clean;
}

function parseTelemetryLine(line, lineNumber) {
    const parts = line.split(",").map((part) => part.trim());

    if (parts.length < 2 || parts.every((part) => part.length === 0)) {
        return null;
    }

    const row = {
        ID: parts[0] || "unknown",
        Time: parts[1] || "",
        _line: lineNumber,
        _raw: line
    };

    const embeddedKeys = embeddedHeaderKeys(parts);
    const hasEmbeddedKeys = embeddedKeys.length >= 3;
    const keys = hasEmbeddedKeys ? embeddedKeys : SENSOR_KEYS;
    const valuesStart = hasEmbeddedKeys ? 2 + embeddedKeys.length : 2;
    const values = parts.slice(valuesStart, valuesStart + keys.length);

    keys.forEach((key, index) => {
        if (key) {
            row[key] = values[index] || "";
        }
    });

    return row;
}

function decodeRawFile() {
    let raw = "";

    try {
        raw = fs.readFileSync(RAW_DATA_FILE, "utf8");
    } catch (error) {
        console.error(`Unable to read telemetry file ${RAW_DATA_FILE}:`, error.message);
    }

    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const skippedRows = Math.max(lines.length - MAX_HISTORY_ROWS, 0);
    const rows = lines
        .slice(-MAX_HISTORY_ROWS)
        .map((line, index) => parseTelemetryLine(line, index + 1))
        .filter(Boolean);

    const history = rows.slice().reverse();
    telemetryState = {
        rawFile: RAW_DATA_FILE,
        updatedAt: new Date().toISOString(),
        count: lines.length,
        displayedCount: history.length,
        skippedRows,
        latest: history[0] || null,
        history
    };

    const jsonPayload = history.map(stripInternalFields);
    fs.writeFileSync(DATA_JSON_FILE, JSON.stringify(jsonPayload, null, 2), "utf8");

    return telemetryState;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function allDisplayKeys(rows) {
    const keys = ["ID", "Time"];

    for (const key of SENSOR_KEYS) {
        if (rows.some((row) => row[key] !== undefined)) {
            keys.push(key);
        }
    }

    return keys;
}

function buildDashboardSnapshot() {
    const rows = telemetryState.history.map(stripInternalFields);
    const latest = rows[0] || {};
    const keys = allDisplayKeys(rows);
    const generatedAt = new Date().toISOString();

    const latestItems = keys
        .map((key) => `<div><strong>${escapeHtml(key)}</strong><span>${escapeHtml(latest[key] || "-")}</span></div>`)
        .join("");

    const tableHeader = keys.map((key) => `<th>${escapeHtml(key)}</th>`).join("");
    const tableRows = rows
        .map((row) => `<tr>${keys.map((key) => `<td>${escapeHtml(row[key] || "-")}</td>`).join("")}</tr>`)
        .join("");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Payload Telemetry Snapshot</title>
  <style>
    :root { color-scheme: dark; font-family: Arial, sans-serif; }
    body { margin: 0; background: #101216; color: #eef2f6; }
    main { max-width: 1180px; margin: 0 auto; padding: 28px; }
    h1, h2 { margin: 0 0 16px; }
    .meta { color: #9ba7b4; margin-bottom: 24px; }
    .latest { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 28px; }
    .latest div { border: 1px solid #303947; border-radius: 7px; padding: 10px; background: #171b22; }
    .latest strong, .latest span { display: block; }
    .latest strong { color: #75d0c6; font-size: 12px; }
    .latest span { font-size: 18px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; background: #171b22; }
    th, td { border-bottom: 1px solid #303947; padding: 9px 10px; text-align: left; }
    th { color: #75d0c6; font-size: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <main>
    <h1>Payload Telemetry Snapshot</h1>
    <p class="meta">Generated ${escapeHtml(generatedAt)} from ${escapeHtml(telemetryState.rawFile)}. Rows: ${rows.length}.</p>
    <h2>Most Recent</h2>
    <section class="latest">${latestItems || "<div><strong>Status</strong><span>No data</span></div>"}</section>
    <h2>History</h2>
    <table>
      <thead><tr>${tableHeader}</tr></thead>
      <tbody>${tableRows || `<tr><td colspan="${Math.max(keys.length, 1)}">No telemetry rows available</td></tr>`}</tbody>
    </table>
  </main>
</body>
</html>`;
}

ensureFile(RAW_DATA_FILE);
ensureFile(DATA_JSON_FILE, "[]");
decodeRawFile();

app.use(express.static(path.join(__dirname, "src")));

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        rawFile: telemetryState.rawFile,
        updatedAt: telemetryState.updatedAt,
        count: telemetryState.count,
        displayedCount: telemetryState.displayedCount
    });
});

app.get("/api/telemetry", (_req, res) => {
    res.json({
        ...telemetryState,
        latest: telemetryState.latest ? stripInternalFields(telemetryState.latest) : null,
        history: telemetryState.history.map(stripInternalFields)
    });
});

app.get("/data/data.json", (_req, res) => {
    res.type("application/json");
    res.sendFile(DATA_JSON_FILE);
});

app.get("/download/dashboard.html", (_req, res) => {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="payload-dashboard-${stamp}.html"`);
    res.send(buildDashboardSnapshot());
});

app.post("/i2c/off", (_req, res) => {
    try {
        const i2c = require("i2c-bus");
        const bus = i2c.openSync(1);

        bus.writeByteSync(0x00, 0x00, 0x00);
        bus.closeSync();
        res.send("disabled I2C");
    } catch (error) {
        res.status(503).send(`I2C unavailable: ${error.message}`);
    }
});

fs.watchFile(RAW_DATA_FILE, { interval: FILE_ACCESS_INTERVAL }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs || curr.size !== prev.size) {
        decodeRawFile();
    }
});

app.listen(PORT, () => {
    console.log(`Payload dashboard server running on port ${PORT}`);
    console.log(`Watching telemetry file: ${RAW_DATA_FILE}`);
});
