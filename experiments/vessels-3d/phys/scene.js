// Physics video, palette A «Космос»: one force F on body 1 (0,5 kg, a = 1,8) and body 2 (3 kg) → a₂.
// Deterministic: window.renderFrame(t). Three.js glass table, glossy cubes, a glowing force arrow and
// "strobe" ghost copies (equal time steps) that show acceleration; DOM overlay for tags, notes, the pause.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
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

const tl = await (await fetch("/experiments/vessels-3d/phys/timeline.json")).json();
const T = tl.marks;
const S = Object.fromEntries(tl.sentences.map((s) => [s.id, s]));
window.DURATION = tl.total;
await Promise.all(['700 40px "Exo2"', '800 40px "Exo2"', 'italic 800 40px "Exo2"', '500 40px "Golos"', '600 40px "Golos"', '700 40px "Golos"', '600 40px "JB"'].map((f) => document.fonts.load(f, "АаЯя0,5")));

// ---------------------------------------------------------------- key times (mirrored in make_mix_phys.py)
const P0 = S.pause.start;
const T_COND = P0 + 0.4, T_TIMER = P0 + 0.95, T_C0 = P0 + 1.3, T_EX = T_C0 + 4;
const VI = "#A98BFF", CY = "#62D4FF";
const S1 = 1.5, S2 = 2.2;                 // cube sizes (body 1, body 2)
const L1 = 3.4, L2 = L1 / 6;              // distance covered while the force acts (a₂ = a₁ / 6)
const E1 = { t0: T.a1 + 0.25, D: 1.6, L: L1, x0: -2.4, z: 0, out0: T.b2, out1: T.b2 + 0.5 };
const E2 = { t0: T.h2 + 0.7, D: 1.6, L: L1, x0: -2.4, z: 0, out0: T.h3, out1: T.h3 + 0.5 };
const E3 = { t0: T.six + 0.7, D: 1.8, L: L1, x0: -3.0, z: 1.2, out0: T.cta - 0.7, out1: T.cta - 0.4 };
const E4 = { t0: T.six + 0.7, D: 1.8, L: L2, x0: -2.4, z: -1.0, out0: T.cta - 0.7, out1: T.cta - 0.4 };

