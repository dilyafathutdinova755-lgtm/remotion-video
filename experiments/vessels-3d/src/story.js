// Story timing (from measured voice marks) + color worlds per section.
import { ease, seg } from "./lib.js";

export const PALETTES = {
  lavender: {
    top: "#F5F4FF", bottom: "#E6E9FB",
    glows: ["#C3CEFF", "#EBC7F6", "#BCE2FF"],
    text: "#121528", sub: "#6A6F8E", accent: "#5653F0",
    shadow: [38, 40, 110], shadowA: 0.42, dark: 0,
  },
  peach: {
    top: "#FFF5EC", bottom: "#FFE3CF",
    glows: ["#FFAF78", "#FFD0A6", "#FF9A86"],
    text: "#261309", sub: "#8D6A57", accent: "#F06418",
    shadow: [130, 62, 22], shadowA: 0.4, dark: 0,
  },
  sun: {
    top: "#FFFBE8", bottom: "#FFEDB8",
    glows: ["#FFD64A", "#FFE79A", "#FFBE63"],
    text: "#2A2108", sub: "#8A7742", accent: "#D99A00",
    shadow: [125, 92, 10], shadowA: 0.4, dark: 0,
  },
  violet: {
    top: "#1E1440", bottom: "#0C0820",
    glows: ["#6C3BFF", "#B64DFF", "#3B2BA8"],
    text: "#FFFFFF", sub: "#BDB3E0", accent: "#CDAEFF",
    shadow: [0, 0, 0], shadowA: 0.75, dark: 1,
  },
  emerald: {
    top: "#08301F", bottom: "#03160F",
    glows: ["#1DB57A", "#40E6A0", "#0C6B4C"],
    text: "#FFFFFF", sub: "#A5DCC4", accent: "#5CF2AF",
    shadow: [0, 0, 0], shadowA: 0.75, dark: 1,
  },
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
    s7end: sent.s7.end,
    ansEnd: sent.ans.end,
    ctaEnd: sent.cta.end,
  };
  // Section worlds: [startOfTransition, paletteName]
  const worlds = [
    [0, "lavender"],
    [T.pauseEnd - 0.1, "peach"],
    [T.h2 - 0.3, "sun"],
    [T.h3 - 0.35, "violet"],
    [T.ans - 0.35, "emerald"],
    [T.cta - 0.35, "lavender"],
  ];
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
