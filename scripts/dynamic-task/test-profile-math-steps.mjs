#!/usr/bin/env node
/**
 * Regression-тесты контракта video_structure_version="chemistry-steps-v1"
 * — см. scripts/dynamic-task/profile-math-steps.mjs (единственный источник
 * правды для этой логики).
 *
 * Реальный рендер (кадры всех сцен, реальная 2с тишина, реальные 120 FPS)
 * проверяется отдельно — см. отчёт по этой задаче (npx remotion still/render
 * + ffprobe + визуальный осмотр).
 *
 * Использование: node scripts/dynamic-task/test-profile-math-steps.mjs
 */
import assert from "node:assert/strict";
import {
  validateProfileMathStepsTaskData,
  validateProfileMathStepsTiming,
} from "./profile-math-steps.mjs";

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  OK  ${name}`);
  } catch (e) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${e.message}`);
  }
}

// Biological fixture: a coding sequence for 55 amino acids, one DNA strand.
const BIO3 = {
  video_structure_version: "chemistry-steps-v1", exam: "ЕГЭ", subject: "химия", task_number: 11,
  render_fps: 120, pause_seconds: 2, pause_prompt: "Ставь на паузу", separate_answer_slide: false, instruction: "",
  condition_text: "Сколько нуклеотидов кодирует 55 аминокислот в одной цепи ДНК?", cta_text: "ЕГЭ Тренажёр — ссылка в профиле.",
  solution_steps: [
    {id:"step-1",title:"Триплетность",lines:["1 аминокислота — 3 нуклеотида"],voiceover_text:"Одну аминокислоту кодируют три нуклеотида."},
    {id:"step-2",title:"Расчёт",lines:["55 × 3 = 165"],voiceover_text:"Умножаем количество аминокислот на три."},
    {id:"step-3",title:"Проверка цепи",lines:["Считаем одну цепь: не удваиваем", "Ответ: 165"],voiceover_text:"Нужна одна цепь, поэтому результат не удваиваем. Ответ: сто шестьдесят пять."}
  ],
};
BIO3.narration_segments = [
  {id:"intro",kind:"intro",text:"Решаем задание одиннадцать по химии из приложения ЕГЭ Тренажёр.",tts_text:"Решаем задание одиннадцать по химии из приложения ЕГЭ Тренажёр."},
  {id:"task",kind:"task",text:BIO3.condition_text,tts_text:"Сколько нуклеотидов кодирует пятьдесят пять аминокислот в одной цепи дэ-эн-ка?"},
  ...BIO3.solution_steps.map(s=>({id:s.id,kind:"solution",step_id:s.id,text:s.voiceover_text,tts_text:s.voiceover_text})),
  {id:"cta",kind:"cta",text:BIO3.cta_text,tts_text:BIO3.cta_text}
];

console.log("--- 1. ЕГЭ химия №11: базовая структура ---");

check("валидный BIO3 task_data проходит validateProfileMathStepsTaskData", () => {
  const result = validateProfileMathStepsTaskData(BIO3);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

check("3 шага решения, у каждого непустые id/title/lines", () => {
  assert.equal(BIO3.solution_steps.length, 3);
  for (const s of BIO3.solution_steps) {
    assert.ok(s.id);
    assert.ok(s.title);
    assert.ok(s.lines.length > 0);
  }
});

check("ответ — часть последнего шага (lines), отдельного answer-поля нет", () => {
  const lastStep = BIO3.solution_steps[BIO3.solution_steps.length - 1];
  assert.ok(lastStep.lines.some((l) => l.includes("Ответ")));
});

console.log("\n--- 2. Fail-fast: top-level поля ---");

check("video_structure_version не 'chemistry-steps-v1' → fail-fast", () => {
  const bad = { ...BIO3, video_structure_version: "four-slides-v1" };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /video_structure_version/i.test(e)));
});

check("render_fps отсутствует → fail-fast", () => {
  const bad = { ...BIO3 };
  delete bad.render_fps;
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /render_fps/i.test(e)));
});

check("render_fps нецелый → fail-fast", () => {
  const bad = { ...BIO3, render_fps: 119.5 };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /render_fps/i.test(e)));
});

check("pause_seconds <= 0 → fail-fast", () => {
  const bad = { ...BIO3, pause_seconds: 0 };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /pause_seconds/i.test(e)));
});

check("pause_prompt пуст → fail-fast", () => {
  const bad = { ...BIO3, pause_prompt: "   " };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /pause_prompt/i.test(e)));
});

check("separate_answer_slide=true → fail-fast (не реализовано)", () => {
  const bad = { ...BIO3, separate_answer_slide: true };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /separate_answer_slide/i.test(e)));
});

check("separate_answer_slide отсутствует → fail-fast", () => {
  const bad = { ...BIO3 };
  delete bad.separate_answer_slide;
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /separate_answer_slide/i.test(e)));
});

