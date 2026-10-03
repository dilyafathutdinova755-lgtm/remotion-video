#!/usr/bin/env python3
"""
Автоматическая разметка озвучки для динамического рендера (GitHub Actions).

Тот же метод, что использовался вручную весь проект: паузы находятся
ffmpeg silencedetect, ожидаемые позиции границ — по доле слов от общего
числа, DP выравнивает найденные паузы под ожидаемые позиции минимизируя
сумму квадратов ошибки (см. PLAYBOOK.md §11a).

Фиксированный порядок сегментов voiceover_text (n8n собирает именно так,
см. PLAYBOOK.md §11b) — для технических/естественно-научных предметов
(математика, физика, химия, информатика, биология, география):

    1. вступление («Решаем задание 6 по русскому языку...»)
    2. condition_text — дословно, тем же текстом, что на экране
    3. explanation — объяснение решения
    4. «Ответ: …» (с любым тире/двоеточием после)
    5. CTA («Скачивай бесплатно...»)

Для гуманитарных предметов (русский язык, литература, история,
обществознание) сегмента 4 нет вовсе — после краткого explanation сразу
идёт CTA, без отдельной озвученной фразы «Ответ: ...» (см. PLAYBOOK.md
§11d). Это определяется по --subject: если он похож на гуманитарный (по
тем же ключевым словам, что в normalize-for-voiceover.mjs/subjectKeyFromText
— русск/литератур/истор/обществ) И в тексте не нашлось предложения
«Ответ:», сегмент 4 считается ОТСУТСТВУЮЩИМ намеренно, а не ошибкой; если
--subject не передан или не гуманитарный — «Ответ:» по-прежнему обязателен
(полная обратная совместимость со старыми вызовами). Если гуманитарный
предмет всё же прислал «Ответ:» (переходный период, старые записанные
ролики) — используется он, как раньше: отсутствие маркера — это
единственное, что меняет поведение.

Заметьте: explanation звучит ДО «Ответ:» (когда он есть), а не после — под
ответом на экране (AnswerScene) объяснение всё равно показывается (см.
checkLines ниже), но озвучено оно уже было, пока на экране ещё висела
карточка с условием. Опорные точки, которые скрипт ищет в тексте:
  - конец condition_text (нужен --condition-text — тот же текст, что ушёл
    в task_data.condition_text, дословно; ищется как подстрока в
    накапливаемых предложениях, без него не отличить «условие» от
    «объяснение» внутри одного и того же блока перед «Ответ:»/CTA);
  - «Ответ:» — начало сегмента 4 (технические — всегда; гуманитарные —
    если он реально есть в тексте);
  - «Скачивай бесплатно» — начало финального CTA-сегмента.

Когда «Ответ:» отсутствует (гуманитарные), отдельного AnswerScene у ролика
вообще нет — answerSec/correctAtSec/checkAtSec в результат не попадают
(ключи отсутствуют в JSON, а не равны null/0). ProblemScene в этом случае
держится от condition_text до самого CTA (все explanation звучит поверх
неё), и сразу после неё идёт Outro — так же, как устроены сцены без
audioSync вовсе, только с точным таймингом из реального аудио, а не
оценкой по словам. Никакого отдельного резервирования секунд под
AnswerScene не делается: их попросту нет, экран с одним ответом не
появляется. build-dynamic-task.mjs при отсутствии answerSec сам выставляет
TaskDef.answerRecap = false — этого достаточно, чтобы buildScenes()
(timing.ts) не добавил AnswerScene в Series.

Если текст не соответствует ожидаемому шаблону — скрипт завершается с
ошибкой (код 1), а не с угадыванием: лучше видимый сбой CI, чем тихо
разъехавшийся по времени ролик.

--text должен быть ТЕМ ЖЕ текстом, который реально ушёл в TTS (то есть уже
пропущенным через normalizeForVoiceover.mjs — с «6», а не «шесть», иначе
подсчёт слов для тайминга разойдётся с тем, что на самом деле произнесено).
--display-text — необязательный, ИСХОДНЫЙ (не нормализованный) текст с
цифрами: если передан, и он, и --condition-text используются для
«checkLines» и поиска границы условия вместо --text, чтобы пояснение под
ответом на экране показывало «15», а не «пятнадцать» — нормализация нужна
только звуку, не отображаемому тексту. Число предложений в --display-text
должно совпадать с --text (так и есть, если единственная разница — это
цифры/слова: точки, «Ответ:» и CTA-маркер нормализация не трогает).

Использование:
    python3 align.py --text "<озвучка для TTS, числа словами>" \
        --display-text "<та же озвучка, числа цифрами>" \
        --condition-text "<task_data.condition_text, как на экране>" \
        --audio path/to.mp3 --ffmpeg path/to/ffmpeg > audiosync.json
"""

