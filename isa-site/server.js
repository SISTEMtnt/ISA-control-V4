const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

/* =========================
   WEBSOCKET SETUP
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

function getRole(email) {
  return USERS[email] || "guest";
}

function isDirector(email) {
  return getRole(email) === "director";
}

/* =========================
   STATE
========================= */
const PHASE = {
  IDLE: "IDLE",
  COUNTDOWN: "COUNTDOWN",
  ACTIVE: "ACTIVE",
  ABORTED: "ABORTED"
};

const state = {
  launchEnabled: false,
  launchTime: Date.now() + 300000,
  phase: PHASE.IDLE,

  logs: [],

  telemetry: {
    altitude: 0,
    velocity: 0,
    fuel: 100
  }
};

/* =========================
   HELPERS
========================= */
const now = () => Date.now();

const getCountdown = () =>
  Math.max(0, state.launchTime - now());

function addLog(message) {
  state.logs.unshift(`[${new Date().toISOString()}] ${message}`);
  if (state.logs.length > 20) state.logs.pop();
}

/* =========================
   PAYLOAD (SOURCE OF TRUTH)
========================= */
function buildPayload() {
  return {
    launchEnabled: state.launchEnabled,
    phase: state.phase,
    countdown: getCountdown(),
    logs: state.logs,
    telemetry: state.telemetry
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
  try {
    if (state.launchEnabled && state.phase !== PHASE.ABORTED) {
      state.telemetry.altitude += Math.random() * 4;
      state.telemetry.velocity += Math.random() * 2;
      state.telemetry.fuel -= Math.random() * 0.4;

      if (state.telemetry.fuel <= 0) {
        state.telemetry.fuel = 0;
        state.launchEnabled = false;
        state.phase = PHASE.ABORTED;

        addLog("FUEL DEPLETED - SYSTEM SHUTDOWN INITIATED");
      }
    }

    broadcast();
  } catch (err) {
    console.error("Telemetry error:", err);
  }
}, 1000);

/* =========================
   AUTH ROUTES
========================= */
app.post("/login", (req, res) => {
  const email = req.body?.email;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  res.json({
    role: getRole(email)
  });
});

/* =========================
   CONTROL ROUTES
========================= */
app.post("/toggle", (req, res) => {
  const email = req.body?.email;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  if (!isDirector(email)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  state.launchEnabled = !state.launchEnabled;
  state.phase = state.launchEnabled ? PHASE.COUNTDOWN : PHASE.IDLE;

  addLog(`Launch state changed: ${state.launchEnabled}`);

  broadcast();
  res.json(buildPayload());
});

app.post("/abort", (req, res) => {
  const email = req.body?.email;

  if (!email) {
    return res.status(400).json({ error: "Email required" });
  }

  if (!isDirector(email)) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  state.launchEnabled = false;
  state.phase = PHASE.ABORTED;

  addLog("Mission aborted by operator");

  broadcast();
  res.json(buildPayload());
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
   START SERVER (RENDER SAFE)
========================= */
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});