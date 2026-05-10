const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static("public"));

/* =========================
   DATABASE
========================= */

const db = new sqlite3.Database("isa.db");

db.run(`
CREATE TABLE IF NOT EXISTS state (
  id INTEGER PRIMARY KEY,
  launchEnabled INTEGER,
  launchTime INTEGER,
  news TEXT,
  newsImage TEXT
)`);

db.run(`INSERT OR IGNORE INTO state VALUES (1,0,0,'','')`);

let state = {
  launchEnabled: false,
  launchTime: Date.now() + 3600000,
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

function role(email) {
  return USERS[email] || "guest";
}

function isDirector(email) {
  return role(email) === "director";
}

/* =========================
   COUNTDOWN (FIXED)
========================= */

function msLeft() {
  return Math.max(0, state.launchTime - Date.now());
}

function countdown(ms) {
  let s = Math.floor(ms / 1000);

  const sec = s % 60;
  s = Math.floor(s / 60);

  const min = s % 60;
  s = Math.floor(s / 60);

  const hr = s % 24;
  s = Math.floor(s / 24);

  const day = s % 30;
  s = Math.floor(s / 30);

  const mon = s % 12;
  const yr = Math.floor(s / 12);

  return {
    years: yr,
    months: mon,
    days: day,
    hours: hr,
    minutes: min,
    seconds: sec
  };
}

/* =========================
   BROADCAST
========================= */

function broadcast() {
  const payload = JSON.stringify({
    launchEnabled: state.launchEnabled,
    countdown: countdown(msLeft()),
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
   LOG
========================= */

function log(msg) {
  state.logs.unshift(`[${new Date().toISOString()}] ${msg}`);
  if (state.logs.length > 20) state.logs.pop();
}

/* =========================
   LOGIN
========================= */

app.post("/login", (req, res) => {
  res.json({ role: role(req.body.email) });
});

/* =========================
   LAUNCH
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
  log("ABORTED");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   COUNTDOWN SET
========================= */

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

/* =========================
   NEWS TEXT
========================= */

app.post("/set-news", (req, res) => {
  state.news = req.body.message || "";
  log("News updated");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   IMAGE UPLOAD (FIXED)
   WORKS FOR OPERATOR + DIRECTOR
========================= */

app.post("/upload-image", (req, res) => {
  const userRole = role(req.body.email);

  if (userRole !== "director" && userRole !== "operator") {
    return res.sendStatus(403);
  }

  state.newsImage = req.body.image;
  log("Image uploaded by " + userRole);

  broadcast();
  res.json({ ok: true });
});

/* =========================
   WS
========================= */

wss.on("connection", ws => {
  ws.send(JSON.stringify({
    launchEnabled: state.launchEnabled,
    countdown: countdown(msLeft()),
    telemetry: state.telemetry,
    logs: state.logs,
    news: state.news,
    newsImage: state.newsImage
  }));
});

/* =========================
   START
========================= */

server.listen(3000, () => console.log("RUNNING"));
