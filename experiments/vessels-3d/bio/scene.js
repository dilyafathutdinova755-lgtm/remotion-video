// Biology video: "120 amino acids → nucleotides of the template DNA strand".
// Deterministic: window.renderFrame(t). Three.js world (beads, nucleotide capsules, DNA ladder)
// + the 3D logo slab (../ru/logo3d.js) + DOM overlay (plaque, headlines, small notes, pause card).
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
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

const tl = await (await fetch("/experiments/vessels-3d/bio/timeline.json")).json();
const T = tl.marks;
const S = Object.fromEntries(tl.sentences.map((s) => [s.id, s]));
window.DURATION = tl.total;

await Promise.all(['700 40px "Unbounded"', '800 40px "Unbounded"', '500 40px "Onest"', '800 40px "Onest"', '600 40px "JB"'].map((f) => document.fonts.load(f, "АаЯя0")));

// ---------------------------------------------------------------- key times (mirrored in make_mix_bio.py)
const P0 = S.pause.start;
const T_COND = P0 + 0.4, T_TIMER = P0 + 0.95, T_C0 = P0 + 1.3, T_EX = T_C0 + 4;

// ---------------------------------------------------------------- 3D world
const canvas = $("world");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.85;
scene.add(new THREE.AmbientLight(0xffffff, 0.15));
const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-5, 7, 9); scene.add(key);
const rim = new THREE.DirectionalLight(0xd8ffb0, 1.0); rim.position.set(6, 2, -5); scene.add(rim);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);
const CAMZ = 9.6 / Math.tan((15 * Math.PI) / 180); // 1 world unit = 100 px on the z=0 plane
const wx = (x) => (x - 540) / 100, wy = (y) => -(y - 960) / 100;

const phys = (o) => new THREE.MeshPhysicalMaterial({ roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, ...o });

// beads (amino acids)
const beadMat = phys({ color: 0xffffff, emissive: 0x0b2a12, envMapIntensity: 1.1 });
const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 28, 20), beadMat, 120);
const cA = new THREE.Color("#D6FF6A"), cB = new THREE.Color("#2FA866"), tmpC = new THREE.Color();
for (let i = 0; i < 120; i++) { const v = 0.5 + 0.5 * Math.sin(i * 2.399); beads.setColorAt(i, tmpC.copy(cA).lerp(cB, v * 0.75)); }
scene.add(beads);
const hero = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), phys({ color: "#B8F25A", emissive: 0x0b2a12 }));
scene.add(hero);

// nucleotide capsules: 3 big (step 1, with letters) + 360 small (step 2)
const capMat = phys({ color: "#8BE37A", emissive: 0x08200d });
function letterTex(ch) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"); g.fillStyle = "#0A2A16"; g.font = '700 170px "Unbounded"'; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(ch, 128, 140);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
const bigCaps = ["Т", "А", "Ц"].map((ch) => {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1.26, 10, 28), capMat);
  g.add(m);
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: letterTex(ch), transparent: true, depthWrite: false }));
  lp.position.set(0, -0.55, 1.02); g.add(lp);
  scene.add(g);
  return g;
});
const miniMat = phys({ color: "#8BE37A", emissive: 0x08200d });
const minis = new THREE.InstancedMesh(new THREE.CapsuleGeometry(1, 1.4, 4, 14), miniMat, 360);
scene.add(minis);

// DNA ladder: template strand (glows) + complementary strand, each with its half-rungs
const dna = new THREE.Group(), tplG = new THREE.Group(), cmpG = new THREE.Group();
dna.add(tplG, cmpG); scene.add(dna);
const tplMat = phys({ color: "#C6FF4D", emissive: "#5c8a12", emissiveIntensity: 0.55 });
const cmpMat = phys({ color: "#3E9E6E", emissive: 0x06180c });
const railGeo = new THREE.CapsuleGeometry(0.15, 9.5, 8, 24); railGeo.rotateZ(Math.PI / 2);
const rungGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.96, 14);
const tRail = new THREE.Mesh(railGeo, tplMat); tRail.position.y = 1.13; tplG.add(tRail);
const cRail = new THREE.Mesh(railGeo, cmpMat); cRail.position.y = -1.13; cmpG.add(cRail);
for (let x = 80; x < 1010; x += 38) {
  const X = wx(x + 6);
  const a = new THREE.Mesh(rungGeo, tplMat); a.position.set(X, 0.56, 0); tplG.add(a);
  const b = new THREE.Mesh(rungGeo, cmpMat); b.position.set(X, -0.56, 0); cmpG.add(b);
}

