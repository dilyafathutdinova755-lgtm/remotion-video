/**
 * Общая, testable-без-Remotion логика контракта video_structure_version=
 * "four-slides-v1": разбор condition_text на строки, подсветка ALL-CAPS
 * форм (то же самое, что рисует ProblemScene — см. src/ege/scenes/
 * four-slides/highlight.ts, держите обе версии в синхроне, если правите
 * регулярку), и fail-fast валидация task_data/тайминга ДО рендера.
 *
 * Используется build-dynamic-task.mjs (реальная сборка TaskDef) и
 * test-four-slides.mjs (regression-тесты) — единственный источник правды
 * для этой логики, тот же принцип, что у normalize-for-voiceover.mjs.
 */

/** Строки condition_text — по одной непустой строке на визуальную строку. */
export function splitConditionLines(conditionText) {
  return String(conditionText)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Сколько секунд занимает последовательное появление всех строк. */
export const REVEAL_SECONDS_PER_LINE = 0.7;

export function computeRevealSeconds(lineCount, perLineSeconds = REVEAL_SECONDS_PER_LINE) {
  return Math.max(0, Number(lineCount) || 0) * perLineSeconds;
}

/** В какую секунду (от начала Problem-сцены) появляется строка №i (0-based). */
export function lineRevealOffsetSeconds(index, perLineSeconds = REVEAL_SECONDS_PER_LINE) {
  return Math.max(0, index) * perLineSeconds;
}

/**
 * Окно, когда внутри Problem-сцены (в секундах от НАЧАЛА сцены) должен быть
 * виден pause_prompt — ровно последние pauseSeconds секунды, никогда раньше
 * (во время появления строк подсказка не показывается вовсе).
 */
export function pausePromptWindowSeconds(problemDurationSeconds, pauseSeconds) {
  const start = Math.max(0, problemDurationSeconds - pauseSeconds);
  return { start, end: problemDurationSeconds };
}

/**
 * Алгоритмическое выделение ALL-CAPS кириллических лексических токенов:
 * непрерывные пробеги заглавных Ё/А-Я, с поддержкой дефисных форм
 * («ПОЛУ-ФАБРИКАТ»). Минимум 2 буквы (без учёта дефисов) — иначе одиночная
 * заглавная буква в начале строки (обычная капитализация первого слова)
 * ошибочно считалась бы "выделенной формой". ТОЛЬКО форматирование —
 * исходная строка не меняется, функция лишь размечает её на части.
 * Возвращает массив { text, caps } в исходном порядке; join(p=>p.text)
 * восстанавливает строку один в один.
 */
const CAPS_TOKEN_RE = /([А-ЯЁ]+(?:-[А-ЯЁ]+)*)/g;

export function highlightCapsTokens(line) {
  const parts = String(line).split(CAPS_TOKEN_RE);
  return parts
    .filter((part) => part !== "")
    .map((part) => {
      const isWholeCapsRun = /^[А-ЯЁ]+(?:-[А-ЯЁ]+)*$/.test(part);
      const letterCount = part.replace(/-/g, "").length;
      return { text: part, caps: isWholeCapsRun && letterCount >= 2 };
    });
}

/** Русское №6/№7 — единственные предметы/номера, где incorrect_fragment обязателен. */
export function requiresIncorrectFragment(subject, taskNumber) {
  const s = String(subject || "").toLowerCase();
  const n = Number(taskNumber);
  return s.includes("русск") && (n === 6 || n === 7);
}

/**
 * Детерминированный поиск строки condition_text, где буквально встречается
 * incorrect_fragment — вся эта строка (целиком, как есть) становится
 * "зачёркнутым контекстом" на AnswerScene (а не одно только incorrect_
 * fragment — по референсу зачёркивается вся исходная фраза). condition_text
 * НЕ меняется — это read-only поиск, не мутация.
 *
 * Для однострочного condition_text splitConditionLines() вернёт массив из
 * одного элемента, и тот же алгоритм сработает без отдельной ветки —
 * "используем весь condition_text как контекст" получается сам собой.
 *
 * Fail-fast, не угадывание: если фрагмент не найден ни в одной строке, или
 * найден в нескольких — однозначного контекста нет, ok:false.
 */
export function findIncorrectContext(conditionText, incorrectFragment) {
  const fragment = String(incorrectFragment ?? "").trim();
  if (!fragment) {
    return { ok: false, error: "incorrect_fragment пуст — контекст не найти" };
  }
  const lines = splitConditionLines(conditionText);
  const matches = lines.filter((line) => line.includes(fragment));
  if (matches.length === 0) {
    return {
      ok: false,
      error: `incorrect_fragment "${fragment}" не найден дословно ни в одной строке condition_text`,
    };
  }
  if (matches.length > 1) {
    return {
      ok: false,
      error: `incorrect_fragment "${fragment}" найден в ${matches.length} строках condition_text — контекст неоднозначен`,
    };
  }
  return { ok: true, context: matches[0] };
}

/**
 * Убирает эмодзи/иконки из pause_prompt — контракт требует показывать
 * ТОЛЬКО текст ("Ставь на паузу"), без ⏸️ и любых других эмодзи, даже если
 * старый task_data их всё ещё присылает. Единый источник правды здесь, а
 * не в самой сцене: ProblemScene просто рисует то, что получила, и не
 * должна знать про Unicode-регексы.
 *
 * \p{Extended_Pictographic} покрывает сами эмодзи-символы (включая ⏸,
 * U+23F8); ️/‍ — variation selector и zero-width joiner, которые
 * эмодзи-последовательности используют как модификаторы и которые сами по
 * себе не Extended_Pictographic.
 */
export function normalizePausePromptText(text) {
  return String(text ?? "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[️‍]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const REQUIRED_FOUR_SLIDES_FIELDS = [
  "intro_text",
  "instruction",
  "condition_text",
  "answer",
  "explanation",
  "answer_voiceover_text",
  "cta_text",
  "pause_seconds",
];

const normalizeForContainsCheck = (text) =>
  String(text)
    .replace(/[её]/gi, "е")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/**
 * Fail-fast проверка task_data ДО render — ничего из этого не разрешается
 * "угадать": каждый пункт — жёсткое условие, отсутствие любого хотя бы
 * одного проваливает всю проверку разом (ok:false + список причин).
 */
export function validateFourSlidesTaskData(taskData) {
  const errors = [];

  for (const field of REQUIRED_FOUR_SLIDES_FIELDS) {
    const value = taskData?.[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`Отсутствует обязательное поле "${field}"`);
    }
  }
  // Без базовых полей дальнейшие проверки (которые их читают) бессмысленны.
  if (errors.length > 0) return { ok: false, errors };

  const instruction = String(taskData.instruction).trim();
  const conditionText = String(taskData.condition_text).trim();

  if (!instruction) errors.push("instruction пуст после trim()");
  if (!conditionText) errors.push("condition_text пуст после trim()");

  if (instruction && conditionText) {
    const normInstr = normalizeForContainsCheck(instruction);
    const normCond = normalizeForContainsCheck(conditionText);
    if (normCond.includes(normInstr)) {
      errors.push("condition_text содержит instruction целиком");
    }
  }

  if (requiresIncorrectFragment(taskData.subject, taskData.task_number)) {
    const fragment = taskData.incorrect_fragment;
    if (!fragment || !String(fragment).trim()) {
      errors.push(
        `incorrect_fragment обязателен для русского задания №${taskData.task_number}, но отсутствует`,
      );
    } else {
      // Дословно, буква в букву, и в РОВНО одной строке — иначе AnswerScene
      // не сможет однозначно выбрать, какую строку зачёркивать целиком (см.
      // findIncorrectContext).
      const contextResult = findIncorrectContext(conditionText, fragment);
      if (!contextResult.ok) errors.push(contextResult.error);
    }
  }

  const pauseSeconds = Number(taskData.pause_seconds);
  if (!(pauseSeconds > 0)) {
    errors.push(`pause_seconds должен быть положительным числом, получено: ${taskData.pause_seconds}`);
  }

  if (taskData.read_task_aloud === true) {
    const taskVoiceover = taskData.task_voiceover_text;
    if (!taskVoiceover || !String(taskVoiceover).trim()) {
      errors.push("read_task_aloud=true, но task_voiceover_text пуст");
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Вторая fail-fast проверка — уже ПОСЛЕ align.py, на реальных секундах
 * границ: все 4 сцены обязаны иметь положительную длительность. Не
 * повторяет validateFourSlidesTaskData — работает с числами из align.json.
 */
export function validateFourSlidesTiming({ introSec, answerSec, outroSec, totalSec }) {
  const durations = {
    title: introSec,
    problem: answerSec - introSec,
    answer: outroSec - answerSec,
    outro: totalSec - outroSec,
  };
  const errors = Object.entries(durations)
    .filter(([, d]) => !(typeof d === "number" && isFinite(d) && d > 0))
    .map(([name, d]) => `Сцена "${name}" имеет неположительную/некорректную длительность (${d}с)`);
  return { ok: errors.length === 0, errors, durations };
}
