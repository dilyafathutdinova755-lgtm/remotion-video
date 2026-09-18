#!/usr/bin/env python3
"""
Автоматическая разметка озвучки для динамического рендера (GitHub Actions).

Тот же метод, что использовался вручную весь проект: паузы находятся
ffmpeg silencedetect, ожидаемые позиции границ — по доле слов от общего
числа, DP выравнивает найденные паузы под ожидаемые позиции минимизируя
сумму квадратов ошибки (см. PLAYBOOK.md §11a).

В отличие от ручного процесса, здесь нет отдельного хука в озвучке
(экран хука не озвучивается, см. задание в чате) — первая же услышанная
фраза относится к условию. Текст обязан содержать маркер «Ответ:»
(с любым тире после) — это единственный способ автоматически найти
границу условие→ответ без разметки от человека. Финальная фраза-CTA
(«Скачивай бесплатно...») ищется тоже по фиксированному тексту.

Если текст не соответствует этому шаблону — скрипт завершается с
ошибкой (код 1), а не с угадыванием: лучше видимый сбой CI, чем тихо
разъехавшийся по времени ролик.

Использование:
    python3 align.py --text "<озвучка целиком>" --audio path/to.mp3 \
        --ffmpeg path/to/ffmpeg > audiosync.json
"""
import argparse
import json
import re
import subprocess
import sys


def split_sentences(text: str):
    text = text.strip()
    # Разбиваем по концу предложения (.!?) с последующим пробелом.
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]


def align(expected, candidates):
    """DP: минимальная сумма квадратов ошибки, выбираем возрастающую
    подпоследовательность candidates длиной len(expected)."""
    n, m = len(expected), len(candidates)
    INF = float("inf")
    dp = [[INF] * (m + 1) for _ in range(n + 1)]
    choice = [[-1] * (m + 1) for _ in range(n + 1)]
    for j in range(m + 1):
        dp[0][j] = 0
    for i in range(1, n + 1):
        for j in range(i, m + 1):
            best = dp[i][j - 1]
            bchoice = -2
            prev = dp[i - 1][j - 1]
            if prev < INF:
                cost = prev + (candidates[j - 1] - expected[i - 1]) ** 2
                if cost < best:
                    best = cost
                    bchoice = j - 1
            dp[i][j] = best
            choice[i][j] = bchoice
    result = [None] * n
    i, j = n, m
    while i > 0:
        c = choice[i][j]
        if c == -2:
            j -= 1
        else:
            result[i - 1] = candidates[c]
            i -= 1
            j = c
    return result


def ffmpeg_duration(ffmpeg, audio_path):
    out = subprocess.run(
        [ffmpeg, "-i", audio_path], stderr=subprocess.PIPE, stdout=subprocess.PIPE
    ).stderr.decode("utf-8", "ignore")
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", out)
    if not m:
        raise RuntimeError("Не удалось прочитать длительность аудио из ffmpeg -i")
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def silence_ends(ffmpeg, audio_path, noise_db=-20):
    out = subprocess.run(
        [
            ffmpeg,
            "-i",
            audio_path,
            "-af",
            f"silencedetect=noise={noise_db}dB:d=0.3",
            "-f",
            "null",
            "-",
        ],
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
    ).stderr.decode("utf-8", "ignore")
    return [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)", out)]


ANSWER_RE = re.compile(r"^ответ\s*[:\-—]", re.IGNORECASE)
# Гибкое сопоставление CTA: ё/е не различаем, между словами допускаем любые
# небуквенные символы (пробелы, тире, запятая, перенос строки) — требование
# к самой фразе остаётся жёстким, гибкость только в её написании.
CTA_RE = re.compile(r"скачивай\W*бесплатно", re.IGNORECASE)


