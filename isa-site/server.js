const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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
   AUTH SYSTEM
========================= */

const USERS = {
  "andreatnt12@hotmail.com": {
    password: "Ciao_2026",
    role: "director"
  }
};

function checkAuth(email, password) {
  const user = USERS[email];
  if (!user) return "guest";

  return user.password === password ? user.role : "guest";
}

/* =========================
   MINECRAFT CONFIG
========================= */

const MINECRAFT_WORLD_NAME = "ISA headquarters";

/* =========================
   WORLD NORMALIZER
========================= */

function normalizeWorld(world) {
  if (!world) return "";

  if (world.includes("ISA headquarters")) {
    return MINECRAFT_WORLD_NAME;
  }

  return world;
}

/* =========================
   LOG SYSTEM
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
    ...state,
    players
  });

  wss.clients.forEach(c => {
    if (c.readyState === 1) c.send(payload);
  });
}

/* =========================
   MINECRAFT STATUS UPDATE
========================= */

app.post("/mc-status", (req, res) => {
  const { name, online, world } = req.body;

  const fixedWorld = normalizeWorld(world);

  players[name] = {
    online: !!online,
    world: fixedWorld
  };

  log(
    `${name} → ${online ? "ONLINE" : "OFFLINE"} ${
      fixedWorld ? `(world: ${fixedWorld})` : ""
    }`
  );

  broadcast();

  res.json({ ok: true });
});

/* =========================
   LOGIN
========================= */

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const role = checkAuth(email, password);

  res.json({ role });
});

/* =========================
   DIRECT ACTION PROTECTION
========================= */

function isDirector(email, password) {
  return checkAuth(email, password) === "director";
}

/* =========================
   ACTION ROUTES (SAFE)
========================= */

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
  ws.send(JSON.stringify({
    ...state,
    players
  }));
});

/* =========================
   START
========================= */

server.listen(3000, () => {
  console.log("🚀 ISA SYSTEM ONLINE");
});
