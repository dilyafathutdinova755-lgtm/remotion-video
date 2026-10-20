// History video: "Раскройте смысл понятия «баскак»". Deterministic: window.renderFrame(t).
// DOM/SVG scene (three cartoon heroes, icons, timeline) + the 3D logo slab (../ru/logo3d.js).
import * as THREE from "three";
import { createLogo3d } from "../ru/logo3d.js";

const W = 1080, H = 1920;
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eOut = (k) => 1 - Math.pow(1 - k, 3);
const eIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eBack = (k) => { const c1 = 1.70158, c3 = c1 + 1; return k <= 0 ? 0 : 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const css = (el, o) => { for (const k in o) el.style[k] = o[k]; };
const fadeIO = (t, a0, a1, b0, b1) => seg(t, a0, a1) * (1 - seg(t, b0, b1));

const tl = await (await fetch("/experiments/vessels-3d/hist/timeline.json")).json();
const T = tl.marks;
const S = Object.fromEntries(tl.sentences.map((s) => [s.id, s]));
window.DURATION = tl.total;
await Promise.all(['400 40px "Ruslan"', '600 40px "Manrope"', '700 40px "Manrope"', '800 40px "Manrope"'].map((f) => document.fonts.load(f, "АаЯя0")));

// ---------------------------------------------------------------- key times (mirrored in make_mix_hist.py)
const P0 = S.pause.start;
const T_TIMER = P0 + 0.5, T_C0 = P0 + 0.9, T_EX = T_C0 + 4;

// ---------------------------------------------------------------- 3D logo (same as the other subjects)
const logoTex = await new THREE.TextureLoader().loadAsync("/experiments/vessels-3d/ru/logo.png");
logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8;
const logo3d = createLogo3d(logoTex, 4.2, 1);
const lctx = $("logoc").getContext("2d");
const PW_MAX = 12 + 80 + 22 + $("plaque").lastElementChild.getBoundingClientRect().width + 38;
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
function drawLogo(t) {
  const c0 = T.cta - 0.05;
  const nS = (t < 2.0 || (t > c0 - 0.1 && t < c0 + 1.35)) ? 9 : 1;
  lctx.globalCompositeOperation = "source-over"; lctx.globalAlpha = 1; lctx.clearRect(0, 0, W, H);
  if (nS > 1) { lctx.globalCompositeOperation = "lighter"; lctx.globalAlpha = 1 / nS; }
  for (let i = 0; i < nS; i++) {
    logo3d.render(logoAt(nS === 1 ? t : Math.max(0, t + (1 / 60) * (i / (nS - 1) - 0.5))));
    lctx.drawImage(logo3d.canvas, 0, 0);
  }
}

// ---------------------------------------------------------------- helpers
const dots = [...$("dots").children];
function show(el, o, { dy = 0, dx = 0, sc = 1, flex = false, extra = "" } = {}) {
  css(el, { display: o <= 0.001 ? "none" : flex ? "flex" : "", opacity: o, transform: `translate(${dx}px, ${dy}px) scale(${sc}) ${extra}` });
}
const pop = (t, t0, d = 0.4) => { const k = seg(t, t0, t0 + d); return { o: clamp(k * 2), s: k <= 0 ? 0 : eBack(k) }; };
function popShow(el, t, t0, tOut, opt = {}) {
  const p = pop(t, t0), out = seg(t, tOut, tOut + 0.3);
  show(el, p.o * (1 - out), { sc: lerp(0.8, 1, clamp(p.s, 0, 1.12)) * lerp(1, 0.92, out), dy: (1 - p.o) * 24 - 20 * out, ...opt });
}
function headline(el, o) { css(el, { display: o <= 0.001 ? "none" : "", opacity: o, transform: `translateY(${(1 - o) * 26}px)`, filter: `blur(${(1 - o) * 6}px)` }); }
const setT = (id, v) => $(id).setAttribute("transform", v);

// blinking: short lid closures at fixed times plus a slow periodic one
function blink(t, times, period, phase) {
  let b = 0;
  for (const bt of times) b = Math.max(b, 1 - Math.abs(t - bt) / 0.08);
  const pt = ((t + phase) % period);
  b = Math.max(b, 1 - Math.abs(pt - period / 2) / 0.08);
  return 1 - 0.92 * clamp(b);
}

// ---------------------------------------------------------------- the trio
function trioOffset(t) {
  const out = eIO(seg(t, T_EX, T_EX + 0.6));
  const back = eBack(seg(t, T.sum + 1.1, T.sum + 1.8));
  const final = eIO(seg(t, T.cta - 0.45, T.cta - 0.05));
  let y = 20 * eIO(seg(t, P0, P0 + 0.5));
  y = lerp(y, 900, out);
  if (t > T.sum) y = lerp(900, 120, clamp(back, 0, 1.08));
  y = lerp(y, 900, final);
  return y;
}
// heroes: baked layers from hist/characters, composed on a 2D canvas (fast); eyes are drawn live
const LAY = await (await fetch("/experiments/vessels-3d/hist/characters/layers.json")).json();
const IMG = {};
await Promise.all(Object.entries(LAY).flatMap(([X, m]) => m.layers.map((L) => new Promise((res, rej) => {
  const im = new Image(); im.onload = () => { IMG[X + "_" + L] = im; res(); }; im.onerror = rej;
  im.src = `/experiments/vessels-3d/hist/characters/${X}_${L}.png`;
}))));
const tctx = $("trioc").getContext("2d");
const EYE = {
  P: { cy: 220, pupil: "#2A1712", hl: [4, -5], lashes: false },
  E: { cy: 222, pupil: "#3B2A55", hl: [3, -5], lashes: true },
  A: { cy: 222, pupil: "#2F4A6B", hl: [3, -5], lashes: false },
};
function drawEyes(ctx, X, s, gx, gy) {
  const e = EYE[X];
  ctx.save();
  ctx.translate(0, 222); ctx.scale(1, s); ctx.translate(0, -222);
  for (const x of [160, 240]) {
    ctx.beginPath(); ctx.ellipse(x, e.cy, 20, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF"; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = "#3A1222"; ctx.stroke();
  }
  for (const x of [160, 240]) {
    ctx.beginPath(); ctx.arc(x + gx, e.cy + gy, 11, 0, Math.PI * 2); ctx.fillStyle = e.pupil; ctx.fill();
    ctx.beginPath(); ctx.arc(x + gx + e.hl[0], e.cy + gy + e.hl[1], 4, 0, Math.PI * 2); ctx.fillStyle = "#FFFFFF"; ctx.fill();
  }
  if (e.lashes) {
    ctx.beginPath();
    for (const [x0, dx] of [[140, -8], [180, 6], [220, -6], [260, 8]]) { ctx.moveTo(x0, 204); ctx.lineTo(x0 + dx, 196); }
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = "#3A1222"; ctx.stroke();
  }
  ctx.restore();
}
function updateTrio(t) {
  const base = trioOffset(t);
  tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.clearRect(0, 0, W, H);
  if (base > 880 && t > 3) return;
  const rise = (d) => (1 - clamp(eBack(seg(t, 2.05 + d, 2.8 + d)), 0, 1.1)) * 900;
  const gaze = eIO(seg(t, T.word - 0.1, T.word + 0.35));
  const nodK = seg(t, T.fin, T.fin + 1.0), nod = Math.sin(nodK * Math.PI * 2) * 12 * (1 - nodK);
  const think = Math.sin(seg(t, P0 + 1.2, T_EX) * Math.PI) * 4;
  const figs = [  // draw order: Peter (behind), then Catherine and Alexander in front
    { X: "P", rot: 0, d: 0, ph: 0, gx: 0, gy: -9, hr: think, blinks: [3.1, 6.3, 8.6, 35.4], per: 4.7, bph: 1.3 },
    { X: "E", rot: -7, d: 0.12, ph: 1.7, gx: 9, gy: -6, hr: 6, blinks: [3.6, 7.1, 36.1], per: 5.3, bph: 2.9 },
    { X: "A", rot: 7, d: 0.2, ph: 3.1, gx: -9, gy: -6, hr: -6, blinks: [4.3, 7.7, 35.8], per: 4.1, bph: 0.4 },
  ];
  const ctx = tctx;
  for (const f of figs) {
    const m = LAY[f.X], p = m.pad, sc = m.scale;
    const bob = Math.sin(t * 1.6 + f.ph) * 4;
    const hr = (f.hr * gaze + (f.X === "P" ? 0 : Math.sin(t * 0.9 + f.ph) * 1.2)) * Math.PI / 180;
    const pvx = p + 200 * sc, pvy = p + 330 * sc;
    ctx.save();
    ctx.translate(m.left - p, 1060 + m.top - p + base + rise(f.d) + bob);
    const ox = p + m.w / 2, oy = p + m.h;
    ctx.translate(ox, oy); ctx.rotate(f.rot * Math.PI / 180); ctx.translate(-ox, -oy);
    const headT = () => { ctx.translate(pvx, pvy + nod * sc); ctx.rotate(hr); ctx.translate(-pvx, -pvy); };
    ctx.drawImage(IMG[f.X + "_oBody"], 0, 0);
    ctx.save(); headT(); ctx.drawImage(IMG[f.X + "_oHead"], 0, 0); if (IMG[f.X + "_headB"]) ctx.drawImage(IMG[f.X + "_headB"], 0, 0); ctx.restore();
    ctx.drawImage(IMG[f.X + "_body"], 0, 0);
    ctx.save(); headT(); ctx.drawImage(IMG[f.X + "_head"], 0, 0);
    ctx.translate(p, p); ctx.scale(sc, sc);
    drawEyes(ctx, f.X, blink(t, f.blinks, f.per, f.bph), f.gx * gaze, f.gy * gaze);
    ctx.restore();
    ctx.restore();
  }
}

// background: stage rings slowly spread from the concept (fade-out mask baked into the alpha), glow follows the action
const bctx = $("bgc").getContext("2d");
const ringMask = (r) => (r < 456 ? lerp(1, 0.4, r / 456) : r < 646 ? lerp(0.4, 0, (r - 456) / 190) : 0);
function drawBg(t) {
  bctx.clearRect(0, 0, W, H);
  for (let i = 0; i < 2; i++) {
    const ph = (t * 0.09 + i * 0.5) % 1, sc = 1 + ph * 0.3, op = Math.sin(ph * Math.PI) * 0.9;
    for (let k = 1; k <= 9; k++) {
      const r = 74 * k, a = ringMask(r) * 0.13 * op;
      if (a <= 0.002) continue;
      bctx.beginPath(); bctx.arc(540, 780, r * sc, 0, Math.PI * 2);
      bctx.lineWidth = 3 * sc; bctx.strokeStyle = `rgba(255,92,154,${a.toFixed(4)})`; bctx.stroke();
    }
  }
  const gy = t < T.h1 ? 760 : t < T.sum ? 960 : 700;
  const cx = 540 + Math.sin(t * 0.3) * 80, cy = gy + Math.cos(t * 0.4) * 60, go = 0.8 + 0.2 * Math.sin(t * 0.8);
  const g = bctx.createRadialGradient(cx, cy, 0, cx, cy, 450);
  g.addColorStop(0, `rgba(255,92,154,${(0.32 * go).toFixed(4)})`); g.addColorStop(1, "rgba(255,92,154,0)");
  bctx.fillStyle = g; bctx.fillRect(cx - 450, cy - 450, 900, 900);
}

// ---------------------------------------------------------------- frame
function bez(p0, p1, p2, p3, u) {
  const v = 1 - u;
  return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
          v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
}

function renderFrame(t) {
  drawBg(t);

  // plaque + logo
  const pw = pwOf(t);
  const pv = seg(t, 1.85, 2.0) * (1 - seg(t, T.cta + 0.1, T.cta + 0.25));
  css($("plaque"), { width: pw + "px", left: 540 - pw / 2 + "px", opacity: pv, display: pv <= 0 ? "none" : "" });
  $("plaque").lastElementChild.style.opacity = eOut(seg(t, 2.3, 2.75)) * (1 - seg(t, T.cta - 0.4, T.cta - 0.1));
  drawLogo(t);

  // step dots
  const st = t < T.h1 - 0.3 ? 0 : t < T.h2 ? 1 : t < T.h3 ? 2 : 3;
  css($("dots"), { opacity: seg(t, 1.9, 2.4) * (1 - seg(t, T.cta - 0.3, T.cta + 0.2)) });
  dots.forEach((d, i) => css(d, { width: i === st ? "46px" : "14px", background: i === st ? "#FF5C9A" : "rgba(255,255,255,0.25)" }));

  // condition + pause on the same frame
  const up = -90 * eIO(seg(t, P0, P0 + 0.5));
  const condOut = seg(t, T_EX, T_EX + 0.4);
  const qIn = seg(t, T.ask, T.ask + 0.45);
  show($("qst"), qIn * (1 - condOut), { dy: up + (1 - qIn) * 20 });
  const wk = seg(t, T.word - 0.15, T.word + 0.45);
  css($("word"), { display: wk > 0 && condOut < 1 ? "" : "none", opacity: clamp(wk * 1.6) * (1 - condOut),
    transform: `translateY(${up}px) scale(${lerp(1.7, 1, eOut(wk)) * lerp(1, 0.9, condOut)})`, filter: `blur(${(1 - eOut(wk)) * 10}px)` });
  const tp = pop(t, T_TIMER, 0.45);
  show($("timer"), tp.o * (1 - condOut), { sc: lerp(0.9, 1, tp.o), dy: (1 - tp.o) * 60 + 40 * condOut, flex: true });
  const rem = clamp(4 - (t - T_C0), 0, 4);
  $("tnum").textContent = String(t < T_C0 ? 4 : Math.max(1, Math.ceil(rem - 1e-6)));
  $("arc").setAttribute("stroke-dashoffset", String(540.4 * (1 - (t < T_C0 ? 4 : rem) / 4)));

  updateTrio(t);

  // headlines
  headline($("h1"), seg(t, T.h1 - 0.2, T.h1 + 0.3) * (1 - seg(t, T.h2 - 0.2, T.h2 + 0.2)));
  headline($("h2"), seg(t, T.h2, T.h2 + 0.4) * (1 - seg(t, T.h3 - 0.2, T.h3 + 0.2)));
  headline($("h3"), seg(t, T.h3, T.h3 + 0.4) * (1 - seg(t, T.sum - 0.3, T.sum + 0.1)));
  headline($("h4"), seg(t, T.cta + 1.0, T.cta + 1.5));

  // step 1 — who: Orda → arc → Rus, the baskak travels along the arc
  const whoOut = T.h2 - 0.2;
  popShow($("orda"), t, T.h1 + 0.25, whoOut);
  popShow($("lOrda"), t, T.h1 + 0.35, whoOut);
  popShow($("rus"), t, T.h1 + 0.45, whoOut);
  popShow($("lRus"), t, T.h1 + 0.55, whoOut);
  $("flag").setAttribute("transform", `skewY(${Math.sin(t * 6) * 6})`);
  const ak = eIO(seg(t, T.h1 + 0.55, T.h1 + 1.15)), aOut = seg(t, whoOut, whoOut + 0.3);
  css($("arcSvg"), { display: ak > 0 && aOut < 1 ? "" : "none", opacity: 1 - aOut, clipPath: `inset(0 ${(1 - ak) * 100}% 0 0)` });
  const bu = eIO(seg(t, T.bas + 0.15, T.bas + 1.35));
  const bp = bez([230, 790], [350, 640], [730, 640], [850, 790], bu);
  const bIn = pop(t, T.bas - 0.1, 0.4), bOut = seg(t, whoOut, whoOut + 0.3);
  const tilt = Math.sin(bu * Math.PI) * (bu < 1 ? 10 : 0) + Math.sin(t * 2.2) * 2;
  css($("baskak"), { display: bIn.o > 0 && bOut < 1 ? "" : "none", opacity: bIn.o * (1 - bOut), left: bp[0] - 150 + "px", top: bp[1] - 330 + Math.abs(Math.sin(bu * Math.PI * 6)) * -14 * (bu < 1 ? 1 : 0) + "px",
    transform: `rotate(${tilt}deg) scale(${0.72 * lerp(0.6, 1, clamp(bIn.s, 0, 1.1))})`, transformOrigin: "50% 100%" });
  $("bEyes").setAttribute("transform", `translate(0 ${144 * (1 - blink(t, [12.4], 3.3, 0.7))}) scale(1 ${blink(t, [12.4], 3.3, 0.7)})`);
  const tg = pop(t, T.bas + 0.3, 0.4);
  css($("tagB"), { display: tg.o > 0 && bOut < 1 ? "" : "none", left: bp[0] - 290 + "px", top: bp[1] - 200 + "px", opacity: tg.o * (1 - bOut), transform: `scale(${lerp(0.8, 1, clamp(tg.s, 0, 1.1))})` });
  popShow($("nRep"), t, T.rep + 0.15, whoOut, { flex: true });

  // step 2 — when: centuries, then the timeline
  const whenOut = T.h3 - 0.2;
  const ck = pop(t, T.cent, 0.5), shrink = eIO(seg(t, T.y1257 - 0.1, T.y1257 + 0.5)), cOut = seg(t, whenOut, whenOut + 0.3);
  css($("cent"), { display: ck.o > 0 && cOut < 1 ? "" : "none", opacity: ck.o * (1 - cOut), transformOrigin: "50% 0",
    transform: `translateY(${-80 * shrink}px) scale(${lerp(1.35, 1, clamp(ck.s, 0, 1.1)) * lerp(1, 150 / 210, shrink)})` });
  const vk = seg(t, T.cent + 0.5, T.cent + 0.9);
  show($("vek"), vk * (1 - cOut), { dy: -140 * shrink + (1 - vk) * 20 });
  const lk = eIO(seg(t, T.y1257 + 0.1, T.y1257 + 0.8));
  css($("tline"), { display: lk > 0 && cOut < 1 ? "" : "none", opacity: 1 - cOut, clipPath: `inset(0 ${(1 - lk) * 100}% 0 0)` });
  ["t1200", "t1300", "t1400"].forEach((id, i) => popShow($(id), t, T.y1257 + 0.3 + i * 0.15, whenOut));
  const d1 = T.y1257 + 1.7;
  popShow($("dot1"), t, d1, whenOut);
  popShow($("lab1"), t, d1 + 0.2, whenOut);
  const segW = lerp(lerp(0, 40, eOut(seg(t, d1, d1 + 0.4))), 284, eIO(seg(t, T.xiv - 0.6, T.xiv + 0.8)));
  css($("tseg"), { display: segW > 1 && cOut < 1 ? "" : "none", width: segW + "px", opacity: 1 - cOut });
  popShow($("dot2"), t, T.xiv + 0.8, whenOut);
  popShow($("lab2"), t, T.xiv + 1.0, whenOut);

  // step 3 — what: three cards, each on its word; then they gather into the summary
  const gather = eIO(seg(t, T.sum - 0.2, T.sum + 0.5));
  [["card1", T.tax + 0.1, 51], ["card2", T.eye, 385], ["card3", T.army, 719]].forEach(([id, t0, x]) => {
    const p = pop(t, t0, 0.45);
    show($(id), p.o * (1 - gather), { sc: lerp(0.7, 1, clamp(p.s, 0, 1.1)) * lerp(1, 0.5, gather), dy: (1 - p.o) * 60 - 200 * gather, dx: (385 - x) * gather, flex: true });
  });
  $("coins").setAttribute("transform", `translate(0 ${-Math.abs(Math.sin((t - T.tax) * 7)) * 12 * seg(t, T.tax, T.tax + 0.3)})`);
  $("iris").setAttribute("transform", `translate(${Math.sin((t - T.eye) * 2.4) * 14 * seg(t, T.eye, T.eye + 0.4)} 0)`);
  $("spear").setAttribute("transform", `rotate(${Math.sin((t - T.army) * 10) * 10 * (1 - seg(t, T.army, T.army + 1.2)) * seg(t, T.army, T.army + 0.1)} 75 75)`);

  // summary — the answer as one sentence, heroes come back and nod
  const sumOut = T.cta - 0.5;
  popShow($("sumQ"), t, T.sum + 0.2, sumOut);
  popShow($("sumW"), t, T.sum + 0.3, sumOut);
  popShow($("dfn"), t, T.sum + 0.6, sumOut);

  // CTA
  const k1 = pop(t, T.cta + 2.1, 0.45), k2 = pop(t, T.link, 0.45);
  show($("cta1"), k1.o, { dy: (1 - k1.o) * 40, sc: lerp(0.9, 1, k1.o), flex: true });
  show($("cta2"), k2.o, { dy: (1 - k2.o) * 40, sc: lerp(0.9, 1, k2.o), flex: true });
}

window.renderFrame = renderFrame;
renderFrame(0);
window.ready = true;
