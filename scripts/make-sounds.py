"""
Звуковые акценты для роликов: щелчки таймера и «поп» на ответе.

    python3 scripts/make-sounds.py

Синтезируются кодом, а не берутся готовыми файлами: так их не нужно
хранить в репозитории и не возникает вопросов с лицензией.
"""
import math
import struct
import wave
from pathlib import Path

RATE = 48000
OUT = Path(__file__).resolve().parent.parent / "public"


def save(name: str, samples: list[float]) -> None:
    data = bytearray()
    for s in samples:
        v = int(max(-1.0, min(1.0, s)) * 32767)
        data += struct.pack("<hh", v, v)
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(bytes(data))
    print(f"  {name}")


def pop(duration: float = 0.11) -> list[float]:
    """Мягкий «поп»: тон слегка съезжает вниз, иначе выходит ровный писк."""
    out = []
    for n in range(int(RATE * duration)):
        t = n / RATE
        freq = 760 - 180 * (t / duration)
        env = math.exp(-t * 42)
        attack = min(1.0, t / 0.004)  # без атаки на старте щёлкает
        out.append(math.sin(2 * math.pi * freq * t) * env * attack * 0.55)
    return out


def ticks(count: int = 5) -> list[float]:
    """Щелчки раз в секунду — по одному на смену цифры отсчёта."""
    import random

    out = [0.0] * int(RATE * count)
    for i in range(count):
        high = i % 2 == 0
        freq = 2100 if high else 1500
        amp = 0.42 if high else 0.36
        start = int(i * RATE)
        for n in range(int(0.045 * RATE)):
            if start + n >= len(out):
                break
            t = n / RATE
            env = math.exp(-t * 210)
            snap = random.uniform(-1, 1) * math.exp(-t * 900) * 0.5
            out[start + n] += (math.sin(2 * math.pi * freq * t) + snap) * env * amp
    return out


if __name__ == "__main__":
    save("pop.wav", pop())
    save("ticks.wav", ticks())