import argparse
import json
import re
import subprocess
import sys


def split_sentences(text: str):
    text = text.strip()
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
        [ffmpeg, "-i", audio_path],
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
    ).stderr.decode("utf-8", "ignore")

    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", out)

    if not m:
        raise RuntimeError(
            "Не удалось прочитать длительность аудио из ffmpeg -i"
        )

    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def silence_ends(
    ffmpeg,
    audio_path,
    noise_db=-20,
    min_duration=0.3,
):
    out = subprocess.run(
        [
            ffmpeg,
            "-i",
            audio_path,
            "-af",
            f"silencedetect=noise={noise_db}dB:d={min_duration}",
            "-f",
            "null",
            "-",
        ],
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
    ).stderr.decode("utf-8", "ignore")

    return [
        float(x)
        for x in re.findall(
            r"silence_end:\s*([\d.]+)",
            out,
        )
    ]


ANSWER_RE = re.compile(
    r"^ответ\s*[:\-—]",
    re.IGNORECASE,
)

CTA_RE = re.compile(
    r"скачивай\W*бесплатно",
    re.IGNORECASE,
)

HUMANITIES_KEYWORDS = (
    "русск",
    "литератур",
    "истор",
    "обществ",
)


def is_humanities(subject) -> bool:
    s = (subject or "").lower()
    return any(k in s for k in HUMANITIES_KEYWORDS)


def normalize_yo(text: str) -> str:
    return text.replace("ё", "е").replace("Ё", "Е")


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def find_condition_end_idx(sentences, condition_text):
    target = normalize_yo(
        normalize_ws(condition_text)
    ).lower()

    if not target:
        return None

    acc = ""

    for i, s in enumerate(sentences):
        acc = f"{acc} {s}".strip() if acc else s

        norm_acc = normalize_yo(
            normalize_ws(acc)
        ).lower()

        if target in norm_acc:
            return i

    return None


def main():
    ap = argparse.ArgumentParser()

    ap.add_argument(
        "--mode",
        choices=[
            "legacy",
            "four-slides-v1",
            "profile-math-steps-v2",
        ],
        default="legacy",
        help=(
            "legacy (по умолчанию, полная обратная совместимость), "
            "four-slides-v1 или profile-math-steps-v2."
        ),
    )

    ap.add_argument("--text")
    ap.add_argument(
        "--display-text",
        default=None,
    )
    ap.add_argument("--condition-text")

    ap.add_argument(
        "--subject",
        default="",
        help=(
            "task_data.subject как есть "
            "(например «Русский язык»)."
        ),
    )

    ap.add_argument("--audio")
    ap.add_argument(
        "--ffmpeg",
        required=True,
    )
    ap.add_argument(
        "--noise-db",
        type=int,
        default=-20,
    )

    ap.add_argument(
        "--task-data",
        help=(
            "Путь к task_data.json "
            "(обязателен для mode=four-slides-v1)."
        ),
    )

    ap.add_argument("--audio-in")
    ap.add_argument("--audio-out")

    args = ap.parse_args()

    if args.mode == "four-slides-v1":
        run_four_slides_v1(args)
        return

    if args.mode == "profile-math-steps-v2":
        run_profile_math_steps_v2(args)
        return

    run_legacy(args)