// ---------------------------------------------------------------- 3D world
const renderer = new THREE.WebGLRenderer({ canvas: $("world"), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.85;
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(-5, 9, 8); scene.add(key);
const rim = new THREE.DirectionalLight(0xb9a0ff, 1.4); rim.position.set(6, 3, -6); scene.add(rim);
const fill = new THREE.DirectionalLight(0x62d4ff, 0.35); fill.position.set(6, -1, 6); scene.add(fill);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 300);
const CAM = new THREE.Vector3(0, 10.5, 29), LOOK = new THREE.Vector3(0, -0.2, 0);
const TOPY = -2.4;

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const radial = canvasTex(256, 256, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  [[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.5)"], [0.7, "rgba(255,255,255,0.12)"], [1, "rgba(255,255,255,0)"]].forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});

const WX = 0.9;   // whole table shifted right so the arrow tail stays on screen
const world = new THREE.Group(); world.position.x = WX; scene.add(world);

// glass table: translucent slab, grid on top, glowing edges, a sheen that sweeps on «стол гладкий»
const TW = 8.6, TD = 4.6;
const slabGeo = new THREE.BoxGeometry(TW, 0.32, TD);
const slab = new THREE.Mesh(slabGeo, new THREE.MeshPhysicalMaterial({ color: "#2B2275", roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.6, envMapIntensity: 1.3, depthWrite: false }));
slab.position.y = -0.16; world.add(slab);
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slabGeo), new THREE.LineBasicMaterial({ color: "#C9B6FF", transparent: true, opacity: 0.75 }));
edges.position.y = -0.16; world.add(edges);
const gridTex = canvasTex(1920, 920, (g, w, h) => {
  const u = w / TW;
  g.strokeStyle = "rgba(190,170,255,0.20)"; g.lineWidth = 2;
  for (let x = 0; x <= TW + 1e-6; x += 0.4) { g.beginPath(); g.moveTo(x * u, 0); g.lineTo(x * u, h); g.stroke(); }
  for (let z = 0; z <= TD + 1e-6; z += 0.4) { g.beginPath(); g.moveTo(0, z * u); g.lineTo(w, z * u); g.stroke(); }
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "rgba(169,139,255,0.10)"); gr.addColorStop(1, "rgba(169,139,255,0.22)");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const top = new THREE.Mesh(new THREE.PlaneGeometry(TW, TD), new THREE.MeshBasicMaterial({ map: gridTex, transparent: true, depthWrite: false }));
top.rotation.x = -Math.PI / 2; top.position.y = 0.003; world.add(top);
const frontGlow = new THREE.Mesh(new THREE.BoxGeometry(TW, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: "#D8CCFF" }));
frontGlow.position.set(0, 0, TD / 2); world.add(frontGlow);
const sheenTex = canvasTex(256, 16, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const sheen = new THREE.Mesh(new THREE.PlaneGeometry(2.2, TD), new THREE.MeshBasicMaterial({ map: sheenTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: "#D8CCFF" }));
sheen.rotation.x = -Math.PI / 2; sheen.position.y = 0.006; world.add(sheen);

// glossy cubes with a printed front face
function faceTex(lines, cells) {
  return canvasTex(512, 512, (g, w, h) => {
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#FFFFFF";
    if (cells) {
      g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 6;
      for (let i = 1; i < 3; i++) { g.beginPath(); g.moveTo((w * i) / 3, 14); g.lineTo((w * i) / 3, h - 14); g.stroke(); }
      g.beginPath(); g.moveTo(14, h / 2); g.lineTo(w - 14, h / 2); g.stroke();
      g.font = '800 70px "Exo2"';
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) g.fillText("0,5", (w * (c + 0.5)) / 3, (h * (r + 0.5)) / 2 + 4);
      return;
    }
    g.font = `800 ${lines.size}px "Exo2"`; g.fillText(lines.text, w / 2, h / 2 + 8);
    g.globalAlpha = 0.7; g.font = '800 64px "Exo2"'; g.textAlign = "left"; g.fillText(lines.idx, 34, 64);
  });
}
function makeBlock(size, color, texA, texB) {
  const g = new THREE.Group(); world.add(g);
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, envMapIntensity: 1.15 });
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size, size, size, 5, size * 0.09), mat); mesh.position.y = size / 2; g.add(mesh);
  const mkFace = (tex) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.9, size * 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })); m.position.set(0, size / 2, size / 2 + 0.006); g.add(m); return m; };
  const fA = mkFace(texA), fB = texB ? mkFace(texB) : null;
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(size * 2.6, size * 1.9), new THREE.MeshBasicMaterial({ map: radial, color: VI, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = 0.008; world.add(glow);
  return { g, mat, fA, fB, glow, size };
}
const B1 = makeBlock(S1, "#8E6BFF", faceTex({ text: "0,5 кг", size: 128, idx: "1" }));
const B2 = makeBlock(S2, "#4A2FD0", faceTex({ text: "3 кг", size: 170, idx: "2" }), faceTex(null, true));
function setBlock(b, s) {
  const on = !!s && s.op > 0.004;
  b.g.visible = on; b.glow.visible = on;
  if (!on) return;
  b.g.position.set(s.x, s.y, s.z);
  b.mat.opacity = s.op; b.mat.transparent = s.op < 0.999;
  const f = s.face || 0;
  b.fA.material.opacity = s.op * (1 - f);
  if (b.fB) b.fB.material.opacity = s.op * f;
  b.glow.position.set(s.x, 0.008, s.z);
  b.glow.material.opacity = 0.42 * s.op * clamp(1 - s.y / 4);
}

// strobe ghosts: wire cube + faint fill + a cyan dot on the table
function makeGhosts(size) {
  const box = new THREE.BoxGeometry(size, size, size), eg = new THREE.EdgesGeometry(box);
  return [0, 1, 2, 3].map(() => {
    const g = new THREE.Group(); world.add(g);
    const line = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: "#CDBBFF", transparent: true }));
    const body = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: VI, transparent: true, depthWrite: false }));
    line.position.y = body.position.y = size / 2; g.add(body); g.add(line);
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), new THREE.MeshBasicMaterial({ color: CY, transparent: true }));
    dot.rotation.x = -Math.PI / 2; world.add(dot);
    return { g, line, body, dot, size };
  });
}
const G1 = makeGhosts(S1), G2 = makeGhosts(S2);
function setGhosts(G, E, t) {
  G.forEach((gh, k) => {
    const spawn = E ? E.t0 + (k * E.D) / 4 : 0;
    const op = E ? seg(t, spawn, spawn + 0.12) * (1 - seg(t, E.out0, E.out1)) : 0;
    gh.g.visible = gh.dot.visible = op > 0.004;
    if (!gh.g.visible) return;
    const x = E.x0 + E.L * (k / 4) ** 2;
    gh.g.position.set(x, 0, E.z);
    gh.line.material.opacity = 0.55 * op; gh.body.material.opacity = 0.07 * op;
    gh.dot.position.set(x, 0.01, E.z + gh.size / 2 + 0.3); gh.dot.material.opacity = op;
  });
}

