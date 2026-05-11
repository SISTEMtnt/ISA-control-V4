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
   CONSTANTS
========================= */

const MINECRAFT_WORLD_NAME = "ISA headquarters";

/* =========================
   WORLD NORMALIZER
========================= */

function normalizeWorld(world) {
  if (!world) return "";

  // se arriva path o stringa lunga, estrai il nome mondo
  if (world.includes("ISA headquarters")) {
    return MINECRAFT_WORLD_NAME;
  }

  return world;
}

/* =========================
   LOGS
========================= */

function log(msg) {
  state.logs.unshift(`[${new Date().toISOString()}] ${msg}`);
  if (state.logs.length > 30) state.logs.pop();
}

/* =========================
   WS BROADCAST
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
   MINECRAFT STATUS
========================= */

app.post("/mc-status", (req, res) => {
  const { name, online, world } = req.body;

  const fixedWorld = normalizeWorld(world);

  players[name] = {
    online,
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
  const { email } = req.body;

  res.json({
    role:
      email === "andreatnt12@hotmail.com"
        ? "director"
        : "guest"
  });
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
  console.log("ISA SYSTEM ONLINE");
});
