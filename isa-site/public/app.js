let email = "";
let role = "guest";

const API_BASE = window.location.origin;

/* =========================
   WEBSOCKET
========================= */

const WS_URL =
  location.protocol === "https:"
    ? `wss://${location.host}`
    : `ws://${location.host}`;

let ws;

function connectWS() {
  ws = new WebSocket(WS_URL);

  ws.onopen = () => console.log("WS connected");

  ws.onclose = () => {
    console.warn("WS reconnecting...");
    setTimeout(connectWS, 2000);
  };

  ws.onerror = err => console.error(err);

  ws.onmessage = msg => {
    const data = JSON.parse(msg.data);
    updateUI(data);
  };
}

connectWS();

/* =========================
   UI UPDATE
========================= */

function updateUI(data) {
  const countdown = document.getElementById("countdown");
  const status = document.getElementById("status");
  const telemetry = document.getElementById("telemetry");
  const logs = document.getElementById("logs");
  const news = document.getElementById("news");
  const newsImg = document.getElementById("newsImage");

  /* COUNTDOWN (FULL BREAKDOWN) */
  if (countdown && data.countdown) {
    const c = data.countdown;

    countdown.innerText =
      `Y:${c.years} M:${c.months} W:${c.weeks} D:${c.days} ` +
      `H:${c.hours} M:${c.minutes} S:${c.seconds}`;
  }

  /* STATUS */
  if (status) {
    status.innerText = data.launchEnabled ? "ACTIVE" : "STANDBY";
    status.style.color = data.launchEnabled ? "#00ff99" : "#ff5555";
  }

  /* TELEMETRY */
  if (telemetry && data.telemetry) {
    const t = data.telemetry;

    telemetry.innerText =
      `ALT: ${t.altitude.toFixed(1)} | ` +
      `VEL: ${t.velocity.toFixed(1)} | ` +
      `FUEL: ${t.fuel.toFixed(1)}`;
  }

  /* LOGS */
  if (logs && Array.isArray(data.logs)) {
    logs.innerText = data.logs.join("\n");
  }

  /* NEWS TEXT */
  if (news) {
    news.innerText = data.news || "NO ACTIVE NEWS";
  }

  /* NEWS IMAGE */
  if (newsImg && data.newsImage) {
    newsImg.src = data.newsImage;
    newsImg.style.display = "block";
  }
}

/* =========================
   LOGIN
========================= */

async function login() {
  email = document.getElementById("email")?.value || "";

  const res = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  role = data.role || "guest";

  document.getElementById("role").innerText = `ROLE: ${role}`;

  document.getElementById("directorPanel").style.display =
    role === "director" ? "block" : "none";
}

/* =========================
   CONTROL ACTIONS
========================= */

async function toggleLaunch() {
  if (!email) return alert("Login required");

  await fetch(`${API_BASE}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

async function abortLaunch() {
  if (!email) return alert("Login required");

  await fetch(`${API_BASE}/abort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

/* =========================
   COUNTDOWN CONTROL
========================= */

async function setCountdown() {
  if (role !== "director") return;

  await fetch(`${API_BASE}/set-countdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,

      years: +document.getElementById("years")?.value || 0,
      months: +document.getElementById("months")?.value || 0,
      weeks: +document.getElementById("weeks")?.value || 0,
      days: +document.getElementById("days")?.value || 0,
      hours: +document.getElementById("hours")?.value || 0,
      minutes: +document.getElementById("minutes")?.value || 0,
      seconds: +document.getElementById("seconds")?.value || 0
    })
  });
}

/* =========================
   NEWS TEXT
========================= */

async function setNews() {
  if (role !== "director") return;

  const message = document.getElementById("newsInput")?.value;

  await fetch(`${API_BASE}/set-news`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, message })
  });
}

/* =========================
   DRAG & DROP IMAGE
========================= */

const dropZone = document.getElementById("dropZone");

if (dropZone) {
  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.style.borderColor = "#00ff99";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#00d9ff";
  });

  dropZone.addEventListener("drop", e => {
    e.preventDefault();

    if (role !== "director") return;

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();

    reader.onload = () => {
      fetch(`${API_BASE}/set-news-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          image: reader.result
        })
      });
    };

    reader.readAsDataURL(file);
  });
}