// glowing force arrow (tip at local x = 0)
function makeArrow() {
  const len = 1.5, sh = 0.11, hh = 0.3, hl = 0.5;
  const s = new THREE.Shape();
  s.moveTo(-len, -sh); s.lineTo(-hl, -sh); s.lineTo(-hl, -hh); s.lineTo(0, 0); s.lineTo(-hl, hh); s.lineTo(-hl, sh); s.lineTo(-len, sh); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 3 });
  geo.translate(0, 0, -0.09);
  const mat = new THREE.MeshStandardMaterial({ color: "#B9A0FF", emissive: "#7B55FF", emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.1, transparent: true });
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, mat)); world.add(g);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial, color: VI, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.x = -0.75; glow.scale.set(3.4, 1.5, 1); g.add(glow);
  return { g, mat, glow };
}
const AR = [makeArrow(), makeArrow()];
function setArrow(a, s, t) {
  const on = !!s && s.op > 0.004;
  a.g.visible = on; if (!on) return;
  a.g.position.set(s.tip, s.y, s.z);
  a.mat.opacity = s.op; a.glow.material.opacity = s.op * (0.55 + 0.15 * Math.sin(t * 5));
}

// ---------------------------------------------------------------- motion
function pushX(t, E) {           // x(τ) = L(τ/D)² while F acts, then a short glide to rest
  const tau = t - E.t0; if (tau <= 0) return 0;
  if (tau < E.D) return E.L * (tau / E.D) ** 2;
  const v = (2 * E.L) / E.D;
  return E.L + v * 0.12 * eOut(seg(tau, E.D, E.D + 0.36));
}
function dropY(t, t0, h = 6) {   // falls under gravity, small bounce
  const s = (t - t0) / 0.45;
  if (s <= 0) return h;
  if (s < 1) return h * (1 - s * s);
  const b = seg(t, t0 + 0.45, t0 + 0.7);
  return 0.22 * Math.sin(b * Math.PI);
}
function worldY(t) {
  const enter = eBack(seg(t, T.f1 - 0.6, T.f1 + 0.2));
  const exit1 = eIO(seg(t, P0, P0 + 0.6)), back = eOut(seg(t, T.h1 - 0.4, T.h1 + 0.35)), exit2 = eIO(seg(t, T.cta - 0.6, T.cta - 0.1));
  let off = lerp(-14, 0, clamp(enter, 0, 1.08));
  if (t > P0) off = lerp(0, -22, exit1);
  if (t > T.h1 - 0.4) off = lerp(-22, 0, back);
  if (t > T.cta - 0.6) off = lerp(0, -22, exit2);
  return TOPY + off;
}
function b1Base(t) {   // body 1 x without the "leave" slide
  if (t < P0 + 0.7) return E1.x0 + pushX(t, E1);
  if (t < T.six - 0.1) return lerp(-0.6, E2.x0, eIO(seg(t, T.h2, T.h2 + 0.5))) + pushX(t, E2);
  return E3.x0 + pushX(t, E3);
}
function b1At(t) {
  if (t < P0 + 0.7) {
    if (t < T.b1 - 0.1) return null;
    return { x: b1Base(t) + 4 * eIO(seg(t, T.b2, T.b2 + 0.7)), z: 0, y: dropY(t, T.b1 - 0.1), op: 1 - seg(t, T.b2 + 0.2, T.b2 + 0.7) };
  }
  if (t < T.h1 - 0.5) return null;
  if (t < T.six - 0.1) {
    const op = 1 - seg(t, T.h3 + 0.1, T.h3 + 0.6);
    return op > 0 ? { x: b1Base(t) + 4 * eIO(seg(t, T.h3, T.h3 + 0.6)), z: 0, y: 0, op } : null;
  }
  return { x: b1Base(t), z: E3.z, y: dropY(t, T.six, 3.6), op: seg(t, T.six, T.six + 0.15) };
}
function b2At(t) {
  if (t < P0 + 0.7) return t < T.m2 - 0.05 ? null : { x: -1.2, z: 0, y: dropY(t, T.m2 - 0.05, 7), op: 1, face: 0 };
  if (t < T.h3 + 0.2) return null;
  const mv = eIO(seg(t, T.six, T.six + 0.6));
  return { x: lerp(-1.2, E4.x0, mv) + pushX(t, E4), z: lerp(0, E4.z, mv), y: dropY(t, T.h3 + 0.2, 3.6), op: seg(t, T.h3 + 0.2, T.h3 + 0.35),
    face: seg(t, T.h3 + 1.4, T.h3 + 1.9) * (1 - seg(t, T.six, T.six + 0.4)) };
}
const tipOf1 = (x) => x - S1 / 2 - 0.05, tipOf2 = (x) => x - S2 / 2 - 0.05;
function arAAt(t) {
  if (t < P0 + 0.7) {
    const k = eOut(seg(t, T.f1 + 0.1, T.f1 + 0.7)); if (k <= 0) return null;
    let tip = tipOf1(b1Base(t)), y = S1 / 2;
    const m = eIO(seg(t, T.b2 + 0.1, T.b2 + 0.9));
    if (m > 0) { tip = lerp(tipOf1(b1Base(T.b2 + 0.1)), tipOf2(-1.2), m); y = lerp(S1 / 2, S2 / 2, m) + Math.sin(m * Math.PI) * 0.7; }
    return { tip: lerp(-7, tip, k), y, z: 0, op: k };
  }
  if (t < T.h1 - 0.5) return null;
  if (t < T.six) {
    let tip = tipOf1(b1Base(t)), y = S1 / 2;
    const m = eIO(seg(t, T.h3 + 0.1, T.h3 + 0.9));
    if (m > 0) { tip = lerp(tipOf1(b1Base(T.h3 + 0.1)), tipOf2(-1.2), m); y = lerp(S1 / 2, S2 / 2, m) + Math.sin(m * Math.PI) * 0.7; }
    return { tip, y, z: 0, op: 1 - seg(t, T.six - 0.25, T.six) };
  }
  return { tip: lerp(-7, tipOf1(b1Base(t)), eOut(seg(t, T.six + 0.3, T.six + 0.7))), y: S1 / 2, z: E3.z, op: seg(t, T.six + 0.3, T.six + 0.55) };
}
function arBAt(t) {
  if (t < T.six) return null;
  const b = b2At(t);
  return { tip: lerp(-7, tipOf2(b.x), eOut(seg(t, T.six + 0.35, T.six + 0.75))), y: S2 / 2, z: b.z, op: seg(t, T.six + 0.35, T.six + 0.6) };
}

