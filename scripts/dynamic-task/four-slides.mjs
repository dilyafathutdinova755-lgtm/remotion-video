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
    } else if (!conditionText.includes(String(fragment).trim())) {
      // Дословно — без нормализации ё/е и регистра: incorrect_fragment должен
      // быть найден в condition_text буква в букву, как он там реально написан.
      errors.push(
        `incorrect_fragment "${fragment}" не найден дословно в condition_text`,
      );
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
