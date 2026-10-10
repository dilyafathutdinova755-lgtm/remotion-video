// Real 3D layer: glass beakers with level-correct liquid (world clipping plane),
// pouring streams, salt crystals, the app logo as a thick glossy slab, and
// soft contact shadows. Everything is a pure function of time t.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { clamp, lerp, seg, ease, spring, track, rng, ramp } from "./lib.js";
import { makeChoreo } from "./choreo.js";

export const W = 1080;
export const H = 1920;

// ---------------------------------------------------------------- materials
function glassMaterial() {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
    transparent: true, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.75,
  });
  const u = { uBase: { value: 0.035 }, uEdge: { value: 0.7 }, uFade: { value: 1 } };
  m.userData.u = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.fragmentShader =
      "uniform float uBase; uniform float uEdge; uniform float uFade;\n" +
      sh.fragmentShader.replace(
        "#include <opaque_fragment>",
        `float fr = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
         fr = pow(fr, 2.4);
         float spec = clamp(dot(outgoingLight, vec3(0.3333)) - 0.8, 0.0, 1.0);
         float a = max(mix(uBase, uEdge, fr), spec * 1.6);
         gl_FragColor = vec4(outgoingLight + vec3(fr * 0.22), clamp(a, 0.0, 1.0) * uFade);`,
      );
  };
  return m;
}