const V3 = new THREE.Vector3();
function proj(x, y, z) { V3.set(x + WX, y, z).project(camera); return { x: (V3.x + 1) / 2 * W, y: (1 - V3.y) / 2 * H }; }

let SNAP = {};
function updateWorld(t) {
  // camera: slow drift + a short shake when the heavy cube lands
  let shake = 0;
  for (const tl0 of [T.m2 - 0.05 + 0.45, T.h3 + 0.2 + 0.45]) { const d = t - tl0; if (d > 0 && d < 0.5) shake += 0.07 * Math.exp(-d * 9) * Math.sin(d * 70); }
  camera.position.set(CAM.x + Math.sin(t * 0.23) * 0.5, CAM.y + Math.sin(t * 0.17) * 0.25 + shake, CAM.z);
  const lookY = t < P0 + 0.7 ? LOOK.y + 1.5 : LOOK.y;   // condition: scene sits lower (nothing below it)
  camera.lookAt(LOOK.x + Math.sin(t * 0.23) * 0.2, lookY + shake * 0.5, LOOK.z);
  camera.updateMatrixWorld();

  const wy = worldY(t);
  world.position.y = wy;
  const b1 = b1At(t), b2 = b2At(t), a1 = arAAt(t), a2 = arBAt(t);
  setBlock(B1, b1); setBlock(B2, b2);
  setArrow(AR[0], a1, t); setArrow(AR[1], a2, t);
  const e1 = t < P0 + 0.7 ? E1 : t < T.six - 0.1 ? E2 : E3;
  setGhosts(G1, e1, t);
  setGhosts(G2, t >= T.six ? E4 : null, t);
  const sk = seg(t, T.sm + 0.05, T.sm + 1.15);
  sheen.visible = sk > 0 && sk < 1; sheen.position.x = lerp(-6, 6, eIO(sk)); sheen.material.opacity = Math.sin(sk * Math.PI) * 0.55;
  renderer.render(scene, camera);
  SNAP = { wy, b1, b2, a1, a2 };
}

