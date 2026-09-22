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
    ap.add_argument("--text", required=True)
    ap.add_argument("--display-text", default=None)
    ap.add_argument("--condition-text", required=True)
    ap.add_argument(
        "--subject",
        default="",
        help=(
            "task_data.subject как есть (например «Русский язык»). Не передан "
            "или не похож на гуманитарный (см. HUMANITIES_KEYWORDS) — «Ответ:» "
            "по-прежнему обязателен (обратная совместимость)."
        ),
    )
    ap.add_argument("--audio", required=True)
    ap.add_argument("--ffmpeg", required=True)
    ap.add_argument("--noise-db", type=int, default=-20)
    args = ap.parse_args()
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


if __name__ == "__main__":
    main()