function radialTexture(stops, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ticksTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const g = c.getContext("2d");
  g.clearRect(0, 0, 256, 512);
  g.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = 1; i <= 9; i++) {
    const y = 512 - i * 48;
    const long = i % 2 === 0;
    g.fillRect(150, y, long ? 90 : 55, 5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ------------------------------------------------------------------ vessel
const VR = 0.6, VH = 1.5, WALL = 0.035, BOT = 0.07;
const R_IN = VR - WALL - 0.006;

function makeVessel(scene, shadowTex) {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.position.y = -VH / 2;
  group.add(inner);

  const pts = [];
  const arc = (cx, cy, r, a0, a1, n) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a)));
    }
  };
  pts.push(new THREE.Vector2(0.0001, 0));
  arc(VR - 0.12, 0.12, 0.12, -Math.PI / 2, 0, 10);
  pts.push(new THREE.Vector2(VR, VH));
  arc(VR - WALL / 2, VH, WALL / 2, 0, Math.PI, 10);
  pts.push(new THREE.Vector2(VR - WALL, BOT + 0.09));
  arc(VR - WALL - 0.09, BOT + 0.09, 0.09, 0, -Math.PI / 2, 10);
  pts.push(new THREE.Vector2(0.0001, BOT));
  const glassMat = glassMaterial();
  const glass = new THREE.Mesh(new THREE.LatheGeometry(pts, 112), glassMat);
  glass.renderOrder = 3;
  inner.add(glass);

  const rimMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.55, depthWrite: false,
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(VR - WALL / 2, WALL * 0.62, 12, 112), rimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = VH;
  rim.renderOrder = 4;
  inner.add(rim);

  const tickMat = new THREE.MeshBasicMaterial({
    map: ticksTexture(), transparent: true, depthWrite: false, opacity: 0.75,
  });
  const ticks = new THREE.Mesh(
    new THREE.CylinderGeometry(VR + 0.004, VR + 0.004, VH * 0.82, 40, 1, true, -1.15, 0.75),
    tickMat,
  );
  ticks.position.y = BOT + VH * 0.41;
  ticks.renderOrder = 5;
  inner.add(ticks);

  // Liquid: inner wall volume clipped by a WORLD horizontal plane = level.
  const levelPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const bottomPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const liqMat = new THREE.MeshPhysicalMaterial({
    color: 0x4b7bff, roughness: 0.22, clearcoat: 0.35, clearcoatRoughness: 0.1, envMapIntensity: 0.45,
    transparent: true, opacity: 0.93, side: THREE.DoubleSide, clippingPlanes: [levelPlane],
    emissive: 0x000000, depthWrite: true,
  });
  const liqH = VH - BOT - 0.025;
  const liqGeo = new THREE.CylinderGeometry(R_IN, R_IN * 0.985, liqH, 80, 1, true);
  liqGeo.translate(0, BOT + liqH / 2, 0);
  const liquid = new THREE.Mesh(liqGeo, liqMat);
  liquid.renderOrder = 1;
  inner.add(liquid);
  const liqBottom = new THREE.Mesh(new THREE.CircleGeometry(R_IN * 0.985, 80), liqMat);
  liqBottom.rotation.x = Math.PI / 2;
  liqBottom.position.y = BOT + 0.003;
  liqBottom.renderOrder = 1;
  inner.add(liqBottom);

  const capMat = new THREE.MeshPhysicalMaterial({
    color: 0x9dbbff, roughness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.05,
    transparent: true, opacity: 0.96, clippingPlanes: [bottomPlane], envMapIntensity: 0.7,
  });
  const capPivot = new THREE.Group();
  capPivot.rotation.order = "ZYX";
  const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 96), capMat);
  cap.rotation.x = -Math.PI / 2;
  cap.renderOrder = 2;
  capPivot.add(cap);
  scene.add(capPivot);

  // Ghost "target" liquid for the result vessel (what we want to get).
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0x9a6cff, transparent: true, opacity: 0, depthWrite: false });
  const ghost = new THREE.Mesh(new THREE.CylinderGeometry(R_IN * 0.98, R_IN * 0.97, 1, 64, 1, false), ghostMat);
  ghost.renderOrder = 1;
  inner.add(ghost);

  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, color: 0x000000 });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 0;
  scene.add(shadow);

  scene.add(group);

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpD = new THREE.Vector3();
  const v = {
    group, liqMat, capMat, glassMat, rimMat, tickMat, ghostMat, ghost, shadowMat, shadow, capPivot, cap,
    levelPlane, bottomPlane,
    state: null,
    /** Local point (vessel space, origin = vessel center) → world. */
    local(x, y, z = 0, out = new THREE.Vector3()) {
      return group.localToWorld(out.set(x, y, z));
    },
    set(s) {
      this.state = s;
      const vis = s.opacity > 0.001;
      group.visible = vis;
      capPivot.visible = vis && s.fill > 0.004;
      shadow.visible = vis;
      group.position.set(...s.pos);
      group.rotation.set(s.rotX || 0, s.rotY || 0, s.tilt || 0);
      const sq = s.squash || 0;
      group.scale.set(s.scale * (1 + sq * 0.5), s.scale * (1 - sq), s.scale * (1 + sq * 0.5));
      group.updateMatrixWorld(true);

      glassMat.userData.u.uFade.value = s.opacity;
      rimMat.opacity = 0.55 * s.opacity;
      tickMat.opacity = 0.7 * s.opacity * (s.ticks ?? 1);
      liqMat.color.set(s.color);
      liqMat.emissive.set(s.color).multiplyScalar(0.28);
      capMat.color.set(s.color).lerp(new THREE.Color(0xffffff), 0.3);
      liqMat.opacity = 0.93 * s.opacity;
      capMat.opacity = 0.96 * s.opacity;

      // Level: point on the axis at fill height; when tilted, never above the low rim.
      const p0 = this.local(0, -VH / 2 + BOT, 0, tmpA);
      const top = this.local(0, VH / 2, 0, tmpB);
      const d = tmpD.copy(top).sub(p0).normalize();
      const axisLen = (VH - BOT) * s.scale;
      let level = p0.y + d.y * axisLen * clamp(s.fill, 0, 1) * 0.97;
      const lowRim = Math.min(this.local(VR - WALL, VH / 2, 0).y, this.local(-(VR - WALL), VH / 2, 0).y);
      level = Math.min(level, lowRim - 0.015 * s.scale);
      const slosh = s.slosh || 0;
      levelPlane.normal.set(Math.sin(slosh), -Math.cos(slosh), 0);
      const sAxis = (level - p0.y) / Math.max(1e-4, d.y);
      const c = p0.clone().addScaledVector(d, sAxis);
      levelPlane.constant = -levelPlane.normal.dot(c);
      bottomPlane.normal.copy(d);
      bottomPlane.constant = -d.dot(p0) - 0.002;

      const hd = new THREE.Vector3(d.x, 0, d.z);
      const cosPhi = Math.max(0.2, d.y);
      capPivot.position.copy(c);
      capPivot.rotation.set(0, hd.lengthSq() > 1e-8 ? Math.atan2(-hd.z, hd.x) : 0, slosh);
      cap.scale.set((R_IN * s.scale) / cosPhi, R_IN * s.scale, 1);

      ghost.visible = (s.ghost || 0) > 0.001;
      ghostMat.opacity = 0.22 * (s.ghost || 0) * s.opacity;
      const gh = (VH - BOT) * 0.6;
      ghost.scale.set(1, gh, 1);
      ghost.position.y = BOT + gh / 2;

      // Contact shadow on an invisible floor under the vessel.
      const floorY = s.floorY ?? (group.position.y - (VH / 2) * s.scale - 0.12);
      const lift = Math.max(0, group.position.y - (VH / 2) * s.scale - floorY);
      shadow.position.set(group.position.x, floorY, group.position.z);
      const spread = 1 + lift * 0.55;
      shadow.scale.set(VR * 3.1 * s.scale * spread, VR * 1.5 * s.scale * spread, 1);
      shadowMat.opacity = s.shadowA * s.opacity * clamp(1.15 - lift * 0.45, 0.1, 1);
      shadowMat.color.setRGB(s.shadowRGB[0] / 255, s.shadowRGB[1] / 255, s.shadowRGB[2] / 255);
    },
    /** World point at the rim on the given side (+1 right, −1 left). */
    spout(side) {
      return this.local(side * (VR + 0.02), VH / 2 + 0.01, 0);
    },
    surfaceCenter() {
      return capPivot.position.clone();
    },
  };
  return v;
}

