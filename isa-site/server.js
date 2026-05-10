const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json({ limit: "10mb" }));
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

let state = {
  launchEnabled: false,

  countdownActive: true,
  launchTime: Date.now() + 3600000,
  pausedRemaining: null,

  news: "",
  newsImage: "",

  logs: []
};

/* =========================
   TIME (FIXED SAFE FORMAT)
========================= */

function msLeft() {
  return Math.max(0, state.launchTime - Date.now());
}

function format(ms) {
  let totalSeconds = Math.floor(ms / 1000);

  const seconds = totalSeconds % 60;
  totalSeconds = Math.floor(totalSeconds / 60);

  const minutes = totalSeconds % 60;
  totalSeconds = Math.floor(totalSeconds / 60);

  const hours = totalSeconds % 24;
  totalSeconds = Math.floor(totalSeconds / 24);

  const days = totalSeconds;

  return {
    years: 0,
    months: 0,
    weeks: 0,
    days,
    hours,
    minutes,
    seconds
  };
}

/* =========================
   LOGS
========================= */

function log(msg) {
  state.logs.unshift(`[${new Date().toISOString()}] ${msg}`);
  if (state.logs.length > 30) state.logs.pop();
}

/* =========================
   WS
========================= */

function broadcast() {
  const payload = JSON.stringify({
    launchEnabled: state.launchEnabled,
    countdownActive: state.countdownActive,
    countdown: state.countdownActive ? format(msLeft()) : null,
    news: state.news,
    newsImage: state.newsImage,
    logs: state.logs
  });

  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(payload);
  });
}

/* =========================
   AUTH
========================= */

app.post("/login", (req, res) => {
  res.json({ role: getRole(req.body.email) });
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
  log("MISSION ABORTED");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   COUNTDOWN SET
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
  state.countdownActive = true;
  state.pausedRemaining = null;

  log("Countdown set");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   STOP / RESUME
========================= */

app.post("/stop-countdown", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  if (state.countdownActive) {
    state.pausedRemaining = state.launchTime - Date.now();
    state.countdownActive = false;
    log("Countdown stopped");
  }

  broadcast();
  res.json({ ok: true });
});

app.post("/resume-countdown", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  if (!state.countdownActive && state.pausedRemaining != null) {
    state.launchTime = Date.now() + state.pausedRemaining;
    state.countdownActive = true;
    state.pausedRemaining = null;

    log("Countdown resumed");
  }

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
   DELETE NEWS (FIX ADDED)
========================= */

app.post("/clear-news", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.news = "";
  log("News cleared");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   IMAGE
========================= */

app.post("/set-news-image", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.newsImage = req.body.image || "";
  log("Image updated");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   DELETE IMAGE (FIX ADDED)
========================= */

app.post("/clear-image", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.newsImage = "";
  log("Image cleared");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   WS INIT
========================= */

wss.on("connection", ws => {
  ws.send(JSON.stringify({
    launchEnabled: state.launchEnabled,
    countdownActive: state.countdownActive,
    countdown: state.countdownActive ? format(msLeft()) : null,
    news: state.news,
    newsImage: state.newsImage,
    logs: state.logs
  }));
});

/* =========================
   START
========================= */

server.listen(3000, () => {
  console.log("ISA SYSTEM ONLINE");
});
