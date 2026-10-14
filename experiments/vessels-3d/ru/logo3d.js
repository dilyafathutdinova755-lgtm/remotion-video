// Real 3D app logo: thick glossy slab (extruded superellipse with bevel), same look and
// camera as the math video's logo. Rendered in its own WebGL canvas; scene.js drives it.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export const W = 1080, H = 1920;

function superellipseShape(a, n, steps = 240) {
  const s = new THREE.Shape();
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const c = Math.cos(th), sn = Math.sin(th);
    const x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / n);
    const y = a * Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n);
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  return s;
}

function radialTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  [[0, "rgba(255,255,255,0.95)"], [0.35, "rgba(255,255,255,0.55)"], [0.7, "rgba(255,255,255,0.12)"], [1, "rgba(255,255,255,0)"]].forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createLogo3d(logoTexture, n = 4.2, S = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = W * S; canvas.height = H * S;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W * S, H * S, false); renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 0.8;
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(-4, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(5, 2, -4); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(28, W / H, 0.1, 100);
  camera.position.set(0, 0.9, 17); camera.lookAt(0, -0.38, 0); camera.updateMatrixWorld(true);

  const BEV = 0.07, DEPTH = 0.26, BT = 0.08, aIn = 1 - BEV;
  const body = new THREE.ExtrudeGeometry(superellipseShape(aIn, n), { depth: DEPTH, bevelEnabled: true, bevelThickness: BT, bevelSize: BEV, bevelSegments: 6, curveSegments: 4 });
  body.center();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(body, new THREE.MeshPhysicalMaterial({ color: 0x1767ff, roughness: 0.26, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1.1 })));
  const face = new THREE.ShapeGeometry(superellipseShape(aIn, n), 1);
  const uv = face.attributes.uv, pos = face.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) / aIn + 1) / 2, (pos.getY(i) / aIn + 1) / 2);
  const faceMat = new THREE.MeshPhysicalMaterial({ map: logoTexture, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 0.5 });
  const zFace = DEPTH / 2 + BT + 0.004;
  const front = new THREE.Mesh(face, faceMat); front.position.z = zFace; g.add(front);
  const back = new THREE.Mesh(face, faceMat); back.rotation.y = Math.PI; back.position.z = -zFace; g.add(back);
  scene.add(g);
  const shadowMat = new THREE.MeshBasicMaterial({ map: radialTexture(), transparent: true, depthWrite: false, color: new THREE.Color(90 / 255, 20 / 255, 50 / 255) });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

  const tmp = new THREE.Vector3();
  const project = (p) => { tmp.copy(p).project(camera); return { x: (tmp.x + 1) * 0.5 * W, y: (1 - tmp.y) * 0.5 * H }; };
  const screenToWorld = (px, py, zPlane) => {
    const ndc = new THREE.Vector3((px / W) * 2 - 1, 1 - (py / H) * 2, 0.5).unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    return camera.position.clone().addScaledVector(dir, (zPlane - camera.position.z) / dir.z);
  };
  const scaleForPx = (p, px) => {
    const a = project(p.clone().add(new THREE.Vector3(-1, 0, 0))), b = project(p.clone().add(new THREE.Vector3(1, 0, 0)));
    return px / Math.max(1, Math.abs(b.x - a.x));
  };

  /** st: { cx, cy, span (px), rotX, rotY, rotZ, shadow (0..1) } */
  function render(st) {
    const p = screenToWorld(st.cx, st.cy, 2.2);
    const s = scaleForPx(p, st.span);
    g.position.copy(p); g.scale.setScalar(s); g.rotation.set(st.rotX, st.rotY, st.rotZ);
    shadow.visible = st.shadow > 0.01;
    shadow.position.set(p.x, p.y - 1.35 * s - 0.35, p.z);
    shadow.scale.set(2.8 * s, 1.2 * s, 1);
    shadowMat.opacity = st.shadow * 0.5;
    renderer.render(scene, camera);
  }
  return { canvas, render };
}
