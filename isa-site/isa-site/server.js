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
   USERS
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
  launchTime: Date.now() + 3600000,

  phase: "IDLE",

  news: "NO ACTIVE NEWS",
  newsImage: null,

  logs: [],

  telemetry: {
    altitude: 0,
    velocity: 0,
    fuel: 100
  }
};

/* =========================
   TIME ENGINE (BREAKDOWN)
========================= */
function breakdown(ms) {
  let s = Math.floor(ms / 1000);

  const years = Math.floor(s / (365 * 24 * 3600));
  s %= 365 * 24 * 3600;

  const months = Math.floor(s / (30 * 24 * 3600));
  s %= 30 * 24 * 3600;

  const weeks = Math.floor(s / (7 * 24 * 3600));
  s %= 7 * 24 * 3600;

  const days = Math.floor(s / (24 * 3600));
  s %= 24 * 3600;

  const hours = Math.floor(s / 3600);
  s %= 3600;

  const minutes = Math.floor(s / 60);
  const seconds = s % 60;

  return { years, months, weeks, days, hours, minutes, seconds };
}

/* =========================
   HELPERS
========================= */
const now = () => Date.now();

const getCountdown = () =>
  breakdown(state.launchTime - now());

function log(msg) {
  state.logs.unshift(`[${new Date().toISOString()}] ${msg}`);
  if (state.logs.length > 25) state.logs.pop();
}

/* =========================
   PAYLOAD
========================= */
function payload() {
  return {
    launchEnabled: state.launchEnabled,
    phase: state.phase,
    countdown: getCountdown(),
    news: state.news,
    newsImage: state.newsImage,
    logs: state.logs,
    telemetry: state.telemetry
  };
}

/* =========================
   BROADCAST
========================= */
function broadcast() {
  const data = JSON.stringify(payload());

  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(data);
    }
  });
}

/* =========================
   TELEMETRY LOOP
========================= */
setInterval(() => {
  if (state.launchEnabled && state.phase !== "ABORTED") {
    state.telemetry.altitude += Math.random() * 4;
    state.telemetry.velocity += Math.random() * 2;
    state.telemetry.fuel -= Math.random() * 0.4;

    if (state.telemetry.fuel <= 0) {
      state.telemetry.fuel = 0;
      state.launchEnabled = false;
      state.phase = "ABORTED";
      log("FUEL DEPLETED");
    }
  }

  broadcast();
}, 1000);

/* =========================
   AUTH
========================= */
app.post("/login", (req, res) => {
  const email = req.body?.email;
  res.json({ role: getRole(email) });
});

/* =========================
   LAUNCH CONTROL
========================= */
app.post("/toggle", (req, res) => {
  const email = req.body?.email;
  if (!isDirector(email)) return res.sendStatus(403);

  state.launchEnabled = !state.launchEnabled;
  state.phase = state.launchEnabled ? "COUNTDOWN" : "IDLE";

  log("Launch toggled");

  broadcast();
  res.json(payload());
});

app.post("/abort", (req, res) => {
  const email = req.body?.email;
  if (!isDirector(email)) return res.sendStatus(403);

  state.launchEnabled = false;
  state.phase = "ABORTED";

  log("MISSION ABORTED");

  broadcast();
  res.json(payload());
});

/* =========================
   COUNTDOWN SET (DIRECTOR)
========================= */
app.post("/set-countdown", (req, res) => {
  const email = req.body?.email;
  if (!isDirector(email)) return res.sendStatus(403);

  const { years=0, months=0, weeks=0, days=0, hours=0, minutes=0, seconds=0 } = req.body;

  const ms =
    seconds * 1000 +
    minutes * 60000 +
    hours * 3600000 +
    days * 86400000 +
    weeks * 604800000 +
    months * 2592000000 +
    years * 31536000000;

  state.launchTime = Date.now() + ms;

  log("Countdown updated");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   NEWS TEXT
========================= */
app.post("/set-news", (req, res) => {
  const email = req.body?.email;
  if (!isDirector(email)) return res.sendStatus(403);

  state.news = req.body?.message || "";

  log("News updated");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   NEWS IMAGE (BASE64)
========================= */
app.post("/set-news-image", (req, res) => {
  const email = req.body?.email;
  if (!isDirector(email)) return res.sendStatus(403);

  state.newsImage = req.body?.image || null;

  log("News image updated");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   WS CONNECT
========================= */
wss.on("connection", ws => {
  ws.send(JSON.stringify(payload()));
  log("Client connected");
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port", PORT);
});