const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), E = new THREE.Euler();
function setInst(mesh, i, x, y, z, s, sy = s, rz = 0) {
  if (s <= 0.0001) { M4.makeScale(0, 0, 0); mesh.setMatrixAt(i, M4); return; }
  V.set(wx(x), wy(y), z / 100); SC.set(s, sy, s); Q.setFromEuler(E.set(0, 0, rz));
  M4.compose(V, Q, SC); mesh.setMatrixAt(i, M4);
}

// ---------------------------------------------------------------- bead layouts (px)
function coil(i, ang) {
  const u = i / 119, a = u * Math.PI * 7.2, b = u * Math.PI * 2.3;
  const r = 230 + 70 * Math.sin(u * Math.PI * 3);
  let x = Math.cos(a) * r * Math.cos(b * 0.6), z = Math.sin(a) * r;
  const y = (u - 0.5) * 380 + Math.sin(b) * 108;
  const x2 = x * Math.cos(ang) + z * Math.sin(ang), z2 = -x * Math.sin(ang) + z * Math.cos(ang);
  return [540 + x2, 880 + y, z2];
}
const grid1 = (i) => [144 + (i % 12) * 72, 628 + Math.floor(i / 12) * 72, 0];
const strip = (i) => [75 + (i % 60) * 16, 531 + Math.floor(i / 60) * 30, 0];
const grid2 = (i) => [144 + (i % 12) * 72, 578 + Math.floor(i / 12) * 78, 0];

