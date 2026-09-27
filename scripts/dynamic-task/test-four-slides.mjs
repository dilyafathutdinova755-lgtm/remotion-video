#!/usr/bin/env node
/**
 * Regression-тесты контракта video_structure_version="four-slides-v1" —
 * см. scripts/dynamic-task/four-slides.mjs (единственный источник правды
 * для этой логики; ProblemScene.tsx использует ту же формулу выделения
 * ALL-CAPS форм и тот же reveal-тайминг, см. src/ege/scenes/four-slides/).
 *
 * Реальный рендер (Title/Problem/Answer/CTA кадры) и то, что instruction
 * визуально снаружи карточки, — не проверяется здесь текстовыми тестами
 * (это часть JSX/CSS), а подтверждается отдельно реальным скриншотом
 * (см. отчёт по задаче four-slides-v1: npx remotion still + визуальный
 * осмотр всех 4 сцен).
 *
 * Использование: node scripts/dynamic-task/test-four-slides.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  computeRevealSeconds,
  findIncorrectContext,
  highlightCapsTokens,
  lineRevealOffsetSeconds,
  normalizePausePromptText,
  pausePromptWindowSeconds,
  requiresIncorrectFragment,
  splitConditionLines,
  validateFourSlidesTaskData,
  validateFourSlidesTiming,
} from "./four-slides.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..");

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

// Реальный пример задания из ТЗ (ЕГЭ русский №7).
const RUS7 = {
  exam: "ЕГЭ",
  subject: "русский",
  task_number: 7,
  intro_text: "Решаем задание 7 из приложения «ЕГЭ Тренажёр».",
  instruction:
    "В одном из выделенных ниже слов допущена ошибка в образовании формы слова. Исправьте ошибку и запишите слово правильно.",
  condition_text:
    "становиться всё ГИБЧЕ\nдеревянных БРУСЬЕВ\nзастёгивать пуговицы ГЕТРОВ\nгруппа КИРГИЗОВ\nмного ДЕЛ",
  incorrect_fragment: "ГЕТРОВ",
  answer: "гетр",
  explanation:
    "У существительного «гетры» в родительном падеже множественного числа нулевое окончание.",
  task_voiceover_text: "",
  answer_voiceover_text: "Правильно — гетр. У существительного «гетры»...",
  cta_text: "Скачивай бесплатно. Ссылка в шапке профиля.",
  pause_seconds: 5,
  pause_prompt: "Ставь на паузу ⏸️",
  read_task_aloud: false,
  video_structure_version: "four-slides-v1",
};

console.log("--- 1. ЕГЭ русский №7: базовая структура ---");

check("instruction и condition_text — разные строки, ни одна не пуста", () => {
  assert.notEqual(RUS7.instruction.trim(), "");
  assert.notEqual(RUS7.condition_text.trim(), "");
  assert.notEqual(RUS7.instruction, RUS7.condition_text);
});

check("condition_text — ровно 5 строк, ни одна не потеряна", () => {
  const lines = splitConditionLines(RUS7.condition_text);
  assert.equal(lines.length, 5);
  assert.deepEqual(lines, [
    "становиться всё ГИБЧЕ",
    "деревянных БРУСЬЕВ",
    "застёгивать пуговицы ГЕТРОВ",
    "группа КИРГИЗОВ",
    "много ДЕЛ",
  ]);
});

check("ALL-CAPS формы выделяются алгоритмически, обычные слова — нет", () => {
  const cases = [
    ["становиться всё ГИБЧЕ", ["ГИБЧЕ"]],
    ["деревянных БРУСЬЕВ", ["БРУСЬЕВ"]],
    ["застёгивать пуговицы ГЕТРОВ", ["ГЕТРОВ"]],
    ["группа КИРГИЗОВ", ["КИРГИЗОВ"]],
    ["много ДЕЛ", ["ДЕЛ"]],
  ];
  for (const [line, expectedCaps] of cases) {
    const parts = highlightCapsTokens(line);
    // join обязан точно восстановить исходную строку — форматирование не
    // должно менять сам текст.
    assert.equal(parts.map((p) => p.text).join(""), line);
    const capsFound = parts.filter((p) => p.caps).map((p) => p.text);
    assert.deepEqual(capsFound, expectedCaps);
    const lowerParts = parts.filter((p) => !p.caps).map((p) => p.text.trim()).filter(Boolean);
    for (const lp of lowerParts) {
      assert.ok(!/^[А-ЯЁ]+$/.test(lp), `строчная часть "${lp}" не должна считаться выделенной`);
    }
  }
});

check("выделение поддерживает Ё/ё и дефисные формы", () => {
  const parts1 = highlightCapsTokens("вкус ПОЛУ-ФАБРИКАТА хороший");
  assert.deepEqual(parts1.filter((p) => p.caps).map((p) => p.text), ["ПОЛУ-ФАБРИКАТА"]);

  const parts2 = highlightCapsTokens("явное УДАРЁННОЕ слово");
  assert.deepEqual(parts2.filter((p) => p.caps).map((p) => p.text), ["УДАРЁННОЕ"]);
});

check("одиночная заглавная буква (обычная капитализация) не считается выделенной", () => {
  const parts = highlightCapsTokens("У неё более ГРОМКИЙ голос");
  const caps = parts.filter((p) => p.caps).map((p) => p.text);
  assert.deepEqual(caps, ["ГРОМКИЙ"]);
  assert.ok(!caps.includes("У"), "предлог «У» не должен считаться ALL-CAPS формой");
});

check("incorrect_fragment/answer из примера ЕГЭ русский №7", () => {
  assert.equal(RUS7.incorrect_fragment, "ГЕТРОВ");
  assert.equal(RUS7.answer, "гетр");
  assert.ok(RUS7.condition_text.includes(RUS7.incorrect_fragment));
});

check("requiresIncorrectFragment: русский №6/№7 — да, остальное — нет", () => {
  assert.equal(requiresIncorrectFragment("русский", 7), true);
  assert.equal(requiresIncorrectFragment("Русский язык", 6), true);
  assert.equal(requiresIncorrectFragment("русский", 9), false);
  assert.equal(requiresIncorrectFragment("физика", 6), false);
});

check("валидный RUS7 task_data проходит validateFourSlidesTaskData", () => {
  const result = validateFourSlidesTaskData(RUS7);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

console.log("\n--- Визуальные правки: Title/Hook, pause_prompt без emoji, incorrectContext ---");

check("TitleScene four-slides-v1 использует старый Hook-визуал (HookVisual), а не intro_text как центральный текст", () => {
  // В этом проекте нет DOM/React-рендер-тестов (см. комментарий в шапке
  // файла) — реальная визуальная проверка идёт кадрами (npx remotion still,
  // см. отчёт по правке). Здесь — статическая регрессия по исходнику:
  // TitleScene обязана рендерить общий HookVisual и НЕ должна вставлять
  // task.introText как видимый JSX-текст (только звучать/определять
  // длительность сцены).
  const src = readFileSync(join(REPO_ROOT, "src/ege/scenes/four-slides/TitleScene.tsx"), "utf8");
  assert.ok(src.includes("HookVisual"), "TitleScene должна использовать HookVisual");
  assert.ok(!/>\s*\{task\.introText\}/.test(src), "TitleScene не должна рисовать task.introText как видимый текст");
});

check("HookScene и FourSlidesTitleScene рендерят один и тот же визуальный компонент", () => {
  const hookScene = readFileSync(join(REPO_ROOT, "src/ege/scenes/HookScene.tsx"), "utf8");
  const titleScene = readFileSync(join(REPO_ROOT, "src/ege/scenes/four-slides/TitleScene.tsx"), "utf8");
  assert.ok(hookScene.includes("<HookVisual"));
  assert.ok(titleScene.includes("<HookVisual"));
});

check("normalizePausePromptText убирает emoji, оставляя чистый текст", () => {
  assert.equal(normalizePausePromptText("Ставь на паузу ⏸️"), "Ставь на паузу");
  assert.equal(normalizePausePromptText("Пауза 🎯🔥 текст"), "Пауза текст");
  assert.equal(normalizePausePromptText("Обычный текст без эмодзи"), "Обычный текст без эмодзи");
  assert.equal(normalizePausePromptText(""), "");
});

check("findIncorrectContext: для RUS7 находит именно строку «застёгивать пуговицы ГЕТРОВ»", () => {
  const result = findIncorrectContext(RUS7.condition_text, RUS7.incorrect_fragment);
  assert.equal(result.ok, true);
  assert.equal(result.context, "застёгивать пуговицы ГЕТРОВ");
});

check("findIncorrectContext: однострочный condition_text — весь текст становится контекстом", () => {
  const result = findIncorrectContext("Единственное предложение с ГЕТРОВ внутри.", "ГЕТРОВ");
  assert.equal(result.ok, true);
  assert.equal(result.context, "Единственное предложение с ГЕТРОВ внутри.");
});

check("findIncorrectContext: fail-fast, если incorrect_fragment не найден ни в одной строке", () => {
  const result = findIncorrectContext(RUS7.condition_text, "НЕСУЩЕСТВУЮЩЕЕСЛОВО");
  assert.equal(result.ok, false);
  assert.ok(/не найден дословно/i.test(result.error));
});

check("findIncorrectContext: fail-fast, если incorrect_fragment найден в нескольких строках (неоднозначно)", () => {
  const ambiguous = "слово ГЕТРОВ на первой строке\nещё раз ГЕТРОВ на второй строке";
  const result = findIncorrectContext(ambiguous, "ГЕТРОВ");
  assert.equal(result.ok, false);
  assert.ok(/неоднозначен/i.test(result.error));
});

check("AnswerScene зачёркивает incorrectContext (всю строку), а не только incorrectFragment; answer остаётся одним словом", () => {
  const src = readFileSync(join(REPO_ROOT, "src/ege/scenes/four-slides/AnswerScene.tsx"), "utf8");
  assert.ok(src.includes("task.incorrectContext"), "AnswerScene должна зачёркивать task.incorrectContext");
  assert.ok(!src.includes("task.incorrectFragment"), "AnswerScene больше не должна рендерить task.incorrectFragment напрямую");
  // answer сам по себе — просто и как есть, никаких склеек со строкой контекста.
  assert.ok(src.includes("{task.answer}"));
});

console.log("\n--- 4/5/6. Progressive reveal + пауза ---");

check("progressive reveal: каждая из 5 строк появляется в свою секунду", () => {
  const lines = splitConditionLines(RUS7.condition_text);
  const offsets = lines.map((_, i) => Math.round(lineRevealOffsetSeconds(i) * 10) / 10);
  assert.deepEqual(offsets, [0, 0.7, 1.4, 2.1, 2.8]);
});

check("reveal duration (5 строк × 0.7с) + ровно 5с полной паузы = 8.5с", () => {
  const reveal = computeRevealSeconds(5);
  assert.equal(reveal, 3.5);
  const totalSilence = reveal + RUS7.pause_seconds;
  assert.equal(totalSilence, 8.5);
});

check("pause_prompt показывается только во время последних pause_seconds секунд", () => {
  const problemDuration = 8.5; // reveal(3.5) + pause(5) для этого примера
  const window = pausePromptWindowSeconds(problemDuration, RUS7.pause_seconds);
  assert.equal(window.start, 3.5);
  assert.equal(window.end, 8.5);
  // Во время появления строк (секунды 0..3.5) подсказки быть не должно —
  // конкретно: последний reveal (2.8с) должен быть строго раньше начала
  // окна паузы (3.5с), иначе подсказка перекрыла бы ещё проявляющийся текст.
  const lastLineRevealAt = lineRevealOffsetSeconds(4);
  assert.ok(lastLineRevealAt < window.start, "последняя строка должна успеть появиться до начала паузы");
});

console.log("\n--- 9. Fail-fast ---");

check("нет instruction → fail-fast", () => {
  const bad = { ...RUS7, instruction: "" };
  const result = validateFourSlidesTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /instruction/i.test(e)));
});

check("нет condition_text → fail-fast", () => {
  const bad = { ...RUS7, condition_text: "" };
  const result = validateFourSlidesTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /condition_text/i.test(e)));
});

check("condition_text содержит instruction целиком → fail-fast", () => {
  const bad = { ...RUS7, condition_text: RUS7.instruction + " " + RUS7.condition_text };
  const result = validateFourSlidesTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /содержит instruction/i.test(e)));
});

check("нет incorrect_fragment у русского №7 → fail-fast", () => {
  const bad = { ...RUS7, incorrect_fragment: undefined };
  const result = validateFourSlidesTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /incorrect_fragment.*обязателен/i.test(e)));
});

check("incorrect_fragment отсутствует в condition_text → fail-fast", () => {
  const bad = { ...RUS7, incorrect_fragment: "НЕСУЩЕСТВУЮЩЕЕСЛОВО" };
  const result = validateFourSlidesTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /не найден дословно/i.test(e)));
});

check("pause_seconds <= 0 → fail-fast", () => {
  const bad = { ...RUS7, pause_seconds: 0 };
  const result = validateFourSlidesTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /pause_seconds/i.test(e)));
});

check("read_task_aloud=true без task_voiceover_text → fail-fast", () => {
  const bad = { ...RUS7, read_task_aloud: true, task_voiceover_text: "" };
  const result = validateFourSlidesTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /task_voiceover_text/i.test(e)));
});

check("отсутствие обязательного поля верхнего уровня (answer) → fail-fast", () => {
  const bad = { ...RUS7 };
  delete bad.answer;
  const result = validateFourSlidesTaskData(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /"answer"/.test(e)));
});

console.log("\n--- Тайминг четырёх сцен (после align.py) ---");

check("все 4 сцены с положительной длительностью — проходит", () => {
  const result = validateFourSlidesTiming({
    introSec: 3,
    answerSec: 3 + 8.5,
    outroSec: 3 + 8.5 + 6,
    totalSec: 3 + 8.5 + 6 + 3,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.durations, { title: 3, problem: 8.5, answer: 6, outro: 3 });
});

check("нулевая/отрицательная длительность любой сцены → fail-fast", () => {
  const zeroProblem = validateFourSlidesTiming({
    introSec: 3,
    answerSec: 3, // problem = 0
    outroSec: 10,
    totalSec: 13,
  });
  assert.equal(zeroProblem.ok, false);
  assert.ok(zeroProblem.errors.some((e) => /"problem"/.test(e)));

  const negativeOutro = validateFourSlidesTiming({
    introSec: 3,
    answerSec: 10,
    outroSec: 9, // answer-сцена отрицательная
    totalSec: 13,
  });
  assert.equal(negativeOutro.ok, false);
  assert.ok(negativeOutro.errors.some((e) => /"answer"/.test(e)));
});

console.log(`\n${failed === 0 ? "Все тесты пройдены" : "ЕСТЬ ПРОВАЛЕННЫЕ ТЕСТЫ"} (${passed}/${passed + failed}).`);
if (failed > 0) process.exit(1);
