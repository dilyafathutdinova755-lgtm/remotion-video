#!/usr/bin/env python3
"""Sound design + final mix for the PHYSICS video (fully offline); helpers copied from make_mix.py.

Synthesizes SFX (whoosh, pop, thud, clink, pour, typing tick, chime) and a soft
ambient pad with numpy, places them on the same measured timeline the visuals
use (timeline.json), mixes under the voice and writes out/final.wav (48 kHz).
Cue offsets mirror src/overlay.js / src/choreo.js.
"""
import json
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent / "phys"
SR = 48000
rng = np.random.default_rng(3)
tl = json.loads((HERE / "timeline.json").read_text(encoding="utf-8"))
T = dict(tl["marks"])
sent = {s["id"]: s for s in tl["sentences"]}
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


# ---- cues (mirror phys/scene.js)
S = sent
P0 = S["pause"]["start"]
T_COND, T_TIMER, T_C0 = P0 + 0.4, P0 + 0.95, P0 + 1.3
T_EX = T_C0 + 4
E1, E2, E3 = (T["a1"] + 0.25, 1.6), (T["h2"] + 0.7, 1.6), (T["six"] + 0.7, 1.8)


def push(t0, D, n=1):
    put(whoosh(D + 0.3, 150, 2400, 0.32), t0 - 0.05)        # the push: rising swoosh
    for k in range(4):
        for j in range(n):
            put(pop(1500 + 120 * k, 1300 + 120 * k, 0.06, 0.32), t0 + k * D / 4 + j * 0.03)   # strobe ticks


put(whoosh(1.7, 200, 5000, 0.55), 0.0)                  # logo spin
put(pop(1200, 600, 0.12, 0.45), 1.95)                   # logo lands
put(whoosh(0.8, 200, 2200, 0.35), T["f1"] - 0.6)        # glass table rises
put(clink(3400, 0.18), T["f1"] + 0.15)
put(whoosh(0.6, 400, 3200, 0.3), T["f1"] + 0.1)         # force arrow slides in
put(thud(0.55), T["b1"] + 0.35); put(clink(4200, 0.16), T["b1"] + 0.35)   # body 1 lands on glass
put(pop(900, 450, 0.1, 0.35), T["b1"] + 0.5)            # v = 0
push(*E1)
put(pop(1000, 500, 0.1, 0.35), T["a1"] + 0.6)           # a1 tag
put(pop(800, 400, 0.1, 0.3), T["a1"] + 1.1)             # strobe note
put(whoosh(0.7, 300, 2600, 0.3), T["b2"])               # body 1 leaves, the arrow moves back
put(thud(0.95), T["m2"] + 0.4); put(thud(0.6), T["m2"] + 0.43)   # heavy body 2 lands
put(clink(3000, 0.14), T["m2"] + 0.4)
put(whoosh(1.1, 2500, 7000, 0.14), T["sm"] + 0.05)      # sheen over the smooth glass
put(chime(1320, 0.1), T["sm"] + 0.2)
put(pop(1000, 500, 0.1, 0.35), T["q"])                  # a2 = ?
put(whoosh(0.7, 500, 3500, 0.3), P0)
put(pop(700, 350, 0.1, 0.4), T_COND + 0.2)
put(pop(900, 450, 0.1, 0.4), T_TIMER + 0.15)
for k in range(4):
    put(pop(1500, 1300, 0.07, 0.38), T_C0 + k)
put(chime(990, 0.24), T_C0 + 4)
put(whoosh(0.9, 400, 4000, 0.32), T["h1"] - 0.45)       # table comes back
put(pop(800, 400, 0.1, 0.35), T["h1"])
for k, d in enumerate((0, 0.35, 0.6, 1.0, 1.25)):
    put(pop(900 + 80 * k, 500, 0.08, 0.36), T["law"] + d + 0.05)   # F = m · a, letter by letter
for i in range(3):
    put(pop(1200, 800, 0.06, 0.3), T["law"] + 1.45 + i * 0.2)
put(pop(800, 400, 0.1, 0.3), T["fr"] + 0.1)
put(whoosh(0.8, 300, 2600, 0.3), T["h2"] - 0.1)
put(pop(900, 450, 0.1, 0.35), T["h2"] + 0.35)
push(*E2)
put(pop(1000, 500, 0.12, 0.4), T["mul"] + 0.05)
put(pop(1100, 550, 0.12, 0.45), T["res"] + 0.05)
put(chime(740, 0.26), T["res"] + 0.1)                   # 0,9 N lands on the arrow
put(whoosh(0.9, 250, 3000, 0.3), T["h3"] - 0.2)
put(thud(0.9), T["h3"] + 0.62); put(thud(0.5), T["h3"] + 0.65)   # body 2 again
put(pop(900, 450, 0.1, 0.35), T["h3"] + 0.5)
for k in range(6):
    put(clink(3200 + 300 * k, 0.12), T["h3"] + 1.4 + k * 0.07)   # the face splits into six
put(pop(1000, 500, 0.1, 0.35), T["h3"] + 1.45)
put(pop(1000, 500, 0.12, 0.4), T["div"] + 0.05)
put(whoosh(0.4, 600, 3000, 0.2), T["ans"] - 0.25)       # the a2 tag flips
put(chime(880, 0.38), T["ans"] + 0.05)                  # 0,3 m/s²
put(whoosh(0.7, 300, 2600, 0.3), T["six"] - 0.2)
put(thud(0.45), T["six"] + 0.45); put(clink(4200, 0.14), T["six"] + 0.45)
push(*E3, n=2)
put(pop(900, 450, 0.1, 0.35), T["six"] + 0.25)
put(pop(1000, 500, 0.1, 0.35), T["slow"] + 0.15)
put(chime(660, 0.18), T["slow"] + 0.2)
put(whoosh(1.4, 200, 5000, 0.5), T["cta"] - 0.05)
put(pop(1100, 500, 0.12, 0.4), T["cta"] + 1.1)
put(pop(900, 450, 0.1, 0.4), T["cta"] + 1.05)
put(pop(1000, 500, 0.1, 0.4), T["cta"] + 2.2)
put(pop(1000, 500, 0.1, 0.4), T["link"] + 0.05)
put(chime(660, 0.2), T["cta"] + 2.3)

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
import os
if os.environ.get('NO_VOICE'):
    vv[:] = 0  # silent variant: SFX + ambient only; timings are unchanged

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
with wave.open(str(HERE / "out" / ("final-novoice.wav" if os.environ.get("NO_VOICE") else "final.wav")), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print("out/final.wav", round(len(final) / SR, 3), "s")