check("instruction не строка → fail-fast", () => {
  const bad = { ...BIO3, instruction: null };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /instruction/i.test(e)));
});

check("condition_text пуст → fail-fast", () => {
  const bad = { ...BIO3, condition_text: "   " };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /condition_text/i.test(e)));
});

console.log("\n--- 3. Fail-fast: solution_steps ---");

check("solution_steps пуст → fail-fast", () => {
  const bad = { ...BIO3, solution_steps: [] };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /solution_steps/i.test(e)));
});

check("solution_steps[i].lines пуст → fail-fast", () => {
  const bad = {
    ...BIO3,
    solution_steps: [{ id: "step-1", title: "T", lines: [] }],
    narration_segments: BIO3.narration_segments.filter((s) => s.kind !== "solution" || s.step_id === "step-1"),
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /lines/i.test(e)));
});

check("solution_steps с повторяющимся id → fail-fast", () => {
  const bad = {
    ...BIO3,
    solution_steps: [
      { id: "step-1", title: "A", lines: ["x"] },
      { id: "step-1", title: "B", lines: ["y"] },
    ],
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /повторяющиеся id/i.test(e)));
});

console.log("\n--- 4. Fail-fast: narration_segments (порядок/контракт) ---");

check("narration_segments[0].kind не 'intro' → fail-fast", () => {
  const bad = {
    ...BIO3,
    narration_segments: [
      { ...BIO3.narration_segments[0], kind: "task" },
      ...BIO3.narration_segments.slice(1),
    ],
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /intro/i.test(e)));
});

check('narration_segments[1].kind не "task" (сразу после intro) → fail-fast', () => {
  const bad = {
    ...BIO3,
    narration_segments: [
      BIO3.narration_segments[0],
      { ...BIO3.narration_segments[2] },
      BIO3.narration_segments[1],
      ...BIO3.narration_segments.slice(3),
    ],
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /"task"/.test(e)));
});

check("последний сегмент не 'cta' → fail-fast", () => {
  const bad = {
    ...BIO3,
    narration_segments: BIO3.narration_segments.slice(0, -1),
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /cta/i.test(e)));
});

check("narration_segments step_id не совпадает с solution_steps id (порядок) → fail-fast", () => {
  const bad = {
    ...BIO3,
    narration_segments: BIO3.narration_segments.map((s) =>
      s.id === "step-2" ? { ...s, step_id: "step-does-not-exist" } : s,
    ),
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /step_id.*совпадать/i.test(e)));
});

check('solution-сегмент без step_id → fail-fast', () => {
  const bad = {
    ...BIO3,
    narration_segments: BIO3.narration_segments.map((s) =>
      s.id === "step-1" ? { id: s.id, kind: s.kind, text: s.text, tts_text: s.tts_text } : s,
    ),
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /step_id/i.test(e)));
});

check("narration_segments[i].tts_text пуст → fail-fast", () => {
  const bad = {
    ...BIO3,
    narration_segments: BIO3.narration_segments.map((s) => (s.id === "task" ? { ...s, tts_text: "" } : s)),
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /tts_text/i.test(e)));
});

check("kind вне intro/task/solution/cta → fail-fast", () => {
  const bad = {
    ...BIO3,
    narration_segments: BIO3.narration_segments.map((s) => (s.id === "step-2" ? { ...s, kind: "explanation" } : s)),
  };
  const result = validateProfileMathStepsTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /kind/i.test(e)));
});

console.log("\n--- 5. Тайминг (после align.py) ---");

check("все сегменты монотонны и положительны — проходит", () => {
  const segments = [
    { id: "intro", startSec: 0, endSec: 1 },
    { id: "task", startSec: 1, endSec: 9.3 },
    { id: "step-1", startSec: 9.3, endSec: 12.3 },
    { id: "cta", startSec: 12.3, endSec: 14.35 },
  ];
  const result = validateProfileMathStepsTiming(segments);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

check("нулевая/отрицательная длительность сегмента → fail-fast", () => {
  const segments = [
    { id: "intro", startSec: 0, endSec: 1 },
    { id: "task", startSec: 1, endSec: 1 }, // нулевая длительность
    { id: "cta", startSec: 1, endSec: 3 },
  ];
  const result = validateProfileMathStepsTiming(segments);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /"task"/.test(e)));
});

check("разрыв между сегментами (startSec != endSec предыдущего) → fail-fast", () => {
  const segments = [
    { id: "intro", startSec: 0, endSec: 1 },
    { id: "task", startSec: 1.5, endSec: 5 }, // разрыв 0.5с
  ];
  const result = validateProfileMathStepsTiming(segments);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /не совпадает с концом/i.test(e)));
});

check("пустой segments → fail-fast", () => {
  const result = validateProfileMathStepsTiming([]);
  assert.equal(result.ok, false);
});

console.log(`\n${failed === 0 ? "Все тесты пройдены" : "ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ"} (${passed}/${passed + failed}).`);
if (failed > 0) process.exit(1);
