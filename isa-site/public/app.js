let email = "";
let role = "guest";
const API = window.location.origin;

let launchTime = null;
let countdownActive = true;

/* =========================
   WS
========================= */

function connectWS() {
  const ws = new WebSocket(
    location.protocol === "https:" ? `wss://${location.host}` : `ws://${location.host}`
  );

  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    updateUI(data);
  };

  ws.onclose = () => setTimeout(connectWS, 1500);
}

connectWS();

/* =========================
   COUNTDOWN LOOP (CLIENT SIDE)
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

  document.getElementById("status").innerText =
    data.statusText || "STANDBY";

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

  if (data.missionInfo) {
    document.getElementById("miRocket").innerText = data.missionInfo.rocket || "---";
    document.getElementById("miPayload").innerText = data.missionInfo.payload || "---";
    document.getElementById("miDestination").innerText = data.missionInfo.destination || "---";
    document.getElementById("miAgency").innerText = data.missionInfo.agency || "---";
  }

  if (!countdownActive) {
    document.getElementById("countdownState").innerText = "PAUSED";
  }
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
   HELPERS
========================= */

const send = (path, body = {}) =>
  fetch(`${API}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ...body })
  });

/* =========================
   ACTIONS
========================= */

const toggleLaunch = () => send("toggle");
const abortMission = () => send("abort");

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

/* NEWS */
const setNews = () => send("set-news", { message: newsInput.value });
const clearNews = () => send("clear-news");

/* IMAGE */
function uploadImage() {
  const file = imageInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () =>
    send("set-news-image", { image: reader.result });

  reader.readAsDataURL(file);
}

const clearImage = () => send("clear-image");

/* MISSION INFO */
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