def run_legacy(args):
    for flag, value in (
        ("--text", args.text),
        ("--condition-text", args.condition_text),
        ("--audio", args.audio),
    ):
        if not value:
            print(
                f"ОШИБКА: обязательный флаг {flag} "
                "не передан (mode=legacy).",
                file=sys.stderr,
            )
            sys.exit(1)

    humanities = is_humanities(
        args.subject
    )

    sentences = split_sentences(
        args.text
    )

    if len(sentences) < 3:
        print(
            f"ОШИБКА: в тексте всего {len(sentences)} "
            "предложений — похоже не на шаблон "
            "условие/ответ/CTA, разметить не могу.",
            file=sys.stderr,
        )
        sys.exit(1)

    answer_idx = next(
        (
            i
            for i, s in enumerate(sentences)
            if ANSWER_RE.match(s)
        ),
        None,
    )

    cta_idx = next(
        (
            i
            for i, s in enumerate(sentences)
            if CTA_RE.search(
                normalize_yo(s)
            )
        ),
        None,
    )

    if (
        answer_idx is None
        and not humanities
    ):
        print(
            "ОШИБКА: не нашёл предложение, "
            "начинающееся с «Ответ:» — без него "
            "невозможно автоматически найти границу "
            "условие → ответ.",
            file=sys.stderr,
        )
        sys.exit(1)

    if cta_idx is None:
        print(
            "ОШИБКА: не нашёл фразу "
            "«Скачивай бесплатно» — без неё "
            "невозможно найти границу перед "
            "финальным экраном.",
            file=sys.stderr,
        )
        sys.exit(1)

    answer_marker_present = (
        answer_idx is not None
    )

    if (
        answer_marker_present
        and cta_idx <= answer_idx
    ):
        print(
            "ОШИБКА: фраза «Скачивай бесплатно» "
            "стоит раньше «Ответ:» — порядок текста "
            "не соответствует ожидаемому шаблону.",
            file=sys.stderr,
        )
        sys.exit(1)

    explanation_end_idx = (
        answer_idx
        if answer_marker_present
        else cta_idx
    )

    display_sentences = sentences

    if args.display_text is not None:
        display_sentences = split_sentences(
            args.display_text
        )

        if (
            len(display_sentences)
            != len(sentences)
        ):
            print(
                "ОШИБКА: --display-text и --text "
                "разбились на разное число предложений "
                f"({len(display_sentences)} vs "
                f"{len(sentences)}) — разметить "
                "не могу.",
                file=sys.stderr,
            )
            sys.exit(1)

    condition_end_idx = (
        find_condition_end_idx(
            display_sentences,
            args.condition_text,
        )
    )

    if condition_end_idx is None:
        print(
            "ОШИБКА: не нашёл condition_text "
            "внутри озвучки.",
            file=sys.stderr,
        )
        sys.exit(1)

    if (
        condition_end_idx
        >= explanation_end_idx
    ):
        boundary = (
            "«Ответ:»"
            if answer_marker_present
            else "CTA («Скачивай бесплатно»)"
        )

        print(
            f"ОШИБКА: condition_text заканчивается "
            f"не раньше {boundary}.",
            file=sys.stderr,
        )
        sys.exit(1)

    merged = (
        sentences[: cta_idx + 1]
        + [
            "".join(
                sentences[cta_idx + 1 :]
            )
        ]
    )

    merged = [
        s for s in merged if s
    ]

    display_merged = (
        display_sentences[
            : cta_idx + 1
        ]
        + [
            "".join(
                display_sentences[
                    cta_idx + 1 :
                ]
            )
        ]
    )

    display_merged = [
        s
        for s in display_merged
        if s
    ]

    words = [
        len(s.split())
        for s in merged
    ]

    cum = []
    acc = 0

    for w in words:
        acc += w
        cum.append(acc)

    total_words = cum[-1]

    total_sec = ffmpeg_duration(
        args.ffmpeg,
        args.audio,
    )

    # LEGACY СОХРАНЯЕТ СТАРЫЙ ПОРОГ 0.3 СЕКУНДЫ.
    candidates = silence_ends(
        args.ffmpeg,
        args.audio,
        args.noise_db,
    )

    if not candidates:
        print(
            "ОШИБКА: silencedetect не нашёл "
            "ни одной паузы ≥0.3с — "
            "проверьте файл или понизьте порог.",
            file=sys.stderr,
        )
        sys.exit(1)

    full_expected = [
        cum[i]
        / total_words
        * total_sec
        for i in range(
            len(merged) - 1
        )
    ]

    needed = {}
    needed_idx = []

    has_trailing_after_answer = False

    if answer_marker_present:
        if answer_idx > 0:
            needed_idx.append(
                (
                    "answerSec",
                    answer_idx - 1,
                )
            )
        else:
            needed[
                "answerSec"
            ] = 0.0

        has_trailing_after_answer = (
            answer_idx + 1
            < cta_idx
        )

        if has_trailing_after_answer:
            needed_idx.append(
                (
                    "checkAtSec",
                    answer_idx,
                )
            )

    needed_idx.append(
        (
            "outroSec",
            cta_idx - 1,
        )
    )

    check_lines = [
        s
        for s in display_merged[
            condition_end_idx + 1 :
            explanation_end_idx
        ]
    ]

    if needed_idx:
        idxs = [
            i
            for _, i in needed_idx
        ]

        sub_expected = [
            full_expected[i]
            for i in idxs
        ]

        aligned = align(
            sub_expected,
            candidates,
        )

        for (
            label,
            _
        ), value in zip(
            needed_idx,
            aligned,
        ):
            needed[label] = value

    if (
        answer_marker_present
        and not has_trailing_after_answer
    ):
        needed[
            "checkAtSec"
        ] = needed[
            "answerSec"
        ]

    lead_guess = (
        full_expected[0]
        if full_expected
        else total_sec
        / max(
            len(merged),
            1,
        )
    )

    condition_sec = (
        candidates[0]
        if candidates[0]
        < max(
            lead_guess,
            2.0,
        )
        else 1.0
    )

    result = {
        "totalSec": round(
            total_sec,
            3,
        ),
        "conditionSec": round(
            condition_sec,
            3,
        ),
        "stepSec": [],
    }

    if answer_marker_present:
        result[
            "answerSec"
        ] = round(
            needed[
                "answerSec"
            ],
            3,
        )

        result[
            "correctAtSec"
        ] = round(
            needed[
                "answerSec"
            ],
            3,
        )

        result[
            "checkAtSec"
        ] = round(
            needed[
                "checkAtSec"
            ],
            3,
        )

    result[
        "outroSec"
    ] = round(
        needed[
            "outroSec"
        ],
        3,
    )

    result[
        "checkLines"
    ] = check_lines

    result[
        "_debug"
    ] = {
        "sentenceCount": len(
            merged
        ),
        "conditionEndIdx": (
            condition_end_idx
        ),
        "answerIdx": answer_idx,
        "ctaIdx": cta_idx,
        "humanities": humanities,
        "answerMarkerPresent": (
            answer_marker_present
        ),
        "candidates": candidates,
        "fullExpected": [
            round(x, 2)
            for x in full_expected
        ],
    }

    print(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        )
    )


