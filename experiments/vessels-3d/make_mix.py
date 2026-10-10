#!/usr/bin/env python3
"""Sound design + final mix for the vessels-3d experiment (fully offline).

Synthesizes SFX (whoosh, pop, thud, clink, pour, typing tick, chime) and a soft
ambient pad with numpy, places them on the same measured timeline the visuals
use (timeline.json), mixes under the voice and writes out/final.wav (48 kHz).
Cue offsets mirror src/overlay.js / src/choreo.js.
"""
import json
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
SR = 48000
rng = np.random.default_rng(3)
tl = json.loads((HERE / "timeline.json").read_text(encoding="utf-8"))
T = dict(tl["marks"])
sent = {s["id"]: s for s in tl["sentences"]}
T["pauseStart"], T["pauseEnd"] = sent["pause"]["start"], sent["pause"]["end"]
TOTAL = tl["total"]
N = int(TOTAL * SR) + SR


def env(n, a, d):
    e = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nd:
        e[-nd:] *= np.linspace(1, 0, nd) ** 2
    return e


def onepole_lp(x, fc):
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    y = np.zeros_like(x)
    acc = 0.0
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def whoosh(dur=0.7, f0=300, f1=3000, amp=0.5):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    sweep = np.geomspace(f0, f1, n)
    lp = onepole_lp(noise, sweep)
    hp = lp - onepole_lp(lp, sweep * 0.25)
    shape = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return hp * shape * amp * 3


def pop(f0=900, f1=420, dur=0.09, amp=0.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.geomspace(f0, f1, n)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 38) * amp


def thud(amp=0.7):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    f = np.geomspace(140, 55, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) * amp


def clink(f=None, amp=0.25):
    f = f or rng.uniform(2600, 4800)
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.71 * t) * np.exp(-t * 30)
    return s * np.exp(-t * 14) * amp


def tick(amp=0.18):
    n = int(0.018 * SR)
    x = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 400)
    return (x - onepole_lp(x, 2500)) * amp


def chime(base=880, amp=0.35):
    out = np.zeros(int(1.8 * SR))
    for k, ratio in enumerate([1, 1.26, 1.5, 2.0]):
        n = len(out) - int(k * 0.07 * SR)
        t = np.arange(n) / SR
        f = base * ratio
        tone = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * np.exp(-t * 3.2)
        out[int(k * 0.07 * SR):] += tone * amp / (1 + k * 0.25)
    return out


def pour(dur, amp=0.25):
    n = int(dur * SR)
    noise = onepole_lp(rng.standard_normal(n), 900)
    t = np.arange(n) / SR
    out = noise * 1.6
    for _ in range(int(dur * 14)):  # bubbles
        st = rng.uniform(0, dur - 0.08)
        bn = int(0.07 * SR)
        bt = np.arange(bn) / SR
        f = np.linspace(rng.uniform(250, 420), rng.uniform(500, 800), bn)
        b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-bt * 45) * 0.5
        i = int(st * SR)
        out[i:i + bn] += b
    return out * env(n, 0.25, 0.4) * amp


mix = np.zeros(N)


def put(sig, t, gain=1.0):
    i = int(t * SR)
    if i < 0 or i >= N:
        return
    j = min(N, i + len(sig))
    mix[i:j] += sig[: j - i] * gain


# ---- cues (mirror the visual timeline)
put(whoosh(1.7, 200, 5000, 0.55), 0.0)             # logo spin
put(pop(1200, 600, 0.12, 0.45), 1.95)              # logo lands in the plaque
put(thud(0.8), T["v1"] + 0.33)                     # vessel 1 lands
for i in range(26):
    put(clink(), T["salt"] + 0.05 + rng.uniform(0, 1.3) + 0.62, 0.55)
put(whoosh(0.8, 300, 2500, 0.35), T["v2"])
put(thud(0.5), T["v2"] + 0.55)
for i in range(40):
    put(clink(), T["v2b"] + 0.35 + rng.uniform(0, 1.25) + 0.62, 0.45)
put(thud(0.45), T["q"] + 0.55)                     # hop
put(whoosh(0.9, 250, 2200, 0.35), T["v3"])         # row + mix vessel rises
put(pop(700, 350, 0.1, 0.4), T["pauseStart"])      # pause card
put(whoosh(0.9, 400, 4000, 0.3), T["pauseEnd"] - 0.1)  # world change
# stickers popping in
for t in [T["v1"] + 0.5, T["salt"] + 0.55, T["v2b"] + 0.15, T["q"] + 0.25, T["v3"] + 0.7, T["p20"] + 0.05,
          T["m1"] + 0.6, T["s1b"] + 1.9, T["s2b"] + 1.7, T["m3"] + 1.95, T["h3"] + 0.9, T["link"], T["cta"] + 1.0]:
    put(pop(rng.uniform(800, 1100), 450), t)
