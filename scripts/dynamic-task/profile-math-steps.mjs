/**
 * Общая, testable-без-Remotion логика контракта video_structure_version=
 * "biology-steps-v1": fail-fast валидация task_data ДО рендера.
 *
 * Используется build-dynamic-task.mjs (реальная сборка TaskDef) и
 * test-profile-math-steps.mjs (regression-тесты) — единственный источник
 * правды для этой логики, тот же принцип, что у four-slides.mjs.
 *
 * ВАЖНО: нормализацию произношения этот модуль не делает и не должен —
 * tts_text/voiceover_tts_text уже готовы (их нормализует отдельный узел
 * n8n + ChatGPT, затем ElevenLabs озвучивает). Здесь только структурная
 * проверка контракта и то, что реально нужно экрану (instruction/
 * condition_text/solution_steps[].lines — неизменный экранный текст).
 */

const REQUIRED_TOP_LEVEL_FIELDS = [
  "video_structure_version",
  "exam",
  "subject",
  "task_number",
  "render_fps",
  "pause_seconds",
  "pause_prompt",
  "condition_text",
  "cta_text",
  "solution_steps",
  "narration_segments",
];

const VALID_KINDS = new Set(["intro", "task", "solution", "cta"]);

/**
 * Проверяет solution_steps: непустой массив, у каждого шага непустые
 * id/title/lines (lines — непустой массив непустых строк), id уникальны.
 */
function validateSolutionSteps(solutionSteps, errors) {
  if (!Array.isArray(solutionSteps) || solutionSteps.length === 0) {
    errors.push("solution_steps должен быть непустым массивом");
    return [];
  }

  const ids = [];
  solutionSteps.forEach((step, i) => {
    if (!step || typeof step !== "object") {
      errors.push(`solution_steps[${i}] не объект`);
      return;
    }
    if (!step.id || typeof step.id !== "string") {
      errors.push(`solution_steps[${i}].id отсутствует или не строка`);
    } else {
      ids.push(step.id);
    }
    if (!step.title || typeof step.title !== "string") {
      errors.push(`solution_steps[${i}].title отсутствует или не строка`);
    }
    if (!Array.isArray(step.lines) || step.lines.length === 0) {
      errors.push(`solution_steps[${i}].lines должен быть непустым массивом строк`);
    } else if (step.lines.some((l) => typeof l !== "string" || l.trim() === "")) {
      errors.push(`solution_steps[${i}].lines содержит пустую или нестроковую строку`);
    }
  });

  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length > 0) {
    errors.push(`solution_steps содержит повторяющиеся id: ${[...new Set(dupes)].join(", ")}`);
  }

  return ids;
}

/**
 * Проверяет narration_segments: непустой массив, у каждого сегмента
 * непустые id/kind/text/tts_text (kind=solution — ещё и непустой step_id),
 * и СТРОГИЙ порядок: intro, затем ровно один task, затем один или более
 * solution (их step_id — в ТОЧНОСТИ тот же набор и порядок, что
 * solutionStepIds), затем ровно один cta последним. Любое другое —
 * fail-fast: отсюда движок align.py берёт spoken-секции, и именно этот
 * порядок разметка предполагает жёстко (intro → task → шаги → cta).
 */
function validateNarrationSegments(narrationSegments, solutionStepIds, errors) {
  if (!Array.isArray(narrationSegments) || narrationSegments.length === 0) {
    errors.push("narration_segments должен быть непустым массивом");
    return;
  }

  narrationSegments.forEach((seg, i) => {
    if (!seg || typeof seg !== "object") {
      errors.push(`narration_segments[${i}] не объект`);
      return;
    }
    if (!seg.id || typeof seg.id !== "string") {
      errors.push(`narration_segments[${i}].id отсутствует или не строка`);
    }
    if (!VALID_KINDS.has(seg.kind)) {
      errors.push(
        `narration_segments[${i}].kind должен быть одним из intro/task/solution/cta, получено: ${JSON.stringify(seg.kind)}`,
      );
    }
    if (!seg.text || typeof seg.text !== "string") {
      errors.push(`narration_segments[${i}].text отсутствует или не строка`);
    }
    if (!seg.tts_text || typeof seg.tts_text !== "string") {
      errors.push(`narration_segments[${i}].tts_text отсутствует или не строка`);
    }
    if (seg.kind === "solution" && (!seg.step_id || typeof seg.step_id !== "string")) {
      errors.push(`narration_segments[${i}].step_id обязателен для kind="solution"`);
    }
  });

  // Если структурные проверки выше уже провалились, дальнейшая проверка
  // порядка по заведомо кривым данным только продублирует шум — выходим.
  if (errors.length > 0) return;

  const kinds = narrationSegments.map((s) => s.kind);

  if (kinds[0] !== "intro") {
    errors.push('narration_segments[0].kind должен быть "intro"');
  }
  if (kinds[1] !== "task") {
    errors.push('narration_segments[1].kind должен быть "task" (сразу после intro)');
  }
  if (kinds[kinds.length - 1] !== "cta") {
    errors.push('последний narration_segments[].kind должен быть "cta"');
  }

  const middle = kinds.slice(2, kinds.length - 1);
  if (middle.some((k) => k !== "solution")) {
    errors.push(
      'между "task" и "cta" в narration_segments должны быть только kind="solution" сегменты, по порядку',
    );
    return;
  }
  if (middle.length === 0) {
    errors.push('narration_segments не содержит ни одного kind="solution" сегмента');
    return;
  }

  const narrationStepIds = narrationSegments
    .filter((s) => s.kind === "solution")
    .map((s) => s.step_id);

  const sameLength = narrationStepIds.length === solutionStepIds.length;
  const sameOrder = sameLength && narrationStepIds.every((id, i) => id === solutionStepIds[i]);

  if (!sameOrder) {
    errors.push(
      "narration_segments[].step_id (в порядке kind=\"solution\") должны в точности совпадать с solution_steps[].id, " +
        `в том же порядке. Получено: [${narrationStepIds.join(", ")}], ожидалось: [${solutionStepIds.join(", ")}]`,
    );
  }
}