// ---------------------------------------------------------------- 3D logo (same as the other subjects)
const logoTex = await new THREE.TextureLoader().loadAsync("/experiments/vessels-3d/ru/logo.png");
logoTex.colorSpace = THREE.SRGBColorSpace; logoTex.anisotropy = 8;
const logo3d = createLogo3d(logoTex, 4.2, 1, [6, 4, 24]);
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

// ---------------------------------------------------------------- overlay helpers
const dots = [...$("dots").children];
function show(el, o, { dy = 0, dx = 0, sc = 1, flex = false } = {}) {
  css(el, { display: o <= 0.001 ? "none" : flex ? "flex" : "", opacity: o, transform: `translate(${dx}px, ${dy}px) scale(${sc})` });
}
const pop = (t, t0, d = 0.4) => { const k = seg(t, t0, t0 + d); return { o: clamp(k * 2), s: k <= 0 ? 0 : eBack(k) }; };
function popShow(el, t, t0, tOut, opt = {}) {
  const p = pop(t, t0), out = seg(t, tOut, tOut + 0.3);
  show(el, p.o * (1 - out), { sc: lerp(0.8, 1, clamp(p.s, 0, 1.12)) * lerp(1, 0.92, out), dy: (opt.dy || 0) + (1 - p.o) * 24 - 20 * out, dx: opt.dx || 0, flex: opt.flex });
}
// a label pinned to a screen point: (ax, ay) is where its anchor (0..1 of its own box) sits
function pin(el, o, x, y, ax = 0.5, ay = 1, sc = 1) {
  if (o <= 0.001) { el.style.display = "none"; return; }
  el.style.display = "";
  const r = el.firstElementChild ? el.firstElementChild.getBoundingClientRect() : el.getBoundingClientRect();
  const w = r.width / (sc || 1), h = r.height / (sc || 1);
  css(el, { left: x - w * ax + "px", top: y - h * ay + "px", opacity: o, transform: `scale(${sc})`, transformOrigin: `${ax * 100}% ${ay * 100}%` });
}
function headline(el, o) { css(el, { display: o <= 0.001 ? "none" : "", opacity: o, transform: `translateY(${(1 - o) * 26}px)`, filter: `blur(${(1 - o) * 6}px)` }); }
const bctx = $("bgc").getContext("2d");
function drawBg(t) {
  bctx.clearRect(0, 0, W, H);
  const cx = 540 + Math.sin(t * 0.3) * 90, cy = 1080 + Math.cos(t * 0.4) * 80, go = 0.8 + 0.2 * Math.sin(t * 0.8);
  const g = bctx.createRadialGradient(cx, cy, 0, cx, cy, 520);
  g.addColorStop(0, `rgba(150,110,255,${(0.26 * go).toFixed(4)})`); g.addColorStop(1, "rgba(150,110,255,0)");
  bctx.fillStyle = g; bctx.fillRect(cx - 520, cy - 520, 1040, 1040);
  const c2 = bctx.createRadialGradient(840, 420, 0, 840, 420, 420);
  c2.addColorStop(0, "rgba(98,212,255,0.07)"); c2.addColorStop(1, "rgba(98,212,255,0)");
  bctx.fillStyle = c2; bctx.fillRect(420, 0, 840, 840);
}
const flipSx = (t, t0) => { const f = seg(t, t0 - 0.25, t0 + 0.25); return f > 0 && f < 1 ? Math.abs(Math.cos(f * Math.PI)) : 1; };

