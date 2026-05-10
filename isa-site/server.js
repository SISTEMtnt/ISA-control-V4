const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

/* =========================
   DB
========================= */

const db = new sqlite3.Database("isa.db");

db.run(`
CREATE TABLE IF NOT EXISTS mission (
  id INTEGER PRIMARY KEY,
  launchTime INTEGER,
  launchEnabled INTEGER,
  news TEXT,
  newsImage TEXT
)`);

db.run(`INSERT OR IGNORE INTO mission VALUES (1,0,0,'','')`);

let state = {
  launchTime: Date.now() + 3600000,
  launchEnabled: false,
  news: "",
  newsImage: "",
  logs: [],
  telemetry: { altitude: 0, velocity: 0, fuel: 100 }
};

/* =========================
   USERS
========================= */

const USERS = {
  "director@isa.com": "director",
  "operator@isa.com": "operator"
};

const role = (email) => USERS[email] || "guest";
const isDirector = (email) => role(email) === "director";

/* =========================
   TIME SYSTEM
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
  if (state.logs.length > 25) state.logs.pop();
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
    state.telemetry.fuel = Math.max(0, state.telemetry.fuel - 0.2);
  }

  broadcast();
}, 1000);

/* =========================
   API
========================= */

app.post("/login", (req, res) => {
  res.json({ role: role(req.body.email) });
});

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

/* countdown set (ALL UNITS) */
app.post("/set-countdown", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  const ms =
    (req.body.years || 0) * 31536000000 +
    (req.body.months || 0) * 2592000000 +
    (req.body.weeks || 0) * 604800000 +
    (req.body.days || 0) * 86400000 +
    (req.body.hours || 0) * 3600000 +
    (req.body.minutes || 0) * 60000 +
    (req.body.seconds || 0) * 1000;

  state.launchTime = Date.now() + ms;

  log("Countdown updated");
  broadcast();

  res.json({ ok: true });
});

/* news */
app.post("/set-news", (req, res) => {
  state.news = req.body.message || "";
  log("News updated");

  broadcast();
  res.json({ ok: true });
});

/* image upload (BOTH operator + director) */
app.post("/upload-image", (req, res) => {
  const r = role(req.body.email);

  if (r !== "director" && r !== "operator")
    return res.sendStatus(403);

  state.newsImage = req.body.image;

  log(`Image uploaded by ${r}`);
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
  console.log("ISA SYSTEM ONLINE");
});
