// Russian "find the error" video: deterministic DOM scene, window.renderFrame(t).
import * as THREE from "three";
import { createLogo3d } from "./logo3d.js";
const W = 1080, H = 1920;
const SC = Number(new URLSearchParams(location.search).get("s") || 1); // output scale (2 = 4K)
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eOut = (k) => 1 - Math.pow(1 - k, 3);
const eBackOut = (k) => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const eSine = (k) => 0.5 - Math.cos(Math.PI * k) / 2;
const eIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eBack = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mixC = (a, b, k) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, "0")).join(""); };
const css = (el, o) => { for (const k in o) el.style[k] = o[k]; };

const tl = await (await fetch("/experiments/vessels-3d/ru/timeline.json")).json();
const T = tl.marks;
const S = Object.fromEntries(tl.sentences.map((s) => [s.id, s]));
window.DURATION = tl.total;

await document.fonts.load('400 40px "Huninn"');
await document.fonts.load('800 40px "Huninn"');
await new Promise((res) => { const im = new Image(); im.onload = res; im.onerror = res; im.src = "/experiments/vessels-3d/ru/logo.png"; });

// ---- timeline constants (mirrored in make_mix_ru.py)
const INS = "В одном из этих слов допущена грамматическая ошибка. Найдите её и запишите слово правильно.";
const PH = ["уборка яслей", "наиболее сильный", "восьмьюдесятью словами", "полощет бельё", "красивый подчерк"];
const WIN = [[S.c0.start, S.c0.end - 0.15], ...PH.map((_, i) => [S["c" + (i + 1)].start, S["c" + (i + 1)].end - 0.1])];
const SH = -110; // the whole composition sits 110 px higher (no dead band above the plaque)
const EDGE = [690, 826, 910, 994, 1078, 1162];
const T_CUR = 2.0;
const T_FULL = S.c5.end + 0.05;
const T_TIMER = S.c5.end + 0.95;
const T_C0 = S.pause.start + 1.4, T_C1 = T_C0 + 4;
const T_EX0 = T_C1 - 0.02, T_EX1 = T_EX0 + 0.8;
const T_RED = T.w + 0.45;
const T_MORPH = T.w + 0.9;             // other phrases fade, found phrase moves to the centre
const T_GROW = T_MORPH + 0.8;          // «красивый» leaves, «подчерк» grows and turns raspberry
const T_END_MORPH = S.s2.start + 0.1;
const ROW_Y = (i) => 780 + 92 * i;

// ---- fixed elements
const glows = [$("g0"), $("g1"), $("g2")];
const GL = [
  { c: "#F8C2D8", s: 1300, x: 0.85, y: 0.12, ax: 150, ay: 110, px: 11, py: 13 },
  { c: "#E3C5F5", s: 1450, x: 0.1, y: 0.62, ax: 190, ay: 150, px: 13, py: 9 },
  { c: "#F7CBE0", s: 1350, x: 0.62, y: 0.95, ax: 220, ay: 90, px: 9, py: 12 },
];
$("curglow").style.background = "radial-gradient(520px 520px at 30% 28%, rgba(255,160,205,0.28), rgba(255,160,205,0) 70%), radial-gradient(600px 600px at 78% 68%, rgba(160,130,240,0.3), rgba(160,130,240,0) 70%)";

