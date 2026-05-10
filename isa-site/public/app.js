let email = "";
let role = "guest";

const API = window.location.origin;

/* =========================
   WS
========================= */

let launchTime = null;
let countdownActive = true;

function connectWS() {
  const WS_URL =
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`;

  const ws = new WebSocket(WS_URL);

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    updateUI(data);
  };

  ws.onclose = () => setTimeout(connectWS, 1500);
}

connectWS();

/* =========================
   SMOOTH COUNTDOWN LOOP
========================= */

setInterval(() => {
  if (!launchTime || !countdownActive) return;

  const diff = launchTime - Date.now();

  const el = document.getElementById("countdown");
  const stateEl = document.getElementById("countdownState");

  if (diff <= 0) {
    el.innerText = "LAUNCHED";
    stateEl.innerText = "DONE";
    return;
  }

  let s = Math.floor(diff / 1000);

  const seconds = s % 60; s = Math.floor(s / 60);
  const minutes = s % 60; s = Math.floor(s / 60);
  const hours = s % 24; s = Math.floor(s / 24);
  const days = s;

  el.innerText = `${days}D ${hours}H ${minutes}M ${seconds}S`;
  stateEl.innerText = "RUNNING";

}, 1000);

/* =========================
   UI UPDATE
========================= */

function updateUI(data) {

  launchTime = data.launchTime;
  countdownActive = data.countdownActive;

  if (!countdownActive) {
    document.getElementById("countdownState").innerText = "PAUSED";
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

/* =========================
   ACTIONS
========================= */

function send(path, body = {}) {
  fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ...body })
  });
}

/* launch */
const toggleLaunch = () => send("toggle");
const abortMission = () => send("abort");

/* countdown */
const setCountdown = () => send("set-countdown", {
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

/* news */
const setNews = () => send("set-news", {
  message: newsInput.value
});

const clearNews = () => send("clear-news");

/* image */
function uploadImage() {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    send("set-news-image", { image: reader.result });
  };

  reader.readAsDataURL(file);
}

const clearImage = () => send("clear-image");
