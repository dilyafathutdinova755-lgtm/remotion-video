// Vessel choreography: positions / scales / fills / tilts as functions of t.
import { clamp, lerp, seg, ease, spring, track, ramp } from "./lib.js";

export const COL = { a: "#3f74ff", b: "#ff8a2a", mix: "#8a5bff" };

const mixHex = (a, b, k) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return "#" + x.map((v, i) => Math.round(lerp(v, y[i], clamp(k))).toString(16).padStart(2, "0")).join("");
};
const vlerp = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
const decaySin = (t, t0, amp, rate, freq) => (t > t0 ? amp * Math.exp(-rate * (t - t0)) * Math.sin((t - t0) * freq) : 0);

export function makeChoreo(T) {
  const ROW_Y = -0.8;
  const P = {
    solo1: [0, -0.62, 0.3],
    pair1: [-1.2, -0.62, 0], pair2: [1.2, -0.62, 0],
    row1: [-1.5, ROW_Y, 0], row3: [0, ROW_Y, 0.25], row2: [1.5, ROW_Y, 0],
    pour1: [-1.18, 0.5, 0.25], pour2: [1.18, 0.5, 0.25],
  };
  const pourA = T.m1 + 0.05;
  const pourB = pourA + 0.3;
  const flow = { a0: pourA + 0.75, a1: pourA + 2.55, b0: pourB + 0.75, b1: pourB + 2.55 };

  function states(t, pal) {
    const shadowRGB = pal.shadow, shadowA = pal.shadowA;
    const toPair = ramp(t, T.v2, T.v2 + 0.85);
    const toRow = ramp(t, T.v3 - 0.05, T.v3 + 0.9);
    const f1 = ramp(t, T.s1a - 0.2, T.s1a + 0.5) * (1 - ramp(t, T.s2a - 0.2, T.s2a + 0.5));
    const f2 = ramp(t, T.s2a - 0.2, T.s2a + 0.5) * (1 - ramp(t, T.h2 - 0.1, T.h2 + 0.6));
    const f3 = ramp(t, T.m2 - 0.2, T.m2 + 0.5) * (1 - ramp(t, T.eq0 - 0.2, T.eq0 + 0.4));

    // ---- v1
    const s1 = { scale: 1.55, fill: 0.56, color: COL.a, opacity: 1, tilt: 0, shadowRGB, shadowA };
    const drop = spring(t, T.v1, { freq: 1.25, damping: 0.5 });
    let p1 = [...P.solo1];
    p1[1] = lerp(5.4, P.solo1[1], drop);
    p1 = vlerp(vlerp(p1, P.pair1, toPair), P.row1, toRow);
    s1.scale = lerp(lerp(1.55, 1.32, toPair), 0.9, toRow);
    s1.squash = decaySin(t, T.v1 + 0.33, 0.07, 6, 18);
    s1.slosh = decaySin(t, T.v1 + 0.3, 0.09, 2.5, 9) + decaySin(t, T.v2, 0.05, 2.5, 9);
    s1.opacity = t < T.v1 ? 0 : 1;
    s1.scale *= 1 + f1 * 0.1;
    p1[1] += f1 * 0.08;
    p1[0] += f1 * 0.12;
    s1.opacity *= 1 - (f2 + f3) * 0.6;
    const lift1 = ramp(t, pourA, pourA + 0.75);
    p1 = vlerp(p1, P.pour1, lift1);
    s1.tilt = -track(t, [[pourA + 0.1, 0], [pourA + 0.9, 1.05], [pourA + 2.4, 1.5, ease.inOutSine], [pourA + 3.0, 0.2]]);
    s1.fill = 0.56 * (1 - ramp(t, pourA + 0.8, pourA + 2.5, ease.inOutSine));
    const out1 = ramp(t, T.eq0 + 0.15, T.eq0 + 1.0, ease.inCubic);
    p1[0] -= out1 * 4.5;
    p1[1] += out1 * 0.4;
    s1.opacity *= 1 - out1;
    s1.rotY = Math.sin(t * 0.55) * 0.22;
    p1[1] += Math.sin(t * 1.35) * 0.035 * ramp(t, T.v1 + 0.8, T.v1 + 1.5);
    s1.pos = p1;

    // ---- v2
    const s2 = { scale: 1.32, fill: 0.5, color: COL.b, opacity: 1, tilt: 0, shadowRGB, shadowA };
    const enter2 = spring(t, T.v2, { freq: 1.05, damping: 0.62 });
    let p2 = [...P.pair2];
    p2[0] = lerp(5.6, P.pair2[0], enter2);
    s2.tilt = (1 - clamp(enter2)) * 0.5 + decaySin(t, T.v2 + 0.4, 0.06, 3, 7);
    s2.slosh = decaySin(t, T.v2 + 0.45, 0.12, 2.5, 8);
    s2.opacity = t < T.v2 ? 0 : 1;
    const hop = seg(t, T.q, T.q + 0.55);
    p2[1] += Math.sin(hop * Math.PI) * 0.42;
    s2.squash = hop > 0 && hop < 1 ? -0.05 * Math.sin(hop * Math.PI) : decaySin(t, T.q + 0.55, 0.06, 7, 20);
    s2.slosh += decaySin(t, T.q + 0.55, 0.1, 2.5, 9);
    p2 = vlerp(p2, P.row2, toRow);
    s2.scale = lerp(1.32, 0.9, toRow);
    s2.scale *= 1 + f2 * 0.1;
    p2[1] += f2 * 0.08;
    p2[0] -= f2 * 0.12;
    s2.opacity *= 1 - (f1 + f3) * 0.6;
    const lift2 = ramp(t, pourB, pourB + 0.75);
    p2 = vlerp(p2, P.pour2, lift2);
    s2.tilt += track(t, [[pourB + 0.1, 0], [pourB + 0.9, 1.05], [pourB + 2.4, 1.5, ease.inOutSine], [pourB + 3.0, 0.2]]);
    s2.fill = 0.5 * (1 - ramp(t, pourB + 0.8, pourB + 2.5, ease.inOutSine));
    const out2 = ramp(t, T.eq0 + 0.25, T.eq0 + 1.1, ease.inCubic);
    p2[0] += out2 * 4.5;
    p2[1] += out2 * 0.4;
    s2.opacity *= 1 - out2;
    if (t > T.h3 + 0.3) {
      // waits under the equation ("this is the x we're solving for"), then
      // jumps up as the answer
      const wait = spring(t, T.h3 + 0.3, { freq: 1.0, damping: 0.62 });
      const back = spring(t, T.ans - 0.1, { freq: 1.1, damping: 0.55 });
      const gone = ramp(t, T.cta - 0.1, T.cta + 0.5, ease.inCubic);
      s2.opacity = clamp((t - T.h3 - 0.3) * 5) * (1 - gone);
      const WAIT = [0, -2.55, 0.3];
      p2 = vlerp([0, -6, 0.3], WAIT, wait);
      p2 = vlerp(p2, [0, -0.6, 0.6], clamp(back, 0, 1.15));
      p2[1] -= gone * 4;
      s2.scale = lerp(0.95, 1.6, clamp(back, 0, 1.1));
      s2.tilt = 0;
      s2.fill = 0.5;
      s2.squash = 0;
      const jump = seg(t, T.a8 - 0.05, T.a8 + 0.45);
      p2[1] += Math.sin(jump * Math.PI) * 0.3;
      s2.slosh = decaySin(t, T.h3 + 0.8, 0.1, 2.5, 8) + decaySin(t, T.ans + 0.4, 0.1, 2.5, 8) + decaySin(t, T.a8 + 0.45, 0.08, 3, 10);
    }
    s2.rotY = Math.sin(t * 0.5 + 1.3) * 0.22;
    p2[1] += Math.sin(t * 1.25 + 2) * 0.035 * ramp(t, T.v2 + 1, T.v2 + 1.6);
    s2.pos = p2;

    // ---- v3 (the mix), centre of the row
    const s3 = { scale: 0.98, fill: 0, color: COL.mix, opacity: 0, tilt: 0, shadowRGB, shadowA };
    const rise3 = spring(t, T.v3 + 0.1, { freq: 1.15, damping: 0.6 });
    let p3 = [...P.row3];
    p3[1] = lerp(-6, P.row3[1], rise3);
    s3.opacity = t < T.v3 ? 0 : 1;
    s3.ghost = ramp(t, T.v3 + 0.6, T.v3 + 1.2) * (1 - ramp(t, flow.a0, flow.a0 + 1.0));
    s3.ghost *= 1 + 0.8 * Math.max(0, Math.sin((t - T.p20) * 7)) * (t > T.p20 && t < T.p20 + 1.4 ? 1 : 0);
    s3.fill = 0.62 * ramp(t, flow.a0 + 0.2, flow.b1, ease.inOutSine);
    const mk = ramp(t, flow.a0 + 0.2, flow.b1 - 0.2);
    s3.color = mk < 0.5 ? mixHex(COL.a, "#6f66ff", mk * 2) : mixHex("#6f66ff", COL.mix, (mk - 0.5) * 2);
    s3.slosh = 0.05 * Math.sin(t * 6) * ramp(t, flow.a0 + 0.3, flow.a0 + 0.8) * (1 - ramp(t, flow.b1, flow.b1 + 1));
    s3.opacity *= 1 - (f1 + f2) * 0.6;
    s3.scale *= 1 + f3 * 0.1;
    const center3 = ramp(t, T.eq0 + 0.3, T.eq0 + 1.3);
    s3.scale = lerp(s3.scale, 1.15, center3);
    const out3 = ramp(t, T.h3 - 0.2, T.h3 + 0.7, ease.inCubic);
    p3[1] -= out3 * 5;
    s3.opacity *= 1 - out3;
    s3.rotY = Math.sin(t * 0.45 + 2.6) * 0.2;
    p3[1] += Math.sin(t * 1.15 + 4) * 0.03 * ramp(t, T.v3 + 1, T.v3 + 1.6);
    s3.pos = p3;
    return { s1, s2, s3 };
  }

  /** World-space heap centres (not rotated with tilting vessels). */
  function heapCenter(i, t, st) {
    if (i === 3) {
      const s = st.s3;
      return [s.pos[0], s.pos[1] + 0.75 * s.scale + 0.38, s.pos[2]];
    }
    const s = i === 1 ? st.s1 : st.s2;
    const side = i === 1 ? -1 : 1;
    const above = [s.pos[0], s.pos[1] + 0.75 * s.scale + 0.42, s.pos[2]];
    const aside = [side * 1.62, -0.5, 0.1];
    const k = ramp(t, pourA - 0.35, pourA + 0.45);
    return vlerp(above, aside, k);
  }

  /** Where each heap's result sticker sits (beside the heap, then by the merged heap). */
  function heapSticker(i, t, st) {
    const merge = ease.inOutCubic(seg(t, T.eq0 + 0.2, T.eq0 + 1.2));
    const side = i === 1 ? -1 : 1;
    const hc = heapCenter(i, t, st);
    const k = ramp(t, pourA - 0.35, pourA + 0.45);
    const near = vlerp([hc[0] - side * 0.82, hc[1] + 0.22, hc[2]], [hc[0], hc[1] - 0.36, hc[2] + 0.3], k);
    const h3 = heapCenter(3, t, st);
    const fin = [h3[0] + side * 1.0, h3[1] + 0.22, h3[2] + 0.2];
    return vlerp(near, fin, merge);
  }

  return { states, heapCenter, heapSticker, pourA, pourB, flow };
}
