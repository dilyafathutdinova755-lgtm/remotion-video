// Russian "find the error" video: deterministic DOM scene, window.renderFrame(t).
const W = 1080, H = 1920;
const $ = (id) => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eOut = (k) => 1 - Math.pow(1 - k, 3);
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
const EDGE = [800, 936, 1020, 1104, 1188, 1272];
const T_CUR = 2.0;
const T_FULL = S.c5.end + 0.05;
const T_TIMER = S.c5.end + 0.45;
const T_C0 = S.pause.start + 0.7, T_C1 = T_C0 + 4;
const T_EX0 = T_C1 - 0.02, T_EX1 = T_EX0 + 0.8;
const T_BAND0 = T.f0 - 0.05, T_BAND1 = T.w;
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
const WK = measure("красивый"), WD = measure("д");

// ---- typewriter
const cache = new Map();
const esc = (x) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;");
function typed(el, full, n, caret) {
  const key = n + "|" + caret;
  if (cache.get(el) === key) return;
  cache.set(el, key);
  el.innerHTML = esc(full.slice(0, n)) + (caret ? '<span class="cr"></span>' : "") + `<span class="rest">${esc(full.slice(n))}</span>`;
}
function typing(t, i) { // i: 0 = instruction, 1..5 phrases
  const [a, b] = WIN[i];
  return clamp((t - a) / (b - a));
}

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

