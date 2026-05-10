let email = "";
let role = "guest";

const API_BASE = window.location.origin;

/* =========================
   WEBSOCKET
========================= */

const WS_URL =
    window.location.protocol === "https:"
        ? `wss://${window.location.host}`
        : `ws://${window.location.host}`;

let ws;

function connectWS() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
        console.log("WebSocket connected");
    };

    ws.onclose = () => {
        console.warn("WebSocket disconnected. Reconnecting...");
        setTimeout(connectWS, 2000);
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
    };

    ws.onmessage = (msg) => {
        try {
            const data = JSON.parse(msg.data);
            updateUI(data);
        } catch (e) {
            console.error("Bad WS data:", e);
        }
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

    /* COUNTDOWN */
    if (countdown) {
        const sec = Math.floor((data.countdown || 0) / 1000);
        countdown.innerText = `T-${sec}s`;
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

    /* NEWS */
    if (news) {
        news.innerText = data.news || "NO ACTIVE NEWS";
    }
}

/* =========================
   LOGIN
========================= */

async function login() {
    email = document.getElementById("email")?.value || "";

    try {
        const res = await fetch(`${API_BASE}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        });

        const data = await res.json();
        role = data.role || "guest";

        const roleEl = document.getElementById("role");
        if (roleEl) roleEl.innerText = `ROLE: ${role}`;

        const panel = document.getElementById("directorPanel");
        if (panel) {
            panel.style.display = role === "director" ? "block" : "none";
        }

    } catch (err) {
        console.error("Login error:", err);
    }
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
   DIRECTOR CONTROLS
========================= */

async function setCountdown() {
    if (role !== "director") return;

    const payload = {
        email,

        weeks: parseInt(document.getElementById("weeks")?.value) || 0,
        days: parseInt(document.getElementById("days")?.value) || 0,
        hours: parseInt(document.getElementById("hours")?.value) || 0,
        minutes: parseInt(document.getElementById("minutes")?.value) || 0,
        seconds: parseInt(document.getElementById("seconds")?.value) || 0
    };

    await fetch(`${API_BASE}/set-countdown`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

async function setNews() {
    if (role !== "director") return;

    const message = document.getElementById("newsInput")?.value;

    if (!message) return alert("Enter news message");

    await fetch(`${API_BASE}/set-news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message })
    });
}
