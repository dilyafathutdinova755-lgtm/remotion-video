// Story timing (from measured voice marks) + color worlds per section.
import { ease, seg } from "./lib.js";

// One main color for the subject (the app's blue/indigo). Stages are marked by
// light, a small hue shift and camera motion — never by switching color worlds.
const COMMON = { text: "#121528", sub: "#6A6F8E", accent: "#5653F0", shadow: [38, 40, 110], shadowA: 0.42, dark: 0 };
export const PALETTES = {
  lavender: { ...COMMON, top: "#F5F4FF", bottom: "#E6E9FB", glows: ["#C3CEFF", "#EBC7F6", "#BCE2FF"] },
  sky: { ...COMMON, top: "#F2F5FF", bottom: "#E0E8FC", glows: ["#B8CDFF", "#D5CCFA", "#B5E0FF"] },
  indigo: { ...COMMON, top: "#F4F3FF", bottom: "#E4E3FC", glows: ["#C0C2FF", "#E0C6F8", "#B2D4FF"] },
  peri: { ...COMMON, top: "#F0F1FF", bottom: "#DDE0FB", glows: ["#AEB8FF", "#CBBCFF", "#A6C8FF"] },
  bright: { ...COMMON, top: "#F4F8FF", bottom: "#E3EEFF", glows: ["#BFD8FF", "#D3C9FF", "#B9EAFF"] },
};

export function makeStory(tl) {
  const M = tl.marks;
  const sent = Object.fromEntries(tl.sentences.map((s) => [s.id, s]));
  const T = {
    total: tl.total,
    intro: tl.introSec,
    ...M,
    pauseStart: sent.pause.start,
    pauseEnd: sent.pause.end,
    // the countdown starts only when the task text and the timer card are in place
    timerStart: sent.pause.start + 1.0,
    timerEnd: sent.pause.end,
    s7end: sent.s7.end,
    ansEnd: sent.ans.end,
    ctaEnd: sent.cta.end,
  };
  // Section worlds: [startOfTransition, paletteName]
  const worlds = [
    [0, "lavender"],
    [T.pauseEnd - 0.1, "sky"],
    [T.h2 - 0.3, "indigo"],
    [T.h3 - 0.35, "peri"],
    [T.ans - 0.35, "bright"],
    [T.cta - 0.35, "lavender"],
  ];
  T.sweeps = worlds.slice(1).map((w) => w[0]);
  const WORLD_FADE = 0.9;
  function world(t) {
    let i = 0;
    while (i + 1 < worlds.length && t >= worlds[i + 1][0]) i++;
    const cur = PALETTES[worlds[i][1]];
    if (i === 0) return { a: cur, b: cur, k: 0 };
    const prev = PALETTES[worlds[i - 1][1]];
    const k = ease.inOutCubic(seg(t, worlds[i][0], worlds[i][0] + WORLD_FADE));
    return { a: prev, b: cur, k };
  }
  // Progress dots: 0 condition, 1 step1, 2 step2, 3 step3, 4 answer
  function stage(t) {
    if (t < T.h1 - 0.3) return 0;
    if (t < T.h2 - 0.3) return 1;
    if (t < T.h3 - 0.3) return 2;
    if (t < T.ans - 0.3) return 3;
    return 4;
  }
  return { T, world, stage };
}