function renderFrame(t) {
  // ----- background glows
  GL.forEach((g, i) => {
    const x = g.x * W + Math.sin((t / g.px) * Math.PI * 2 + i) * g.ax;
    const y = g.y * H + Math.cos((t / g.py) * Math.PI * 2 + i * 1.7) * g.ay;
    css(glows[i], { width: g.s + "px", height: g.s + "px", transform: `translate(${x - g.s / 2}px, ${y - g.s / 2}px)`,
      background: `radial-gradient(closest-side, ${g.c} 0%, ${g.c}99 40%, ${g.c}00 100%)`, opacity: 0.9 });
  });

  // ----- intro logo: spin, fly into the plaque
  const big = $("biglogo"), gh = [$("gh0"), $("gh1")], sh = $("shadow");
  const SPIN = 1.35, FLY0 = 1.35, FLY1 = 2.0;
  const ang = (tt) => 1080 * eOut(clamp(tt / SPIN));
  const spinV = (tt) => (1080 * 3 * Math.pow(1 - clamp(tt / SPIN), 2)) / SPIN; // deg/s
  let logo = { vis: 0, cx: 540, cy: 960, size: 540, a: 0, v: 0, shadow: 0 };
  if (t < FLY1) {
    const fk = eIO(seg(t, FLY0, FLY1));
    logo = { vis: clamp(t / 0.25), cx: 540, cy: lerp(960, 300, fk) + (1 - fk) * Math.sin(t * 3) * 6, size: lerp(540, 80, fk) * lerp(0.82, 1, eOut(clamp(t / 0.35))),
      a: ang(t) % 360, v: spinV(Math.min(t, SPIN)), shadow: (1 - seg(t, 1.35, 1.7)) * clamp(t / 0.25) };
  } else if (t >= T.cta + 0.1) {
    const u = seg(t, T.cta + 0.1, T.cta + 1.5), fk = eOut(u);
    logo = { vis: 1, cx: 540, cy: lerp(300, 960, fk) + (u >= 1 ? Math.sin(t * 1.8) * 6 : 0), size: lerp(80, 540, fk),
      a: (720 * eOut(u)) % 360, v: (720 * 3 * Math.pow(1 - u, 2)) / 1.4, shadow: seg(t, T.cta + 1.0, T.cta + 1.6) };
  }
  const radius = logo.size * 0.25;
  const place = (el, o, ang_, blur, opa) => css(el, { display: opa > 0.01 ? "" : "none", left: logo.cx - logo.size / 2 + "px", top: logo.cy - logo.size / 2 + "px",
    width: logo.size + "px", height: logo.size + "px", borderRadius: radius + "px", opacity: opa,
    transform: `perspective(1600px) rotateY(${ang_}deg) rotateX(${logo.v > 80 ? 6 : 0}deg)`, filter: `blur(${blur}px)` });
  const blurMain = Math.min(9, logo.v / 140);
  place(big, 0, logo.a, blurMain, logo.vis);
  place(gh[0], 0, logo.a - logo.v * 0.02, 8, logo.v > 60 ? logo.vis * 0.32 : 0);
  place(gh[1], 0, logo.a - logo.v * 0.045, 8, logo.v > 60 ? logo.vis * 0.2 : 0);
  big.style.boxShadow = logo.size > 200 ? "0 40px 80px rgba(90,20,50,0.3)" : "none";
  css(sh, { opacity: logo.shadow * (logo.size / 540), transform: `translateY(${(logo.cy - 960) * 0.2}px) scale(${logo.size / 540})` });

  // ----- plaque
  const ctaOpen = 1 - eIO(seg(t, T.cta - 0.35, T.cta + 0.15));
  const open = eOut(seg(t, 2.0, 2.55)) * ctaOpen;
  const pw = lerp(104, 560, open);
  const pv = seg(t, 1.85, 2.0) * (1 - seg(t, T.cta + 0.1, T.cta + 0.25));
  css($("plaque"), { width: pw + "px", left: 540 - pw / 2 + "px", opacity: pv, display: pv <= 0 ? "none" : "" });
  $("plaque").firstElementChild.style.opacity = (t >= FLY1 - 0.02 && t < T.cta + 0.1) ? 1 : 0;
  $("plaque").lastElementChild.style.opacity = eOut(seg(t, 2.3, 2.75)) * (1 - seg(t, T.cta - 0.4, T.cta - 0.1));

  // ----- curtain with typewriter
  let edge = 0;
  const pI = typing(t, 0);
  const startK = seg(t, T_CUR, WIN[0][1]);
  edge = EDGE[0] * eIO(seg(t, T_CUR, T_CUR + 0.95));
  for (let i = 1; i <= 5; i++) edge = lerp(edge, EDGE[i], eIO(seg(t, WIN[i][0] - 0.1, WIN[i][1])));
  const fullK = eIO(seg(t, T_FULL, T_FULL + 0.65));
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
  const covered = clamp((edge + dy - 382) / 50) * clamp((382 - dy) / 50);
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

  // ----- find stage: phrases, band
  const rowsIn = (i) => eOut(seg(t, T_EX0 + 0.35 + i * 0.07, T_EX0 + 0.95 + i * 0.07));
  const bandActive = seg(t, T_BAND0, T_BAND0 + 0.1) * (1 - seg(t, T_MORPH - 0.1, T_MORPH + 0.3));
  const d = (T_BAND1 - T_BAND0) / 3, p = (t - T_BAND0) / d;
  const bands = [$("b0"), $("b1"), $("b2")];
  const yb = (off) => {
    const q = p - off; if (q <= 0) return 820;
    const k = Math.min(2, Math.floor(q)), u = q >= 3 ? 1 : q - k;
    return lerp(820, ROW_Y(4) + 40, eIO(u));
  };
  [0, 0.14, 0.28].forEach((off, i) => {
    css(bands[i], { top: yb(off) - 75 + "px", opacity: bandActive * [1, 0.5, 0.25][i], display: bandActive > 0.01 ? "" : "none" });
  });
  const dimOf = (i) => {
    const near = clamp(1 - Math.abs(yb(0) - (ROW_Y(i) + 40)) / 120);
    return lerp(1, 0.45 + 0.55 * near, bandActive);
  };
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
  const wOp = (t > T_EX0 ? wIn : 0) * (t < T_MORPH ? dimOf(4) : 1) * exitW;
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
  const jk = eOut(seg(t, T.d2, T.d2 + 0.4)), fk = seg(t, T.d3, T.d3 + 0.7);
  const fx = 520 * eIO(fk), fy = -130 * jk + (1020 * fk * fk);
  css(dEl, { transform: `translate(${fx}px, ${fy}px) rotate(${-10 * jk + 70 * fk}deg) scale(${1 + 0.15 * jk})`, opacity: 1 - Math.pow(fk, 2),
    filter: (big_ ? "drop-shadow(0 14px 18px rgba(110,30,70,0.2)) " : "") + (redD > 0 ? `drop-shadow(0 0 ${30 * redD}px rgba(229,72,58,0.5)) ` : "") + `blur(${7 * fk}px)` });
  const wk = eIO(seg(t, T.d3 + 0.1, T.d3 + 0.65));
  dOuter.style.width = (WD * fsW / 100 + 0.0 * fsW) * (1 - wk) + "px";
  dOuter.style.display = wk >= 1 ? "none" : "";

  // brackets under «по» / «черк»
  const brs = [$("br0"), $("br1")], bls = [$("bl0"), $("bl1")];
  const spans = [[L[0], L[1], T.pr], [L[3], L[6], T.ko]];
  spans.forEach(([a, b, t0], i) => {
    const k = eOut(seg(t, t0, t0 + 0.45));
    const vis = k * exitW;
    if (vis <= 0.001) { brs[i].style.display = "none"; bls[i].style.display = "none"; return; }
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
    const x0 = ra.left + 6, x1 = rb.right - 6, y = Math.max(ra.bottom, rb.bottom) - 4;
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
