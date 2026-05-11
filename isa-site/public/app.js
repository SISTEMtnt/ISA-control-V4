let email = "";
let password = "";
let role = "guest";

const API = window.location.origin;

let launchTime = null;
let countdownActive = true;

/* =========================
   WS CONNECTION
========================= */

function connectWS() {
  const ws = new WebSocket(
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`
  );

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    updateUI(data);
  };

  ws.onclose = () => setTimeout(connectWS, 1500);
}

connectWS();

/* =========================
   COUNTDOWN
========================= */

setInterval(() => {
  if (!launchTime || !countdownActive) return;

  const diff = launchTime - Date.now();

  const el = document.getElementById("countdown");
  const stateEl = document.getElementById("countdownState");

  if (!el || !stateEl) return;

  if (diff <= 0) {
    el.innerText = "LAUNCHED";
    stateEl.innerText = "DONE";
    return;
  }

  let s = Math.floor(diff / 1000);

  const seconds = s % 60;
  s = Math.floor(s / 60);

  const minutes = s % 60;
  s = Math.floor(s / 60);

  const hours = s % 24;
  s = Math.floor(s / 24);

  const days = s;

  el.innerText = `${days}D ${hours}H ${minutes}M ${seconds}S`;
  stateEl.innerText = "RUNNING";
}, 1000);

/* =========================
   UI UPDATE
========================= */

function updateUI(data) {
  // safety fix
  if (!data.players) data.players = {};
  if (!data.missionInfo) data.missionInfo = {};
  if (!data.logs) data.logs = [];

  launchTime = data.launchTime;
  countdownActive = data.countdownActive;

  document.getElementById("status").innerText =
    data.statusText || "STANDBY";

  document.getElementById("news").innerText =
    data.news || "NO ACTIVE NEWS";

  const img = document.getElementById("newsImage");
  if (img) {
    if (data.newsImage) {
      img.src = data.newsImage;
      img.style.display = "block";
    } else {
      img.style.display = "none";
    }
  }

  document.getElementById("logs").innerText =
    data.logs.join("\n");

  document.getElementById("miRocket").innerText =
    data.missionInfo.rocket || "---";

  document.getElementById("miPayload").innerText =
    data.missionInfo.payload || "---";

  document.getElementById("miDestination").innerText =
    data.missionInfo.destination || "---";

  document.getElementById("miAgency").innerText =
    data.missionInfo.agency || "---";

  /* =========================
     MINECRAFT STATUS
  ========================= */

  const p = data.players?.MossBlocktnt;

  if (p) {
    document.getElementById("mcStatus").innerText =
      p.online ? "ONLINE" : "OFFLINE";

    document.getElementById("mcWorld").innerText =
      p.online ? p.world : "NOT PLAYING";
  }

  document.getElementById("playersBox").innerText =
    JSON.stringify(data.players, null, 2);

  /* =========================
     RADAR + MAP + WORKERS
  ========================= */

  updateRadar(data.players);
  updateMap(data.players);
  updateWorkers(data.players);

  if (!countdownActive) {
    document.getElementById("countdownState").innerText = "PAUSED";
  }
}

/* =========================
   RADAR SYSTEM
========================= */

function updateRadar(players) {
  const radar = document.getElementById("radar");
  if (!radar) return;

  radar.innerHTML = "";

  let i = 0;

  for (const name in players) {
    const p = players[name];
    if (!p.online) continue;

    const dot = document.createElement("div");
    dot.className = "dot";

    const angle = i * 2.2;
    const radius = 90;

    const x = 130 + Math.cos(angle) * radius;
    const y = 130 + Math.sin(angle) * radius;

    dot.style.left = x + "px";
    dot.style.top = y + "px";

    radar.appendChild(dot);
    i++;
  }
}

/* =========================
   MAP SYSTEM
========================= */

function updateMap(players) {
  const map = document.getElementById("map");
  if (!map) return;

  map.innerHTML = "";

  let i = 0;

  for (const name in players) {
    const p = players[name];
    if (!p.online) continue;

    const el = document.createElement("div");
    el.innerText = "📍 " + name;

    el.style.position = "absolute";
    el.style.left = (20 + i * 80) + "px";
    el.style.top = "80px";
    el.style.color = "#00e5ff";
    el.style.textShadow = "0 0 10px #00e5ff";

    map.appendChild(el);
    i++;
  }
}

/* =========================
   WORKERS SYSTEM
========================= */

function updateWorkers(players) {
  let count = 0;

  for (const name in players) {
    if (players[name].online) count++;
  }

  const el = document.getElementById("workersCount");
  if (el) {
    el.innerText = count + " ACTIVE WORKERS";
  }
}

/* =========================
   LOGIN
========================= */

async function login() {
  email = document.getElementById("email").value;
  password = document.getElementById("password").value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  role = data.role;

  document.getElementById("role").innerText =
    "ROLE: " + role;

  document.getElementById("directorPanel").classList.toggle(
    "hidden",
    role !== "director"
  );
}

/* =========================
   HELPERS
========================= */

const send = (path, body = {}) =>
  fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      ...body
    })
  });

/* =========================
   ACTIONS
========================= */

const toggleLaunch = () => send("toggle");
const abortMission = () => send("abort");

const setCountdown = () =>
  send("set-countdown", {
    years: +years.value || 0,
    months: +months.value || 0,
    weeks: +weeks.value || 0,
    days: +days.value || 0,
    hours: +hours.value || 0,
    minutes: +minutes.value || 0,
    seconds: +seconds.value || 0
  });

const stopCountdown = () => send("stop-countdown");
const resumeCountdown = () => send("resume-countdown");

const setNews = () =>
  send("set-news", { message: newsInput.value });

const clearNews = () => send("clear-news");

function uploadImage() {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () =>
    send("set-news-image", { image: reader.result });

  reader.readAsDataURL(file);
}

const clearImage = () => send("clear-image");

const setMissionInfo = () =>
  send("set-mission-info", {
    rocket: rocketInput.value,
    payload: payloadInput.value,
    destination: destinationInput.value,
    agency: agencyInput.value
  });

const setStatusText = () =>
  send("set-status-text", {
    text: statusInput.value
  });
