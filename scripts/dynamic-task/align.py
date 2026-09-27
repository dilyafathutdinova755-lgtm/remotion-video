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

# Те же ключевые слова и та же группировка предметов, что в
# scripts/dynamic-task/normalize-for-voiceover.mjs (subjectKeyFromText/
# SUBJECT_KEYS: russian/literature/history/social = гуманитарные, всё
# остальное — технические/естественно-научные). Python не может
# импортировать .mjs напрямую, поэтому список продублирован здесь — он
# короткий и фиксированный (см. задание пользователя: ровно эти 4 предмета
# гуманитарные), держите в синхроне при правке normalize-for-voiceover.mjs.
HUMANITIES_KEYWORDS = ("русск", "литератур", "истор", "обществ")


def is_humanities(subject) -> bool:
    s = (subject or "").lower()
    return any(k in s for k in HUMANITIES_KEYWORDS)


def normalize_yo(text: str) -> str:
    return text.replace("ё", "е").replace("Ё", "Е")


def normalize_ws(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip())


def find_condition_end_idx(sentences, condition_text):
    """Индекс предложения, на котором заканчивается condition_text —
    накапливаем предложения по одному и проверяем, содержит ли накопленный
    текст condition_text как подстроку (без учёта регистра, ё/е и лишних
    пробелов). condition_text может занимать несколько предложений — тогда
    вернётся индекс последнего из них."""
    target = normalize_yo(normalize_ws(condition_text)).lower()
    if not target:
        return None
    acc = ""
    for i, s in enumerate(sentences):
        acc = f"{acc} {s}".strip() if acc else s
        norm_acc = normalize_yo(normalize_ws(acc)).lower()
        if target in norm_acc:
            return i
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--mode",
        choices=["legacy", "four-slides-v1"],
        default="legacy",
        help="legacy (по умолчанию, полная обратная совместимость) или "
        "four-slides-v1 (см. run_four_slides_v1).",
    )
    # legacy-режим — required=True сознательно не ставится на уровне
    # argparse (иначе four-slides-v1 не смог бы обойтись без них); проверка
    # обязательности — вручную, внутри run_legacy(), сразу после разбора.
    ap.add_argument("--text")
    ap.add_argument("--display-text", default=None)
    ap.add_argument("--condition-text")
    ap.add_argument(
        "--subject",
        default="",
        help=(
            "task_data.subject как есть (например «Русский язык»). Не передан "
            "или не похож на гуманитарный (см. HUMANITIES_KEYWORDS) — «Ответ:» "
            "по-прежнему обязателен (обратная совместимость)."
        ),
    )
    ap.add_argument("--audio")
    ap.add_argument("--ffmpeg", required=True)
    ap.add_argument("--noise-db", type=int, default=-20)

    # four-slides-v1 — читает spoken-секции (intro_text/task_voiceover_text/
    # answer_voiceover_text/cta_text/read_task_aloud/pause_seconds) напрямую
    # из task_data.json, а не из отдельных CLI-флагов (см. докстринг
    # run_four_slides_v1) — так длинные тексты не проходят через bash-
    # аргументы вовсе и не могут разъехаться на кавычках/переносах строк.
    ap.add_argument("--task-data", help="Путь к task_data.json (обязателен для mode=four-slides-v1).")
    ap.add_argument("--audio-in")
    ap.add_argument("--audio-out")

    args = ap.parse_args()

    if args.mode == "four-slides-v1":
        run_four_slides_v1(args)
        return

    run_legacy(args)


