#!/usr/bin/env python3
"""Voiceover + measured word timeline for the biology video (offline RHVoice "tatiana").
Same method as make_audio.py: marks |name| are measured by synthesizing the sentence prefix.
Output: bio/assets/voice.wav, bio/timeline.json."""
import json, re, subprocess, tempfile, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent / "bio"
VOICE, RATE, SR = "tatiana", "108", 24000
INTRO_SEC = 2.0

SCRIPT = [
    ("c1", 0.6, "|bel|Белок состоит из |n120|ста двадцати |amino|аминокислот."),
    ("c2", 0.4, "|q|Сколько нуклеотидов |dna|в матричной цепи ДНК, |code|которая кодирует этот белок?"),
    ("__pause__", 5.6),   # 3D leaves, condition card, timer 4 -> 1, cards leave
    ("s1", 0.5, "|h1|Шаг первый. |trip|Каждую аминокислоту кодирует триплет — |three|три нуклеотида подряд."),
    ("s2", 0.5, "|h2|Шаг второй. Аминокислот сто двадцать, |x3|значит, нуклеотидов в три раза больше: |calc|сто двадцать на три — |r360|триста шестьдесят."),
    ("s3", 0.5, "|h3|Шаг третий. Спрашивают про одну, |tpl|матричную цепь, |two|поэтому вторую не считаем и на два не умножаем. |fin|В матричной цепи — |a360|триста шестьдесят нуклеотидов."),
    ("cta", 0.8, "|cta|Больше заданий — в приложении ЕГЭ Тренажёр. |link|Ссылка в профиле."),
]
TAIL_SEC = 1.2

def synth(text):
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        subprocess.run(["RHVoice-test", "-p", VOICE, "-r", RATE, "-R", str(SR), "-o", f.name],
                       input=text.encode("utf-8"), check=True, capture_output=True)
        with wave.open(f.name) as w:
            return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768

def trim(x, thr=0.012, pad=0.03):
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0: return x[:0]
    return x[max(0, idx[0] - int(pad * SR)): min(len(x), idx[-1] + int(pad * SR))]

out = [np.zeros(int(INTRO_SEC * SR), np.float32)]
cursor = INTRO_SEC
sentences, marks = [], {}
for item in SCRIPT:
    if item[0] in ("__pause__", "__gap__"):
        sentences.append({"id": item[0].strip("_"), "start": cursor, "end": cursor + item[1], "text": ""})
        out.append(np.zeros(int(round(item[1] * SR)), np.float32)); cursor += item[1]; continue
    sid, gap, marked = item
    if gap:
        out.append(np.zeros(int(round(gap * SR)), np.float32)); cursor += gap
    plain = re.sub(r"\|[a-z0-9]+\|", "", marked)
    clip = trim(synth(plain)); dur = len(clip) / SR
    for m in re.finditer(r"\|([a-z0-9]+)\|", marked):
        prefix = re.sub(r"\|[a-z0-9]+\|", "", marked[: m.start()]).strip()
        t = 0.0 if not prefix else min(dur, len(trim(synth(prefix))) / SR)
        marks[m.group(1)] = round(cursor + t, 3)
    sentences.append({"id": sid, "start": round(cursor, 3), "end": round(cursor + dur, 3), "text": plain})
    out.append(clip); cursor += dur
out.append(np.zeros(int(TAIL_SEC * SR), np.float32))
total = cursor + TAIL_SEC
pcm = np.concatenate(out); pcm = pcm / max(1e-6, np.abs(pcm).max()) * 0.89
(HERE / "assets").mkdir(exist_ok=True)
with wave.open(str(HERE / "assets" / "voice.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((pcm * 32767).astype(np.int16).tobytes())
tl = {"total": round(total, 3), "introSec": INTRO_SEC, "sentences": sentences, "marks": marks}
(HERE / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
print(json.dumps({"total": tl["total"], "marks": marks, "s": [(s["id"], s["start"], s["end"]) for s in sentences]}, ensure_ascii=False))
