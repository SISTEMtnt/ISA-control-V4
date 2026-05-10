const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

/* =========================
   USERS (simple auth)
========================= */

const USERS = {
  "director@isa.com": "director",
  "operator@isa.com": "operator"
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

let state = {
  launchEnabled: false,
  launchTime: Date.now() + 3600000, // default 1h
  news: "",
  newsImage: "",
  logs: [],
  telemetry: {
    altitude: 0,
    velocity: 0,
    fuel: 100
  }
};

/* =========================
   TIME ENGINE
========================= */

function msLeft() {
  return Math.max(0, state.launchTime - Date.now());
}

function formatCountdown(ms) {
  let s = Math.floor(ms / 1000);

  const seconds = s % 60; s = Math.floor(s / 60);
  const minutes = s % 60; s = Math.floor(s / 60);
  const hours = s % 24; s = Math.floor(s / 24);
  const days = s % 30; s = Math.floor(s / 30);
  const months = s % 12;
  const years = Math.floor(s / 12);

  return { years, months, days, hours, minutes, seconds };
}

/* =========================
   LOGS
========================= */

function log(msg) {
  state.logs.unshift(`[${new Date().toISOString()}] ${msg}`);
  if (state.logs.length > 30) state.logs.pop();
}

/* =========================
   BROADCAST
========================= */

function broadcast() {
  const payload = JSON.stringify({
    launchEnabled: state.launchEnabled,
    countdown: formatCountdown(msLeft()),
    telemetry: state.telemetry,
    logs: state.logs,
    news: state.news,
    newsImage: state.newsImage
  });

  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(payload);
  });
}

/* =========================
   TELEMETRY LOOP
========================= */

setInterval(() => {
  if (state.launchEnabled) {
    state.telemetry.altitude += Math.random() * 3;
    state.telemetry.velocity += Math.random() * 1.2;
    state.telemetry.fuel = Math.max(0, state.telemetry.fuel - 0.15);
  }

  broadcast();
}, 1000);

/* =========================
   AUTH
========================= */

app.post("/login", (req, res) => {
  const email = req.body.email || "";
  res.json({ role: getRole(email) });
});

/* =========================
   CONTROL
========================= */

app.post("/toggle", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.launchEnabled = !state.launchEnabled;
  log("Launch toggled");

  broadcast();
  res.json({ ok: true });
});

app.post("/abort", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.launchEnabled = false;
  log("MISSION ABORTED");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   COUNTDOWN
========================= */

app.post("/set-countdown", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  const {
    years = 0,
    months = 0,
    weeks = 0,
    days = 0,
    hours = 0,
    minutes = 0,
    seconds = 0
  } = req.body;

  const ms =
    years * 31536000000 +
    months * 2592000000 +
    weeks * 604800000 +
    days * 86400000 +
    hours * 3600000 +
    minutes * 60000 +
    seconds * 1000;

  state.launchTime = Date.now() + ms;

  log("Countdown updated");
  broadcast();

  res.json({ ok: true });
});

/* =========================
   NEWS
========================= */

app.post("/set-news", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.news = req.body.message || "";
  log("News updated");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   IMAGE (director only)
========================= */

app.post("/upload-image", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.newsImage = req.body.image || "";
  log("Image uploaded");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   WS
========================= */

wss.on("connection", ws => {
  ws.send(JSON.stringify({
    launchEnabled: state.launchEnabled,
    countdown: formatCountdown(msLeft()),
    telemetry: state.telemetry,
    logs: state.logs,
    news: state.news,
    newsImage: state.newsImage
  }));
});

/* =========================
   START
========================= */

server.listen(3000, () => {
  console.log("ISA SYSTEM ONLINE - PORT 3000");
});
