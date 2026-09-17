// OpenSourceDeck 启动器（零依赖）
// 作用：一个网页控制面板，一键启动/停止 OpenSourceDeck 开发服务，
//       并把默认 GitHub 账户固化到 cyberspace-cs。每天打开本页即可使用。
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OSDECK_DIR = path.resolve(__dirname, ".."); // opensource-deck 仓库根
const LAUNCHER_PORT = Number(process.env.LAUNCHER_PORT || 8080);
const DEV_PORT = 5173;
const DEV_HOST = "127.0.0.1";
const DEFAULT_USER = process.env.LAUNCHER_DEFAULT_USER || "cyberspace-cs";
const CONDA_NODE = "/home/user/miniconda3/envs/llm/bin/node";
const CONDA_BIN = "/home/user/miniconda3/envs/llm/bin";
const VITE_BIN = path.join(OSDECK_DIR, "node_modules", "vite", "bin", "vite.js");
const DEV_LOG = "/tmp/osdeck_dev.log";

let child = null; // 当前运行的 dev 子进程

function startDev() {
  if (child) return { ok: false, msg: "服务已在运行" };
  const nodeBin = fs.existsSync(CONDA_NODE) ? CONDA_NODE : "node";
  const args = fs.existsSync(VITE_BIN)
    ? [VITE_BIN, "--port", String(DEV_PORT), "--host", DEV_HOST]
    : ["run", "dev", "--", "--port", String(DEV_PORT), "--host", DEV_HOST];
  const cmd = fs.existsSync(VITE_BIN) ? nodeBin : "npm";
  const env = {
    ...process.env,
    PATH: `${CONDA_BIN}:${process.env.PATH}`,
    VITE_DEFAULT_USER: DEFAULT_USER,
  };
  // live.json 存在时优先加载真实快照；否则用内置样例数据兜底
  if (fs.existsSync(path.join(OSDECK_DIR, "public", "data", "live.json"))) {
    env.VITE_DATA_FILE = "data/live.json";
  }
  const logFd = fs.openSync(DEV_LOG, "a");
  child = spawn(cmd, args, {
    cwd: OSDECK_DIR,
    env,
    detached: true,
    stdio: ["ignore", logFd, logFd],
  });
  child.on("exit", () => {
    child = null;
  });
  child.unref();
  return { ok: true, pid: child.pid };
}