function updateWorld(t) {
  const drift = Math.sin(t * 0.21) * 0.05;
  camera.position.set(drift, Math.sin(t * 0.29) * 0.04, CAMZ);
  camera.lookAt(drift * 0.5, 0, 0);

  // --- beads
  const exitCond = eIO(seg(t, P0, P0 + 0.6));
  let beadOp = 1;
  const condPhase = t < P0 + 0.7;
  const step2 = t >= T.h2 && t < T.h3 + 0.4;
  if (condPhase) {
    const ang = (t - T.bel) * 0.6;
    for (let i = 0; i < 120; i++) {
      const ap = eBack(seg(t, T.bel - 0.1 + i * 0.008, T.bel + 0.35 + i * 0.008));
      let p = coil(i, ang), r = 26;
      const k1 = eIO(seg(t, T.n120 + i * 0.006, T.n120 + 0.8 + i * 0.006));
      const g = grid1(i); p = [lerp(p[0], g[0], k1), lerp(p[1], g[1], k1), lerp(p[2], 0, k1)];
      const k2 = eIO(seg(t, T.q + (i % 60) * 0.004, T.q + 0.8 + (i % 60) * 0.004));
      const s = strip(i); p = [lerp(p[0], s[0], k2), lerp(p[1], s[1], k2), lerp(p[2], 0, k2)]; r = lerp(r, 10, k2);
      p[1] += 320 * exitCond;
      setInst(beads, i, p[0], p[1], p[2], (r / 100) * clamp(ap, 0, 1.25));
    }
    beadOp = 1 - exitCond;
  } else if (step2) {
    const dk = seg(t, T.calc - 0.1, T.calc + 0.45);
    for (let i = 0; i < 120; i++) {
      const row = Math.floor(i / 12), col = i % 12;
      const ap = eBack(seg(t, T.h2 + 0.3 + row * 0.05 + col * 0.01, T.h2 + 0.75 + row * 0.05 + col * 0.01));
      const g = grid2(i);
      setInst(beads, i, g[0], g[1] + 18, 0, 0.18 * clamp(ap, 0, 1.25));
    }
    beadOp = lerp(1, 0.14, dk) * (1 - seg(t, T.h3 - 0.2, T.h3 + 0.3));
  } else {
    for (let i = 0; i < 120; i++) setInst(beads, i, 0, 0, 0, 0);
    beadOp = 0;
  }
  beads.instanceMatrix.needsUpdate = true;
  beadMat.opacity = beadOp; beads.visible = beadOp > 0.01;

  // --- mini capsules (step 2): triplets grow row by row
  if (step2) {
    for (let i = 0; i < 120; i++) {
      const row = Math.floor(i / 12), col = i % 12;
      const g = grid2(i);
      for (let k = 0; k < 3; k++) {
        const gk = eBack(seg(t, T.x3 + row * 0.12 + col * 0.012 + k * 0.03, T.x3 + 0.35 + row * 0.12 + col * 0.012 + k * 0.03));
        setInst(minis, i * 3 + k, g[0] - 20 + k * 20, g[1] + 56, 0, 0.085 * clamp(gk, 0, 1.2), 0.085 * clamp(gk, 0, 1.2));
      }
    }
  } else for (let i = 0; i < 360; i++) setInst(minis, i, 0, 0, 0, 0);
  minis.instanceMatrix.needsUpdate = true;
  minis.visible = step2;
  miniMat.opacity = step2 ? beadOp : 0;

  // --- hero bead + big capsules (step 1)
  const hIn = eBack(seg(t, T.h1 + 0.1, T.h1 + 0.7)), hOut = eIO(seg(t, T.h2 - 0.1, T.h2 + 0.45));
  hero.visible = t > T.h1 && hOut < 1;
  hero.position.set(wx(540), wy(790 - 120 * hOut), 0);
  hero.scale.setScalar(1.5 * clamp(hIn, 0, 1.2) * (1 - hOut));
  hero.rotation.y = t * 0.6;
  const FROM = [[-160, 1380, -1.4], [540, 2150, 0.4], [1260, 1300, 1.4]];
  bigCaps.forEach((g, j) => {
    const k = seg(t, T.trip + j * 0.18, T.trip + 0.75 + j * 0.18), e = eBack(k);
    const x = lerp(FROM[j][0], 422 + j * 118, e), y = lerp(FROM[j][1], 1135, e);
    g.visible = k > 0 && hOut < 1;
    g.position.set(wx(x), wy(y - 160 * hOut), 0);
    g.scale.setScalar(0.46 * (1 - hOut));
    g.rotation.set(0, (1 - eOut(k)) * Math.PI * 2, FROM[j][2] * (1 - eOut(k)));
  });
  capMat.opacity = 1;

  // --- DNA ladder
  let dVis = 0, cy = 1108, cmpOp = 1, cmpDy = 0, tplOp = 1;
  if (t < P0 + 0.7) {
    const k = eIO(seg(t, T.dna, T.dna + 0.85));
    dVis = k * (1 - exitCond);
    cy = lerp(2300, 1108, k) + 320 * exitCond;
    cmpOp = lerp(1, 0.45, seg(t, T.code, T.code + 0.5));
  } else if (t > T.h3 - 0.3) {
    const k = eIO(seg(t, T.h3 - 0.3, T.h3 + 0.6));
    dVis = k * (1 - seg(t, T.cta - 0.5, T.cta - 0.1));
    cy = lerp(2300, 1008, k);
    const two = eIO(seg(t, T.two, T.two + 1.0));
    cmpDy = 380 * two; cmpOp = lerp(1, 0.25, two);
  }
  dna.visible = dVis > 0.01;
  dna.position.set(0, wy(cy), 0);
  dna.rotation.set(-0.28 + Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.45) * 0.1, 0);
  cmpG.position.y = -cmpDy / 100;
  tplMat.opacity = dVis * tplOp; cmpMat.opacity = dVis * cmpOp;
  tplMat.emissiveIntensity = 0.55 + 0.35 * seg(t, T.a360, T.a360 + 0.3) * (1 - seg(t, T.a360 + 0.3, T.a360 + 1.2));

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- 3D logo (same as the math and Russian videos)
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

// ---------------------------------------------------------------- overlay
const rays = Array.from({ length: 12 }, (_, i) => {
  const d = document.createElement("div"); d.className = "a ray";
  css(d, { left: 90 + i * 82 + "px", top: "600px", height: "370px" });
  $("rays").appendChild(d); return d;
});
const dots = [...$("dots").children];
function show(el, o, { dy = 0, sc = 1, flex = false } = {}) {
  css(el, { display: o <= 0.001 ? "none" : flex ? "flex" : "", opacity: o, transform: `translateY(${dy}px) scale(${sc})` });
}
const pop = (t, t0, d = 0.4) => { const k = seg(t, t0, t0 + d); return { o: clamp(k * 2), s: k <= 0 ? 0 : eBack(k) }; };
function popShow(el, t, t0, tOut, extra = {}) {
  const p = pop(t, t0), out = seg(t, tOut, tOut + 0.3);
  show(el, p.o * (1 - out), { sc: lerp(0.85, 1, clamp(p.s, 0, 1.1)), dy: (1 - p.o) * 24 - 20 * out, ...extra });
}
function headline(el, o) { css(el, { display: o <= 0.001 ? "none" : "", opacity: o, transform: `translateY(${(1 - o) * 26}px)`, filter: `blur(${(1 - o) * 6}px)` }); }

