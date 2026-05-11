const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json({ limit: "20mb" })); // importante per immagini base64
app.use(express.static("public"));

/* =========================
   STATE
========================= */

let players = {};

let state = {
  launchEnabled: false,
  countdownActive: true,
  launchTime: Date.now() + 3600000,

  news: "",
  newsImage: "",

  statusText: "STANDBY",

  missionInfo: {
    rocket: "ISA-1",
    payload: "",
    destination: "",
    agency: ""
  },

  logs: []
};

/* =========================
   AUTH
========================= */

const USERS = {
  "andreatnt12@hotmail.com": {
    password: "Ciao_2026",
    role: "director"
  }
};

function checkAuth(email, password) {
  const u = USERS[email];
  if (!u) return "guest";
  return u.password === password ? u.role : "guest";
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
  const data = JSON.stringify({ ...state, players });

  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(data);
  });
}

/* =========================
   MINECRAFT STATUS
========================= */

app.post("/mc-status", (req, res) => {
  const { name, online, world, x, z } = req.body;

  players[name] = {
    online: !!online,
    world: world || "",
    x: x || 0,
    z: z || 0
  };

  log(`${name} → ${online ? "ONLINE" : "OFFLINE"} (${world})`);

  broadcast();
  res.json({ ok: true });
});

/* =========================
   LOGIN
========================= */

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  res.json({
    role: checkAuth(email, password)
  });
});

/* =========================
   NEWS + IMAGE (BASE64)
========================= */

app.post("/set-news", (req, res) => {
  const { message } = req.body;

  state.news = message || "";
  log("NEWS UPDATED");

  broadcast();
  res.json({ ok: true });
});

app.post("/set-news-image", (req, res) => {
  const { image } = req.body;

  state.newsImage = image || "";
  log("IMAGE UPDATED");

  broadcast();
  res.json({ ok: true });
});

app.post("/clear-news", (req, res) => {
  state.news = "";
  log("NEWS CLEARED");
  broadcast();
  res.json({ ok: true });
});

app.post("/clear-image", (req, res) => {
  state.newsImage = "";
  log("IMAGE CLEARED");
  broadcast();
  res.json({ ok: true });
});

/* =========================
   MISSION INFO
========================= */

app.post("/set-mission-info", (req, res) => {
  state.missionInfo = {
    rocket: req.body.rocket || "",
    payload: req.body.payload || "",
    destination: req.body.destination || "",
    agency: req.body.agency || ""
  };

  log("MISSION INFO UPDATED");
  broadcast();
  res.json({ ok: true });
});

/* =========================
   WS INIT
========================= */

wss.on("connection", ws => {
  ws.send(JSON.stringify({ ...state, players }));
});

/* =========================
   START
========================= */

server.listen(3000, () => {
  console.log("🚀 ISA SYSTEM ONLINE (NO MULTER MODE)");
});