function stopDev() {
  if (!child) return { ok: false, msg: "服务未在运行" };
  try {
    process.kill(-child.pid, "SIGTERM"); // 杀掉整个进程组（含 esbuild）
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
  child = null;
  return { ok: true };
}

function isDevUp() {
  return new Promise((resolve) => {
    const req = http.get(
      { host: DEV_HOST, port: DEV_PORT, path: "/", timeout: 1500 },
      (res) => {
        res.resume();
        resolve(true);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sendJSON(res, obj, status = 200) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(body);
}

const HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>OpenSourceDeck 启动器</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    background: radial-gradient(1200px 600px at 50% -10%, #15321f 0%, #0b0f0d 60%);
    color: #e6f0ea; min-height: 100vh; display: flex; justify-content: center;
  }
  .wrap { width: min(960px, 94vw); padding: 28px 0 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: .5px; }
  .sub { color: #9fb3a8; font-size: 13px; margin-bottom: 18px; }
  .card {
    background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px; padding: 18px; backdrop-filter: blur(6px);
  }
  .row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .badge {
    display: inline-flex; align-items: center; gap: 8px; font-size: 13px;
    padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,255,255,.12);
  }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: #777; }
  .dot.on { background: #34d399; box-shadow: 0 0 10px #34d399; }
  .dot.off { background: #f87171; }
  button {
    border: 0; border-radius: 10px; padding: 11px 18px; font-size: 14px; cursor: pointer;
    background: #1f7a55; color: #fff; font-weight: 600; transition: .15s;
  }
  button:hover { filter: brightness(1.08); }
  button.ghost { background: rgba(255,255,255,.08); }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .note { color: #9fb3a8; font-size: 13px; line-height: 1.7; margin-top: 14px;
          border-left: 3px solid #1f7a55; padding-left: 12px; }
  .frame-wrap { margin-top: 18px; border-radius: 14px; overflow: hidden;
                border: 1px solid rgba(255,255,255,.1); min-height: 360px;
                background: #0b0f0d; position: relative; }
  iframe { width: 100%; height: 78vh; border: 0; display: block; }
  .placeholder { position: absolute; inset: 0; display: flex; align-items: center;
                  justify-content: center; color: #6b7d74; font-size: 14px; text-align:center; padding: 20px; }
  code { background: rgba(255,255,255,.08); padding: 1px 6px; border-radius: 6px; }
  a { color: #5eead4; }
</style>
</head>
<body>
<div class="wrap">
  <h1>OpenSourceDeck 启动器</h1>
  <div class="sub">一键启动你的开源贡献工作台 · 已固化账户 <b id="acct">${DEFAULT_USER}</b></div>

  <div class="card">
    <div class="row">
      <span class="badge"><span class="dot off" id="dot"></span><span id="status">检测中…</span></span>
      <button id="start">▶ 启动服务</button>
      <button id="stop" class="ghost">■ 停止服务</button>
      <a id="open" href="http://localhost:${DEV_PORT}" target="_blank" rel="noreferrer" style="margin-left:auto">新窗口打开 ↗</a>
    </div>
    <div class="note">
      点击「启动服务」后，下方会直接载入 OpenSourceDeck 工作台。<br/>
      账户已预填 <b>cyberspace-cs</b>：打开后点右上角「账户」→「公开账户」→<b>加载公开数据</b>，
      即由你的浏览器直连 GitHub 拉取<b>真实</b>贡献 / PR / Issue（只读、无需 token）。<br/>
      每天想看就启动它；需要一开即真实数据，给我一个只读 PAT，我跑 <code>sync</code> 烘焙 live.json。
    </div>
    <div class="frame-wrap">
      <div class="placeholder" id="ph">服务未启动时显示此处。点「启动服务」即可载入工作台。</div>
      <iframe id="frame" src="" style="display:none" title="OpenSourceDeck"></iframe>
    </div>
  </div>
</div>
<script>
  const $ = (id) => document.getElementById(id);
  const dot = $("dot"), status = $("status"), start = $("start"), stop = $("stop"),
        frame = $("frame"), ph = $("ph"), open = $("open");
  let shown = false;

  async function refresh() {
    const r = await fetch("/api/status").then((x) => x.json());
    dot.className = "dot " + (r.running ? "on" : "off");
    status.textContent = r.running ? (r.ready ? "运行中 · 已就绪" : "启动中…") : "已停止";
    start.disabled = r.running;
    stop.disabled = !r.running;
    if (r.running && r.ready && !shown) {
      shown = true;
      ph.style.display = "none";
      frame.style.display = "block";
      frame.src = "http://localhost:${DEV_PORT}";
    }
    if (!r.running) { shown = false; frame.style.display = "none"; frame.src = ""; ph.style.display = "flex"; }
  }

  start.onclick = async () => { await fetch("/api/start", { method: "POST" }); refresh(); };
  stop.onclick = async () => { await fetch("/api/stop", { method: "POST" }); refresh(); };
  refresh();
  setInterval(refresh, 1500);
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${LAUNCHER_PORT}`);
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(HTML);
  }
  if (req.method === "POST" && url.pathname === "/api/start") {
    const r = startDev();
    if (r.ok) await sleep(400);
    return sendJSON(res, { ...r, ready: await isDevUp() });
  }
  if (req.method === "POST" && url.pathname === "/api/stop") {
    return sendJSON(res, stopDev());
  }
  if (req.method === "GET" && url.pathname === "/api/status") {
    return sendJSON(res, {
      running: !!child,
      ready: await isDevUp(),
      pid: child ? child.pid : null,
      devUrl: `http://localhost:${DEV_PORT}`,
      account: DEFAULT_USER,
    });
  }
  sendJSON(res, { error: "not found" }, 404);
});

server.listen(LAUNCHER_PORT, DEV_HOST, () => {
  console.log(`[launcher] OpenSourceDeck 启动器已就绪: http://localhost:${LAUNCHER_PORT}`);
  console.log(`[launcher] 固化账户: ${DEFAULT_USER} · 开发服务端口: ${DEV_PORT}`);
});