def run_legacy(args):
    for flag, value in (("--text", args.text), ("--condition-text", args.condition_text), ("--audio", args.audio)):
        if not value:
            print(f"ОШИБКА: обязательный флаг {flag} не передан (mode=legacy).", file=sys.stderr)
            sys.exit(1)

    humanities = is_humanities(args.subject)

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
    if answer_idx is None and not humanities:
        print(
            "ОШИБКА: не нашёл предложение, начинающееся с «Ответ:» — без него "
            "невозможно автоматически найти границу условие → ответ. Если это "
            "гуманитарный предмет без отдельной фразы «Ответ:» — передайте "
            "--subject (русский язык/литература/история/обществознание).",
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
    # answer_idx может отсутствовать намеренно — у гуманитарных без отдельной
    # фразы «Ответ:» граница «конец объяснения» совпадает с началом CTA (см.
    # докстринг и synthesize_answer_sec ниже).
    answer_marker_present = answer_idx is not None
    if answer_marker_present and cta_idx <= answer_idx:
        print(
            "ОШИБКА: фраза «Скачивай бесплатно» стоит раньше «Ответ:» — "
            "порядок текста не соответствует ожидаемому шаблону.",
            file=sys.stderr,
        )
        sys.exit(1)
    explanation_end_idx = answer_idx if answer_marker_present else cta_idx

    # Раздельный, ИСХОДНЫЙ (с цифрами) список предложений — нужен и для
    # checkLines, и для поиска границы condition_text/explanation: числа
    # внутри condition_text нормализованы в --text («пятнадцать» вместо
    # «15»), а condition_text из task_data — всегда с цифрами, поэтому
    # искать его подстрокой нужно в НЕнормализованном тексте.
    display_sentences = sentences
    if args.display_text is not None:
        display_sentences = split_sentences(args.display_text)
        if len(display_sentences) != len(sentences):
            print(
                "ОШИБКА: --display-text и --text разбились на разное число "
                f"предложений ({len(display_sentences)} vs {len(sentences)}) — "
                "нормализация не должна была менять количество предложений, "
                "разметить не могу.",
                file=sys.stderr,
            )
            sys.exit(1)

    # Граница между condition_text и explanation: ищем, на каком предложении
    # заканчивается дословный condition_text. Без неё explanation и условие
    # неотличимы друг от друга — оба звучат до «Ответ:» (см. фиксированный
    # порядок в докстринге).
    condition_end_idx = find_condition_end_idx(display_sentences, args.condition_text)
    if condition_end_idx is None:
        print(
            "ОШИБКА: не нашёл condition_text внутри озвучки (--display-text/--text) — "
            "без этого не отличить условие от объяснения перед «Ответ:»/CTA. "
            "Проверьте, что condition_text вставлен в voiceover_text дословно.",
            file=sys.stderr,
        )
        sys.exit(1)
    if condition_end_idx >= explanation_end_idx:
        boundary = "«Ответ:»" if answer_marker_present else "CTA («Скачивай бесплатно»)"
        print(
            f"ОШИБКА: condition_text заканчивается не раньше {boundary} — "
            "порядок текста не соответствует ожидаемому шаблону "
            "(вступление → [instruction →] условие → объяснение → "
            + ("«Ответ:» → " if answer_marker_present else "")
            + "CTA).",
            file=sys.stderr,
        )
        sys.exit(1)

    # Схлопываем весь CTA-хвост в одно предложение (после первого совпадения) —
    # так же, как и в ручной разметке: между «Скачивай бесплатно.» и
    # «Ссылка в шапке профиля.» обычно нет отдельной паузы длиннее порога.
    merged = sentences[: cta_idx + 1] + ["".join(sentences[cta_idx + 1 :])]
    merged = [s for s in merged if s]
    # После схлопывания cta_idx не меняется (то же самое предложение);
    # answer_idx и condition_end_idx тоже не меняются — оба раньше cta_idx.

    # Для отображаемого текста (checkLines) берём тот же диапазон, но из
    # НЕнормализованного текста, если он передан — на экране число должно
    # быть цифрой, а не словом; звуку нужны слова, экрану — цифры.
    display_merged = display_sentences[: cta_idx + 1] + [
        "".join(display_sentences[cta_idx + 1 :])
    ]
    display_merged = [s for s in display_merged if s]

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
    # answerSec — перед предложением answer_idx, только когда «Ответ:»
    #   реально есть (технические — всегда; гуманитарные — в переходный
    #   период со старой записью). Когда его нет (новые гуманитарные без
    #   «Ответ:») — answerSec/correctAtSec/checkAtSec вообще не вычисляются
    #   и не попадают в result: отдельного AnswerScene у такого ролика нет,
    #   ProblemScene держится до самого CTA (см. докстринг).
    # checkAtSec — только если после «Ответ:» и до CTA есть ещё что-то
    #   озвученное (в фиксированном порядке объяснение звучит ДО ответа, так
    #   что обычно тут пусто, и AnswerScene просто открывается сразу с уже
    #   готовым текстом check — см. фолбэк ниже); checkLines при этом всё
    #   равно заполнены — они не зависят от того, звучит ли что-то ПОСЛЕ
    #   ответа, а зависят от того, что звучало ДО него (условие → объяснение).
    # outroSec — перед CTA-предложением (индекс cta_idx).
    needed = {}
    needed_idx = []
    has_trailing_after_answer = False
    if answer_marker_present:
        if answer_idx > 0:
            needed_idx.append(("answerSec", answer_idx - 1))
        else:
            needed["answerSec"] = 0.0  # ответ — первое предложение (короткий текст)
        has_trailing_after_answer = answer_idx + 1 < cta_idx
        if has_trailing_after_answer:
            needed_idx.append(("checkAtSec", answer_idx))
    needed_idx.append(("outroSec", cta_idx - 1))

    # Текст пояснения под ответом — те же предложения, что реально звучат
    # МЕЖДУ concluding condition_text и «Ответ:»/CTA (фиксированный порядок:
    # вступление → условие → объяснение → [«Ответ:» →] CTA, см. докстринг).
    # Явно НЕ выдумываем отдельное пояснение — берём то, что действительно
    # проговорено, слово в слово, из исходного (с цифрами) текста.
    check_lines = [s for s in display_merged[condition_end_idx + 1 : explanation_end_idx]]

    if needed_idx:
        idxs = [i for _, i in needed_idx]
        sub_expected = [full_expected[i] for i in idxs]
        aligned = align(sub_expected, candidates)
        for (label, _), value in zip(needed_idx, aligned):
            needed[label] = value

    if answer_marker_present and not has_trailing_after_answer:
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
    }
    if answer_marker_present:
        result["answerSec"] = round(needed["answerSec"], 3)
        result["correctAtSec"] = round(needed["answerSec"], 3)
        result["checkAtSec"] = round(needed["checkAtSec"], 3)
    result["outroSec"] = round(needed["outroSec"], 3)
    result["checkLines"] = check_lines
    result["_debug"] = {
        "sentenceCount": len(merged),
        "conditionEndIdx": condition_end_idx,
        "answerIdx": answer_idx,
        "ctaIdx": cta_idx,
        "humanities": humanities,
        "answerMarkerPresent": answer_marker_present,
        "candidates": candidates,
        "fullExpected": [round(x, 2) for x in full_expected],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


def audio_format(ffmpeg, audio_path):
    """(sample_rate, channels) — нужны, чтобы сгенерированная anullsrc-тишина
    точно совпадала по формату со входным файлом (иначе ffmpeg concat может
    отказаться склеивать потоки или тихо испортить результат)."""
    out = subprocess.run(
        [ffmpeg, "-i", audio_path], stderr=subprocess.PIPE, stdout=subprocess.PIPE
    ).stderr.decode("utf-8", "ignore")
    m = re.search(r"Audio:.*?(\d+)\s*Hz,\s*(mono|stereo|[\d.]+\s*channels?)", out)
    if not m:
        raise RuntimeError("Не удалось определить частоту дискретизации/каналы аудио из ffmpeg -i")
    rate = int(m.group(1))
    chan_str = m.group(2)
    if chan_str == "mono":
        channels = 1
    elif chan_str == "stereo":
        channels = 2
    else:
        channels = int(re.search(r"\d+", chan_str).group())
    return rate, channels


def splice_silence(ffmpeg, audio_in, audio_out, cut_sec, silence_sec):
    """РЕАЛЬНАЯ тишина: обрезает audio_in на cut_sec, вставляет между двумя
    кусками сгенерированную дорожку тишины длиной silence_sec и склеивает всё
    обратно в audio_out — а не просто "визуально держит сцену дольше", пока
    в аудио на самом деле уже звучит следующий сегмент."""
    rate, channels = audio_format(ffmpeg, audio_in)
    cl = "mono" if channels == 1 else "stereo"
    filter_complex = (
        f"[0:a]atrim=end={cut_sec:.3f},asetpts=PTS-STARTPTS[a1];"
        f"[0:a]atrim=start={cut_sec:.3f},asetpts=PTS-STARTPTS[a2];"
        f"anullsrc=r={rate}:cl={cl}:d={silence_sec:.3f}[sil];"
        f"[a1][sil][a2]concat=n=3:v=0:a=1[out]"
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
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if proc.returncode != 0:
        print("ОШИБКА: ffmpeg не смог вставить тишину в аудио:", file=sys.stderr)
        print(proc.stderr.decode("utf-8", "ignore")[-2000:], file=sys.stderr)
        sys.exit(1)


#: Держите в синхроне со scripts/dynamic-task/four-slides.mjs
#: (REVEAL_SECONDS_PER_LINE) — тот же принцип дублирования констант между
#: .py/.mjs, что и у ALL-CAPS highlighter (см. src/ege/scenes/four-slides/
#: highlight.ts): кросс-импорт JS↔Python не имеет смысла ради одного числа.
REVEAL_SECONDS_PER_LINE = 0.7


def split_condition_lines(condition_text):
    """Python-двойник splitConditionLines() из four-slides.mjs — нужен
    ТОЛЬКО чтобы посчитать reveal_seconds (сколько визуально длится
    progressive reveal строк на ProblemScene), а не чтобы искать
    condition_text внутри аудио: для read_task_aloud=false он там сознательно
    отсутствует (см. докстринг run_four_slides_v1)."""
    return [line.strip() for line in re.split(r"\r?\n", condition_text or "") if line.strip()]


def run_four_slides_v1(args):
    """
    Разметка для video_structure_version="four-slides-v1" (см.
    scripts/dynamic-task/four-slides.mjs и src/ege/scenes/four-slides/).

    В отличие от legacy-режима, здесь НЕТ единого текстового блока с
    маркерами вида «Ответ:»/«Скачивай бесплатно» для поиска, и condition_text
    в озвучке НЕ ищется вовсе — n8n присылает четыре ОТДЕЛЬНЫХ, уже готовых
    для TTS текста: intro_text, (task_voiceover_text — только если
    read_task_aloud=true), answer_voiceover_text, cta_text. Реальное аудио —
    их конкатенация именно в этом порядке. Раз сегменты уже разделены на
    уровне task_data, нет нужды искать маркеры/condition_text внутри одного
    текста — вместо этого каждый сегмент целиком выступает "предложением"
    для той же word-count-proportional оценки ожидаемой позиции +
    DP-выравнивания по реальным паузам (align()), что и в legacy-режиме.

    Для read_task_aloud=false condition_text — ЧИСТО display-only данные:
    он показывается на экране (progressive reveal), но никогда не звучит и
    не ищется в аудио. Единственное, для чего он здесь вообще читается —
    посчитать reveal_seconds (сколько строк, сколько секунд идёт их появление
    — split_condition_lines/REVEAL_SECONDS_PER_LINE выше), это чисто
    текстовая арифметика, а не поиск подстроки в озвучке.

    Все текстовые поля читаются напрямую из --task-data (task_data.json), а
    не из отдельных CLI-флагов: длинные тексты с кавычками/переносами строк
    так вообще не проходят через bash-аргументы и не могут там разъехаться.

    Нужны РОВНО две реальные границы:
      - intro_end  — конец intro_text (Title → Problem);
      - cut        — точка, после которой вставляется тишина:
                       read_task_aloud=true  → конец task_voiceover_text;
                       read_task_aloud=false → конец intro_text (то есть
                       совпадает с intro_end — Problem-сцена в этом случае
                       целиком состоит из вставленной тишины: reveal строк
                       + pause_seconds, без единого произнесённого слова);
      - answer_end — конец answer_voiceover_text (Answer → CTA).

    Каждая граница проверяется на правдоподобие (TOLERANCE_SEC): если
    ближайшая реальная пауза слишком далеко от ожидаемой по words-proportion
    позиции — это ЗНАЧИТ, что границу нельзя определить надёжно, и скрипт
    завершается ошибкой, а не подставляет процентную оценку как есть.

    Тишина вставляется взаправду (splice_silence, ffmpeg), поэтому
    результирующий audioOut длиннее исходного файла ровно на длительность
    вставленной тишины — Remotion получает готовое аудио с реальным
    беззвучным промежутком, а не полагается на то, что видео "подождёт"
    во время, когда в файле уже звучит следующий сегмент.
    """
    if not args.task_data:
        print("ОШИБКА: --task-data обязателен для --mode four-slides-v1.", file=sys.stderr)
        sys.exit(1)
    with open(args.task_data, "r", encoding="utf-8") as f:
        task_data = json.load(f)

    intro_text = str(task_data.get("intro_text") or "").strip()
    task_voiceover_text = str(task_data.get("task_voiceover_text") or "").strip()
    answer_text = str(task_data.get("answer_voiceover_text") or "").strip()
    cta_text = str(task_data.get("cta_text") or "").strip()
    condition_text = task_data.get("condition_text") or ""
    read_aloud = task_data.get("read_task_aloud") is True
    pause_seconds = task_data.get("pause_seconds")
    try:
        pause_seconds = float(pause_seconds)
    except (TypeError, ValueError):
        pause_seconds = 0.0

    for flag, value in (("--audio-in", args.audio_in), ("--audio-out", args.audio_out)):
        if not value:
            print(f"ОШИБКА: обязательный флаг {flag} не передан (mode=four-slides-v1).", file=sys.stderr)
            sys.exit(1)
    if not (pause_seconds > 0):
        print(
            f"ОШИБКА: task_data.pause_seconds должен быть положительным числом, получено "
            f"{task_data.get('pause_seconds')!r}.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Spoken section contract (см. п.5 постановки задачи по этому багу) —
    # НИКАКОГО отношения к condition_text: read_task_aloud определяет только
    # набор реально ЗВУЧАЩИХ полей.
    if read_aloud:
        missing = [
            name
            for name, value in (
                ("intro_text", intro_text),
                ("task_voiceover_text", task_voiceover_text),
                ("answer_voiceover_text", answer_text),
                ("cta_text", cta_text),
            )
            if not value
        ]
        if missing:
            print(
                f"ОШИБКА: read_task_aloud=true требует непустые поля: {', '.join(missing)}.",
                file=sys.stderr,
            )
            sys.exit(1)
    else:
        missing = [
            name
            for name, value in (
                ("intro_text", intro_text),
                ("answer_voiceover_text", answer_text),
                ("cta_text", cta_text),
            )
            if not value
        ]
        if missing:
            print(
                f"ОШИБКА: read_task_aloud=false требует непустые поля: {', '.join(missing)}.",
                file=sys.stderr,
            )
            sys.exit(1)
        if task_voiceover_text:
            print(
                "ОШИБКА: read_task_aloud=false, но task_voiceover_text непуст — контракт "
                "four-slides-v1 требует оставить его пустым (условие в этом режиме не "
                "озвучивается отдельной репликой).",
                file=sys.stderr,
            )
            sys.exit(1)

    reveal_seconds = 0.0
    if not read_aloud:
        lines = split_condition_lines(condition_text)
        reveal_seconds = len(lines) * REVEAL_SECONDS_PER_LINE
        if not (reveal_seconds > 0):
            print(
                "ОШИБКА: read_task_aloud=false требует непустой condition_text — без него "
                "не из чего считать reveal_seconds (визуальный тайминг progressive reveal, "
                "НЕ поиск condition_text в аудио — в озвучке его нет и не должно быть).",
                file=sys.stderr,
            )
            sys.exit(1)

    segments = [("intro", intro_text)]
    if read_aloud:
        segments.append(("task", task_voiceover_text))
    segments.append(("answer", answer_text))
    segments.append(("cta", cta_text))

    names = [name for name, _ in segments]
    word_counts = [len(text.split()) for _, text in segments]
    if sum(word_counts) == 0:
        print("ОШИБКА: во всех сегментах суммарно 0 слов — размётка невозможна.", file=sys.stderr)
        sys.exit(1)

    cum = []
    acc = 0
    for wc in word_counts:
        acc += wc
        cum.append(acc)
    total_words = cum[-1]

    total_sec = ffmpeg_duration(args.ffmpeg, args.audio_in)
    candidates = silence_ends(args.ffmpeg, args.audio_in, args.noise_db)
    if not candidates:
        print(
            "ОШИБКА: silencedetect не нашёл ни одной паузы ≥0.3с в исходном аудио — "
            "границы сегментов не определить.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Ожидаемая позиция ПОСЛЕ каждого сегмента, кроме последнего (после
    # последнего сегмента, cta, граница не нужна — там просто конец файла).
    full_expected = [cum[i] / total_words * total_sec for i in range(len(segments) - 1)]

    cut_idx = names.index("task") if read_aloud else names.index("intro")
    answer_end_idx = names.index("answer")
    # intro-граница нужна всегда (Title→Problem), даже когда cut_idx на неё
    # не указывает (read_task_aloud=true: cut происходит позже, после task).
    needed_idx = sorted({0, cut_idx, answer_end_idx})

    sub_expected = [full_expected[i] for i in needed_idx]
    aligned = align(sub_expected, candidates)
    matched = dict(zip(needed_idx, aligned))

    # Fail-fast confidence gate (см. докстринг функции): угадывать по
    # проценту длины текста запрещено пользователем явно — если реальная
    # пауза слишком далека от ожидаемой позиции, это и есть тот случай,
    # когда границу "невозможно надёжно определить".
    TOLERANCE_SEC = 2.0
    for idx in needed_idx:
        expected = full_expected[idx]
        got = matched[idx]
        if abs(got - expected) > TOLERANCE_SEC:
            print(
                f"ОШИБКА: не удалось надёжно определить границу после сегмента "
                f'"{names[idx]}" — ожидали паузу около {expected:.2f}с по доле слов, '
                f"ближайшая реальная пауза {got:.2f}с (расхождение "
                f"{abs(got - expected):.2f}с превышает допуск {TOLERANCE_SEC}с). "
                "Разметить нельзя без угадывания.",
                file=sys.stderr,
            )
            sys.exit(1)

    intro_end_sec = matched[0]
    cut_sec = matched[cut_idx]
    answer_end_sec = matched[answer_end_idx]

    silence_duration = pause_seconds if read_aloud else (reveal_seconds + pause_seconds)

    splice_silence(args.ffmpeg, args.audio_in, args.audio_out, cut_sec, silence_duration)

    new_total_sec = total_sec + silence_duration
    new_answer_sec = cut_sec + silence_duration
    new_outro_sec = answer_end_sec + silence_duration

    # Сверяем реальную длительность получившегося файла с арифметикой —
    # заметная расходимость означала бы, что склейка не удалась молча.
    spliced_duration = ffmpeg_duration(args.ffmpeg, args.audio_out)
    if abs(spliced_duration - new_total_sec) > 1.0:
        print(
            f"ОШИБКА: после вставки тишины длительность файла ({spliced_duration:.2f}с) "
            f"не сходится с расчётной ({new_total_sec:.2f}с) — склейка аудио, похоже, "
            "не удалась.",
            file=sys.stderr,
        )
        sys.exit(1)

    result = {
        "totalSec": round(new_total_sec, 3),
        "introSec": round(intro_end_sec, 3),
        "answerSec": round(new_answer_sec, 3),
        "outroSec": round(new_outro_sec, 3),
        "audioOut": args.audio_out,
        "_debug": {
            "readTaskAloud": read_aloud,
            "segments": names,
            "wordCounts": word_counts,
            "candidates": candidates,
            "fullExpected": [round(x, 2) for x in full_expected],
            "matched": {names[i]: round(v, 3) for i, v in matched.items()},
            "cutSec": round(cut_sec, 3),
            "silenceDuration": round(silence_duration, 3),
        },
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