def audio_format(
    ffmpeg,
    audio_path,
):
    out = subprocess.run(
        [
            ffmpeg,
            "-i",
            audio_path,
        ],
        stderr=subprocess.PIPE,
        stdout=subprocess.PIPE,
    ).stderr.decode(
        "utf-8",
        "ignore",
    )

    m = re.search(
        r"Audio:.*?(\d+)\s*Hz,\s*"
        r"(mono|stereo|[\d.]+\s*channels?)",
        out,
    )

    if not m:
        raise RuntimeError(
            "Не удалось определить частоту "
            "дискретизации/каналы аудио "
            "из ffmpeg -i"
        )

    rate = int(
        m.group(1)
    )

    chan_str = m.group(2)

    if chan_str == "mono":
        channels = 1
    elif chan_str == "stereo":
        channels = 2
    else:
        channels = int(
            re.search(
                r"\d+",
                chan_str,
            ).group()
        )

    return rate, channels


def splice_silence(
    ffmpeg,
    audio_in,
    audio_out,
    cut_sec,
    silence_sec,
):
    rate, channels = audio_format(
        ffmpeg,
        audio_in,
    )

    cl = (
        "mono"
        if channels == 1
        else "stereo"
    )

    filter_complex = (
        f"[0:a]atrim=end={cut_sec:.3f},"
        "asetpts=PTS-STARTPTS[a1];"
        f"[0:a]atrim=start={cut_sec:.3f},"
        "asetpts=PTS-STARTPTS[a2];"
        f"anullsrc=r={rate}:cl={cl}:"
        f"d={silence_sec:.3f}[sil];"
        "[a1][sil][a2]"
        "concat=n=3:v=0:a=1[out]"
    )

    cmd = [
        ffmpeg,
        "-y",
        "-i",
        audio_in,
        "-filter_complex",
        filter_complex,
        "-map",
        "[out]",
        audio_out,
    ]

    proc = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    if proc.returncode != 0:
        print(
            "ОШИБКА: ffmpeg не смог "
            "вставить тишину в аудио:",
            file=sys.stderr,
        )

        print(
            proc.stderr.decode(
                "utf-8",
                "ignore",
            )[-2000:],
            file=sys.stderr,
        )

        sys.exit(1)


REVEAL_SECONDS_PER_LINE = 0.7


def split_condition_lines(
    condition_text,
):
    return [
        line.strip()
        for line in re.split(
            r"\r?\n",
            condition_text or "",
        )
        if line.strip()
    ]


