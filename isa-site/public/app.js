let email = "";
let role = "guest";

const API = window.location.origin;

/* =========================
   WS
========================= */

const WS_URL =
  location.protocol === "https:"
    ? `wss://${location.host}`
    : `ws://${location.host}`;

let ws = new WebSocket(WS_URL);

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  updateUI(data);
};

/* =========================
   UI
========================= */

function updateUI(data) {

  /* countdown */
  if (data.countdown) {
    document.getElementById("countdown").innerText =
      `${data.countdown.years}Y ${data.countdown.months}M ${data.countdown.days}D ` +
      `${data.countdown.hours}H ${data.countdown.minutes}M ${data.countdown.seconds}S`;
  }

  /* status */
  const status = document.getElementById("status");
  status.innerText = data.launchEnabled ? "ACTIVE" : "STANDBY";

  /* telemetry */
  if (data.telemetry) {
    document.getElementById("telemetry").innerText =
      `ALT: ${data.telemetry.altitude.toFixed(1)} | ` +
      `VEL: ${data.telemetry.velocity.toFixed(1)} | ` +
      `FUEL: ${data.telemetry.fuel.toFixed(1)}`;
  }

  /* logs */
  if (data.logs) {
    document.getElementById("logs").innerText = data.logs.join("\n");
  }

  /* news */
  document.getElementById("news").innerText =
    data.news || "NO ACTIVE NEWS";

  /* image */
  const img = document.getElementById("newsImage");
  if (data.newsImage) {
    img.src = data.newsImage;
    img.style.display = "block";
  }
}

/* =========================
   LOGIN
========================= */

async function login() {
  email = document.getElementById("email").value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  role = data.role;

  document.getElementById("role").innerText = "ROLE: " + role;

  document.getElementById("directorPanel").style.display =
    role === "director" ? "block" : "none";
}

/* =========================
   ACTIONS
========================= */

function toggleLaunch() {
  fetch(`${API}/toggle`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email })
  });
}

function abortLaunch() {
  fetch(`${API}/abort`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ email })
  });
}

/* =========================
   COUNTDOWN
========================= */

function setCountdown() {
  fetch(`${API}/set-countdown`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      email,
      years: +years.value || 0,
      months: +months.value || 0,
      weeks: +weeks.value || 0,
      days: +days.value || 0,
      hours: +hours.value || 0,
      minutes: +minutes.value || 0,
      seconds: +seconds.value || 0
    })
  });
}

/* =========================
   NEWS
========================= */

function setNews() {
  fetch(`${API}/set-news`, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({
      email,
      message: newsInput.value
    })
  });
}

/* =========================
   DRAG IMAGE
========================= */

const dropZone = document.getElementById("dropZone");

dropZone?.addEventListener("drop", e => {
  e.preventDefault();

  const file = e.dataTransfer.files[0];
  const reader = new FileReader();

  reader.onload = () => {
    fetch(`${API}/set-news-image`, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        email,
        image: reader.result
      })
    });
  };

  reader.readAsDataURL(file);
});

dropZone?.addEventListener("dragover", e => e.preventDefault());
