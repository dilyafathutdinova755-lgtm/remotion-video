// Bakes the three history heroes into fixed PNG layers once (run again only if source.html changes):
//   node hist/characters/bake_trio.mjs
// Layers per hero X (P = Пётр I, E = Екатерина II, A = Александр I), all the same canvas size
// (figure box + PAD on every side), drawn in this order by the scene:
//   X_oBody (white sticker outline + soft shadow of the body), X_oHead (same for the head, moves with it),
//   P_headB (Peter's back hair, moves with the head), X_body, X_head (head without eyes).
// The eyes stay live SVG (blink + gaze); their markup is written to layers.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "../../node_modules/playwright/index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAD = 90;
const OUTLINE = "drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #fff) drop-shadow(0 -6px 0 #fff) drop-shadow(0 24px 30px rgba(20,0,10,0.45))";
const EXE = process.env.CHROME || "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1400, height: 1400 }, deviceScaleFactor: 1 });
await page.goto("file://" + path.join(HERE, "source.html"));

const meta = {};
for (const fid of ["figP", "figE", "figA"]) {
  const X = fid.slice(3);
  const info = await page.evaluate(({ fid, X, PAD, OUTLINE }) => {
    const tpl = document.getElementById(fid);
    const st = tpl.dataset.style;
    const w = parseFloat(/width:(\d+)px/.exec(st)[1]), h = parseFloat(/height:(\d+)px/.exec(st)[1]);
    const left = parseFloat(/left:(\d+)/.exec(st)[1]), top = parseFloat(/top:(\d+)/.exec(st)[1]);
    const src = tpl.content.querySelector("svg");
    const headIds = [X + "_headB", X + "_head"];
    const eyes = src.querySelector("#" + X + "_eyes").outerHTML;
    window.__layer = (name) => {
      document.getElementById("box")?.remove();
      const box = document.createElement("div");
      box.id = "box"; box.className = "box";
      box.style.cssText = `width:${w + 2 * PAD}px;height:${h + 2 * PAD}px`;
      const inner = document.createElement("div");
      inner.style.cssText = `position:absolute;left:${PAD}px;top:${PAD}px;width:${w}px;height:${h}px`;
      const svg = src.cloneNode(true);
      const isHead = (el) => headIds.includes(el.id);
      const keep = { oBody: (el) => !isHead(el), body: (el) => !isHead(el), oHead: isHead, head: (el) => el.id === X + "_head", headB: (el) => el.id === X + "_headB" }[name];
      [...svg.children].forEach((el) => { if (!keep(el)) el.remove(); });
      if (name === "head") svg.querySelector("#" + X + "_eyes")?.remove();
      if (name.startsWith("o")) inner.style.filter = OUTLINE;
      inner.appendChild(svg); box.appendChild(inner); document.body.appendChild(box);
      return svg.children.length;
    };
    return { w, h, left, top, eyes, hasHeadB: !!src.querySelector("#" + X + "_headB") };
  }, { fid, X, PAD, OUTLINE });
  const layers = ["oBody", "oHead", "body", "head"].concat(info.hasHeadB ? ["headB"] : []);
  for (const L of layers) {
    const n = await page.evaluate((L) => window.__layer(L), L);
    if (!n) throw new Error(`${X}_${L} is empty`);
    await page.locator("#box").screenshot({ path: path.join(HERE, `${X}_${L}.png`), omitBackground: true });
    console.log("baked", `${X}_${L}.png`);
  }
  meta[X] = { ...info, layers, pad: PAD, scale: info.w / 400 };
}
fs.writeFileSync(path.join(HERE, "layers.json"), JSON.stringify(meta, null, 1));
await browser.close();