// measured natural widths (px at font-size 100) for collapsing elements
function measure(txt, weight = 800) {
  const s = document.createElement("span");
  s.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${weight} 100px Huninn;letter-spacing:-0.03em`;
  s.textContent = txt; document.body.appendChild(s);
  const w = s.getBoundingClientRect().width; s.remove(); return w;
}
const PW_MAX = 12 + 80 + 22 + $("plaque").lastElementChild.getBoundingClientRect().width + 38;
const WK = measure("красивый"), WD = measure("д");

// ---- typewriter
const cache = new Map();
const esc = (x) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function typed(el, full, n, caret) {
  const key = n + "|" + caret;
  if (cache.get(el) === key) return;
  cache.set(el, key);
  // every word is a nowrap unit laid out at full width: it can never jump to the next line while typing
  let pos = 0, html = "";
  full.split(" ").forEach((w, wi, arr) => {
    const a = pos, b = pos + w.length; pos = b + 1;
    const vis = clamp(n - a, 0, w.length);
    const hasCaret = caret && n >= a && n <= b + (wi === arr.length - 1 ? 0 : 0) && (n < b || wi === arr.length - 1 || n === b);
    html += `<span style="white-space:nowrap">${esc(w.slice(0, vis))}${hasCaret ? '<span class="cr"></span>' : ""}<span class="rest">${esc(w.slice(vis))}</span></span>`;
    if (wi < arr.length - 1) html += n > b ? " " : '<span class="rest"> </span>';
  });
  el.innerHTML = html;
}
function typing(t, i) { // i: 0 = instruction, 1..5 phrases
  const [a, b] = WIN[i];
  return clamp((t - a) / (b - a));
}

const logoTex = await new THREE.TextureLoader().loadAsync("/experiments/vessels-3d/ru/logo.png");
logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8;
const logo3d = createLogo3d(logoTex, 4.2, SC);
$("logoc").width = W * SC; $("logoc").height = H * SC;
const lctx = $("logoc").getContext("2d");

const dots = [...$("dots").children];
const DOT_ST = [1.9, T_EX1 - 0.4, S.s2.start, 1e9];
const rows = [0, 1, 2, 3].map((i) => $("r" + i));
const L = [0, 1, 2, 3, 4, 5, 6].map((i) => $("L" + i));
const COL = { ink: ["#2A1520", "#2A1520"], red: ["#FF8B7B", "#E5483A"], mag: ["#D9608C", "#A8386A"], green: ["#58E0A8", "#14A05F"] };
const mixPair = (p, q, k) => [mixC(p[0], q[0], k), mixC(p[1], q[1], k)];
const grad = (p) => `linear-gradient(180deg, ${p[0]}, ${p[1]})`;
const pop = (t, t0, d = 0.4) => { const k = seg(t, t0, t0 + d); return { k, o: clamp(k * 2), s: k <= 0 ? 0 : eBack(k) }; };
const fade = (t, a0, a1, b0, b1) => seg(t, a0, a1) * (1 - seg(t, b0, b1));

function headline(el, o) {
  css(el, { opacity: o, transform: `translateY(${(1 - o) * 26}px)`, filter: `blur(${(1 - o) * 6}px)`, display: o <= 0.001 ? "none" : "" });
}

const pwOf = (tt) => lerp(104, PW_MAX, eOut(seg(tt, 2.0, 2.55)) * (1 - eIO(seg(tt, T.cta - 0.35, T.cta + 0.15))));
function logoAt(tt) {
  const slot = { x: 540 - pwOf(tt) / 2 + 52, y: 190 };
  const c0 = T.cta - 0.05;
  if (tt < c0) {
    const pop = eBack(clamp(tt / 0.6)), fly = eIO(seg(tt, 1.05, 1.95)), u = seg(tt, 0, 1.95);
    const o = { cx: lerp(540, slot.x, fly), cy: lerp(850, slot.y, fly) - Math.sin(fly * Math.PI) * 70,
      span: lerp(560 * lerp(0.35, 1, clamp(pop, 0, 1.15)), 80, fly),
      rotY: eOut(u) * Math.PI * 6, rotX: Math.sin(u * Math.PI) * 0.25, rotZ: Math.sin(u * Math.PI) * -0.08, shadow: tt < 1.6 ? 1 - seg(tt, 1.0, 1.6) : 0 };
    if (tt > 1.95) { o.rotY = Math.sin((tt - 1.95) * 0.8) * 0.12 * seg(tt, 1.95, 3); o.rotX = 0; o.rotZ = 0; }
    return o;
  }
  const k = eIO(seg(tt, c0, c0 + 1.15)), settle = seg(tt, c0 + 1.3, c0 + 2);
  return { cx: lerp(slot.x, 540, k), cy: lerp(slot.y, 860, k) - Math.sin(k * Math.PI) * 90 + Math.sin(tt * 1.5) * 10 * settle,
    span: lerp(80, 540, k),
    rotY: eIO(seg(tt, c0, c0 + 1.3)) * Math.PI * 4 + Math.sin(Math.max(0, tt - c0 - 1.3) * 0.9) * 0.18 + Math.sin((c0 - 1.95) * 0.8) * 0.12 * (1 - seg(tt, c0, c0 + 0.4)),
    rotX: Math.sin(k * Math.PI) * 0.2 + Math.sin(tt * 1.1) * 0.04 * settle, rotZ: 0, shadow: seg(tt, c0 + 0.6, c0 + 1.3) };
}

function renderFrame(t) {
  // ----- background glows
  GL.forEach((g, i) => {
    const x = g.x * W + Math.sin((t / g.px) * Math.PI * 2 + i) * g.ax;
    const y = g.y * H + Math.cos((t / g.py) * Math.PI * 2 + i * 1.7) * g.ay;
    css(glows[i], { width: g.s + "px", height: g.s + "px", transform: `translate(${x - g.s / 2}px, ${y - g.s / 2}px)`,
      background: `radial-gradient(closest-side, ${g.c} 0%, ${g.c}99 40%, ${g.c}00 100%)`, opacity: 0.9 });
  });

  // ----- plaque
  const pw = pwOf(t);
  const pv = seg(t, 1.85, 2.0) * (1 - seg(t, T.cta + 0.1, T.cta + 0.25));
  css($("plaque"), { width: pw + "px", left: 540 - pw / 2 + "px", opacity: pv, display: pv <= 0 ? "none" : "" });
  $("plaque").firstElementChild.style.opacity = 0; // the 3D slab sits in this slot
  $("plaque").lastElementChild.style.opacity = eOut(seg(t, 2.3, 2.75)) * (1 - seg(t, T.cta - 0.4, T.cta - 0.1));

  // ----- 3D logo (motion blur by sub-frame accumulation during the fast spins)
  const c0 = T.cta - 0.05;
  const nS = (t < 2.0 || (t > c0 - 0.1 && t < c0 + 1.35)) ? 9 : 1;
  lctx.globalCompositeOperation = "source-over"; lctx.globalAlpha = 1; lctx.clearRect(0, 0, W * SC, H * SC);
  if (nS > 1) { lctx.globalCompositeOperation = "lighter"; lctx.globalAlpha = 1 / nS; }
  for (let i = 0; i < nS; i++) {
    logo3d.render(logoAt(nS === 1 ? t : Math.max(0, t + (1 / 60) * (i / (nS - 1) - 0.5))));
    lctx.drawImage(logo3d.canvas, 0, 0);
  }

  // ----- curtain with typewriter
  let edge = 0;
  const pI = typing(t, 0);
  const startK = seg(t, T_CUR, WIN[0][1]);
  edge = EDGE[0] * eIO(seg(t, T_CUR, T_CUR + 0.95));
  for (let i = 1; i <= 5; i++) edge = lerp(edge, EDGE[i], eIO(seg(t, WIN[i][0] - 0.1, WIN[i][1])));
  const fullK = eSine(seg(t, T_FULL, T_FULL + 1.35));
  edge = lerp(edge, 1960, fullK);
  const exitK = eIO(seg(t, T_EX0, T_EX1));
  const dy = exitK * 2060;
  const cg = $("cgroup");
  cg.style.display = (t < T_CUR || exitK >= 1) ? "none" : "";
  cg.style.transform = `translateY(${dy}px)`;
  css($("cur"), { height: edge + "px", borderRadius: `${90 * exitK}px ${90 * exitK}px ${90 * (1 - fullK)}px ${90 * (1 - fullK)}px` });
  css($("curglow"), { transform: `translate(${Math.sin(t * 0.7) * 40}px, ${Math.cos(t * 0.55) * 50}px)` });

  // active line gets the caret until the timer comes
  let active = -1;
  for (let i = 0; i <= 5; i++) if (t >= WIN[i][0]) active = i;
  const blink = Math.floor(t * 2.2) % 2 === 0;
  const caretOn = (i) => i === active && t < T_TIMER && (typing(t, i) < 1 || blink);
  typed($("ins"), INS, Math.floor(INS.length * typing(t, 0)), caretOn(0));
  PH.forEach((p, i) => typed($("p" + i), p, Math.floor(p.length * typing(t, i + 1)), caretOn(i + 1)));
  const nPh = PH.filter((_, i) => t >= WIN[i + 1][0]).length;
  const railH = nPh ? (nPh - 1) * 84 + 70 : 0;
  css($("rail"), { height: railH + "px", opacity: clamp(railH / 70) });

  // timer
  const tp = pop(t, T_TIMER, 0.45);
  const rem = clamp(4 - (t - T_C0), 0, 4);
  const num = Math.max(1, Math.ceil(rem - 1e-6));
  const sinceTick = (t - T_C0) - Math.floor(t - T_C0);
  $("tnum").textContent = String(t < T_C0 ? 4 : num);
  $("tnum").style.transform = `scale(${t >= T_C0 && rem > 0 ? 1 + 0.16 * Math.max(0, 1 - sinceTick / 0.25) : 1})`;
  $("arc").setAttribute("stroke-dashoffset", String(540.4 * (1 - (t < T_C0 ? 4 : rem) / 4)));
  css($("timer"), { opacity: tp.o, transform: `translateY(${(1 - tp.o) * 70}px) scale(${lerp(0.9, 1, tp.o)})`, display: tp.o <= 0 ? "none" : "" });

  // dots
  const dv = seg(t, 1.9, 2.4) * (1 - seg(t, T.cta - 0.3, T.cta + 0.2));
  const covered = clamp((edge + dy - 279) / 50) * clamp((279 - dy) / 50);
  css($("dots"), { opacity: dv });
  dots.forEach((d, i) => {
    const on = eIO(seg(t, DOT_ST[i], DOT_ST[i] + 0.3)) * (1 - eIO(seg(t, DOT_ST[i + 1] ?? 1e9, (DOT_ST[i + 1] ?? 1e9) + 0.3)));
    const base = on > 0.5 ? mixC("#B03A63", "#FFFFFF", covered) : mixC("#CDBCC8", "#8E6E8C", covered);
    css(d, { width: lerp(14, 46, on) + "px", background: i === 0 || on > 0.01 ? base : base });
  });

  // ----- headlines
  headline($("h1"), seg(t, T_EX0 + 0.25, T_EX0 + 0.8) * (1 - seg(t, S.s2.start - 0.15, S.s2.start + 0.3)));
  headline($("h2"), seg(t, S.s2.start - 0.05, S.s2.start + 0.4) * (1 - seg(t, T.cta - 0.5, T.cta - 0.1)));
  headline($("h3"), seg(t, T.cta + 1.0, T.cta + 1.5));

  // ----- find stage: phrases (no scanning: the wrong one is simply marked, the rest step back)
  const rowsIn = (i) => eOut(seg(t, T_EX0 + 0.35 + i * 0.07, T_EX0 + 0.95 + i * 0.07));
  const dimOf = (i) => (i === 4 ? 1 : lerp(1, 0.5, eIO(seg(t, T.w + 0.1, T.w + 0.6))));
  const fo = eIO(seg(t, T_MORPH, T_MORPH + 0.55));
  rows.forEach((r, i) => {
    const rin = rowsIn(i);
    css(r, { top: ROW_Y(i) + "px", opacity: rin * dimOf(i) * (1 - fo) * (1 - seg(t, T.cta - 0.5, T.cta - 0.1)) * (t > T_EX0 ? 1 : 0),
      transform: `translateY(${(1 - rin) * 30 - 34 * fo}px)`, filter: `blur(${(1 - rin) * 5 + 5 * fo}px)`, display: (t > T_EX0 && fo < 1) ? "" : "none" });
  });

  // ----- the word row: «красивый подчерк» → «подчерк» → «почерк»
  const wrow = $("wrow");
  const m1 = eIO(seg(t, T_MORPH, T_MORPH + 0.7));
  const m2 = eIO(seg(t, T_GROW, T_END_MORPH + 0.9));
  const fsK = lerp(64, 96, m1) * lerp(1, 0.8, m2);
  const fsW = lerp(lerp(64, 96, m1), 200, m2);
  const cy = lerp(lerp(ROW_Y(4) + 40, 1060, m1), 1115, m2);
  const bold = t >= T.w;
  const bump = bold ? Math.max(0, 1 - (t - T.w) / 0.25) : 0;
  const krK = eIO(seg(t, T_GROW, T_GROW + 0.7));
  const wIn = rowsIn(4);
  const exitW = 1 - seg(t, T.cta - 0.5, T.cta - 0.1);
  const wOp = (t > T_EX0 ? wIn : 0) * 1 * exitW;
  css(wrow, { display: wOp > 0.001 ? "" : "none", fontSize: fsW + "px", top: cy + "px", fontWeight: bold ? 800 : 400, opacity: wOp,
    transform: `translateY(calc(-50% + ${(1 - wIn) * 30}px)) scale(${1 + 0.05 * bump})` });
  const kr = $("kr"), krin = $("krin");
  css(kr, { width: (WK * fsK / 100 + 0.26 * fsK) * (1 - Math.pow(krK, 3)) + "px", fontSize: fsK + "px", letterSpacing: "-0.03em" });
  css(krin, { opacity: 1 - clamp(krK * 2.2), transform: `translateX(${-80 * krK}px)`, filter: `blur(${6 * krK}px)`, color: "#2A1520", fontWeight: bold ? 800 : 400, fontSize: fsK + "px" });
  // letter colours
  let pc = mixPair(COL.ink, COL.red, seg(t, T_RED, T_RED + 0.25));
  pc = mixPair(pc, COL.mag, seg(t, T_GROW + 0.1, T_GROW + 0.9));
  pc = mixPair(pc, COL.green, seg(t, T.po, T.po + 0.4));
  const big_ = fsW > 130;
  L.forEach((el, i) => {
    const tgt = i === 2 ? el.firstElementChild : el;
    tgt.style.backgroundImage = grad(i === 2 ? mixPair(mixPair(COL.ink, COL.red, seg(t, T_RED, T_RED + 0.25)), COL.mag, seg(t, T_GROW + 0.1, T_GROW + 0.9)) : pc);
    tgt.style.filter = big_ ? "drop-shadow(0 14px 18px rgba(110,30,70,0.2))" : "none";
  });
  // «д»: red, jumps, flies out
  const dEl = $("L2i"), dOuter = $("L2");
  const redD = seg(t, T.d2, T.d2 + 0.2);
  dEl.style.backgroundImage = grad(mixPair(mixPair(mixPair(COL.ink, COL.red, seg(t, T_RED, T_RED + 0.25)), COL.mag, seg(t, T_GROW + 0.1, T_GROW + 0.9)), COL.red, redD));
  // «д» works loose (wobble + lift) on «лишняя», then drops out of the word under gravity and tumbles off-screen
  const loose = seg(t, T.d2, T.d2 + 0.5);
  const wob = Math.sin((t - T.d2) * 38) * 5 * loose * (1 - seg(t, T.d3 - 0.05, T.d3));
  const lift = -42 * eOut(seg(t, T.d2, T.d2 + 0.45)) * (1 - seg(t, T.d3, T.d3 + 0.12));
  const fl = Math.max(0, t - T.d3);
  const fy = lift + 0.5 * 7200 * fl * fl - 60 * Math.min(fl, 0.12) / 0.12 * (fl > 0 ? 1 : 0) * 0;
  const fx = 70 * fl + 160 * fl * fl;
  const frot = wob * 0.6 + (t > T.d3 ? 38 * fl + 160 * fl * fl : 0);
  css(dEl, { transform: `translate(${fx}px, ${fy}px) rotate(${frot}deg) scale(${1 + 0.1 * loose})`, 
    filter: (big_ ? "drop-shadow(0 14px 18px rgba(110,30,70,0.2)) " : "") + (redD > 0 ? `drop-shadow(0 0 ${30 * redD}px rgba(229,72,58,0.5)) ` : "") });
  const wk = eIO(seg(t, T.d3 + 0.3, T.d3 + 0.85));
  dOuter.style.width = (WD * fsW / 100) * Math.max(0, 1 - wk) + "px";
  dOuter.style.display = t > T.d3 + 1.4 ? "none" : "";

  // brackets under «по» / «черк»
  const brs = [$("br0"), $("br1")], bls = [$("bl0"), $("bl1")];
  const spans = [[L[0], L[1], T.pr], [L[3], L[6], T.ko]];
  spans.forEach(([a, b, t0], i) => {
    const k = eOut(seg(t, t0, t0 + 0.45));
    const vis = k * exitW;
    if (vis <= 0.001) { brs[i].style.display = "none"; bls[i].style.display = "none"; return; }
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x0 = ra.left + 6, x1 = rb.right - 6, y = Math.max(ra.bottom, rb.bottom) - 4 - SH;
    css(brs[i], { display: "", left: x0 + "px", width: x1 - x0 + "px", top: y + "px", opacity: vis, transform: `scaleX(${k})` });
    css(bls[i], { display: "", left: x0 + "px", width: x1 - x0 + "px", top: y + 32 + "px", opacity: seg(t, t0 + 0.2, t0 + 0.55) * exitW });
  });

  // ----- final call to action
  const c1 = pop(t, T.cta + 2.1, 0.45), c2 = pop(t, T.link, 0.45);
  css($("cta1"), { top: "1385px", opacity: c1.o, transform: `translateY(${(1 - c1.o) * 40}px) scale(${lerp(0.9, 1, c1.o)})`, display: c1.o <= 0 ? "none" : "" });
  css($("cta2"), { top: "1515px", opacity: c2.o, transform: `translateY(${(1 - c2.o) * 40}px) scale(${lerp(0.9, 1, c2.o)})`, display: c2.o <= 0 ? "none" : "" });
}

window.renderFrame = renderFrame;
renderFrame(0);
window.ready = true;
