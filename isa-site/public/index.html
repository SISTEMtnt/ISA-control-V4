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
    setTimeout(connectWS, 2000);
  };
}

connectWS();

/* =========================
   UI UPDATE
========================= */

function updateUI(data) {

  // countdown
  if (data.countdown) {
    const c = data.countdown;
    document.getElementById("countdown").innerText =
      `${c.years || 0}Y ${c.months || 0}M ${c.weeks || 0}W ` +
      `${c.days || 0}D ${c.hours || 0}H ${c.minutes || 0}M ${c.seconds || 0}S`;
  }

  // status
  document.getElementById("status").innerText =
    data.launchEnabled ? "ACTIVE" : "STANDBY";

  // telemetry
  if (data.telemetry) {
    const t = data.telemetry;
    document.getElementById("telemetry").innerText =
      `ALT: ${t.altitude ?? 0} | VEL: ${t.velocity ?? 0} | FUEL: ${t.fuel ?? 0}`;
  }

  // logs
  if (data.logs) {
    document.getElementById("logs").innerText = data.logs.join("\n");
  }

  // news
  document.getElementById("news").innerText =
    data.news || "NO ACTIVE NEWS";

  // image
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
  email = document.getElementById("email").value.trim();

  if (!email) return alert("Enter email");

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
   COUNTDOWN
========================= */

function setCountdown() {
  if (!isDirector()) return alert("Access denied");

  const get = id => Number(document.getElementById(id)?.value) || 0;

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
   NEWS
========================= */

function setNews() {
  if (!isDirector()) return alert("Access denied");

  fetch(`${API}/set-news`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      message: document.getElementById("newsInput").value
    })
  });
}

/* =========================
   IMAGE UPLOAD (ADMIN ONLY)
========================= */

function uploadImage() {
  if (!isDirector()) return alert("Access denied");

  const file = document.getElementById("imageInput").files[0];
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
