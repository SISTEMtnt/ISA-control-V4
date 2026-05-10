const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

app.use(express.json());
app.use(express.static("public"));

/* ================= USERS ================= */
const USERS = {
  "andreatnt12@hotmail.com": "director"
};

const roleOf = (email) => USERS[email] || "guest";
const isDirector = (email) => roleOf(email) === "director";

/* ================= STATE ================= */
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

/* ================= TIME BREAKDOWN ================= */
function breakdown(ms) {
  let s = Math.floor(ms / 1000);

  const years = Math.floor(s / 31536000); s %= 31536000;
  const months = Math.floor(s / 2592000); s %= 2592000;
  const weeks = Math.floor(s / 604800); s %= 604800;
  const days = Math.floor(s / 86400); s %= 86400;
  const hours = Math.floor(s / 3600); s %= 3600;
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;

  return { years, months, weeks, days, hours, minutes, seconds };
}

/* ================= HELPERS ================= */
const now = () => Date.now();

const countdown = () => breakdown(state.launchTime - now());

function log(msg) {
  state.logs.unshift(`[${new Date().toISOString()}] ${msg}`);
  if (state.logs.length > 20) state.logs.pop();
}

/* ================= PAYLOAD ================= */
function payload() {
  return {
    launchEnabled: state.launchEnabled,
    phase: state.phase,
    countdown: countdown(),
    news: state.news,
    newsImage: state.newsImage,
    logs: state.logs,
    telemetry: state.telemetry
  };
}

/* ================= BROADCAST ================= */
function broadcast() {
  const data = JSON.stringify(payload());

  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(data);
  });
}

/* ================= TELEMETRY ================= */
setInterval(() => {
  if (state.launchEnabled && state.phase !== "ABORTED") {
    state.telemetry.altitude += Math.random() * 4;
    state.telemetry.velocity += Math.random() * 2;
    state.telemetry.fuel -= Math.random() * 0.4;

    if (state.telemetry.fuel <= 0) {
      state.launchEnabled = false;
      state.phase = "ABORTED";
      log("FUEL DEPLETED");
    }
  }

  broadcast();
}, 1000);

/* ================= ROUTES ================= */
app.post("/login", (req, res) => {
  res.json({ role: roleOf(req.body.email) });
});

app.post("/toggle", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.launchEnabled = !state.launchEnabled;
  state.phase = state.launchEnabled ? "COUNTDOWN" : "IDLE";

  log("Launch toggled");
  broadcast();
  res.json(payload());
});

app.post("/abort", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.launchEnabled = false;
  state.phase = "ABORTED";

  log("ABORTED");
  broadcast();
  res.json(payload());
});

/* countdown */
app.post("/set-countdown", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  const {
    years=0, months=0, weeks=0, days=0,
    hours=0, minutes=0, seconds=0
  } = req.body;

  state.launchTime =
    Date.now() +
    seconds*1000 +
    minutes*60000 +
    hours*3600000 +
    days*86400000 +
    weeks*604800000 +
    months*2592000000 +
    years*31536000000;

  log("Countdown updated");
  broadcast();

  res.json({ ok: true });
});

/* news text */
app.post("/set-news", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.news = req.body.message || "NO ACTIVE NEWS";

  log("News updated");
  broadcast();

  res.json({ ok: true });
});

/* news image */
app.post("/set-news-image", (req, res) => {
  if (!isDirector(req.body.email)) return res.sendStatus(403);

  state.newsImage = req.body.image;

  log("Image updated");
  broadcast();

  res.json({ ok: true });
});

/* ws */
wss.on("connection", ws => {
  ws.send(JSON.stringify(payload()));
  log("Client connected");
});

/* start */
server.listen(process.env.PORT || 3000, () => {
  console.log("SERVER RUNNING");
});
