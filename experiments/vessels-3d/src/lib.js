// Pure, deterministic animation helpers: every value is a function of time t.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const seg = (t, a, b) => clamp((t - a) / (b - a));

export const ease = {
  linear: (x) => x,
  inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outCubic: (x) => 1 - Math.pow(1 - x, 3),
  inCubic: (x) => x * x * x,
  outQuint: (x) => 1 - Math.pow(1 - x, 5),
  inOutQuint: (x) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
  outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  outBack: (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
};

/** Closed-form damped spring 0→1 starting at t0 (overshoots, settles). */
export function spring(t, t0, { freq = 2.2, damping = 0.42 } = {}) {
  const x = t - t0;
  if (x <= 0) return 0;
  const w = 2 * Math.PI * freq;
  const z = damping;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x));
}

/** Smooth 0→1 over [a,b] with easing (default inOutCubic). */
export const ramp = (t, a, b, e = ease.inOutCubic) => e(seg(t, a, b));

/** In over [a, a+din], out over [b, b+dout]. */
export function window01(t, a, din, b, dout, e = ease.inOutCubic) {
  return e(seg(t, a, a + din)) * (1 - e(seg(t, b, b + dout)));
}

/**
 * Keyframe track: keys = [[time, value, easeIntoThisKey?], ...]; value is a
 * number or an array of numbers. Holds first/last values outside the range.
 */
export function track(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e = ease.inOutCubic] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) {
      const k = e(seg(t, t0, t1));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return keys[keys.length - 1][1];
}

/** Seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mixHex(a, b, k) {
  const x = hexToRgb(a), y = hexToRgb(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(",")})`;
}
export function mixRgbArr(a, b, k) {
  return a.map((v, i) => lerp(v, b[i], k));
}