def run_four_slides_v1(args):
    """
    Разметка для
    video_structure_version="four-slides-v1".

    Spoken-секции берутся напрямую
    из task_data.json:

      intro_text
      task_voiceover_text
      answer_voiceover_text
      cta_text

    condition_text не ищется внутри аудио.

    При read_task_aloud=true:
      intro → task_voiceover_text
      → 5 секунд тишины
      → answer → CTA

    При read_task_aloud=false:
      после intro вставляется
      reveal_seconds + pause_seconds.

    Для four-slides-v1 используется
    более короткий порог определения
    межсегментной тишины — 0.25 секунды.
    Legacy остаётся на 0.3 секунды.
    """

    if not args.task_data:
        print(
            "ОШИБКА: --task-data обязателен "
            "для --mode four-slides-v1.",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(
        args.task_data,
        "r",
        encoding="utf-8",
    ) as f:
        task_data = json.load(f)

    intro_text = str(
        task_data.get(
            "intro_text"
        )
        or ""
    ).strip()

    task_voiceover_text = str(
        task_data.get(
            "task_voiceover_text"
        )
        or ""
    ).strip()

    answer_text = str(
        task_data.get(
            "answer_voiceover_text"
        )
        or ""
    ).strip()

    cta_text = str(
        task_data.get(
            "cta_text"
        )
        or ""
    ).strip()

    condition_text = (
        task_data.get(
            "condition_text"
        )
        or ""
    )

    read_aloud = (
        task_data.get(
            "read_task_aloud"
        )
        is True
    )

    pause_seconds = (
        task_data.get(
            "pause_seconds"
        )
    )

    try:
        pause_seconds = float(
            pause_seconds
        )
    except (
        TypeError,
        ValueError,
    ):
        pause_seconds = 0.0

    for flag, value in (
        (
            "--audio-in",
            args.audio_in,
        ),
        (
            "--audio-out",
            args.audio_out,
        ),
    ):
        if not value:
            print(
                f"ОШИБКА: обязательный флаг "
                f"{flag} не передан "
                "(mode=four-slides-v1).",
                file=sys.stderr,
            )
            sys.exit(1)

    if not (
        pause_seconds > 0
    ):
        print(
            "ОШИБКА: "
            "task_data.pause_seconds "
            "должен быть положительным "
            "числом, получено "
            f"{task_data.get('pause_seconds')!r}.",
            file=sys.stderr,
        )
        sys.exit(1)

    if read_aloud:
        missing = [
            name
            for name, value in (
                (
                    "intro_text",
                    intro_text,
                ),
                (
                    "task_voiceover_text",
                    task_voiceover_text,
                ),
                (
                    "answer_voiceover_text",
                    answer_text,
                ),
                (
                    "cta_text",
                    cta_text,
                ),
            )
            if not value
        ]

        if missing:
            print(
                "ОШИБКА: "
                "read_task_aloud=true "
                "требует непустые поля: "
                f"{', '.join(missing)}.",
                file=sys.stderr,
            )
            sys.exit(1)

    else:
        missing = [
            name
            for name, value in (
                (
                    "intro_text",
                    intro_text,
                ),
                (
                    "answer_voiceover_text",
                    answer_text,
                ),
                (
                    "cta_text",
                    cta_text,
                ),
            )
            if not value
        ]

        if missing:
            print(
                "ОШИБКА: "
                "read_task_aloud=false "
                "требует непустые поля: "
                f"{', '.join(missing)}.",
                file=sys.stderr,
            )
            sys.exit(1)

        if task_voiceover_text:
            print(
                "ОШИБКА: "
                "read_task_aloud=false, "
                "но task_voiceover_text непуст.",
                file=sys.stderr,
            )
            sys.exit(1)

    reveal_seconds = 0.0

    if not read_aloud:
        lines = split_condition_lines(
            condition_text
        )

        reveal_seconds = (
            len(lines)
            * REVEAL_SECONDS_PER_LINE
        )

        if not (
            reveal_seconds > 0
        ):
            print(
                "ОШИБКА: "
                "read_task_aloud=false "
                "требует непустой "
                "condition_text.",
                file=sys.stderr,
            )
            sys.exit(1)

    segments = [
        (
            "intro",
            intro_text,
        )
    ]

    if read_aloud:
        segments.append(
            (
                "task",
                task_voiceover_text,
            )
        )

    segments.append(
        (
            "answer",
            answer_text,
        )
    )

    segments.append(
        (
            "cta",
            cta_text,
        )
    )

    names = [
        name
        for name, _ in segments
    ]

    word_counts = [
        len(text.split())
        for _, text in segments
    ]

    if sum(
        word_counts
    ) == 0:
        print(
            "ОШИБКА: во всех сегментах "
            "суммарно 0 слов — "
            "размётка невозможна.",
            file=sys.stderr,
        )
        sys.exit(1)

    cum = []
    acc = 0

    for wc in word_counts:
        acc += wc
        cum.append(acc)

    total_words = cum[-1]

    total_sec = ffmpeg_duration(
        args.ffmpeg,
        args.audio_in,
    )

    # ==================================================
    # ВАЖНО:
    # Только FOUR-SLIDES-V1 использует 0.25 секунды.
    #
    # На реальном аудио ElevenLabs граница после
    # instruction дала паузу ~0.269 сек.
    #
    # Старый порог 0.3 её отбрасывал.
    # Legacy выше остаётся без изменений на 0.3.
    # ==================================================
    candidates = silence_ends(
        args.ffmpeg,
        args.audio_in,
        args.noise_db,
        min_duration=0.25,
    )

    if not candidates:
        print(
            "ОШИБКА: silencedetect не нашёл "
            "ни одной паузы ≥0.25с "
            "в исходном аудио — "
            "границы сегментов "
            "не определить.",
            file=sys.stderr,
        )
        sys.exit(1)

    full_expected = [
        cum[i]
        / total_words
        * total_sec
        for i in range(
            len(segments) - 1
        )
    ]

    cut_idx = (
        names.index("task")
        if read_aloud
        else names.index("intro")
    )

    answer_end_idx = (
        names.index("answer")
    )

    needed_idx = sorted(
        {
            0,
            cut_idx,
            answer_end_idx,
        }
    )

    sub_expected = [
        full_expected[i]
        for i in needed_idx
    ]

    aligned = align(
        sub_expected,
        candidates,
    )

    matched = dict(
        zip(
            needed_idx,
            aligned,
        )
    )

    TOLERANCE_SEC = 2.0

    for idx in needed_idx:
        expected = (
            full_expected[idx]
        )

        got = matched[idx]

        if (
            abs(
                got - expected
            )
            > TOLERANCE_SEC
        ):
            print(
                "ОШИБКА: не удалось "
                "надёжно определить границу "
                "после сегмента "
                f'"{names[idx]}" — '
                "ожидали паузу около "
                f"{expected:.2f}с "
                "по доле слов, ближайшая "
                "реальная пауза "
                f"{got:.2f}с "
                "(расхождение "
                f"{abs(got - expected):.2f}с "
                "превышает допуск "
                f"{TOLERANCE_SEC}с). "
                "Разметить нельзя "
                "без угадывания.",
                file=sys.stderr,
            )
            sys.exit(1)

    intro_end_sec = (
        matched[0]
    )

    cut_sec = (
        matched[cut_idx]
    )

    answer_end_sec = (
        matched[
            answer_end_idx
        ]
    )

    silence_duration = (
        pause_seconds
        if read_aloud
        else (
            reveal_seconds
            + pause_seconds
        )
    )

    splice_silence(
        args.ffmpeg,
        args.audio_in,
        args.audio_out,
        cut_sec,
        silence_duration,
    )

    new_total_sec = (
        total_sec
        + silence_duration
    )

    new_answer_sec = (
        cut_sec
        + silence_duration
    )

    new_outro_sec = (
        answer_end_sec
        + silence_duration
    )

    spliced_duration = (
        ffmpeg_duration(
            args.ffmpeg,
            args.audio_out,
        )
    )

    if (
        abs(
            spliced_duration
            - new_total_sec
        )
        > 1.0
    ):
        print(
            "ОШИБКА: после вставки "
            "тишины длительность файла "
            f"({spliced_duration:.2f}с) "
            "не сходится с расчётной "
            f"({new_total_sec:.2f}с) — "
            "склейка аудио, похоже, "
            "не удалась.",
            file=sys.stderr,
        )
        sys.exit(1)

    result = {
        "totalSec": round(
            new_total_sec,
            3,
        ),
        "introSec": round(
            intro_end_sec,
            3,
        ),
        "answerSec": round(
            new_answer_sec,
            3,
        ),
        "outroSec": round(
            new_outro_sec,
            3,
        ),
        "audioOut": (
            args.audio_out
        ),
        "_debug": {
            "readTaskAloud": (
                read_aloud
            ),
            "segments": names,
            "wordCounts": (
                word_counts
            ),
            "candidates": (
                candidates
            ),
            "fullExpected": [
                round(x, 2)
                for x in full_expected
            ],
            "matched": {
                names[i]: round(
                    v,
                    3,
                )
                for i, v
                in matched.items()
            },
            "cutSec": round(
                cut_sec,
                3,
            ),
            "silenceDuration": round(
                silence_duration,
                3,
            ),
        },
    }

    print(
        json.dumps(
            result,
            ensure_ascii=False,
            indent=2,
        )
    )


def run_profile_math_steps_v2(args):
    """
    Разметка для video_structure_version="profile-math-steps-v2" (см.
    scripts/dynamic-task/profile-math-steps.mjs и
    src/ege/scenes/profile-math-steps/).

    В отличие от legacy и four-slides-v1, здесь ЛЮБОЕ количество spoken-
    сегментов, а не фиксированный набор: narration_segments — explicit,
    уже упорядоченный n8n'ом список {id, kind, text, tts_text, step_id?}
    (intro → task → solution×N → cta). tts_text — ТОЧНО тот текст, что
    реально ушёл в ElevenLabs (нормализацию делает отдельный узел n8n —
    этот скрипт её не трогает и не пересчитывает).

    Нужны границы МЕЖДУ КАЖДОЙ ПАРОЙ соседних сегментов (N-1 границ для N
    сегментов) — не выборочные 2-3, как в four-slides-v1, а все: каждый
    solution-сегмент становится отдельным слайдом-шагом, и у каждого
    должна быть собственная реальная (forced-alignment) граница начала.

    Пауза физически НЕ вставлена в исходное аудио (n8n намеренно её не
    кладёт — см. постановку задачи) — ровно pause_seconds тишины
    вставляется здесь, сразу после сегмента "task" (перед первым "solution"
    сегментом), тем же способом (splice_silence/ffmpeg), что и в
    four-slides-v1. Все границы ПОСЛЕ точки вставки сдвигаются на
    +pause_seconds.

    Как и в four-slides-v1: TOLERANCE_SEC — confidence gate, запрещающий
    угадывание по проценту длины текста. Если ЛЮБАЯ из границ не находит
    рядом правдоподобную реальную паузу — fail-fast, а не приблизительный
    результат.
    """

    if not args.task_data:
        print(
            "ОШИБКА: --task-data обязателен для --mode profile-math-steps-v2.",
            file=sys.stderr,
        )
        sys.exit(1)

    with open(args.task_data, "r", encoding="utf-8") as f:
        task_data = json.load(f)

    narration_segments = task_data.get("narration_segments")
    if not isinstance(narration_segments, list) or len(narration_segments) < 4:
        print(
            "ОШИБКА: narration_segments должен быть массивом минимум из 4 "
            "сегментов (intro, task, хотя бы один solution, cta).",
            file=sys.stderr,
        )
        sys.exit(1)

    names = []
    kinds = []
    texts = []
    for i, seg in enumerate(narration_segments):
        seg_id = seg.get("id") if isinstance(seg, dict) else None
        kind = seg.get("kind") if isinstance(seg, dict) else None
        tts_text = seg.get("tts_text") if isinstance(seg, dict) else None
        if not seg_id or not kind or not tts_text or not str(tts_text).strip():
            print(
                f"ОШИБКА: narration_segments[{i}] не содержит непустых "
                "id/kind/tts_text.",
                file=sys.stderr,
            )
            sys.exit(1)
        names.append(str(seg_id))
        kinds.append(str(kind))
        texts.append(str(tts_text).strip())

    if kinds[0] != "intro" or kinds[1] != "task" or kinds[-1] != "cta":
        print(
            "ОШИБКА: narration_segments должен идти в порядке "
            'intro, task, solution×N, cta — получено kinds: '
            f"{kinds}.",
            file=sys.stderr,
        )
        sys.exit(1)

    pause_seconds = task_data.get("pause_seconds")
    try:
        pause_seconds = float(pause_seconds)
    except (TypeError, ValueError):
        pause_seconds = 0.0

    if not (pause_seconds > 0):
        print(
            "ОШИБКА: task_data.pause_seconds должен быть положительным "
            f"числом, получено {task_data.get('pause_seconds')!r}.",
            file=sys.stderr,
        )
        sys.exit(1)

    for flag, value in (("--audio-in", args.audio_in), ("--audio-out", args.audio_out)):
        if not value:
            print(
                f"ОШИБКА: обязательный флаг {flag} не передан "
                "(mode=profile-math-steps-v2).",
                file=sys.stderr,
            )
            sys.exit(1)

    word_counts = [len(t.split()) for t in texts]
    if sum(word_counts) == 0:
        print(
            "ОШИБКА: во всех сегментах суммарно 0 слов — размётка невозможна.",
            file=sys.stderr,
        )
        sys.exit(1)

    cum = []
    acc = 0
    for wc in word_counts:
        acc += wc
        cum.append(acc)
    total_words = cum[-1]

    total_sec = ffmpeg_duration(args.ffmpeg, args.audio_in)

    # Тот же порог 0.25с, что и у four-slides-v1 (см. run_four_slides_v1) —
    # реальные межсегментные паузы ElevenLabs в этом пайплайне короче
    # старого 0.3с legacy-порога. Legacy выше не меняется.
    candidates = silence_ends(args.ffmpeg, args.audio_in, args.noise_db, min_duration=0.25)
    if not candidates:
        print(
            "ОШИБКА: silencedetect не нашёл ни одной паузы ≥0.25с в "
            "исходном аудио — границы сегментов не определить.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Нужны ВСЕ N-1 границ (не выборочные, как в four-slides-v1) — у
    # каждого solution-сегмента свой слайд, и каждому нужна своя реальная
    # граница начала.
    full_expected = [cum[i] / total_words * total_sec for i in range(len(names) - 1)]

    aligned = align(full_expected, candidates)

    TOLERANCE_SEC = 2.0
    for i, (expected, got) in enumerate(zip(full_expected, aligned)):
        if abs(got - expected) > TOLERANCE_SEC:
            print(
                "ОШИБКА: не удалось надёжно определить границу между "
                f'сегментами "{names[i]}" и "{names[i + 1]}" — ожидали паузу '
                f"около {expected:.2f}с по доле слов, ближайшая реальная "
                f"пауза {got:.2f}с (расхождение {abs(got - expected):.2f}с "
                f"превышает допуск {TOLERANCE_SEC}с). Разметить нельзя без "
                "угадывания.",
                file=sys.stderr,
            )
            sys.exit(1)

    # boundaries[i] — граница между сегментом i и сегментом i+1, на исходной
    # (ещё без вставленной тишины) временной шкале.
    boundaries = list(aligned)

    # Пауза вставляется сразу после "task" (индекс 1) — перед первым
    # "solution"-сегментом (индекс 2). cut_sec — это boundaries[1].
    cut_idx = 1
    cut_sec = boundaries[cut_idx]

    splice_silence(args.ffmpeg, args.audio_in, args.audio_out, cut_sec, pause_seconds)

    new_total_sec = total_sec + pause_seconds

    spliced_duration = ffmpeg_duration(args.ffmpeg, args.audio_out)
    if abs(spliced_duration - new_total_sec) > 1.0:
        print(
            f"ОШИБКА: после вставки тишины длительность файла "
            f"({spliced_duration:.2f}с) не сходится с расчётной "
            f"({new_total_sec:.2f}с) — склейка аудио, похоже, не удалась.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Границы ПОСЛЕ (и включая) точки вставки сдвигаются на +pause_seconds;
    # до неё — не трогаются.
    shifted_boundaries = [
        b + pause_seconds if i >= cut_idx else b for i, b in enumerate(boundaries)
    ]

    starts = [0.0] + shifted_boundaries
    ends = shifted_boundaries + [new_total_sec]

    segments_out = []
    for i, seg in enumerate(narration_segments):
        entry = {
            "id": names[i],
            "kind": kinds[i],
            "startSec": round(starts[i], 3),
            "endSec": round(ends[i], 3),
        }
        if kinds[i] == "solution":
            entry["stepId"] = str(seg.get("step_id"))
        segments_out.append(entry)

    result = {
        "totalSec": round(new_total_sec, 3),
        "pauseSeconds": round(pause_seconds, 3),
        "segments": segments_out,
        "audioOut": args.audio_out,
        "_debug": {
            "names": names,
            "kinds": kinds,
            "wordCounts": word_counts,
            "candidates": candidates,
            "fullExpected": [round(x, 2) for x in full_expected],
            "boundaries": [round(x, 3) for x in boundaries],
            "cutSec": round(cut_sec, 3),
        },
    }

    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
