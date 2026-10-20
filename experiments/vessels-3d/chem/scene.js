// Chemistry video, variant A «Лаборатория», colour «Глубина»: NaOH 20 g + excess HCl → mass of NaCl.
// Deterministic: window.renderFrame(t). Three.js glass (the math video's beaker), a porcelain dish with
// cubic salt crystals, a pouring stream; DOM overlay for tags, notes, the equation and the pause card.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { makeVessel, radialTexture } from "../src/world3d.js";
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
const mixHex = (a, b, k) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();

const tl = await (await fetch("/experiments/vessels-3d/chem/timeline.json")).json();
const T = tl.marks;
const S = Object.fromEntries(tl.sentences.map((s) => [s.id, s]));
window.DURATION = tl.total;
await Promise.all(['700 40px "Geologica"', '800 40px "Geologica"', '500 40px "Golos"', '600 40px "Golos"', '700 40px "Golos"', '600 40px "JB"'].map((f) => document.fonts.load(f, "АаЯя0")));

// ---------------------------------------------------------------- key times (mirrored in make_mix_chem.py)
const P0 = S.pause.start;
const T_COND = P0 + 0.4, T_TIMER = P0 + 0.95, T_C0 = P0 + 1.3, T_EX = T_C0 + 4;
const LIQ = "#3FA9F5", ACID = "#9BE0FF";

// ---------------------------------------------------------------- 3D world
const renderer = new THREE.WebGLRenderer({ canvas: $("world"), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.9;
scene.add(new THREE.AmbientLight(0xffffff, 0.15));
const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(-5, 7, 9); scene.add(key);
const rim = new THREE.DirectionalLight(0xbfe6ff, 1.0); rim.position.set(6, 2, -5); scene.add(rim);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200);
const CAMZ = 9.6 / Math.tan((15 * Math.PI) / 180);
camera.position.set(0, 0, CAMZ); camera.lookAt(0, 0, 0);
const wx = (x) => (x - 540) / 100, wy = (y) => -(y - 960) / 100;

const shadowTex = radialTexture([[0, "rgba(255,255,255,0.95)"], [0.35, "rgba(255,255,255,0.55)"], [0.7, "rgba(255,255,255,0.12)"], [1, "rgba(255,255,255,0)"]]);
const vA = makeVessel(scene, shadowTex);   // NaOH
const vB = makeVessel(scene, shadowTex);   // HCl
// clearer glass on the dark background: weaker white fresnel than in the light math scene
for (const v of [vA, vB]) { v.glassMat.userData.u.uEdge.value = 0.32; v.glassMat.userData.u.uBase.value = 0.02; }
function vstate(x, y, scale, fill, color, tilt = 0, opacity = 1) {
  return { pos: [wx(x), wy(y), 0], scale, fill, color, tilt, opacity, rotX: 0.12, rotY: 0, ticks: 1, slosh: 0, ghost: 0, shadowA: 0.55, shadowRGB: [0, 6, 20] };
}

// evaporating dish + cubic NaCl crystals
const DR = 2.6;
const dish = new THREE.Group(); scene.add(dish);
const prof = [];
for (let i = 0; i <= 24; i++) { const a = (i / 24) * (Math.PI / 2); prof.push(new THREE.Vector2(Math.max(0.0001, DR * Math.sin(a)), DR * 0.42 * (1 - Math.cos(a)))); }
const dishMat = new THREE.MeshPhysicalMaterial({ color: "#D9ECFF", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true, side: THREE.DoubleSide, envMapIntensity: 1.0 });
dish.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 96), dishMat));
const rimT = new THREE.Mesh(new THREE.TorusGeometry(DR, 0.05, 12, 96), dishMat); rimT.rotation.x = Math.PI / 2; rimT.position.y = DR * 0.42; dish.add(rimT);
const pondMat = new THREE.MeshPhysicalMaterial({ color: LIQ, roughness: 0.15, clearcoat: 0.6, transparent: true, opacity: 0.9, emissive: "#0b3a66", emissiveIntensity: 0.4 });
const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 64), pondMat); pond.rotation.x = -Math.PI / 2; dish.add(pond);
const crysMat = new THREE.MeshPhysicalMaterial({ color: "#F4FAFF", roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, emissive: "#6fb8ff", emissiveIntensity: 0.0 });
const CR = [];
for (let i = 0; i < 16; i++) {
  const a = i * 2.399, r = 0.35 + 1.25 * Math.sqrt((i + 0.5) / 16);
  CR.push({ x: Math.cos(a) * r, z: Math.sin(a) * r * 0.75, s: 0.3 + 0.14 * ((i * 7) % 5) / 4, ry: a, d: i * 0.05 });
}
const crys = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), crysMat, CR.length); dish.add(crys);
const dishShadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, color: new THREE.Color(0, 0.02, 0.08) }));
dishShadow.rotation.x = -Math.PI / 2; scene.add(dishShadow);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), SC = new THREE.Vector3(), E = new THREE.Euler();
const radAt = (y) => DR * Math.sin(Math.acos(clamp(1 - y / (DR * 0.42), -1, 1)));
function setDish(x, yBottom, sc, op, pondK, crysK, sparkle) {
  dish.visible = op > 0.01; dishShadow.visible = dish.visible;
  dish.position.set(wx(x), wy(yBottom), 0); dish.scale.setScalar(sc); dish.rotation.set(0.55, 0, 0);
  dishMat.opacity = 0.92 * op;
  const ph = 0.06 + 0.32 * pondK;
  pond.visible = pondK > 0.01; pond.position.y = ph; pond.scale.setScalar(radAt(ph) * 0.97); pondMat.opacity = 0.9 * op;
  CR.forEach((c, i) => {
    const k = clamp(eBack(clamp(crysK * 1.6 - c.d * 3)), 0, 1.15);
    const s = c.s * k * (1 + 0.12 * sparkle * Math.sin(i * 1.7 + sparkle * 9));
    if (s <= 0.0005) { M4.makeScale(0, 0, 0); crys.setMatrixAt(i, M4); return; }
    V.set(c.x, 0.06 + s * 0.5, c.z); Q.setFromEuler(E.set(0.2, c.ry, 0.1)); SC.set(s, s, s);
    M4.compose(V, Q, SC); crys.setMatrixAt(i, M4);
  });
  crys.instanceMatrix.needsUpdate = true;
  crysMat.opacity = op; crysMat.emissiveIntensity = 0.5 * sparkle;
  dishShadow.position.set(wx(x), wy(yBottom) - 0.1 * sc, 0); dishShadow.scale.set(DR * 2.6 * sc, DR * 1.2 * sc, 1);
  dishShadow.material.opacity = 0.5 * op;
}

