const { spawn } = require("child_process");
const http = require("http");

let botReady = false;
let dashboardProc = null;

// ============================================================
// Health check server مؤقت حتى ما يقطع Render الخدمة
// ============================================================
const PORT = process.env.PORT || 3000;

const healthServer = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200);
    res.end(botReady ? "OK - Bot online" : "Starting...");
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

healthServer.listen(PORT, () => {
  console.log(`[SYSTEM] 🌐 Health check server on port ${PORT}`);
});

// ============================================================
// تشغيل الداشبورد بعد ما يشتغل البوت
// ============================================================
function startDashboard() {
  console.log("[SYSTEM] 🚀 البوت اشتغل! جاري تشغيل الداشبورد...");

  // أوقف health check المؤقت
  healthServer.close();

  dashboardProc = spawn("npm", ["run", "start", "--workspace=dashboard"], {
    cwd: "/app",
    stdio: "inherit",
    env: { ...process.env, PORT: String(PORT) },
  });

  dashboardProc.on("exit", (code) => {
    console.log(`[WEB] توقف بكود ${code}`);
    process.exit(code ?? 0);
  });
}

// ============================================================
// تشغيل البوت أولاً
// ============================================================
console.log("[SYSTEM] ⏳ جاري تشغيل البوت...");

const bot = spawn("node", ["bot/dist/index.js"], {
  cwd: "/app",
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
});

bot.stdout.on("data", (data) => {
  const text = data.toString();
  process.stdout.write(`[BOT] ${text}`);

  // عندما يتصل البوت بـ Discord نشغّل الداشبورد
  if (!dashboardProc && text.includes("تم تسجيل الدخول")) {
    botReady = true;
    startDashboard();
  }
});

bot.stderr.on("data", (data) => {
  process.stderr.write(`[BOT] ${data.toString()}`);
});

bot.on("exit", (code) => {
  console.log(`[BOT] ❌ توقف بكود ${code}`);
  if (dashboardProc) dashboardProc.kill("SIGTERM");
  process.exit(code ?? 1);
});

// ============================================================
// Graceful shutdown
// ============================================================
function shutdown(signal) {
  console.log(`[SYSTEM] ⚠️ ${signal} - إيقاف تدريجي...`);
  bot.kill(signal);
  if (dashboardProc) dashboardProc.kill(signal);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
