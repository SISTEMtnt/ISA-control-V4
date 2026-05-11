const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.json({ limit: "10mb" }));
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
  res.json({ role: checkAuth(email, password) });
});

/* =========================
   UPLOAD NEWS + IMAGE (FIXED)
========================= */

app.post("/upload-news", upload.single("image"), (req, res) => {
  const { message } = req.body;

  state.news = message || "";

  if (req.file) {
    state.newsImage =
      "data:" +
      req.file.mimetype +
      ";base64," +
      req.file.buffer.toString("base64");
  }

  log("NEWS UPDATED (text + image)");

  broadcast();
  res.json({ ok: true });
});

/* =========================
   ACTIONS
========================= */

function isDirector(email, password) {
  return checkAuth(email, password) === "director";
}

app.post("/toggle", (req, res) => {
  if (!isDirector(req.body.email, req.body.password))
    return res.sendStatus(403);

  state.launchEnabled = !state.launchEnabled;
  log("Launch toggled");

  broadcast();
  res.json({ ok: true });
});

app.post("/abort", (req, res) => {
  if (!isDirector(req.body.email, req.body.password))
    return res.sendStatus(403);

  state.launchEnabled = false;
  log("MISSION ABORTED");

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
  console.log("🚀 ISA SYSTEM ONLINE");
});
