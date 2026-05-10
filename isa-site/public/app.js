let email = "";
let role = "guest";

const API = window.location.origin;

/* =========================
   WEBSOCKET (AUTO RECONNECT)
========================= */

let ws;

function connectWS() {
  const WS_URL =
    location.protocol === "https:"
      ? `wss://${location.host}`
      : `ws://${location.host}`;

  ws = new WebSocket(WS_URL);

  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      updateUI(data);
    } catch (e) {
      console.error("WS error:", e);
    }
  };

  ws.onclose = () => {
    setTimeout(connectWS, 1500);
  };
}

connectWS();

/* =========================
   SAFE DOM HELPERS
========================= */

function el(id) {
  return document.getElementById(id);
}

/* =========================
   UI UPDATE (FIXED + SAFE)
========================= */

function updateUI(data) {

  /* COUNTDOWN */
  const countdownEl = el("countdown");

  if (!countdownEl) return;

  if (data.countdown && data.countdownActive !== false) {
    const c = data.countdown;

    countdownEl.innerText =
      `${c.years || 0}Y ${c.months || 0}M ${c.weeks || 0}W ` +
      `${c.days || 0}D ${c.hours || 0}H ${c.minutes || 0}M ${c.seconds || 0}S`;
  } else {
    countdownEl.innerText = "PAUSED";
  }

  /* STATUS */
  const statusEl = el("status");
  if (statusEl) {
    statusEl.innerText = data.launchEnabled ? "ACTIVE" : "STANDBY";
  }

  /* LOGS */
  const logsEl = el("logs");
  if (logsEl && data.logs) {
    logsEl.innerText = data.logs.join("\n");
  }

  /* NEWS */
  const newsEl = el("news");
  if (newsEl) {
    newsEl.innerText = data.news || "NO ACTIVE NEWS";
  }

  /* IMAGE */
  const img = el("newsImage");

  if (img) {
    if (data.newsImage && data.newsImage.length > 10) {
      img.src = data.newsImage;
      img.style.display = "block";
    } else {
      img.src = "";
      img.style.display = "none";
    }
  }
}

/* =========================
   LOGIN
========================= */

async function login() {
  email = el("email")?.value?.trim();

  if (!email) return alert("Enter email");

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  role = data.role;

  const roleEl = el("role");
  if (roleEl) roleEl.innerText = "ROLE: " + role;

  const panel = el("directorPanel");
  if (panel) {
    panel.classList.toggle("hidden", role !== "director");
  }
}

/* =========================
   ROLE CHECK
========================= */

function isDirector() {
  return role === "director";
}

/* =========================
   ACTIONS
========================= */

function toggleLaunch() {
  if (!isDirector()) return alert("Access denied");

  fetch(`${API}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

function abortMission() {
  if (!isDirector()) return alert("Access denied");

  fetch(`${API}/abort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

/* =========================
   COUNTDOWN SET
========================= */

function setCountdown() {
  if (!isDirector()) return alert("Access denied");

  const get = (id) => Number(el(id)?.value) || 0;

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

/* =========================
   STOP / RESUME COUNTDOWN
========================= */

function stopCountdown() {
  if (!isDirector()) return alert("Access denied");

  fetch(`${API}/stop-countdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
}

function resumeCountdown() {
  if (!isDirector()) return alert("Access denied");

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
  if (!isDirector()) return alert("Access denied");

  fetch(`${API}/set-news`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      message: el("newsInput")?.value || ""
    })
  });
}

/* =========================
   IMAGE UPLOAD
========================= */

function uploadImage() {
  if (!isDirector()) return alert("Access denied");

  const file = el("imageInput")?.files?.[0];
  if (!file) return alert("Select image");

  const reader = new FileReader();

  reader.onload = () => {
    fetch(`${API}/set-news-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        image: reader.result
      })
    });
  };

  reader.readAsDataURL(file);
}
