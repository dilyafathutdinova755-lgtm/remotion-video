#!/usr/bin/env python3
"""Sound design + final mix for the HISTORY video (fully offline); helpers copied from make_mix.py.

Synthesizes SFX (whoosh, pop, thud, clink, pour, typing tick, chime) and a soft
ambient pad with numpy, places them on the same measured timeline the visuals
use (timeline.json), mixes under the voice and writes out/final.wav (48 kHz).
Cue offsets mirror src/overlay.js / src/choreo.js.
"""
import json
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent / "hist"
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


# ---- cues (mirror hist/scene.js)
S = sent
P0 = S["pause"]["start"]
T_TIMER, T_C0 = P0 + 0.5, P0 + 0.9
T_EX = T_C0 + 4

put(whoosh(1.7, 200, 5000, 0.55), 0.0)                  # logo spin
put(pop(1200, 600, 0.12, 0.45), 1.95)                   # logo lands
put(thud(0.7), 2.45)                                    # heroes pop up
for k, d in enumerate((0.0, 0.12, 0.2)):
    put(pop(700 + 120 * k, 380, 0.1, 0.3), 2.3 + d)
put(pop(800, 420, 0.1, 0.25), T["ask"] + 0.1)           # caption
put(whoosh(0.7, 300, 3600, 0.35), T["word"] - 0.2)      # the word flies in
put(chime(990, 0.3), T["word"] + 0.35)                  # ...and lands
put(pop(900, 450, 0.1, 0.4), T_TIMER + 0.15)            # timer card
for k in range(4):
    put(pop(1500, 1300, 0.07, 0.38), T_C0 + k)          # 4-3-2-1
put(chime(990, 0.24), T_C0 + 4)
put(whoosh(0.9, 900, 200, 0.34), T_EX)                  # heroes go down
put(pop(800, 400, 0.1, 0.35), T["h1"])                  # headline
put(pop(700, 360, 0.12, 0.4), T["h1"] + 0.3)            # Orda
put(pop(900, 450, 0.12, 0.4), T["h1"] + 0.5)            # Rus
put(whoosh(0.6, 800, 2600, 0.2), T["h1"] + 0.55)        # arc draws
put(pop(1000, 500, 0.1, 0.35), T["bas"])                # baskak appears
put(whoosh(1.1, 300, 2400, 0.32), T["bas"] + 0.2)       # travels along the arc
for k in range(6):
    put(tick(0.2), T["bas"] + 0.25 + k * 0.2)           # little hops
put(chime(880, 0.22), T["rep"] + 0.2)
put(pop(800, 400, 0.1, 0.35), T["h2"])
put(thud(0.8), T["cent"] + 0.05)                        # centuries land
put(whoosh(0.7, 400, 2800, 0.25), T["y1257"] + 0.1)     # timeline draws
for k in range(3):
    put(tick(0.3), T["y1257"] + 0.35 + k * 0.15)
put(chime(990, 0.26), T["y1257"] + 1.75)                # 1257
put(whoosh(1.2, 300, 1800, 0.22), T["xiv"] - 0.6)       # segment grows
put(chime(880, 0.26), T["xiv"] + 0.85)                  # beginning of XIV
put(pop(800, 400, 0.1, 0.35), T["h3"])
put(pop(900, 450, 0.12, 0.4), T["tax"] + 0.15)
for k in range(8):
    put(clink(rng.uniform(2600, 4200), 0.2), T["tax"] + 0.2 + k * 0.11)   # coins
put(pop(1000, 500, 0.12, 0.4), T["eye"] + 0.05)
put(tick(0.35), T["eye"] + 0.6)                         # blink
put(pop(800, 400, 0.12, 0.4), T["army"] + 0.05)
put(clink(2100, 0.5), T["army"] + 0.1)                  # spear rings
put(whoosh(0.8, 300, 2600, 0.3), T["sum"] - 0.2)        # cards gather
put(chime(740, 0.3), T["sum"] + 0.65)                   # the definition
put(thud(0.6), T["sum"] + 1.5)                          # heroes back
for k in range(2):
    put(pop(600, 300, 0.1, 0.3), T["fin"] + 0.25 + k * 0.5)   # nods
put(whoosh(1.4, 200, 5000, 0.5), T["cta"] - 0.05)       # logo spin back
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