# note typing
NOTES = [(T["s1a"] + 0.25, "10% от 8 кг"), (T["s1b"] + 0.05, "0,1 · 8 = 0,8 кг"),
         (T["s2a"] + 0.25, "30% от x кг"), (T["s2b"] + 0.05, "0,3 · x = 0,3x"),
         (T["m2"] + 0.15, "20% от (8 + x)"), (T["m3"] + 0.1, "0,2 · (8 + x)")]
for at, text in NOTES:
    for i, ch in enumerate(text):
        if ch != " ":
            put(tick(), at + i / 19, rng.uniform(0.7, 1.1))
    put(whoosh(0.35, 800, 5000, 0.18), at + len(text) / 19 + 0.5)  # result flies off
# heaps
for base in [T["s1a"] + 0.35, T["s2a"] + 0.35]:
    for i in range(12):
        put(clink(rng.uniform(3000, 5200), 0.18), base + rng.uniform(0.5, 1.6))
pourA = T["m1"] + 0.05
pourB = pourA + 0.3
put(pour(1.9), pourA + 0.75)
put(pour(1.9), pourB + 0.75, 0.9)
put(whoosh(0.7, 300, 3000, 0.3), T["h2"] - 0.3)
for i in range(30):                                # salt merges
    put(clink(rng.uniform(2500, 5000), 0.16), T["eq0"] + 0.3 + rng.uniform(0, 1.4))
put(whoosh(0.9, 300, 3500, 0.3), T["h3"] - 0.35)
for t in [T["eq1"] + 0.15, T["eq1"] + 0.4, T["eq2"], T["eq2"] + 0.1, T["br"] + 0.1, T["mv"] + 0.1, T["num"] + 0.05, T["r1"] + 0.1]:
    put(whoosh(0.4, 600, 4000, 0.16), t)
    put(pop(1300, 800, 0.06, 0.25), t + 0.6)
put(chime(660, 0.28), T["r2"] + 0.3)               # x = 8
put(whoosh(0.9, 300, 3500, 0.3), T["ans"] - 0.35)
put(chime(880, 0.35), T["a8"])                     # ✓ 8 кг
for i in range(30):
    put(clink(rng.uniform(3500, 6500), 0.14), T["a8"] + rng.uniform(0, 0.8))
put(whoosh(1.4, 200, 5000, 0.5), T["cta"] - 0.05)  # logo spin back
put(pop(1100, 500, 0.12, 0.4), T["cta"] + 1.15)

# ---- ambient pad (soft chords, slow changes)
def note(m):
    return 440 * 2 ** ((m - 69) / 12)

CHORDS = [[48, 55, 59, 64], [45, 52, 57, 60], [41, 48, 53, 57], [43, 50, 55, 59]]  # Cmaj7 Am7 Fmaj7 G
pad = np.zeros(N)
seg_len = 4.0
t_all = np.arange(N) / SR
for ci in range(int(TOTAL / seg_len) + 1):
    ch = CHORDS[ci % 4]
    a = int(ci * seg_len * SR)
    n = int((seg_len + 1.5) * SR)
    if a >= N:
        break
    n = min(n, N - a)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 1.2) * np.clip((seg_len + 1.5 - t) / 1.5, 0, 1)
    s = np.zeros(n)
    for m in ch:
        for det in (-0.12, 0.12):
            f = note(m + 12) * (1 + det / 100)
            s += np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) + 0.18 * np.sin(4 * np.pi * f * t)
    pad[a:a + n] += s * e
pad = onepole_lp(pad / np.abs(pad).max(), 1800)
pad *= 0.5 + 0.5 * np.sin(2 * np.pi * t_all / 7.0) * 0.3

# ---- voice
with wave.open(str(HERE / "assets" / "voice.wav")) as w:
    vsr = w.getframerate()
    v = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
idx = np.arange(int(len(v) * SR / vsr)) * vsr / SR
voice = np.interp(idx, np.arange(len(v)), v)
vv = np.zeros(N)
vv[: min(N, len(voice))] = voice[:N]

# duck pad under speech
speech = onepole_lp(np.abs(vv), 6)
duck = 1 - 0.55 * np.clip(speech / (speech.max() + 1e-9) * 6, 0, 1)
fade = np.clip(t_all / 1.0, 0, 1) * np.clip((TOTAL - t_all) / 1.2, 0, 1)
final = vv * 1.0 + mix * 0.42 + pad * 0.075 * duck * fade
final = np.tanh(final * 1.1) / np.tanh(1.1)
final = final / np.abs(final).max() * 0.93
final = final[: int(TOTAL * SR)]
stereo = np.stack([final, final], axis=1)
(HERE / "out").mkdir(exist_ok=True)
with wave.open(str(HERE / "out" / "final.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print("out/final.wav", round(len(final) / SR, 3), "s")
