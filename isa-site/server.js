const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

/* =========================
   WEBSOCKET
========================= */
const wss = new WebSocket.Server({ server });

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());
app.use(express.static("public"));

/* =========================
   USERS / ROLES
========================= */
const USERS = {
  "andreatnt12@hotmail.com": "director"
};

const getRole = (email) => USERS[email] || "guest";
const isDirector = (email) => getRole(email) === "director";

/* =========================
   STATE
========================= */
const state = {
  launchEnabled: false,

  // store absolute launch time
  launchTime: Date.now() + 3600000, // default 1 hour

  phase: "IDLE",

  logs: [],

  telemetry: {
    altitude: 0,
    velocity: 0,
    fuel: 100
  },

  // 📰 director-controlled news
  news: "System initialized"
};

/* =========================
   HELPERS
========================= */
const now = () => Date.now();

const getCountdown = () =>
  Math.max(0, state.launchTime - now());

function addLog(msg) {
  state.logs.unshift(`[${new Date().toISOString()}] ${msg}`);
  if (state.logs.length > 20) state.logs.pop();
}

/* =========================
   PAYLOAD
========================= */
function buildPayload() {
  return {
    launchEnabled: state.launchEnabled,
    phase: state.phase,
    countdown: getCountdown(),
    logs: state.logs,
    telemetry: state.telemetry,
    news: state.news
  };
}

/* =========================
   BROADCAST
========================= */
function broadcast() {
  const data = JSON.stringify(buildPayload());

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/* =========================
   TELEMETRY LOOP
========================= */
setInterval(() => {
  if (state.launchEnabled) {
    state.telemetry.altitude += Math.random() * 4;
    state.telemetry.velocity += Math.random() * 2;
    state.telemetry.fuel -= Math.random() * 0.4;

    if (state.telemetry.fuel <= 0) {
      state.telemetry.fuel = 0;
      state.launchEnabled = false;
      state.phase = "ABORTED";
      addLog("Fuel depleted");
    }
  }

  broadcast();
}, 1000);

/* =========================
   LOGIN
========================= */
app.post("/login", (req, res) => {
  const email = req.body?.email;
  res.json({ role: getRole(email) });
});

/* =========================
   LAUNCH TOGGLE
========================= */
app.post("/toggle", (req, res) => {
  const email = req.body?.email;

  if (!isDirector(email)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  state.launchEnabled = !state.launchEnabled;
  state.phase = state.launchEnabled ? "COUNTDOWN" : "IDLE";

  addLog(`Launch state changed: ${state.launchEnabled}`);

  broadcast();
  res.json(buildPayload());
});

/* =========================
   ABORT
========================= */
app.post("/abort", (req, res) => {
  const email = req.body?.email;

  if (!isDirector(email)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  state.launchEnabled = false;
  state.phase = "ABORTED";

  addLog("Mission aborted");

  broadcast();
  res.json(buildPayload());
});

/* =========================
   ⏱ SET COUNTDOWN (NEW)
   Supports:
   - seconds
   - minutes
   - hours
   - days
   - weeks
========================= */
app.post("/set-countdown", (req, res) => {
  const email = req.body?.email;
  const { seconds = 0, minutes = 0, hours = 0, days = 0, weeks = 0 } = req.body;

  if (!isDirector(email)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const totalMs =
    seconds * 1000 +
    minutes * 60 * 1000 +
    hours * 60 * 60 * 1000 +
    days * 24 * 60 * 60 * 1000 +
    weeks * 7 * 24 * 60 * 60 * 1000;

  state.launchTime = Date.now() + totalMs;

  addLog(`Countdown updated`);

  broadcast();
  res.json({ launchTime: state.launchTime });
});

/* =========================
   📰 SET NEWS (NEW)
========================= */
app.post("/set-news", (req, res) => {
  const email = req.body?.email;
  const { message } = req.body;

  if (!isDirector(email)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  state.news = message;

  addLog("News updated");

  broadcast();
  res.json({ news: state.news });
});

/* =========================
   WEBSOCKET CONNECTION
========================= */
wss.on("connection", (ws) => {
  ws.send(JSON.stringify(buildPayload()));

  addLog("Client connected");
  broadcast();
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
