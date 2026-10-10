import * as THREE from "three";
import { makeStory } from "./story.js";
import { createWorld, W, H } from "./world3d.js";
import { createOverlay } from "./overlay.js";

const base = new URL("..", import.meta.url);
const tl = await (await fetch(new URL("timeline.json", base))).json();
const shape = await (await fetch(new URL("assets/logo-shape.json", base))).json();
const story = makeStory(tl);
const T = story.T;

await Promise.all([500, 600, 700, 800].map((w) => document.fonts.load(`${w} 40px Inter`, "АаЯя08x")));
await document.fonts.ready;

const logoTexture = await new THREE.TextureLoader().loadAsync(new URL("assets/logo.png", base).href);
logoTexture.colorSpace = THREE.SRGBColorSpace;
logoTexture.anisotropy = 8;

const stage = document.getElementById("stage");
const display = document.getElementById("gl");
const ctx = display.getContext("2d");
const glCanvas = document.createElement("canvas");
glCanvas.width = W;
glCanvas.height = H;

const overlay = createOverlay(stage, story);
const world = createWorld({ canvas: glCanvas, logoTexture, logoN: shape.superellipseN, story });
overlay.init(world);

const FPS = 60;
/** Fast spins get real motion blur: average sub-frames across the shutter. */
function blurSamples(t) {
  if (t < 2.0) return 9;
  if (t > T.cta - 0.1 && t < T.cta + 1.35) return 9;
  return 1;
}

window.renderFrame = (t) => {
  const n = blurSamples(t);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, W, H);
  if (n > 1) {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1 / n;
    const shutter = 1 / FPS;
    for (let i = 0; i < n; i++) {
      world.update(Math.max(0, t + shutter * (i / (n - 1) - 0.5)), overlay.plaque);
      world.render();
      ctx.drawImage(glCanvas, 0, 0);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }
  world.update(t, overlay.plaque);
  if (n === 1) {
    world.render();
    ctx.drawImage(glCanvas, 0, 0);
  }
  overlay.update(t, display);
  return true;
};

window.DURATION = T.total;
window.FPS = FPS;
window.ready = true;
