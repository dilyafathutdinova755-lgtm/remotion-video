#!/usr/bin/env node
// Own renderer (no Remotion): serves the page, steps time deterministically
// via window.renderFrame(t), captures each frame from headless Chromium
// (WebGL via SwiftShader) and pipes it into ffmpeg.
//
//   node render.mjs stills 1.0 3.5 ...      → out/still-<t>.png
//   node render.mjs video [--workers 3] [--fps 60] [--from s --to s]
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const OUT = path.join(HERE, "out");
fs.mkdirSync(OUT, { recursive: true });
const EXE = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2" };
function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
      if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(p, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
        res.end(data);
      });
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

async function openPage(port) {
  const browser = await chromium.launch({
    executablePath: EXE,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/experiments/vessels-3d/index.html`);
  try {
    await page.waitForFunction("window.ready === true", null, { timeout: 60000 });
  } catch (e) {
    console.error("page failed to init:", errors.join("\n"));
    throw e;
  }
  const cdp = await page.context().newCDPSession(page);
  return { browser, page, cdp, errors };
}

async function shot(ctx, t, format = "jpeg") {
  await ctx.page.evaluate((tt) => window.renderFrame(tt), t);
  const { data } = await ctx.cdp.send("Page.captureScreenshot", format === "png"
    ? { format: "png", optimizeForSpeed: true }
    : { format: "jpeg", quality: 94, optimizeForSpeed: true });
  return Buffer.from(data, "base64");
}

const args = process.argv.slice(2);
const mode = args[0];
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const srv = await serve();
const port = srv.address().port;

if (mode === "stills") {
  const ctx = await openPage(port);
  for (const a of args.slice(1)) {
    if (a.startsWith("--")) continue;
    const t = Number(a);
    const buf = await shot(ctx, t, "png");
    fs.writeFileSync(path.join(OUT, `still-${t.toFixed(2)}.png`), buf);
    console.log("still", t);
  }
  if (ctx.errors.length) console.log("PAGE ERRORS:\n" + ctx.errors.join("\n"));
  await ctx.browser.close();
  srv.close();
  process.exit(0);
}

if (mode === "video") {
  const fps = Number(opt("fps", 60));
  const workers = Number(opt("workers", 3));
  const probe = await openPage(port);
  const duration = await probe.page.evaluate(() => window.DURATION);
  await probe.browser.close();
  const from = Number(opt("from", 0)), to = Number(opt("to", duration));
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  const total = f1 - f0;
  const per = Math.ceil(total / workers);
  const started = Date.now();
  let done = 0;
  const segs = [];
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = f0 + w * per, b = Math.min(f1, a + per);
    if (a >= b) return;
    const segFile = path.join(OUT, `seg-${String(w).padStart(2, "0")}.mp4`);
    segs[w] = segFile;
    const ctx = await openPage(port);
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
      "-c:v", "libx264", "-preset", "medium", "-crf", "15", "-pix_fmt", "yuv420p", "-r", String(fps), "-g", String(fps * 2), segFile],
      { stdio: ["pipe", "inherit", "inherit"] });
    for (let f = a; f < b; f++) {
      const buf = await shot(ctx, f / fps);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      done++;
      if (done % 60 === 0) {
        const el = (Date.now() - started) / 1000;
        console.log(`frames ${done}/${total}  ${(el / done).toFixed(2)} s/frame  eta ${((total - done) * el / done / 60).toFixed(1)} min`);
      }
    }
    ff.stdin.end();
    await new Promise((r) => ff.on("close", r));
    if (ctx.errors.length) console.log(`worker ${w} PAGE ERRORS:\n` + ctx.errors.join("\n"));
    await ctx.browser.close();
  }));
  const list = path.join(OUT, "segs.txt");
  fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s}'`).join("\n"));
  const silent = path.join(OUT, "video-silent.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", silent]);
  console.log(`done in ${((Date.now() - started) / 60000).toFixed(1)} min → ${silent}`);
  srv.close();
  process.exit(0);
}

console.log("usage: node render.mjs stills <t...> | video [--workers N] [--fps N] [--from s] [--to s]");
srv.close();