/**
 * Fail-fast проверка task_data ДО render — единственный источник правды
 * (используется и align.py опосредованно через те же правила контракта,
 * и build-dynamic-task.mjs напрямую). Ничего не угадывается: при любой
 * непройденной проверке — ok:false + список причин, без рендера.
 */
export function validateProfileMathStepsTaskData(taskData) {
  const errors = [];

  for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
    const value = taskData?.[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`Отсутствует обязательное поле "${field}"`);
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  if (taskData.video_structure_version !== "biology-steps-v1") {
    errors.push(
      `video_structure_version должен быть "biology-steps-v1", получено: ${JSON.stringify(taskData.video_structure_version)}`,
    );
  }

  if (taskData.exam !== "ЕГЭ" || taskData.subject !== "биология" || Number(taskData.task_number) !== 3) {
    errors.push("Разрешено только ЕГЭ биология №3");
  }
  const renderFps = Number(taskData.render_fps);
  if (!Number.isFinite(renderFps) || renderFps <= 0 || !Number.isInteger(renderFps)) {
    errors.push(`render_fps должен быть положительным целым числом, получено: ${JSON.stringify(taskData.render_fps)}`);
  }

  const pauseSeconds = Number(taskData.pause_seconds);
  if (!(pauseSeconds > 0)) {
    errors.push(`pause_seconds должен быть положительным числом, получено: ${JSON.stringify(taskData.pause_seconds)}`);
  }

  if (typeof taskData.pause_prompt !== "string" || taskData.pause_prompt.trim() === "") {
    errors.push("pause_prompt пуст после trim()");
  }

  // Контракт реализует ТОЛЬКО separate_answer_slide=false (ответ — часть
  // последнего шага). Любое другое значение — явный отказ, а не молчаливое
  // игнорирование несовпавшего контракта (см. постановку задачи).
  if (taskData.separate_answer_slide !== false) {
    errors.push(
      `separate_answer_slide должен быть ровно false — этот рендерер не поддерживает отдельный слайд ответа, получено: ${JSON.stringify(taskData.separate_answer_slide)}`,
    );
  }

  if (typeof taskData.instruction !== "string") {
    errors.push("instruction должен быть строкой, допускается пустая");
  }
  if (typeof taskData.condition_text !== "string" || taskData.condition_text.trim() === "") {
    errors.push("condition_text пуст после trim()");
  }
  if (typeof taskData.cta_text !== "string" || taskData.cta_text.trim() === "") {
    errors.push("cta_text пуст после trim()");
  }

  const solutionStepIds = validateSolutionSteps(taskData.solution_steps, errors);
  validateNarrationSegments(taskData.narration_segments, solutionStepIds, errors);

  return { ok: errors.length === 0, errors };
}

/**
 * Вторая fail-fast проверка — уже ПОСЛЕ align.py, на реальных секундах
 * границ сегментов: каждый сегмент обязан иметь положительную длительность,
 * и сегменты обязаны идти по возрастанию (конец одного = начало следующего).
 * Не повторяет validateProfileMathStepsTaskData — работает с align.json.
 */
export function validateProfileMathStepsTiming(segments) {
  const errors = [];

  if (!Array.isArray(segments) || segments.length === 0) {
    return { ok: false, errors: ["align.json: segments пуст или не массив"] };
  }

  segments.forEach((seg, i) => {
    const { id, startSec, endSec } = seg ?? {};
    if (typeof startSec !== "number" || !isFinite(startSec)) {
      errors.push(`segments[${i}] ("${id}").startSec не является конечным числом`);
      return;
    }
    if (typeof endSec !== "number" || !isFinite(endSec)) {
      errors.push(`segments[${i}] ("${id}").endSec не является конечным числом`);
      return;
    }
    if (!(endSec > startSec)) {
      errors.push(`segments[${i}] ("${id}") имеет неположительную длительность (${startSec}с → ${endSec}с)`);
    }
    if (i > 0) {
      const prevEnd = segments[i - 1]?.endSec;
      if (typeof prevEnd === "number" && Math.abs(prevEnd - startSec) > 0.001) {
        errors.push(
          `segments[${i}] ("${id}").startSec (${startSec}с) не совпадает с концом предыдущего сегмента (${prevEnd}с)`,
        );
      }
    }
  });

  return { ok: errors.length === 0, errors };
}