// -------------------------------------------------------------------- logo
function superellipseShape(a, n, steps = 240) {
  const s = new THREE.Shape();
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const c = Math.cos(th), sn = Math.sin(th);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = a * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
}

function makeLogo(scene, tex, n, shadowTex) {
  const BEV = 0.07, DEPTH = 0.26, BT = 0.08;
  const aIn = 1 - BEV;
  const body = new THREE.ExtrudeGeometry(superellipseShape(aIn, n), {
    depth: DEPTH, bevelEnabled: true, bevelThickness: BT, bevelSize: BEV, bevelSegments: 6, curveSegments: 4,
  });
  body.center();
  const sideMat = new THREE.MeshPhysicalMaterial({
    color: 0x1767ff, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.1,
  });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(body, sideMat));
  const face = new THREE.ShapeGeometry(superellipseShape(aIn, n), 1);
  const uv = face.attributes.uv, pos = face.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) / aIn + 1) / 2, (pos.getY(i) / aIn + 1) / 2);
  const faceMat = new THREE.MeshPhysicalMaterial({
    map: tex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.5,
  });
  const zFace = DEPTH / 2 + BT + 0.004;
  const front = new THREE.Mesh(face, faceMat);
  front.position.z = zFace;
  g.add(front);
  const back = new THREE.Mesh(face, faceMat);
  back.rotation.y = Math.PI;
  back.position.z = -zFace;
  g.add(back);
  scene.add(g);

  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, color: 0x000000 });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  return { group: g, shadow, shadowMat };
}

