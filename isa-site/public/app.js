let email = "";
let password = "";
let role = "guest";

const API = window.location.origin;

let launchTime = null;
let countdownActive = true;

/* =========================
   WS
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
   UI UPDATE
========================= */

function updateUI(data) {
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
    (data.logs || []).join("\n");

  if (data.missionInfo) {
    document.getElementById("miRocket").innerText =
      data.missionInfo.rocket || "---";

    document.getElementById("miPayload").innerText =
      data.missionInfo.payload || "---";

    document.getElementById("miDestination").innerText =
      data.missionInfo.destination || "---";

    document.getElementById("miAgency").innerText =
      data.missionInfo.agency || "---";
  }

  updateRadar(data.players || {});
  updateMap2D(data.players || {});
  updateWorkers(data.players || {});
}

/* =========================
   RADAR
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

    dot.style.left = 130 + Math.cos(angle) * radius + "px";
    dot.style.top = 130 + Math.sin(angle) * radius + "px";

    radar.appendChild(dot);
    i++;
  }
}

/* =========================
   MAPPA 2D
========================= */

function updateMap2D(players) {
  const map = document.getElementById("map2d");
  if (!map) return;

  map.innerHTML = "";

  const scale = 0.3;

  for (const name in players) {
    const p = players[name];
    if (!p.online) continue;

    const dot = document.createElement("div");
    dot.className = "playerDot";

    const cx = map.clientWidth / 2;
    const cy = map.clientHeight / 2;

    dot.style.left = cx + p.x * scale + "px";
    dot.style.top = cy + p.z * scale + "px";

    map.appendChild(dot);
  }
}

/* =========================
   WORKERS
========================= */

function updateWorkers(players) {
  let count = 0;

  for (const p in players) {
    if (players[p].online) count++;
  }

  const el = document.getElementById("workersCount");
  if (el) el.innerText = count + " ACTIVE WORKERS";
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

  document.getElementById("role").innerText = "ROLE: " + role;

  document.getElementById("directorPanel").classList.toggle(
    "hidden",
    role !== "director"
  );
}

/* =========================
   NEWS + IMAGE (NO MULTER)
========================= */

function uploadNews() {
  const file = imageInput.files[0];

  // caso 1: solo testo
  if (!file) {
    fetch(`${API}/set-news`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newsInput.value })
    });
    return;
  }

  // caso 2: immagine + testo
  const reader = new FileReader();

  reader.onload = () => {
    // immagine
    fetch(`${API}/set-news-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: reader.result })
    });

    // testo
    fetch(`${API}/set-news`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newsInput.value })
    });
  };

  reader.readAsDataURL(file);
}

/* =========================
   HELPERS DIRECTOR PANEL
========================= */

const send = (path, body = {}) =>
  fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...body })
  });