// pouring stream
const streamMat = new THREE.MeshPhysicalMaterial({ color: ACID, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92, emissive: "#0a3050", emissiveIntensity: 0.4 });
const stream = new THREE.Mesh(new THREE.BufferGeometry(), streamMat); scene.add(stream);
function setStream(p0, p1, k, color, r = 0.07) {
  stream.visible = k > 0.01;
  if (!stream.visible) return;
  const ctrl = new THREE.Vector3(lerp(p0.x, p1.x, 0.45), p0.y + 0.05, 0.05);
  const curve = new THREE.QuadraticBezierCurve3(p0, ctrl, p1);
  stream.geometry.dispose();
  stream.geometry = new THREE.TubeGeometry(curve, 40, r * clamp(k * 2), 10, false);
  streamMat.color.set(color);
}

function updateWorld(t) {
  const exitCond = eIO(seg(t, P0, P0 + 0.6));
  const drop = 380 * exitCond;
  let A = null, B = null, pour = 0, pourFrom = null, pourTo = null, pourCol = ACID;
  let dish_ = null;

  if (t < P0 + 0.7) {
    // condition: NaOH beaker fills, acid pours in, then the solution goes into the dish and evaporates
    const up = eBack(seg(t, T.naoh - 0.2, T.naoh + 0.5));
    let ax = 540, ay = lerp(2300, 1030, clamp(up, 0, 1.05)), as = 2.5, tilt = 0;
    let fillA = 0.55 * eOut(seg(t, T.naoh + 0.15, T.naoh + 1.2));
    const pourB = seg(t, T.hcl + 0.9, T.salt - 0.15);
    fillA = lerp(fillA, 0.82, pourB);
    let colA = mixHex(LIQ, "#7FD3FF", pourB);
    const toDish = eIO(seg(t, T.salt, T.salt + 0.7));
    ax = lerp(ax, 420, toDish); ay = lerp(ay, 640, toDish); as = lerp(as, 1.7, toDish);
    tilt = -1.75 * eIO(seg(t, T.salt + 0.4, T.salt + 0.9));
    const pourA = seg(t, T.salt + 0.7, T.salt + 1.45);
    fillA = lerp(fillA, 0.06, pourA);
    const aOp = (1 - seg(t, T.salt + 1.45, T.salt + 1.8)) * (1 - exitCond);
    A = vstate(ax, ay + drop, as, fillA, colA, tilt, aOp);

    const bIn = eOut(seg(t, T.hcl - 0.1, T.hcl + 0.6)), bOut = eIO(seg(t, T.salt - 0.2, T.salt + 0.4));
    const bx = lerp(lerp(1300, 800, bIn), 1250, bOut), by = lerp(lerp(260, 640, bIn), 300, bOut);
    const btilt = 1.2 * eIO(seg(t, T.hcl + 0.4, T.hcl + 0.9));
    const fillB = lerp(0.65, 0.14, pourB);
    B = vstate(bx, by, 1.8, fillB, ACID, btilt, bIn * (1 - bOut));

    if (pourB > 0 && pourB < 1) { pour = Math.sin(pourB * Math.PI) * 1.2; pourFrom = "B"; pourCol = ACID; }
    if (pourA > 0 && pourA < 1) { pour = Math.sin(pourA * Math.PI) * 1.2; pourFrom = "A"; pourCol = colA; }

    const dIn = eBack(seg(t, T.salt + 0.2, T.salt + 0.7));
    const pondK = clamp(pourA * 1.1) * (1 - seg(t, T.salt + 1.4, T.salt + 2.0));
    const crK = seg(t, T.salt + 1.55, T.salt + 2.1);
    dish_ = { x: 540, y: 1190 + drop, sc: clamp(dIn, 0, 1.1), op: (dIn > 0 ? 1 : 0) * (1 - exitCond), pond: pondK, crys: crK, sp: 0 };
  } else if (t > T.h1 - 0.3 && t < T.h3 + 0.6) {
    // steps 1–2: the NaOH beaker returns; in step 2 it moves left and the dish appears on the right
    const up = eBack(seg(t, T.h1 + 0.05, T.h1 + 0.7));
    const mv = eIO(seg(t, T.h2, T.h2 + 0.8));
    const out = eIO(seg(t, T.h3 - 0.2, T.h3 + 0.4));
    const ax = lerp(540, 270, mv), ay = lerp(lerp(2300, 910, clamp(up, 0, 1.05)), 1080, mv) + 600 * out;
    A = vstate(ax, ay, lerp(2.5, 1.9, mv), 0.55, LIQ, 0, 1 - out);
    const dIn = eBack(seg(t, T.h2 + 0.3, T.h2 + 0.9));
    if (t > T.h2) {
      const toC = eIO(seg(t, T.h3, T.h3 + 0.8));
      dish_ = { x: lerp(780, 540, toC), y: lerp(1210, 1390, toC), sc: lerp(0.62 * clamp(dIn, 0, 1.1), 1, toC), op: 1, pond: 0, crys: 1, sp: 0 };
    }
  } else if (t >= T.h3 + 0.6) {
    const toC = 1, up = eIO(seg(t, T.rnd, T.rnd + 0.7));
    const out = eIO(seg(t, T.cta - 0.5, T.cta - 0.1));
    const sp = Math.max(0, 1 - Math.abs(t - (T.ans + 0.3)) / 0.6);
    dish_ = { x: 540, y: lerp(1390, 1210, up) + 500 * out, sc: toC, op: 1 - out, pond: 0, crys: 1, sp };
  }

  if (A) vA.set(A); else vA.set(vstate(540, 3000, 1, 0, LIQ, 0, 0));
  if (B) vB.set(B); else vB.set(vstate(540, 3000, 1, 0, ACID, 0, 0));
  if (dish_) setDish(dish_.x, dish_.y, dish_.sc, dish_.op, dish_.pond, dish_.crys, dish_.sp); else setDish(0, 3000, 1, 0, 0, 0, 0);
  if (pourFrom) {
    const src = pourFrom === "B" ? vB.spout(-1) : vA.spout(1);
    const dst = pourFrom === "B" ? vA.surfaceCenter() : new THREE.Vector3(wx(540), wy(1150), 0.3);
    setStream(src, dst, pour, pourCol);
  } else setStream(null, null, 0);
  renderer.render(scene, camera);
}

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
function headline(el, o) { css(el, { display: o <= 0.001 ? "none" : "", opacity: o, transform: `translateY(${(1 - o) * 26}px)`, filter: `blur(${(1 - o) * 6}px)` }); }
const bctx = $("bgc").getContext("2d");
function drawBg(t) {
  bctx.clearRect(0, 0, W, H);
  const gy = t < P0 ? 980 : t < T.h3 ? 1000 : 1150;
  const cx = 540 + Math.sin(t * 0.3) * 90, cy = gy + Math.cos(t * 0.4) * 70, go = 0.8 + 0.2 * Math.sin(t * 0.8);
  const g = bctx.createRadialGradient(cx, cy, 0, cx, cy, 460);
  g.addColorStop(0, `rgba(79,195,255,${(0.25 * go).toFixed(4)})`); g.addColorStop(1, "rgba(79,195,255,0)");
  bctx.fillStyle = g; bctx.fillRect(cx - 460, cy - 460, 920, 920);
}
function setTag(elIn, html, on) { if (elIn.innerHTML !== html) elIn.innerHTML = html; elIn.classList.toggle("on", !!on); }

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
  dots.forEach((d, i) => css(d, { width: i === st ? "46px" : "14px", background: i === st ? "#4FC3FF" : "rgba(255,255,255,0.24)" }));

  updateWorld(t);

  // ---- condition tags follow the beakers
  const exitCond = eIO(seg(t, P0, P0 + 0.6)), drop = 380 * exitCond;
  {
    const up = clamp(eBack(seg(t, T.naoh - 0.2, T.naoh + 0.5)), 0, 1.05), toDish = eIO(seg(t, T.salt, T.salt + 0.7));
    const ax = lerp(540, 420, toDish), ay = lerp(lerp(2300, 1030, up), 640, toDish);
    const p = pop(t, T.naoh + 0.7, 0.4), dim = lerp(1, 0.55, seg(t, T.hcl + 0.3, T.hcl + 0.6)), out = seg(t, T.salt + 0.1, T.salt + 0.4);
    const o = p.o * dim * (1 - out);
    css($("tNaoh"), { display: o > 0 ? "" : "none", opacity: o, left: ax - 130 + "px", top: ay - 300 + "px", transform: `scale(${lerp(0.8, 1, clamp(p.s, 0, 1.1))})` });
    const bIn = eOut(seg(t, T.hcl - 0.1, T.hcl + 0.6)), bOut = eIO(seg(t, T.salt - 0.2, T.salt + 0.4));
    const bx = lerp(lerp(1300, 800, bIn), 1250, bOut), by = lerp(lerp(260, 640, bIn), 300, bOut);
    const pb = pop(t, T.hcl + 0.4, 0.4), ob = pb.o * (1 - bOut);
    css($("tHcl"), { display: ob > 0 ? "" : "none", opacity: ob, left: bx - 330 + "px", top: by - 250 + "px", transform: `scale(${lerp(0.8, 1, clamp(pb.s, 0, 1.1))})` });
  }
  // steam over the dish while the water evaporates
  ["st0", "st1", "st2"].forEach((id, i) => {
    const k = fadeIO(t, T.salt + 1.35, T.salt + 1.6, P0 - 0.5, P0);
    const ph = ((t * 0.6 + i * 0.33) % 1);
    css($(id), { display: k > 0 ? "" : "none", opacity: k * Math.sin(ph * Math.PI) * 0.9, left: 470 + (i - 1) * 90 + Math.sin(t * 2 + i) * 20 + "px", top: 1080 - ph * 260 + "px", transform: `scale(${0.7 + ph * 0.9})` });
  });

  // ---- the salt tag: condition («? г»), step 3, then the answer flips in
  {
    const condK = fadeIO(t, T.salt + 1.75, T.salt + 2.05, P0, P0 + 0.4);
    const s3 = fadeIO(t, T.h3 + 0.6, T.h3 + 1.0, T.cta - 0.5, T.cta - 0.1);
    const o = Math.max(condK, s3);
    const top = t < T.h1 ? 1310 + drop : lerp(1460, 1300, eIO(seg(t, T.rnd, T.rnd + 0.7)));
    const ans = t >= T.ans + 0.15;
    const flip = seg(t, T.ans - 0.1, T.ans + 0.4), sx = Math.abs(Math.cos(flip * Math.PI));
    const pulse = ans ? 1 + 0.15 * Math.max(0, 1 - (t - T.ans - 0.15) / 0.5) : 1;
    setTag($("tSaltIn"), ans ? "NaCl · <b>29,3 г</b>" : "NaCl · <b>? г</b>", ans);
    css($("tSaltIn"), { fontSize: ans ? "48px" : "34px", padding: ans ? "20px 42px" : "14px 28px", transform: `scaleX(${flip > 0 && flip < 1 ? sx : 1}) scale(${pulse})` });
    css($("tSalt"), { display: o > 0 ? "flex" : "none", opacity: o, top: top + "px" });
  }

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

  // ---- step 1: moles
  const s1Out = T.h2 - 0.2;
  {
    const molNow = t >= T.mol + 0.15;
    setTag($("t1tagIn"), molNow ? "NaOH · 0,5 моль" : "NaOH · 20 г", molNow);
    const f = seg(t, T.mol - 0.1, T.mol + 0.4), sx = f > 0 && f < 1 ? Math.abs(Math.cos(f * Math.PI)) : 1;
    $("t1tagIn").style.transform = `scaleX(${sx})`;
    popShow($("t1tag"), t, T.h1 + 0.45, s1Out, { flex: true });
  }
  popShow($("nM1"), t, T.mm + 0.1, s1Out, { flex: true });
  popShow($("b20"), t, T.div, s1Out);
  popShow($("b05"), t, T.mol, s1Out);

  // ---- step 2: equation tiles, coefficients, the 0,5 mol tag travels to the salt
  const s2Out = T.h3 - 0.2;
  const tiles = ["e0", "e1", "e2", "e3", "e4", "e5", "e6"];
  const eqIn = seg(t, T.eq - 0.1, T.eq + 0.2) * (1 - seg(t, s2Out, s2Out + 0.3));
  css($("eq"), { display: eqIn > 0 ? "flex" : "none", opacity: eqIn });
  const tileT = [0, 0.55, 0.75, 1.5, 1.75, 2.6, 2.8];
  tiles.forEach((id, i) => { const p = pop(t, T.eq + tileT[i], 0.35); css($(id), { opacity: p.o, transform: `translateY(${(1 - p.o) * 30}px) scale(${lerp(0.6, 1, clamp(p.s, 0, 1.1))})` }); });
  if (eqIn > 0) {
    const r0 = $("e0").getBoundingClientRect(), r4 = $("e4").getBoundingClientRect();
    css($("k1"), { left: r0.left + r0.width / 2 - 12 + "px", top: r0.bottom + 16 + "px" });
    css($("k2"), { left: r4.left + r4.width / 2 - 12 + "px", top: r4.bottom + 16 + "px" });
  }
  popShow($("k1"), t, T.r11, s2Out);
  popShow($("k2"), t, T.r11 + 0.25, s2Out);
  const ak = eIO(seg(t, T.r11 + 0.3, T.r11 + 0.8)), aOut = seg(t, s2Out, s2Out + 0.3);
  css($("arrow"), { display: ak > 0 && aOut < 1 ? "" : "none", opacity: 1 - aOut, clipPath: `inset(0 ${(1 - ak) * 100}% 0 0)` });
  popShow($("mA"), t, T.r11 + 0.2, s2Out, { dx: 160, dy: 1290 });
  const fly = eIO(seg(t, T.same, T.same + 0.8)), pB = pop(t, T.same, 0.3), bOutK = seg(t, s2Out, s2Out + 0.3);
  css($("mB"), { display: pB.o > 0 && bOutK < 1 ? "" : "none", opacity: pB.o * (1 - bOutK), left: lerp(160, 670, fly) + "px", top: 1290 - Math.sin(fly * Math.PI) * 120 + "px", transform: `scale(${1 + 0.1 * Math.sin(fly * Math.PI)})` });
  popShow($("n11"), t, T.same + 0.7, s2Out, { flex: true });

  // ---- step 3: mass, rounding
  popShow($("nM2"), t, T.mm2 + 0.1, T.rnd - 0.2, { flex: true });
  popShow($("bMul"), t, T.mul, T.rnd - 0.2);
  popShow($("bRes"), t, T.res, T.rnd - 0.2);
  popShow($("nRnd"), t, T.rnd + 0.1, T.cta - 0.5, { flex: true });

  // ---- CTA
  const k1 = pop(t, T.cta + 2.1, 0.45), k2 = pop(t, T.link, 0.45);
  show($("cta1"), k1.o, { dy: (1 - k1.o) * 40, sc: lerp(0.9, 1, k1.o), flex: true });
  show($("cta2"), k2.o, { dy: (1 - k2.o) * 40, sc: lerp(0.9, 1, k2.o), flex: true });
}

window.renderFrame = renderFrame;
renderFrame(0);
window.ready = true;
