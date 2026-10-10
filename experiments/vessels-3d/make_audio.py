#!/usr/bin/env python3
"""Voiceover + word-level timeline for the vessels-3d experiment.

Offline only: RHVoice (apt `rhvoice rhvoice-russian`), voice "tatiana".
Each sentence is synthesized whole (natural intonation). Marks `|name|`
inside a sentence are word triggers for visuals: their time is measured by
synthesizing the sentence prefix up to that word and taking its trimmed
duration — real measured time, not a guess.

Output: assets/voice.wav (24 kHz mono) and timeline.json.
"""
import json
import re
import subprocess
import tempfile
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
VOICE = "tatiana"
RATE = "108"
SR = 24000
INTRO_SEC = 2.0  # logo spin; no voice (the old intro phrase is removed)

# (id, gap_before_sec, text with |marks|) ; ("__pause__", seconds) = silent pause
SCRIPT = [
    ("cond1", 0.0, "|v1|К восьми килограммам |salt|десятипроцентного раствора соли |v2|добавили |v2b|тридцатипроцентный раствор той же соли."),
    ("cond2", 0.35, "|q|Сколько килограммов тридцатипроцентного раствора нужно добавить, |v3|чтобы получить |p20|двадцатипроцентный раствор?"),
    ("__pause__", 2.0),
    ("s1", 0.35, "|h1|Шаг первый: считаем соль."),
    ("s2", 0.3, "|s1a|В первом растворе — десять процентов от восьми, |s1b|это ноль целых восемь десятых килограмма."),
    ("s3", 0.3, "|s2a|Во втором — тридцать процентов от икс, |s2b|то есть ноль три икс."),
    ("s4", 0.45, "|h2|Шаг второй. |m1|Смесь весит восемь плюс икс, |m2|и соли в ней двадцать процентов: |m3|ноль два умножить на восемь плюс икс."),
    ("s5", 0.35, "|eq0|Соль никуда не исчезает. |eq1|Сколько её было в двух растворах — |eq2|столько и в смеси."),
    ("s6", 0.45, "|h3|Шаг третий. |br|Раскрываем скобки, |mv|переносим икс влево, |num|числа вправо."),
    ("s7", 0.3, "|r1|Ноль одна икс равна ноль восьми, |r2|значит, икс равен восьми."),
    ("ans", 0.45, "|ans|Ответ: |a8|восемь килограммов."),
    ("cta", 0.55, "|cta|Больше заданий — в приложении ЕГЭ Тренажёр. |link|Ссылка в профиле."),
]
TAIL_SEC = 1.0


def synth(text: str) -> np.ndarray:
    with tempfile.NamedTemporaryFile(suffix=".wav") as f:
        subprocess.run(
            ["RHVoice-test", "-p", VOICE, "-r", RATE, "-R", str(SR), "-o", f.name],
            input=text.encode("utf-8"), check=True, capture_output=True,
        )
        with wave.open(f.name) as w:
            assert w.getframerate() == SR and w.getnchannels() == 1, (w.getframerate(), w.getnchannels())
            data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return data


def trim(x: np.ndarray, thr=0.012, pad=0.03) -> np.ndarray:
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x[:0]
    a = max(0, idx[0] - int(pad * SR))
    b = min(len(x), idx[-1] + int(pad * SR))
    return x[a:b]


def main():
    out = [np.zeros(int(INTRO_SEC * SR), np.float32)]
    cursor = INTRO_SEC
    sentences, marks = [], {}
    for item in SCRIPT:
        if item[0] == "__pause__":
            sentences.append({"id": "pause", "start": cursor, "end": cursor + item[1], "text": ""})
            out.append(np.zeros(int(round(item[1] * SR)), np.float32))
            cursor += item[1]
            continue
        sid, gap, marked = item
        if gap:
            out.append(np.zeros(int(round(gap * SR)), np.float32))
            cursor += gap
        plain = re.sub(r"\|[a-z0-9]+\|", "", marked)
        clip = trim(synth(plain))
        dur = len(clip) / SR
        for m in re.finditer(r"\|([a-z0-9]+)\|", marked):
            prefix = re.sub(r"\|[a-z0-9]+\|", "", marked[: m.start()]).strip()
            t = 0.0 if not prefix else min(dur, len(trim(synth(prefix))) / SR)
            marks[m.group(1)] = round(cursor + t, 3)
        sentences.append({"id": sid, "start": round(cursor, 3), "end": round(cursor + dur, 3), "text": plain})
        out.append(clip)
        cursor += dur
    out.append(np.zeros(int(TAIL_SEC * SR), np.float32))
    total = cursor + TAIL_SEC
    pcm = np.concatenate(out)
    pcm = pcm / max(1e-6, np.abs(pcm).max()) * 0.89
    (HERE / "assets").mkdir(exist_ok=True)
    with wave.open(str(HERE / "assets" / "voice.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((pcm * 32767).astype(np.int16).tobytes())
    timeline = {"total": round(total, 3), "introSec": INTRO_SEC, "sentences": sentences, "marks": marks}
    (HERE / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(timeline, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