// ------------------------------------------------------------------- world
export function createWorld({ canvas, logoTexture, logoN, story }) {
  const T = story.T;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.8;
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-4, 6, 7);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
  rimLight.position.set(5, 2, -4);
  scene.add(rimLight);

  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);

  const shadowTex = radialTexture([
    [0, "rgba(255,255,255,0.95)"], [0.35, "rgba(255,255,255,0.55)"], [0.7, "rgba(255,255,255,0.12)"], [1, "rgba(255,255,255,0)"],
  ]);
  // Shadow "map" is white→transparent; material color tints it.
  const v1 = makeVessel(scene, shadowTex);
  const v2 = makeVessel(scene, shadowTex);
  const v3 = makeVessel(scene, shadowTex);
  const logo = makeLogo(scene, logoTexture, logoN, shadowTex);

  // Pour streams
  const streamMats = [0, 1].map(() => new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.95, emissive: 0x000000,
  }));
  const streams = streamMats.map((m) => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), m);
    mesh.renderOrder = 2;
    scene.add(mesh);
    return mesh;
  });
  const rippleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  const ripples = [0, 1, 2, 3].map(() => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 64), rippleMat.clone());
    r.rotation.x = Math.PI / 2;
    r.renderOrder = 3;
    scene.add(r);
    return r;
  });

  // Salt crystals (instanced)
  const N_CRYST = 230;
  const crystGeo = new THREE.BoxGeometry(1, 1, 1);
  const crystMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0xffffff, emissiveIntensity: 0.12,
  });
  const cryst = new THREE.InstancedMesh(crystGeo, crystMat, N_CRYST);
  cryst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cryst.renderOrder = 6;
  cryst.frustumCulled = false;
  scene.add(cryst);
  const R = rng(7);
  const crystals = Array.from({ length: N_CRYST }, () => ({
    rx: R() * 6, ry: R() * 6, rz: R() * 6, spin: (R() - 0.5) * 8, size: 0.06 + R() * 0.05,
    a: R(), b: R(), c: R(), d: R(), e: R(),
  }));
  // Heap layout: cone pile
  function heapPos(i, n, radius, height) {
    const k = crystals[i];
    const h = Math.pow(k.a, 1.7);
    const r = radius * (1 - h) * Math.sqrt(k.b);
    const ang = k.c * Math.PI * 2;
    return new THREE.Vector3(Math.cos(ang) * r, h * height, Math.sin(ang) * r * 0.8);
  }

  // ------------------------------------------------------------ choreography
  const choreo = makeChoreo(T);
  let lastStates = null;

  // --------------------------------------------------------------- streams
  function updateStream(i, mesh, from, to, side, t0, t1, color, t) {
    const head = ramp(t, t0, t0 + 0.35, ease.outCubic);
    const tail = ramp(t, t1 - 0.35, t1, ease.inCubic);
    mesh.visible = head > 0.001 && tail < 0.999;
    if (!mesh.visible) return;
    const p0 = from.clone().add(new THREE.Vector3(side * 0.03, 0, 0));
    const c1 = p0.clone().add(new THREE.Vector3(side * 0.32, 0.12, 0));
    const c2 = to.clone().add(new THREE.Vector3(-side * 0.05, 0.8, 0));
    const curve = new THREE.CubicBezierCurve3(p0, c1, c2, to);
    const SEG = 64, RAD = 10;
    mesh.geometry.dispose();
    const wobble = 1 + 0.08 * Math.sin(t * 23 + i);
    mesh.geometry = new THREE.TubeGeometry(curve, SEG, 0.05 * wobble, RAD, false);
    const per = RAD * 6;
    const a = Math.floor(tail * SEG), b = Math.ceil(head * SEG);
    mesh.geometry.setDrawRange(a * per, Math.max(0, b - a) * per);
    mesh.material.color.set(color);
    mesh.material.emissive.set(color).multiplyScalar(0.18);
  }

  // ------------------------------------------------------------- crystals
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), sc = new THREE.Vector3();
  function setCrystal(i, pos, scale, rot) {
    e3.set(rot[0], rot[1], rot[2]);
    q.setFromEuler(e3);
    sc.setScalar(Math.max(0.00001, scale));
    m4.compose(pos, q, sc);
    cryst.setMatrixAt(i, m4);
  }

  function updateCrystals(t, vs) {
    let idx = 0;
    const hide = (n) => { for (let k = 0; k < n; k++) setCrystal(idx++, new THREE.Vector3(0, -50, 0), 0.00001, [0, 0, 0]); };
    // Falls into v1 / v2 and dissolve
    const fall = (vessel, n, t0, spread, seedOff) => {
      for (let k = 0; k < n; k++) {
        const c = crystals[idx];
        const start = t0 + c.a * spread;
        const lt = t - start;
        if (lt < 0 || lt > 1.5 || !vessel.group.visible) { hide(1); continue; }
        const surf = vessel.surfaceCenter();
        const x = surf.x + (c.b - 0.5) * 0.7 * vessel.state.scale;
        const z = surf.z + (c.c - 0.5) * 0.45 * vessel.state.scale;
        const yTop = surf.y + 1.5 + c.d * 0.6;
        const tf = 0.62;
        let y, s = c.size;
        if (lt < tf) { const k = lt / tf; y = lerp(yTop, surf.y, k * k); s *= clamp(lt / 0.12); }
        else { const k = (lt - tf) / 0.88; y = surf.y - k * 0.45 * vessel.state.scale; s *= 1 - ease.inCubic(k); }
        const sp = c.spin * lt;
        setCrystal(idx++, new THREE.Vector3(x, y, z), s, [c.rx + sp, c.ry + sp * 0.7, c.rz]);
      }
    };
    fall(v1, 26, T.salt + 0.05, 1.3);
    fall(v2, 40, T.v2b + 0.35, 1.25);

    // Heaps: crystals rise out of the liquid and pile up above the vessel
    // (world-space, so they don't tilt with a pouring vessel), step aside
    // during pouring, then merge over the mix on "соль никуда не исчезает".
    const heap = (vessel, which, n, t0, base, mergeOffset) => {
      const hc = new THREE.Vector3(...choreo.heapCenter(which, t, vs));
      const h3 = new THREE.Vector3(...choreo.heapCenter(3, t, vs));
      for (let k = 0; k < n; k++) {
        const c = crystals[idx];
        const start = t0 + c.e * 1.1;
        const lt = t - start;
        if (lt < 0 || t > T.h3 + 0.7) { hide(1); continue; }
        const dest = hc.clone().add(heapPos(base + k, n, 0.4, 0.4));
        const surf = vessel.surfaceCenter();
        const src = new THREE.Vector3(surf.x + (c.b - 0.5) * 0.6, surf.y - 0.25 - c.d * 0.35, surf.z + (c.c - 0.5) * 0.3);
        const k1 = ease.outCubic(clamp(lt / 0.9));
        let p = lt < 0.9 ? src.clone().lerp(dest, k1) : dest.clone();
        p.y += Math.sin(k1 * Math.PI) * 0.35;
        const s = c.size * 1.25 * clamp(lt / 0.25);
        const mk = ease.inOutCubic(seg(t, T.eq0 + 0.1 + c.a * 0.5, T.eq0 + 1.1 + c.a * 0.5));
        if (mk > 0) {
          const d3 = h3.clone().add(heapPos(mergeOffset + k, 48, 0.55, 0.5));
          p = p.clone().lerp(d3, mk);
          p.y += Math.sin(mk * Math.PI) * 0.8;
        }
        p.y -= ramp(t, T.h3 - 0.2, T.h3 + 0.6, ease.inCubic) * 5;
        p.y += Math.sin(t * 1.6 + c.d * 6) * 0.015;
        const sp = lt < 1 ? c.spin * lt : c.spin + Math.sin(t + c.e * 5) * 0.2;
        setCrystal(idx++, p, s, [c.rx + sp, c.ry + sp, c.rz]);
      }
    };
    heap(v1, 1, 24, T.s1a + 0.35, 0, 0);
    heap(v2, 2, 24, T.s2a + 0.35, 24, 24);

    // Answer burst
    for (let k = 0; k < 60; k++) {
      const c = crystals[idx];
      const lt = t - (T.a8 + 0.05 + c.e * 0.12);
      if (lt < 0 || lt > 2.4) { hide(1); continue; }
      const origin = v2.local(0, 0, 0);
      const ang = c.a * Math.PI * 2;
      const sp = 2.2 + c.b * 2.4;
      const p = origin.clone().add(new THREE.Vector3(Math.cos(ang) * sp * lt * 0.75, (0.9 + c.c * 1.3) * lt - 2.6 * lt * lt - 0.4, 0.5 + Math.abs(Math.sin(ang)) * sp * lt * 0.35));
      const s = c.size * 1.3 * (1 - ease.inCubic(clamp(lt / 2.4)));
      setCrystal(idx++, p, s, [c.rx + c.spin * lt, c.ry + c.spin * lt, c.rz]);
    }
    while (idx < N_CRYST) hide(1);
    cryst.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- logo
  const tmpV = new THREE.Vector3();
  function project(p) {
    tmpV.copy(p).project(camera);
    return { x: (tmpV.x + 1) * 0.5 * W, y: (1 - tmpV.y) * 0.5 * H, z: tmpV.z };
  }
  function screenToWorld(px, py, zPlane) {
    const ndc = new THREE.Vector3((px / W) * 2 - 1, 1 - (py / H) * 2, 0.5).unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    const k = (zPlane - camera.position.z) / dir.z;
    return camera.position.clone().addScaledVector(dir, k);
  }
  /** World scale so a slab of half-size 1 at `pos` spans `px` pixels. */
  function scaleForPx(pos, px) {
    const a = project(pos.clone().add(new THREE.Vector3(-1, 0, 0)));
    const b = project(pos.clone().add(new THREE.Vector3(1, 0, 0)));
    return px / Math.max(1, Math.abs(b.x - a.x));
  }

  function logoState(t, plaque) {
    // Intro: big spin (≈3 turns, eases out) then flies into the plaque slot.
    const slot = screenToWorld(plaque.slotX, plaque.slotY, 1.2);
    const center = screenToWorld(540, 930, 2.2);
    const bigS = scaleForPx(center, 560);
    const slotS = scaleForPx(slot, plaque.slotPx);
    const pop = spring(t, 0, { freq: 1.6, damping: 0.55 });
    const fly = ease.inOutCubic(seg(t, 1.05, 1.95));
    let pos = center.clone().lerp(slot, fly);
    pos.y += Math.sin(fly * Math.PI) * 0.25;
    let s = lerp(bigS * lerp(0.35, 1, clamp(pop, 0, 1.15)), slotS, fly);
    let rotY = ease.outCubic(seg(t, 0, 1.95)) * Math.PI * 6;
    let rotX = Math.sin(seg(t, 0, 1.95) * Math.PI) * 0.25;
    let rotZ = Math.sin(seg(t, 0, 1.95) * Math.PI) * -0.08;
    // idle in plaque
    if (t > 1.95) {
      rotY = Math.sin((t - 1.95) * 0.8) * 0.12 * ramp(t, 1.95, 3);
      rotX = 0;
      rotZ = 0;
    }
    // CTA: leaves the plaque, spins to the center and stays big
    const c0 = T.cta - 0.05;
    if (t > c0) {
      const k = ease.inOutCubic(seg(t, c0, c0 + 1.15));
      const ctaPos = screenToWorld(540, 1010, 2.2);
      pos = slot.clone().lerp(ctaPos, k);
      pos.y += Math.sin(k * Math.PI) * 0.35;
      s = lerp(slotS, scaleForPx(ctaPos, 520), k);
      rotY = ease.inOutCubic(seg(t, c0, c0 + 1.3)) * Math.PI * 4 + Math.sin(Math.max(0, t - c0 - 1.3) * 0.9) * 0.18;
      rotX = Math.sin(k * Math.PI) * 0.2 + Math.sin(t * 1.1) * 0.04 * ramp(t, c0 + 1.3, c0 + 2);
      pos.y += Math.sin(t * 1.5) * 0.04 * ramp(t, c0 + 1.3, c0 + 2);
    }
    return { pos, s, rotX, rotY, rotZ, shadow: t < 1.6 ? 1 - ramp(t, 1.0, 1.6) : t > c0 + 0.6 ? ramp(t, c0 + 0.6, c0 + 1.3) : 0 };
  }

  // ---------------------------------------------------------------- update
  function update(t, plaque) {
    const w = story.world(t);
    const pal = {
      shadow: w.a.shadow.map((x, i) => lerp(x, w.b.shadow[i], w.k)),
      shadowA: lerp(w.a.shadowA, w.b.shadowA, w.k),
    };
    // Camera: slow handheld drift + gentle push-ins per section
    const push = track(t, [[0, 0], [T.v3, 0], [T.v3 + 1, 0.15], [T.h1, 0.15], [T.s1a, 0.3], [T.h2, 0.2], [T.eq0 + 1, 0.4], [T.h3, 0], [T.ans, 0], [T.ans + 1, 0.6], [T.cta, 0.6], [T.cta + 1, 0]]);
    camera.position.set(Math.sin(t * 0.21) * 0.22, 0.9 + Math.sin(t * 0.29) * 0.1, 17 - push);
    camera.lookAt(Math.sin(t * 0.17) * 0.06, -0.38, 0);
    camera.updateMatrixWorld(true);

    const vs = choreo.states(t, pal);
    lastStates = vs;
    v1.set(vs.s1);
    v2.set(vs.s2);
    v3.set(vs.s3);

    // streams + ripples
    const target3 = () => {
      const c = v3.surfaceCenter();
      return c;
    };
    const tgt = target3();
    const { a0: flowA0, a1: flowA1, b0: flowB0, b1: flowB1 } = choreo.flow;
    updateStream(0, streams[0], v1.spout(1), tgt.clone().add(new THREE.Vector3(-0.18, 0, 0)), 1, flowA0, flowA1, vs.s1.color, t);
    updateStream(1, streams[1], v2.spout(-1), tgt.clone().add(new THREE.Vector3(0.18, 0, 0)), -1, flowB0, flowB1, vs.s2.color, t);
    ripples.forEach((r, i) => {
      const t0 = (i < 2 ? flowA0 : flowB0) + 0.3 + (i % 2) * 0.45;
      const t1 = i < 2 ? flowA1 : flowB1;
      const active = t > t0 && t < t1 + 0.4;
      r.visible = active && v3.group.visible;
      if (!r.visible) return;
      const ph = ((t - t0) % 0.9) / 0.9;
      r.position.copy(tgt).add(new THREE.Vector3(i < 2 ? -0.18 : 0.18, 0.012, 0));
      const rad = lerp(0.05, 0.42, ph) * vs.s3.scale;
      r.scale.set(rad, rad, 1);
      r.material.opacity = 0.55 * (1 - ph) * (1 - ramp(t, t1, t1 + 0.4));
    });

    updateCrystals(t, vs);

    const L = logoState(t, plaque);
    logo.group.position.copy(L.pos);
    logo.group.scale.setScalar(L.s);
    logo.group.rotation.set(L.rotX, L.rotY, L.rotZ);
    logo.shadow.visible = L.shadow > 0.01;
    logo.shadow.position.set(L.pos.x, L.pos.y - 1.35 * L.s - 0.35, L.pos.z);
    logo.shadow.scale.set(2.8 * L.s, 1.2 * L.s, 1);
    logo.shadowMat.opacity = L.shadow * pal.shadowA * 0.9;
    logo.shadowMat.color.setRGB(pal.shadow[0] / 255, pal.shadow[1] / 255, pal.shadow[2] / 255);

    return { v1, v2, v3, vs };
  }

  function render() {
    renderer.render(scene, camera);
  }

  return {
    update, render, project, camera, v1, v2, v3, VH, VR,
    heapSticker: (i, t) => new THREE.Vector3(...choreo.heapSticker(i, t, lastStates)),
  };
}