// ---------------------------------------------------------------- frame
function renderFrame(t) {
  drawBg(t);
  const pw = pwOf(t);
  const pv = seg(t, 1.85, 2.0) * (1 - seg(t, T.cta + 0.1, T.cta + 0.25));
  css($("plaque"), { width: pw + "px", left: 540 - pw / 2 + "px", opacity: pv, display: pv <= 0 ? "none" : "" });
  $("plaque").lastElementChild.style.opacity = eOut(seg(t, 2.3, 2.75)) * (1 - seg(t, T.cta - 0.4, T.cta - 0.1));
  drawLogo(t);

  const st = t < T.h1 - 0.3 ? 0 : t < T.h2 ? 1 : t < T.h3 ? 2 : 3;
  css($("dots"), { opacity: seg(t, 1.9, 2.4) * (1 - seg(t, T.cta - 0.3, T.cta + 0.2)) });
  dots.forEach((d, i) => css(d, { width: i === st ? "46px" : "14px", background: i === st ? VI : "rgba(255,255,255,0.24)" }));

  updateWorld(t);
  const { wy, b1, b2, a1, a2 } = SNAP;
  const sceneOut = Math.max(seg(t, P0, P0 + 0.3), seg(t, T.cta - 0.7, T.cta - 0.4)) * (t < T.h1 - 0.4 || t > T.cta - 0.7 ? 1 : 0);
  const vis = 1 - sceneOut;

  // ---- force label: «F», «та же F», later the tag «F = 0,9 Н»
  {
    const fCond = fadeIO(t, T.f1 + 0.5, T.f1 + 0.8, P0 - 0.1, P0 + 0.2);
    const fS1 = fadeIO(t, T.h1 + 0.2, T.h1 + 0.5, T.res - 0.1, T.res + 0.1);
    const same = t > T.b2 + 0.4 && t < P0 + 1;
    const want = same ? "та же F" : "F";
    if ($("lF").textContent !== want) $("lF").textContent = want;
    const o = (a1 ? a1.op : 0) * Math.max(fCond * (1 - seg(t, T.b2 + 0.05, T.b2 + 0.3) + seg(t, T.b2 + 0.4, T.b2 + 0.7)), fS1) * vis;
    if (a1 && o > 0) { const p = proj(a1.tip - (same ? 1.5 : 0.9), wy + a1.y + 0.55, a1.z); pin($("lF"), o, p.x, p.y, 0.5, 1); } else pin($("lF"), 0);
    const oF = (a1 ? a1.op : 0) * fadeIO(t, T.res, T.res + 0.3, T.six - 0.3, T.six - 0.05) * vis;
    if (a1 && oF > 0) { const p = proj(a1.tip - 0.9, wy + a1.y + 0.55, a1.z); const pp = pop(t, T.res, 0.4); pin($("tF"), oF, p.x, p.y, 0.5, 1, lerp(0.8, 1, clamp(pp.s, 0, 1.12))); } else pin($("tF"), 0);
  }
  // ---- «v = 0» over the resting body 1
  {
    const o = fadeIO(t, T.b1 + 0.5, T.b1 + 0.8, T.a1 + 0.1, T.a1 + 0.35) * vis;
    if (b1 && o > 0) { const p = proj(b1.x, wy + b1.y + S1 + 0.45, b1.z); pin($("tV"), o, p.x, p.y); } else pin($("tV"), 0);
  }
  // ---- a₁ tag rides above body 1 (in the comparison: under the table, in front of it)
  {
    const o = Math.max(fadeIO(t, T.a1 + 0.6, T.a1 + 0.9, T.b2, T.b2 + 0.3), fadeIO(t, E2.t0 + 0.4, E2.t0 + 0.7, T.h3, T.h3 + 0.3), fadeIO(t, E3.t0 + 0.3, E3.t0 + 0.6, T.cta - 0.8, T.cta - 0.5)) * vis;
    if (b1 && o > 0) {
      const cmp = t >= T.six;
      const p = cmp ? proj(b1.x, wy - 0.32, TD / 2) : proj(b1.x, wy + b1.y + S1 + 0.45, b1.z);
      pin($("tA"), o, clamp(p.x, 200, 880), cmp ? p.y + 26 : p.y, 0.5, cmp ? 0 : 1);
    } else pin($("tA"), 0);
  }
  // ---- a₂ tag: «?» in the condition and step 3, flips to the answer
  {
    const o = Math.max(fadeIO(t, T.q, T.q + 0.3, P0, P0 + 0.25), fadeIO(t, T.h3 + 0.9, T.h3 + 1.2, T.cta - 0.8, T.cta - 0.5)) * vis;
    if (b2 && o > 0) {
      const ans = t >= T.ans;
      const want = ans ? "a₂ = 0,3 м/с²" : "a₂ = ?";
      if ($("tQin").textContent !== want) { $("tQin").textContent = want; $("tQin").classList.toggle("ans", ans); }
      const pulse = ans ? 1 + 0.15 * Math.max(0, 1 - (t - T.ans) / 0.5) : 1;
      css($("tQin"), { fontSize: ans ? "42px" : "38px", padding: ans ? "18px 34px" : "14px 30px", transform: `scaleX(${flipSx(t, T.ans)}) scale(${pulse})` });
      const side = proj(b2.x + S2 / 2 + 0.25, wy + b2.y + S2 * 0.9, b2.z), above = proj(b2.x, wy + b2.y + S2 + 0.5, b2.z);
      const k = eIO(seg(t, T.six, T.six + 0.6));
      pin($("tQ"), o, lerp(side.x, clamp(above.x, 270, 810), k), lerp(side.y, above.y, k), lerp(0, 0.5, k), lerp(0.5, 1, k));
    } else pin($("tQ"), 0);
  }

  // ---- condition notes
  popShow($("nStrobe"), t, T.a1 + 1.1, T.b2 - 0.1, { flex: true });
  popShow($("nSmooth"), t, T.sm + 0.05, P0 - 0.05, { flex: true });

  // ---- pause: whole condition + timer
  const cin = seg(t, T_COND, T_COND + 0.5), cout = eIO(seg(t, T_EX, T_EX + 0.45));
  show($("cond"), cin * (1 - cout), { dy: (1 - cin) * 40 - 160 * cout });
  const tp = pop(t, T_TIMER, 0.45);
  show($("timer"), tp.o * (1 - cout), { dy: (1 - tp.o) * 60 - 160 * cout, sc: lerp(0.9, 1, tp.o), flex: true });
  const rem = clamp(4 - (t - T_C0), 0, 4);
  $("tnum").textContent = String(t < T_C0 ? 4 : Math.max(1, Math.ceil(rem - 1e-6)));
  $("arc").setAttribute("stroke-dashoffset", String(540.4 * (1 - (t < T_C0 ? 4 : rem) / 4)));

  // ---- headlines
  headline($("h1"), seg(t, T.h1 - 0.2, T.h1 + 0.3) * (1 - seg(t, T.h2 - 0.2, T.h2 + 0.2)));
  headline($("h2"), seg(t, T.h2, T.h2 + 0.4) * (1 - seg(t, T.h3 - 0.2, T.h3 + 0.2)));
  headline($("h3"), seg(t, T.h3, T.h3 + 0.4) * (1 - seg(t, T.cta - 0.5, T.cta - 0.1)));
  headline($("h4"), seg(t, T.cta + 1.0, T.cta + 1.5));

  // ---- step 1: F = m · a assembles letter by letter, then three chips
  const s1Out = T.h2 - 0.2;
  {
    const fo = seg(t, T.law - 0.15, T.law + 0.15) * (1 - seg(t, s1Out, s1Out + 0.3));
    css($("fm"), { display: fo > 0 ? "flex" : "none", opacity: fo, transform: `translateY(${-20 * seg(t, s1Out, s1Out + 0.3)}px)` });
    [["fmF", 0], ["fmEq", 0.35], ["fmM", 0.6], ["fmDot", 1.0], ["fmA", 1.25]].forEach(([id, d]) => {
      const p = pop(t, T.law + d, 0.35); css($(id), { opacity: p.o, transform: `translateY(${(1 - p.o) * 40}px) scale(${lerp(0.5, 1, clamp(p.s, 0, 1.15))})` });
    });
    const co = seg(t, T.law + 1.4, T.law + 1.6) * (1 - seg(t, s1Out, s1Out + 0.3));
    css($("chips"), { display: co > 0 ? "flex" : "none", opacity: co });
    ["c0", "c1", "c2"].forEach((id, i) => { const p = pop(t, T.law + 1.4 + i * 0.2, 0.35); css($(id), { opacity: p.o, transform: `translateY(${(1 - p.o) * 24}px) scale(${lerp(0.8, 1, clamp(p.s, 0, 1.1))})` }); });
  }
  popShow($("nFr"), t, T.fr + 0.1, s1Out, { flex: true });

  // ---- step 2: force
  const s2Out = T.h3 - 0.2;
  popShow($("n2"), t, T.h2 + 0.35, s2Out, { flex: true });
  popShow($("b2a"), t, T.mul, s2Out);
  popShow($("b2b"), t, T.res, s2Out);

  // ---- step 3: acceleration, then the comparison
  const s3Out = T.six - 0.25;
  popShow($("n3"), t, T.h3 + 0.5, s3Out, { flex: true });
  popShow($("t6"), t, T.h3 + 1.45, s3Out, { flex: true });
  popShow($("b3a"), t, T.div, s3Out);
  popShow($("b3b"), t, T.ans, s3Out);
  popShow($("nSix"), t, T.six + 0.25, T.cta - 0.6, { flex: true });
  popShow($("nChk"), t, T.slow + 0.15, T.cta - 0.6, { flex: true });

  // ---- CTA
  const k1 = pop(t, T.cta + 2.1, 0.45), k2 = pop(t, T.link, 0.45);
  show($("cta1"), k1.o, { dy: (1 - k1.o) * 40, sc: lerp(0.9, 1, k1.o), flex: true });
  show($("cta2"), k2.o, { dy: (1 - k2.o) * 40, sc: lerp(0.9, 1, k2.o), flex: true });
}

window.renderFrame = renderFrame;
renderFrame(0);
window.ready = true;
