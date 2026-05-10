let email = "";
let role = "guest";

const API = window.location.origin;

let ws;

/* =========================
   WS
========================= */

function connectWS() {
  const WS_URL =
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`;

  ws = new WebSocket(WS_URL);

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    updateUI(data);
  };

  ws.onclose = () => setTimeout(connectWS, 1500);
}

connectWS();

/* =========================
   UI
========================= */

function updateUI(data) {
  const c = document.getElementById("countdown");
  if (data.countdown) {
    c.innerText =
      `${data.countdown.days}D ${data.countdown.hours}H ${data.countdown.minutes}M ${data.countdown.seconds}S`;
  } else {
    c.innerText = "PAUSED";
  }

  document.getElementById("status").innerText =
    data.launchEnabled ? "ACTIVE" : "STANDBY";

  document.getElementById("news").innerText =
    data.news || "NO ACTIVE NEWS";

  const img = document.getElementById("newsImage");
  if (data.newsImage) {
    img.src = data.newsImage;
    img.style.display = "block";
  } else {
    img.style.display = "none";
  }

  document.getElementById("logs").innerText =
    (data.logs || []).join("\n");
}

/* =========================
   LOGIN
========================= */

async function login() {
  email = document.getElementById("email").value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  role = data.role;

  document.getElementById("role").innerText = "ROLE: " + role;

  document.getElementById("directorPanel").classList.toggle(
    "hidden",
    role !== "director"
  );
}

const isDirector = () => role === "director";

/* =========================
   ACTIONS
========================= */

function toggleLaunch() {
  fetch(`${API}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

function abortMission() {
  fetch(`${API}/abort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

/* =========================
   COUNTDOWN
========================= */

function setCountdown() {
  const get = (id) => Number(document.getElementById(id).value) || 0;

  fetch(`${API}/set-countdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      years: get("years"),
      months: get("months"),
      weeks: get("weeks"),
      days: get("days"),
      hours: get("hours"),
      minutes: get("minutes"),
      seconds: get("seconds")
    })
  });
}

function stopCountdown() {
  fetch(`${API}/stop-countdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

function resumeCountdown() {
  fetch(`${API}/resume-countdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

/* =========================
   NEWS
========================= */

function setNews() {
  fetch(`${API}/set-news`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      message: document.getElementById("newsInput").value
    })
  });
}

function clearNews() {
  fetch(`${API}/clear-news`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

/* =========================
   IMAGE
========================= */

function uploadImage() {
  const file = document.getElementById("imageInput").files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    fetch(`${API}/set-news-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, image: reader.result })
    });
  };

  reader.readAsDataURL(file);
}

function clearImage() {
  fetch(`${API}/clear-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}