def normalize_yo(text: str) -> str:
    return text.replace("ё", "е").replace("Ё", "Е")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True)
    ap.add_argument("--audio", required=True)
    ap.add_argument("--ffmpeg", required=True)
    ap.add_argument("--noise-db", type=int, default=-20)
    args = ap.parse_args()

    sentences = split_sentences(args.text)
    if len(sentences) < 3:
        print(
            f"ОШИБКА: в тексте всего {len(sentences)} предложений — похоже не на "
            "шаблон условие/ответ/CTA, разметить не могу.",
            file=sys.stderr,
        )
        sys.exit(1)

    answer_idx = next((i for i, s in enumerate(sentences) if ANSWER_RE.match(s)), None)
    cta_idx = next(
        (i for i, s in enumerate(sentences) if CTA_RE.search(normalize_yo(s))), None
    )
    if answer_idx is None:
        print(
            "ОШИБКА: не нашёл предложение, начинающееся с «Ответ:» — без него "
            "невозможно автоматически найти границу условие → ответ.",
            file=sys.stderr,
        )
        sys.exit(1)
    if cta_idx is None:
        print(
            "ОШИБКА: не нашёл фразу «Скачивай бесплатно» — без неё невозможно "
            "найти границу перед финальным экраном.",
            file=sys.stderr,
        )
        sys.exit(1)
    if cta_idx <= answer_idx:
        print(
            "ОШИБКА: фраза «Скачивай бесплатно» стоит раньше «Ответ:» — "
            "порядок текста не соответствует ожидаемому шаблону.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Схлопываем весь CTA-хвост в одно предложение (после первого совпадения) —
    # так же, как и в ручной разметке: между «Скачивай бесплатно.» и
    # «Ссылка в шапке профиля.» обычно нет отдельной паузы длиннее порога.
    merged = sentences[: cta_idx + 1] + ["".join(sentences[cta_idx + 1 :])]
    merged = [s for s in merged if s]
    # После схлопывания cta_idx не меняется (то же самое предложение);
    # answer_idx не меняется, так как он раньше cta_idx.

    words = [len(s.split()) for s in merged]
    cum = []
    acc = 0
    for w in words:
        acc += w
        cum.append(acc)
    total_words = cum[-1]

    total_sec = ffmpeg_duration(args.ffmpeg, args.audio)
    candidates = silence_ends(args.ffmpeg, args.audio, args.noise_db)
    if not candidates:
        print(
            "ОШИБКА: silencedetect не нашёл ни одной паузы ≥0.3с — "
            "проверьте файл или понизьте порог.",
            file=sys.stderr,
        )
        sys.exit(1)

    full_expected = [cum[i] / total_words * total_sec for i in range(len(merged) - 1)]

    # Нужные границы (0-based индекс "после какого предложения"):
    # conditionSec — самое начало (перед предложением 0), считаем отдельно;
    # answerSec — перед предложением answer_idx;
    # checkAtSec — перед предложением answer_idx + 1, если оно есть до CTA;
    # outroSec — перед CTA-предложением (индекс cta_idx).
    needed = {}
    needed_idx = []
    if answer_idx > 0:
        needed_idx.append(("answerSec", answer_idx - 1))
    else:
        needed["answerSec"] = 0.0  # ответ — первое предложение (короткий текст)
    has_check = answer_idx + 1 < cta_idx
    if has_check:
        needed_idx.append(("checkAtSec", answer_idx))
    needed_idx.append(("outroSec", cta_idx - 1))

    # Текст пояснения под ответом — те же предложения, что звучат между
    # «Ответ: …» и CTA, слово в слово из присланной озвучки (не выдумываем
    # отдельное пояснение — берём то, что реально проговорено).
    check_lines = [s for s in merged[answer_idx + 1 : cta_idx]] if has_check else []

    if needed_idx:
        idxs = [i for _, i in needed_idx]
        sub_expected = [full_expected[i] for i in idxs]
        aligned = align(sub_expected, candidates)
        for (label, _), value in zip(needed_idx, aligned):
            needed[label] = value

    if not has_check:
        needed["checkAtSec"] = needed["answerSec"]

    # conditionSec: начало самого первого предложения — граница перед ним,
    # то есть конец ведущей тишины. Берём первый кандидат, если он похож на
    # ведущую паузу (< 1/3 от ожидаемой позиции конца первого предложения);
    # иначе — небольшая фиксированная пауза, чтобы хук-сцена не была нулевой.
    lead_guess = full_expected[0] if full_expected else total_sec / max(len(merged), 1)
    condition_sec = candidates[0] if candidates[0] < max(lead_guess, 2.0) else 1.0

    result = {
        "totalSec": round(total_sec, 3),
        "conditionSec": round(condition_sec, 3),
        "stepSec": [],
        "answerSec": round(needed["answerSec"], 3),
        "correctAtSec": round(needed["answerSec"], 3),
        "checkAtSec": round(needed["checkAtSec"], 3),
        "outroSec": round(needed["outroSec"], 3),
        "checkLines": check_lines,
        "_debug": {
            "sentenceCount": len(merged),
            "answerIdx": answer_idx,
            "ctaIdx": cta_idx,
            "candidates": candidates,
            "fullExpected": [round(x, 2) for x in full_expected],
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
