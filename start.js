// ============================================================
// Orchestrator: deploy → bot → dashboard (بعد دخول البوت)
// خادم الصحة يفتح منذ الثانية 0 على PORT حتى لا يقطع Render الخدمة
// ============================================================
const { spawn } = require("child_process");
const http = require("http");

const PORT = process.env.PORT || 3000;

let botReady = false;
let dashboardProc = null;
let dashboardSpawned = false;

const healthServer = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(botReady && dashboardProc ? "OK - The Z online\n" : "OK - The Z starting\n");
});

healthServer.listen(PORT, () => {
  console.log(`[SYSTEM] 🌐 Health check server on port ${PORT}`);
});

function print(prefix, data) {
  process.stdout.write(`[${prefix}] ${data.toString()}`);
}

// ============================================================
// الداشبورد بعد اتصال البوت بـ Discord
// ============================================================
function startDashboard() {
  if (dashboardSpawned) return;
  dashboardSpawned = true;
  console.log("[SYSTEM] 🚀 البوت اشتغل! جاري تشغيل الداشبورد...");

  dashboardProc = spawn("npm", ["run", "start", "--workspace=dashboard"], {
    cwd: "/app",
    stdio: ["inherit", "pipe", "pipe"],
    env: { ...process.env, PORT: String(PORT) }
  });

  dashboardProc.stdout.on("data", (d) => print("DASH", d));
  dashboardProc.stderr.on("data", (d) => print("DASH", d));

  dashboardProc.on("exit", (code) => {
    console.log(`[DASH] ❌ توقف بكود ${code ?? "null"}`);
    process.exit(code ?? 1);
  });
}

// ============================================================
// البوت
// ============================================================
function startBot() {
  console.log("[SYSTEM] ⏳ جاري تشغيل البوت...");

  const bot = spawn("node", ["bot/dist/index.js"], {
    cwd: "/app",
    stdio: ["inherit", "pipe", "pipe"],
    env: process.env
  });

  bot.stdout.on("data", (d) => {
    const text = d.toString();
    process.stdout.write(`[BOT] ${text}`);
    if (!botReady && text.includes("تم تسجيل الدخول")) {
      botReady = true;
      startDashboard();
    }
  });

  bot.stderr.on("data", (d) => print("BOT", d));

  bot.on("exit", (code) => {
    console.log(`[BOT] ❌ توقف بكود ${code ?? "null"}`);
    if (dashboardProc) dashboardProc.kill("SIGTERM");
    process.exit(code ?? 1);
  });
}

// ============================================================
// تسلسل الإقلاع: deploy → bot → dashboard
// ============================================================
async function main() {
  console.log("[SYSTEM] 🔍 فحص الوصول إلى Discord (IPv4)...");
  try {
    const t0 = Date.now();
    const res = await fetch("https://discord.com/api/v10/gateway", {
      signal: AbortSignal.timeout(15_000)
    });
    console.log(`[SYSTEM] ✅ Discord قابل للوصول (HTTP ${res.status}) خلال ${Date.now() - t0}ms`);
  } catch (err) {
    console.log(`[SYSTEM] ⚠️ Discord غير قابل للوصول: ${err?.message ?? err}`);
  }

  console.log("[SYSTEM] ⏳ جاري نشر أوامر الـ Slash Commands...");
  await new Promise((resolve) => {
    const deploy = spawn("npm", ["run", "deploy", "--workspace=bot"], {
      cwd: "/app",
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env
    });
    deploy.stdout.on("data", (d) => print("DEPLOY", d));
    deploy.stderr.on("data", (d) => print("DEPLOY", d));
    const deployTimeout = setTimeout(() => {
      console.log("[SYSTEM] ⚠️ انقضت مهلة نشر الأوامر — قتلها ومواصلة تشغيل البوت");
      deploy.kill("SIGKILL");
    }, 180_000);
    deploy.on("exit", (code) => {
      clearTimeout(deployTimeout);
      console.log(`[SYSTEM] ${code === 0 ? "✅ نُشرت الأوامر" : "⚠️ فشل نشر الأوامر (" + code + ")"}`);
      resolve();
    });
  });

  startBot();
}

main().catch((err) => {
  console.error("[SYSTEM] ❌ فشل الإقلاع:", err);
  process.exit(1);
});

// ============================================================
// إيقاف آمن
// ============================================================
function shutdown(signal) {
  console.log(`[SYSTEM] ⚠️ ${signal} — إيقاف تدريجي...`);
  healthServer.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));