function renderFrame(t) {
  // background: dot matrix lit by a slow glow that follows the main object
  const gx = 540 + Math.sin(t * 0.23) * 160, gy = (t < P0 ? 900 : t < T.h3 ? 980 : 1000) + Math.cos(t * 0.31) * 120;
  css($("glow"), { transform: `translate(${gx - 550}px, ${gy - 550}px)`, opacity: 0.85 + 0.15 * Math.sin(t * 0.9) });
  const m = `radial-gradient(720px 900px at ${gx}px ${gy}px, #000 0%, rgba(0,0,0,0.35) 55%, transparent 82%)`;
  css($("pat"), { webkitMaskImage: m, maskImage: m, opacity: 0.85 + 0.15 * Math.sin(t * 1.3) });

  // plaque + logo
  const pw = pwOf(t);
  const pv = seg(t, 1.85, 2.0) * (1 - seg(t, T.cta + 0.1, T.cta + 0.25));
  css($("plaque"), { width: pw + "px", left: 540 - pw / 2 + "px", opacity: pv, display: pv <= 0 ? "none" : "" });
  $("plaque").lastElementChild.style.opacity = eOut(seg(t, 2.3, 2.75)) * (1 - seg(t, T.cta - 0.4, T.cta - 0.1));
  drawLogo(t);

  // step dots
  const st = t < T.h1 - 0.3 ? 0 : t < T.h2 ? 1 : t < T.h3 ? 2 : 3;
  css($("dots"), { opacity: seg(t, 1.9, 2.4) * (1 - seg(t, T.cta - 0.3, T.cta + 0.2)) });
  dots.forEach((d, i) => css(d, { width: i === st ? "46px" : "14px", background: i === st ? "#C6FF4D" : "rgba(255,255,255,0.22)" }));

  // world
  updateWorld(t);

  // condition stage
  popShow($("nBelok"), t, T.bel + 0.5, T.n120, { flex: true });
  const cv = fadeIO(t, T.n120, T.n120 + 0.3, T.q, T.q + 0.3);
  show($("cnt"), cv, { sc: lerp(0.9, 1, cv) });
  $("cnt").textContent = String(Math.round(120 * eOut(seg(t, T.n120, T.amino + 0.6))));
  show($("lAmino"), fadeIO(t, T.amino, T.amino + 0.3, T.q, T.q + 0.3));
  show($("lStrip"), fadeIO(t, T.q + 0.6, T.q + 1.0, P0, P0 + 0.4));
  show($("lTpl"), fadeIO(t, T.dna + 0.6, T.dna + 1.0, P0, P0 + 0.4));
  show($("lDna"), fadeIO(t, T.dna + 0.6, T.dna + 1.0, P0, P0 + 0.4));
  popShow($("tagQ"), t, T.dna + 1.0, P0);
  popShow($("nCode"), t, T.code + 0.2, P0);
  const rv = fadeIO(t, T.code, T.code + 0.4, P0, P0 + 0.4);
  rays.forEach((r, i) => {
    const ph = (t * 1.6 + i * 0.37) % 1;
    css(r, { display: rv > 0 ? "" : "none", opacity: rv * (0.35 + 0.65 * Math.abs(Math.sin(t * 3 + i * 1.7))), transform: `scaleY(${lerp(0.6, 1, ph)})`, transformOrigin: "50% 100%" });
  });

  // pause: whole condition + timer
  const cin = seg(t, T_COND, T_COND + 0.5), cout = eIO(seg(t, T_EX, T_EX + 0.45));
  show($("cond"), cin * (1 - cout), { dy: (1 - cin) * 40 - 160 * cout });
  const tp = pop(t, T_TIMER, 0.45);
  show($("timer"), tp.o * (1 - cout), { dy: (1 - tp.o) * 60 - 160 * cout, sc: lerp(0.9, 1, tp.o), flex: true });
  const rem = clamp(4 - (t - T_C0), 0, 4);
  $("tnum").textContent = String(t < T_C0 ? 4 : Math.max(1, Math.ceil(rem - 1e-6)));
  $("arc").setAttribute("stroke-dashoffset", String(540.4 * (1 - (t < T_C0 ? 4 : rem) / 4)));

  // headlines
  headline($("h1"), seg(t, T.h1 - 0.2, T.h1 + 0.3) * (1 - seg(t, T.h2 - 0.2, T.h2 + 0.2)));
  headline($("h2"), seg(t, T.h2, T.h2 + 0.4) * (1 - seg(t, T.h3 - 0.2, T.h3 + 0.2)));
  headline($("h3"), seg(t, T.h3, T.h3 + 0.4) * (1 - seg(t, T.cta - 0.5, T.cta - 0.1)));
  headline($("h4"), seg(t, T.cta + 1.0, T.cta + 1.5));

  // step 1
  show($("lOne"), fadeIO(t, T.h1 + 0.6, T.h1 + 1.0, T.h2 - 0.1, T.h2 + 0.2));
  const bk = eOut(seg(t, T.three, T.three + 0.4)) * (1 - seg(t, T.h2 - 0.1, T.h2 + 0.2));
  css($("brk"), { display: bk > 0 ? "" : "none", opacity: bk, transform: `scaleX(${bk})` });
  popShow($("nTrip"), t, T.three + 0.3, T.h2 - 0.1, { flex: true });

  // step 2
  popShow($("nGrid"), t, T.h2 + 0.8, T.calc - 0.2, { flex: true });
  const gtxt = t < T.x3 + 0.3 ? "<b>120</b> аминокислот" : "<b>120</b> × 3 …";
  if ($("nGridIn").innerHTML !== gtxt) $("nGridIn").innerHTML = gtxt;
  const c1 = pop(t, T.calc, 0.45), c2 = pop(t, T.r360, 0.5), cOut = seg(t, T.h3 - 0.3, T.h3 + 0.1);
  show($("calc1"), c1.o * (1 - cOut), { sc: lerp(0.85, 1, clamp(c1.s, 0, 1.1)) });
  show($("calc2"), c2.o * (1 - cOut), { sc: lerp(0.7, 1, clamp(c2.s, 0, 1.15)) });

  // step 3
  show($("lTpl2"), fadeIO(t, T.h3 + 0.6, T.h3 + 1.0, T.cta - 0.5, T.cta - 0.1));
  show($("lCmp2"), fadeIO(t, T.h3 + 0.6, T.h3 + 1.0, T.two, T.two + 0.5), { dy: 380 * eIO(seg(t, T.two, T.two + 1.0)) });
  popShow($("nOne"), t, T.two + 0.6, T.cta - 0.5, { flex: true });
  const ta = pop(t, T.h3 + 0.9, 0.45), taOut = seg(t, T.cta - 0.5, T.cta - 0.1);
  const flip = eIO(seg(t, T.a360, T.a360 + 0.5));
  const tagIn = $("tagAin");
  const done = flip >= 0.5;
  if (tagIn.classList.contains("on") !== done) { tagIn.classList.toggle("on", done); tagIn.textContent = done ? "360 нуклеотидов" : "? нуклеотидов"; }
  css($("tagA"), { display: ta.o * (1 - taOut) > 0 ? "flex" : "none", opacity: ta.o * (1 - taOut) });
  css(tagIn, { transform: `rotateX(${done ? (flip - 1) * 180 : flip * 180}deg) scale(${lerp(0.85, 1, clamp(ta.s, 0, 1.1)) * (done ? 1 + 0.12 * (1 - seg(t, T.a360 + 0.5, T.a360 + 0.9)) : 1)})`,
    fontSize: done ? "44px" : "36px", padding: done ? "20px 40px" : "16px 30px" });

  // CTA
  const k1 = pop(t, T.cta + 2.1, 0.45), k2 = pop(t, T.link, 0.45);
  show($("cta1"), k1.o, { dy: (1 - k1.o) * 40, sc: lerp(0.9, 1, k1.o), flex: true });
  show($("cta2"), k2.o, { dy: (1 - k2.o) * 40, sc: lerp(0.9, 1, k2.o), flex: true });
}

window.renderFrame = renderFrame;
renderFrame(0);
window.ready = true;
