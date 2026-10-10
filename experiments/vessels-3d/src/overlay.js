// HTML/CSS layer: background worlds, plaque, dots, headlines, stickers pinned
// to 3D objects, typed note cards, morphing equation, pause card, CTA chips.
import { clamp, lerp, seg, ease, spring, ramp, track, mixHex, mixRgbArr } from "./lib.js";

const W = 1080, H = 1920;

function el(parent, cls, html) {
  const d = document.createElement("div");
  if (cls) d.className = cls;
  if (html != null) d.innerHTML = html;
  parent.appendChild(d);
  return d;
}
const css = (node, o) => { for (const k in o) node.style[k] = o[k]; };

/** Entrance/exit envelope used by stickers & chips. */
function popEnv(t, tIn, tOut, outDur = 0.35) {
  const s = spring(t, tIn, { freq: 2.0, damping: 0.48 });
  const o = 1 - ease.inCubic(seg(t, tOut, tOut + outDur));
  const vis = t >= tIn && t < tOut + outDur;
  return { vis, s, o, k: clamp((t - tIn) / 0.18) };
}

export function createOverlay(root, story) {
  const T = story.T;

  // ------------------------------------------------------------ background
  const bg = el(root, "bg");
  const glows = [0, 1, 2, 3].map(() => el(bg, "glow"));
  const vignette = el(bg, "vignette");

  // ---------------------------------------------------------------- plaque
  const plaque = el(root, "plaque");
  const plaqueSlot = el(plaque, "plaque-slot");
  const plaqueText = el(plaque, "plaque-text", "ЕГЭ&nbsp;Тренажёр");
  const PLQ = { cy: 300, h: 104, slotPx: 80, pad: 12 };
  let plaqueW = 0;

  // ------------------------------------------------------------------ dots
  const dotsWrap = el(root, "dots");
  const dots = [0, 1, 2, 3, 4].map(() => el(dotsWrap, "dot"));

  // -------------------------------------------------------------- headline
  const head = el(root, "head");
  const fields = ["eyebrow", "title", "sub"].map((f) => {
    const box = el(head, `hf ${f}`);
    return { f, box, a: el(box, "hl"), b: el(box, "hl"), cacheA: null, cacheB: null };
  });
  const HEAD = [
    [T.v1 - 0.05, "Профиль · задание 10", "8 кг раствора", "раствор соли"],
    [T.salt + 0.05, "Профиль · задание 10", "Соли — 10%", "остальное — вода"],
    [T.v2b, "Профиль · задание 10", "Добавили 30%", "раствор той же соли"],
    [T.q, "Профиль · задание 10", "Сколько добавить?", "килограммов 30%-го раствора"],
    [T.v3, "Профиль · задание 10", "Чтобы вышло 20%", "концентрация смеси"],
    [T.pauseStart + 0.05, "Пауза", "Попробуй сам", "ставь на паузу"],
    [T.h1 - 0.05, "Шаг 1 из 3", "Считаем соль", "в каждом растворе"],
    [T.s1a, "Шаг 1 из 3", "Считаем соль", "первый раствор"],
    [T.s2a, "Шаг 1 из 3", "Считаем соль", "второй раствор"],
    [T.h2 - 0.05, "Шаг 2 из 3", "Смешиваем", "масса смеси — 8 + x кг"],
    [T.eq0 - 0.05, "Шаг 2 из 3", "Соль не исчезает", "сколько было — столько стало"],
    [T.h3 - 0.05, "Шаг 3 из 3", "Решаем уравнение", "раскрываем скобки"],
    [T.mv, "Шаг 3 из 3", "Решаем уравнение", "иксы — влево, числа — вправо"],
    [T.r1, "Шаг 3 из 3", "Решаем уравнение", "почти готово"],
    [T.ans - 0.05, "Ответ", "8 кг", "тридцатипроцентного раствора"],
    [T.cta - 0.05, "ЕГЭ Тренажёр", "Больше заданий", "в приложении — бесплатно"],
  ];

  // --------------------------------------------------------------- stickers
  const stickerLayer = el(root, "stickers");
  const stickers = [];
  function sticker(def) {
    const node = el(stickerLayer, `sticker ${def.variant || ""}`, def.html);
    stickers.push({ ...def, node });
  }

  // ------------------------------------------------------------ note cards
  const noteLayer = el(root, "notes");
  function noteCard(def) {
    const wrap = el(noteLayer, "note-wrap");
    const shadow = el(wrap, "floor-shadow");
    const card = el(wrap, "note");
    const top = el(card, "note-top", `<i></i><i></i><i></i><span>${def.title}</span>`);
    const lines = def.lines.map((ln) => {
      const row = el(card, "note-line");
      const txt = el(row, "nl-text");
      const caret = el(row, "caret");
      return { ...ln, row, txt, caret, cache: null };
    });
    return { ...def, wrap, shadow, card, top, lines };
  }

  // -------------------------------------------------------------- equation
  const eqWrap = el(root, "eq-wrap");
  const eqShadow = el(eqWrap, "floor-shadow");
  const eqCard = el(eqWrap, "eq-card");
  const eqBox = el(eqCard, "eq-box");

  // ------------------------------------------------------------ pause card
  const pauseVeil = el(root, "pause-veil");
  const pauseWrap = el(root, "pause-wrap");
  const pauseShadow = el(pauseWrap, "floor-shadow");
  const pauseCard = el(pauseWrap, "pause-card",
    `<svg viewBox="0 0 200 200" class="ring"><circle cx="100" cy="100" r="86" class="ring-bg"/><circle cx="100" cy="100" r="86" class="ring-fg"/></svg>
     <div class="bars"><i></i><i></i></div>`);
  const ringFg = pauseCard.querySelector(".ring-fg");

  // ------------------------------------------------------------------ flyers
  const flyLayer = el(root, "flyers");
  const flyers = [];

  // ---------------------------------------------------------------- CTA chips
  const ctaA = el(root, "chip cta-a", "Скачивай бесплатно");
  const ctaB = el(root, "chip cta-b", "Ссылка в профиле&nbsp;&nbsp;↑");

  let world = null;
  const api = { plaque: { slotX: 0, slotY: PLQ.cy, slotPx: PLQ.slotPx } };

  // ----------------------------------------------------------- definitions
  let notes = [];
  let eqTokens = [];
  const EQ = { lh: 108, font: 66, cardW: 930 };

  api.init = (w) => {
    world = w;
    // plaque size from real text width
    plaqueW = PLQ.pad + PLQ.slotPx + 22 + plaqueText.getBoundingClientRect().width + 40;
    api.plaque.slotX = W / 2 - plaqueW / 2 + PLQ.pad + PLQ.slotPx / 2;

    const v = () => world;
    const VH = w.VH;
    const Z = 0.64; // front surface of the glass: labels are literally stuck on it
    const UP = 0.42, LOW = -0.2;
    sticker({ html: "8&nbsp;кг", anchor: () => w.v1.local(0, UP, Z), tIn: T.v1 + 0.5, tOut: T.m1 - 0.15, tilt: -5 });
    sticker({ html: "10%&nbsp;<b>соли</b>", anchor: () => w.v1.local(0, LOW, Z), tIn: T.salt + 0.55, tOut: T.m1 - 0.1, tilt: 3 });
    sticker({ html: "x&nbsp;кг&nbsp;<b>?</b>", variant: "accent", anchor: () => w.v2.local(0, UP, Z), tIn: T.q + 0.25, tOut: T.m1 + 0.05, tilt: -6, pulseFrom: T.q + 0.6 });
    sticker({ html: "30%", anchor: () => w.v2.local(0, LOW, Z), tIn: T.v2b + 0.15, tOut: T.m1 + 0.1, tilt: 4 });
    sticker({ html: "?&nbsp;кг", variant: "ghosty", anchor: () => w.v3.local(0, UP, Z), tIn: T.v3 + 0.7, tOut: T.m1 + 0.5, tilt: -4 });
    sticker({ html: "8&nbsp;+&nbsp;x&nbsp;кг", anchor: () => w.v3.local(0, UP, Z), tIn: T.m1 + 0.6, tOut: T.h3 - 0.25, tilt: -4 });
    sticker({ html: "20%", variant: "violet", anchor: () => w.v3.local(0, LOW, Z), tIn: T.p20 + 0.05, tOut: T.h3 - 0.25, tilt: 4, pulseFrom: T.m2, pulseTo: T.m2 + 1.4 });
    // results: arrive from the note cards onto the salt heaps, then into the equation
    sticker({ id: "r1", html: "0,8&nbsp;кг&nbsp;<b>соли</b>", variant: "result", anchor: (t) => w.heapSticker(1, t), tIn: T.s1b + 1.9, tOut: T.eq1 + 0.15, outDur: 0.12, tilt: -3 });
    sticker({ id: "r2", html: "0,3x&nbsp;<b>соли</b>", variant: "result", anchor: (t) => w.heapSticker(2, t), tIn: T.s2b + 1.7, tOut: T.eq1 + 0.4, outDur: 0.12, tilt: 3 });
    sticker({ id: "r3", html: "0,2(8&nbsp;+&nbsp;x)", variant: "result", anchor: () => w.v3.local(0, -0.75 - 0.32, 0.5), tIn: T.m3 + 1.95, tOut: T.eq2 + 0.1, outDur: 0.12, tilt: -2 });
    sticker({ id: "ans", html: "", variant: "answer", anchor: () => w.v2.local(0, 0.3, Z), tIn: T.h3 + 0.9, tOut: T.cta - 0.15, tilt: -3, flipAt: T.a8, pulseFrom: T.h3 + 1.3, pulseTo: T.ans });

    notes = [
      noteCard({ title: "Раствор 1 · соль", tIn: T.s1a - 0.15, tOut: T.s2a - 0.2, lines: [
        { text: "10% от 8 кг", at: T.s1a + 0.25 },
        { text: "0,1 · 8 = ", hi: "0,8 кг", at: T.s1b + 0.05, fly: "r1" },
      ] }),
      noteCard({ title: "Раствор 2 · соль", tIn: T.s2a - 0.1, tOut: T.h2 + 0.15, lines: [
        { text: "30% от x кг", at: T.s2a + 0.25 },
        { text: "0,3 · x = ", hi: "0,3x", at: T.s2b + 0.05, fly: "r2" },
      ] }),
      noteCard({ title: "Смесь · соль", tIn: T.m2 - 0.15, tOut: T.eq0 + 0.05, lines: [
        { text: "20% от (8 + x)", at: T.m2 + 0.15 },
        { text: "0,2 · ", hi: "(8 + x)", hiFull: "0,2(8 + x)", at: T.m3 + 0.1, fly: "r3" },
      ] }),
    ];

    // equation lines; `from` = token id copied down from the line above
    const LINES = [
      { at: T.eq1 + 0.15, toks: [["a", "0,8", { sticker: "r1" }], ["p", "+"], ["b", "0,3x", { sticker: "r2", delay: 0.25 }]] },
      { at: T.eq2, sameLine: 0, toks: [["e", "="], ["c", "0,2(8 + x)", { sticker: "r3", delay: 0.1 }]] },
      { at: T.br + 0.1, toks: [["a2", "0,8", "a"], ["p2", "+", "p"], ["b2", "0,3x", "b"], ["e2", "=", "e"], ["c1", "1,6", "c"], ["p3", "+"], ["c2", "0,2x", "c"]] },
      { at: T.mv + 0.1, toks: [["x1", "0,3x", "b2"], ["m1", "−", null, "flip"], ["x2", "0,2x", "c2"], ["e3", "=", "e2"]] },
      { at: T.num + 0.05, sameLine: 3, toks: [["n1", "1,6", "c1"], ["m2", "−", null, "flip"], ["n2", "0,8", "a2"]] },
      { at: T.r1 + 0.1, toks: [["y1", "0,1x", "x1"], ["e4", "=", "e3"], ["y2", "0,8", "n2"]] },
      { at: T.r2 + 0.25, toks: [["z1", "x", "y1"], ["e5", "=", "e4"], ["z2", "8", "y2"]], final: true },
    ];
    // merge "sameLine" groups and measure
    const rows = [];
    for (const L of LINES) {
      if (L.sameLine != null) rows[rows.length - 1].parts.push(L);
      else rows.push({ parts: [L], final: !!L.final });
    }
    const meas = el(eqBox, "eq-tok");
    css(meas, { visibility: "hidden", position: "absolute" });
    const tokW = (s, fin) => { meas.className = "eq-tok" + (fin ? " final" : ""); meas.textContent = s; return meas.getBoundingClientRect().width; };
    const GAP = 22;
    eqTokens = [];
    rows.forEach((row, ri) => {
      const all = row.parts.flatMap((p) => p.toks.map((tk) => ({ tk, part: p })));
      const widths = all.map(({ tk }) => tokW(tk[1], row.final));
      const total = widths.reduce((a, b) => a + b, 0) + GAP * (all.length - 1);
      let x = -total / 2;
      all.forEach(({ tk, part }, i) => {
        const [id, text, from, kind] = tk;
        const node = el(eqBox, `eq-tok${row.final ? " final" : ""}`, text.replace(/ /g, "&nbsp;"));
        const fromObj = typeof from === "object" && from ? from : null;
        eqTokens.push({ id, text, node, row: ri, x: x + widths[i] / 2, w: widths[i], at: part.at + (fromObj?.delay || 0) + i * 0.0,
          from: typeof from === "string" ? from : null, sticker: fromObj?.sticker || null, kind, final: row.final });
        x += widths[i] + GAP;
      });
    });
    api.rows = rows.length;
  };

  // ------------------------------------------------------------- helpers
  function proj(p) {
    return world.project(p);
  }
  function stickerScreen(s, t) {
    return proj(s.anchor(t));
  }

  function setTextSwap(fd, idx, list, t, fi) {
    // current entry & previous with different text for this field
    let cur = idx;
    const txt = (i) => (i >= 0 ? list[i][fi + 1] : "");
    let start = list[cur] ? list[cur][0] : 0;
    // find the time this field's text last changed
    let ci = cur;
    while (ci > 0 && txt(ci - 1) === txt(cur)) ci--;
    start = ci >= 0 && list[ci] ? list[ci][0] : 0;
    const prevText = txt(ci - 1);
    const k = seg(t, start, start + 0.55);
    const kin = ease.outCubic(seg(t, start + 0.12, start + 0.6));
    const kout = ease.inCubic(seg(t, start, start + 0.3));
    if (fd.cacheA !== txt(cur)) { fd.a.textContent = txt(cur); fd.cacheA = txt(cur); }
    if (fd.cacheB !== prevText) { fd.b.textContent = prevText; fd.cacheB = prevText; }
    css(fd.a, { opacity: idx < 0 ? 0 : kin, filter: `blur(${(1 - kin) * 14}px)`, transform: `translateY(${(1 - kin) * 26}px)` });
    css(fd.b, { opacity: k >= 1 ? 0 : 1 - kout, filter: `blur(${kout * 14}px)`, transform: `translateY(${-kout * 22}px)` });
  }

  // --------------------------------------------------------------- update
  api.update = (t, glCanvasEl) => {
    const w = story.world(t);
    const P = (key) => (typeof w.a[key] === "string" ? mixHex(w.a[key], w.b[key], w.k) : null);
    const text = P("text"), sub = P("sub"), accent = P("accent");
    const dark = lerp(w.a.dark, w.b.dark, w.k);
    root.style.setProperty("--text", text);
    root.style.setProperty("--sub", sub);
    root.style.setProperty("--accent", accent);

    // background: big drifting glows (ref2-style color worlds)
    css(bg, { background: `linear-gradient(180deg, ${P("top")} 0%, ${P("bottom")} 100%)` });
    const G = [
      { c: 0, x: 0.85, y: 0.22, s: 1300, ax: 170, ay: 120, px: 11, py: 13 },
      { c: 1, x: 0.12, y: 0.72, s: 1450, ax: 200, ay: 160, px: 13, py: 9 },
      { c: 2, x: 0.6, y: 1.02, s: 1350, ax: 240, ay: 90, px: 9, py: 12 },
      { c: 0, x: 0.2, y: 0.08, s: 1000, ax: 150, ay: 110, px: 15, py: 10 },
    ];
    G.forEach((g, i) => {
      const col = mixHex(w.a.glows[g.c], w.b.glows[g.c], w.k);
      const x = g.x * W + Math.sin((t / g.px) * Math.PI * 2 + i) * g.ax;
      const y = g.y * H + Math.cos((t / g.py) * Math.PI * 2 + i * 1.7) * g.ay;
      const s = g.s * (1 + 0.1 * Math.sin(t * 0.5 + i * 2));
      css(glows[i], {
        width: `${s}px`, height: `${s}px`, transform: `translate(${x - s / 2}px, ${y - s / 2}px)`,
        background: `radial-gradient(closest-side, ${col} 0%, ${col.replace("rgb", "rgba").replace(")", ",0.55)")} 38%, rgba(0,0,0,0) 100%)`,
        opacity: lerp(0.95, 0.85, dark),
      });
    });
    css(vignette, { opacity: dark * 0.9 });

    // plaque: expands behind the landing logo, collapses at CTA
    const open = ease.outCubic(seg(t, 1.45, 2.05)) * (1 - ease.inOutCubic(seg(t, T.cta - 0.3, T.cta + 0.25)));
    const pw = lerp(PLQ.slotPx + PLQ.pad * 2, plaqueW, open);
    const pvis = ramp(t, 1.4, 1.65) * (1 - ramp(t, T.cta + 0.1, T.cta + 0.45));
    css(plaque, {
      width: `${pw}px`, height: `${PLQ.h}px`, left: `${W / 2 - plaqueW / 2}px`, top: `${PLQ.cy - PLQ.h / 2}px`,
      opacity: pvis, transform: `scale(${lerp(0.85, 1, pvis)})`,
    });
    css(plaqueText, { opacity: ease.outCubic(seg(t, 1.75, 2.2)) * (1 - ramp(t, T.cta - 0.35, T.cta - 0.05)), transform: `translateX(${(1 - ease.outCubic(seg(t, 1.7, 2.2))) * -30}px)` });

    // dots
    const st = story.stage(t);
    const dv = ramp(t, 1.9, 2.4) * (1 - ramp(t, T.cta - 0.3, T.cta + 0.2));
    css(dotsWrap, { opacity: dv });
    dots.forEach((d, i) => {
      const on = i === st;
      css(d, { width: on ? "46px" : "14px", background: on ? accent : dark > 0.5 ? "rgba(255,255,255,0.28)" : "rgba(20,20,60,0.18)" });
    });

    // headline (per-field blur swap)
    let idx = -1;
    for (let i = 0; i < HEAD.length; i++) if (t >= HEAD[i][0]) idx = i;
    fields.forEach((fd, fi) => setTextSwap(fd, idx, HEAD, t, fi));

    // stickers
    for (const s of stickers) {
      const env = popEnv(t, s.tIn, s.tOut, s.outDur ?? 0.35);
      if (!env.vis) { s.node.style.display = "none"; continue; }
      s.node.style.display = "";
      const p = stickerScreen(s, t);
      let pulse = 0;
      if (s.pulseFrom != null && t > s.pulseFrom && t < (s.pulseTo ?? 1e9)) pulse = 0.06 * Math.max(0, Math.sin((t - s.pulseFrom) * 6.5));
      const bob = Math.sin(t * 2.1 + s.tIn * 3) * 4;
      let rx = 0;
      if (s.variant === "answer") {
        const fk = ease.inOutCubic(seg(t, s.flipAt, s.flipAt + 0.5));
        rx = fk * 180;
        const html = fk < 0.5 ? "x&nbsp;кг&nbsp;<b>?</b>" : "<em>✓</em>&nbsp;8&nbsp;кг";
        if (s.cache !== html) { s.node.innerHTML = html; s.cache = html; }
        s.node.classList.toggle("done", fk >= 0.5);
        if (fk >= 0.5) rx -= 180;
      }
      const scale = clamp(env.s, 0, 1.3) * (1 + pulse) * lerp(0.85, 1, env.o);
      css(s.node, {
        opacity: env.o * env.k,
        transform: `translate(${p.x}px, ${p.y + bob}px) translate(-50%, -50%) perspective(600px) rotateX(${rx}deg) rotate(${(s.tilt || 0) * (2 - clamp(env.s, 0, 1.3))}deg) scale(${scale})`,
        filter: `blur(${(1 - env.k) * 6 + (1 - env.o) * 6}px)`,
      });
    }

    // note cards
    for (const f of flyers) f.flyer.style.display = "none";
    for (const n of notes) {
      const vis = t >= n.tIn && t < n.tOut + 0.5;
      n.wrap.style.display = vis ? "" : "none";
      if (!vis) continue;
      const kin = spring(t, n.tIn, { freq: 1.3, damping: 0.62 });
      const kout = ease.inCubic(seg(t, n.tOut, n.tOut + 0.45));
      const ry = lerp(-22, -5, clamp(kin)) + Math.sin(t * 0.8) * 2.5;
      const rxx = lerp(38, 9, clamp(kin)) + Math.sin(t * 0.6 + 1) * 1.5;
      css(n.card, {
        transform: `perspective(1500px) translateY(${(1 - kin) * 260 + kout * 280}px) rotateX(${rxx + kout * 20}deg) rotateY(${ry}deg)`,
        opacity: clamp(kin * 2) * (1 - kout),
      });
      css(n.shadow, { opacity: clamp(kin) * (1 - kout) * (dark > 0.5 ? 0.8 : 0.55) });
      for (const ln of n.lines) {
        const full = ln.text + (ln.hi || "");
        const nChars = clamp(Math.floor((t - ln.at) * 19), 0, full.length);
        const typedBase = full.slice(0, Math.min(nChars, ln.text.length));
        const typedHi = nChars > ln.text.length ? full.slice(ln.text.length, nChars) : "";
        const doneAt = ln.at + full.length / 19;
        const hk = ease.outCubic(seg(t, doneAt + 0.05, doneAt + 0.45));
        const esc = (x) => x.replace(/ /g, "&nbsp;");
        const html = `${esc(typedBase)}${typedHi ? `<mark style="--hk:${hk.toFixed(3)}">${esc(typedHi)}</mark>` : ""}`;
        if (ln.cache !== html) { ln.txt.innerHTML = html; ln.cache = html; }
        const caretOn = t >= ln.at && t < doneAt + 0.6 && (Math.floor(t * 3.2) % 2 === 0 || t < doneAt);
        ln.caret.style.opacity = caretOn ? 1 : 0;
        ln.row.style.opacity = t >= ln.at - 0.05 ? 1 : 0;
        // result flyer from the highlighted part to its sticker
        if (ln.fly && !ln.flyer) {
          ln.flyer = el(flyLayer, "sticker result flyer", (ln.hiFull || ln.hi).replace(/ /g, "&nbsp;"));
          flyers.push(ln);
        }
        if (ln.flyer) {
          const s = stickers.find((x) => x.id === ln.fly);
          const t0 = doneAt + 0.5, t1 = s.tIn;
          const fk = seg(t, t0, t1);
          const on = t >= t0 && t < t1 + 0.02;
          ln.flyer.style.display = on ? "" : "none";
          if (on) {
            const m = ln.txt.querySelector("mark");
            const r = m ? m.getBoundingClientRect() : ln.txt.getBoundingClientRect();
            const a = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            const b = stickerScreen(s, t);
            const e = ease.inOutCubic(fk);
            const x = lerp(a.x, b.x, e);
            const y = lerp(a.y, b.y, e) - Math.sin(e * Math.PI) * 140;
            css(ln.flyer, { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${Math.sin(e * Math.PI) * -8}deg) scale(${lerp(1.15, 1, e)})`, opacity: 1 });
          }
        }
      }
    }

    // equation card
    const eqIn = spring(t, T.eq1 - 0.25, { freq: 1.25, damping: 0.62 });
    const eqOut = ease.inCubic(seg(t, T.ans - 0.4, T.ans + 0.15));
    const eqVis = t >= T.eq1 - 0.25 && t < T.ans + 0.2;
    eqWrap.style.display = eqVis ? "" : "none";
    if (eqVis) {
      const up = ease.inOutCubic(seg(t, T.h3 - 0.25, T.h3 + 0.7));
      const rowsShown = t < T.br + 0.1 ? 1 : t < T.mv + 0.1 ? 2 : t < T.r1 + 0.1 ? 3 : t < T.r2 + 0.25 ? 4 : 5;
      const hTarget = 70 + EQ.lh * rowsShown;
      const hk = ease.inOutCubic(clamp(((t - [T.eq1, T.br + 0.1, T.mv + 0.1, T.r1 + 0.1, T.r2 + 0.25][rowsShown - 1]) / 0.5)));
      const hPrev = 70 + EQ.lh * Math.max(1, rowsShown - 1);
      const ch = rowsShown === 1 ? hTarget : lerp(hPrev, hTarget, hk);
      const top = lerp(1395, 650, up);
      const scale = lerp(0.92, 1.0, up);
      css(eqWrap, { top: `${top}px` });
      css(eqCard, {
        height: `${ch}px`,
        transform: `perspective(1600px) translateY(${(1 - clamp(eqIn)) * 300 + eqOut * 400}px) rotateX(${lerp(30, 6, clamp(eqIn)) + Math.sin(t * 0.7) * 1.5 + eqOut * 25}deg) rotateY(${Math.sin(t * 0.5) * 2.5}deg) scale(${scale})`,
        opacity: clamp(eqIn * 2) * (1 - eqOut),
      });
      css(eqShadow, { opacity: clamp(eqIn) * (1 - eqOut) * (dark > 0.5 ? 0.85 : 0.5), top: `${ch + 40}px` });
      const cardRect = eqBox.getBoundingClientRect();
      const byId = Object.fromEntries(eqTokens.map((k) => [k.id, k]));
      const lastRow = Math.max(...eqTokens.filter((k) => t >= k.at).map((k) => k.row), 0);
      for (const k of eqTokens) {
        const on = t >= k.at;
        k.node.style.display = on ? "" : "none";
        if (!on) continue;
        const X = k.x, Y = 52 + k.row * EQ.lh;
        let x = X, y = Y, sc = 1, op = 1, rot = 0;
        const fk = ease.inOutCubic(seg(t, k.at, k.at + 0.7));
        if (k.from && byId[k.from]) {
          const src = byId[k.from];
          const sx = src.x, sy = 52 + src.row * EQ.lh;
          x = lerp(sx, X, fk);
          y = lerp(sy, Y, fk) + Math.sin(fk * Math.PI) * -18;
          sc = 1 + Math.sin(fk * Math.PI) * 0.12;
        } else if (k.sticker) {
          const s = stickers.find((z) => z.id === k.sticker);
          const sp = stickerScreen(s, t);
          const sx = sp.x - (cardRect.left + cardRect.width / 2), sy = sp.y - cardRect.top;
          x = lerp(sx, X, fk);
          y = lerp(sy, Y, fk) - Math.sin(fk * Math.PI) * 60;
          sc = lerp(0.8, 1, fk);
          rot = (1 - fk) * -6;
        } else {
          const pk = spring(t, k.at, { freq: 2, damping: 0.5 });
          sc = clamp(pk, 0, 1.4);
          op = clamp((t - k.at) / 0.15);
        }
        if (k.kind === "flip") {
          const fl = seg(t, k.at, k.at + 0.9);
          k.node.style.color = fl < 1 ? mixHex("#ff4d6d", "#121528", ease.inCubic(fl)) : "";
        }
        // older rows dim
        const dim = k.row < lastRow ? lerp(1, 0.38, ease.inOutCubic(seg(t, eqTokens.find((z) => z.row === lastRow).at, eqTokens.find((z) => z.row === lastRow).at + 0.5))) : 1;
        css(k.node, { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rot}deg) scale(${sc})`, opacity: op * dim });
        if (k.final) {
          const g = ease.outCubic(seg(t, k.at + 0.5, k.at + 1.1));
          k.node.style.setProperty("--glow", g.toFixed(3));
        }
      }
    }

    // pause card + canvas blur
    const pIn = spring(t, T.pauseStart, { freq: 1.6, damping: 0.55 });
    const pOut = ease.inCubic(seg(t, T.pauseEnd - 0.05, T.pauseEnd + 0.35));
    const pVis = t >= T.pauseStart && t < T.pauseEnd + 0.4;
    pauseWrap.style.display = pVis ? "" : "none";
    if (pVis) {
      css(pauseCard, {
        transform: `perspective(1400px) translateY(${(1 - clamp(pIn)) * 120 - pOut * 80}px) rotateX(${(1 - clamp(pIn)) * 50 + Math.sin(t * 1.4) * 3}deg) rotateY(${Math.sin(t * 1.1) * 6}deg) scale(${clamp(pIn, 0, 1.2) * (1 - pOut * 0.3)})`,
        opacity: clamp(pIn * 2) * (1 - pOut),
      });
      css(pauseShadow, { opacity: clamp(pIn) * (1 - pOut) * 0.6 });
      const pk = seg(t, T.pauseStart + 0.1, T.pauseEnd);
      ringFg.style.strokeDashoffset = `${(1 - pk) * 540.4}`;
    }
    const blurK = window01(t, T.pauseStart, 0.35, T.pauseEnd - 0.15, 0.45);
    css(pauseVeil, { display: blurK > 0.001 ? "" : "none", opacity: blurK });
    stickerLayer.style.filter = blurK > 0.001 ? `blur(${blurK * 9}px)` : "none";

    // CTA chips
    const ca = popEnv(t, T.cta + 1.0, 1e9);
    css(ctaA, { display: ca.vis ? "" : "none", opacity: ca.k, transform: `translate(-50%, 0) scale(${clamp(ca.s, 0, 1.3)}) rotate(${(1 - clamp(ca.s)) * -8}deg)`, filter: `blur(${(1 - ca.k) * 6}px)` });
    const cb = popEnv(t, T.link, 1e9);
    css(ctaB, { display: cb.vis ? "" : "none", opacity: cb.k, transform: `translate(-50%, 0) scale(${clamp(cb.s, 0, 1.3)}) rotate(${(1 - clamp(cb.s)) * 8}deg)`, filter: `blur(${(1 - cb.k) * 6}px)` });
  };

  function window01(t, a, din, b, dout) {
    return ease.inOutCubic(seg(t, a, a + din)) * (1 - ease.inOutCubic(seg(t, b, b + dout)));
  }

  return api;
}
