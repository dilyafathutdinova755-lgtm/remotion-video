#!/usr/bin/env node
/**
 * Собирает src/ege/tasks/_dynamic.generated.tsx для разового рендера в CI
 * (render-on-demand.yml) из трёх источников:
 *   - task_data (JSON от n8n: exam, subject, task_number, condition_text,
 *     answer, voiceover_text, account; необязательно — instruction, если
 *     n8n хочет явно задать приглушённую формулировку над условием, см.
 *     splitInstruction ниже);
 *   - JSON от align.py (тайминг по реальной озвучке + checkLines — текст
 *     пояснения, дословно из voiceover_text);
 *   - относительный путь к уже скачанному mp3 внутри public/.
 *
 * Файл перезаписывается транзитно в рабочей копии рантайма CI и никогда не
 * коммитится обратно — в репозитории лежит только пустой стаб с тем же
 * экспортом (см. сам _dynamic.generated.tsx).
 *
 * Использование:
 *   node build-dynamic-task.mjs --task-id "<id>" --task-data path/to/task_data.json \
 *     --align path/to/align.json --audio-src "audio/dynamic-<id>.mp3" \
 *     --out ../../src/ege/tasks/_dynamic.generated.tsx
 */
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const flag = (name, required = true) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1 || i + 1 >= args.length) {
    if (required) {
      console.error(`ОШИБКА: не передан обязательный флаг --${name}`);
      process.exit(1);
    }
    return undefined;
  }
  return args[i + 1];
};

const taskId = flag("task-id");
const taskDataPath = flag("task-data");
const alignPath = flag("align");
const audioSrc = flag("audio-src");
const outPath = flag("out");
const idOutPath = flag("id-out", false);

const taskData = JSON.parse(readFileSync(taskDataPath, "utf8"));
const align = JSON.parse(readFileSync(alignPath, "utf8"));

const REQUIRED_FIELDS = [
  "exam",
  "subject",
  "task_number",
  "condition_text",
  "answer",
];
for (const f of REQUIRED_FIELDS) {
  if (!taskData[f] && taskData[f] !== 0) {
    console.error(`ОШИБКА: в task_data нет обязательного поля "${f}"`);
    process.exit(1);
  }
}

/** Composition id принимает только a-z, A-Z, 0-9, CJK и "-". */
const sanitizeId = (raw) => {
  const cleaned = String(raw)
    .replace(/[^a-zA-Z0-9一-鿿-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `Dyn-${cleaned || "Task"}`;
};

const examType = /огэ|oge/i.test(String(taskData.exam)) ? "oge" : "ege";

const paletteFor = (subject) => {
  const s = String(subject).toLowerCase();
  if (s.includes("биолог")) return "green";
  if (s.includes("русск") || s.includes("истор")) return "pink";
  return "blue";
};

/**
 * Некоторые номера заданий (7 и 8 по русскому) имеют раз и навсегда
 * стандартизированную формулировку — ту же самую, что и в formword.tsx /
 * oge8.tsx. В карточке (ProblemScene.tsx) она рисуется отдельным приглушённым
 * блоком НАД самим условием (`task.instruction`), а не сплошным текстом
 * вперемешку с ним (`task.tokens`) — раньше динамический рендер этот блок
 * вообще не заполнял, и весь condition_text шёл одним жирным куском без
 * разделения на «формулировка» / «условие». Отсюда и был визуальный дефект.
 *
 * Для заданий, где формулировка — часть самого предложения (задание 9) или
 * зависит от варианта, которого в task_data нет (задание 6: «исключив» или
 * «заменив»), автоматической формулировки нет — n8n может прислать её явно
 * через необязательное поле task_data.instruction.
 */
const STANDARD_INSTRUCTIONS = {
  "ege:7":
    "В одном из выделенных слов допущена ошибка в образовании формы слова. Исправьте ошибку и запишите слово правильно.",
  "oge:8":
    "Раскройте скобки и запишите слово в соответствии с нормами современного русского литературного языка.",
};

/**
 * condition_text от n8n может либо уже содержать сам стандартный текст
 * формулировки (тогда его нужно убрать из tokens, чтобы не показать дважды),
 * либо быть только специфичным предложением без неё (тогда tokens не трогаем).
 * Сравнение — регуляркой, нечувствительной к регистру, ё/е и лишним
 * пробелам, а не по длине строки: длины могут не совпасть даже при
 * фактически одинаковом тексте.
 */
const splitInstruction = (conditionText, examType, taskNumber, explicit) => {
  const instruction =
    explicit != null && explicit !== ""
      ? String(explicit)
      : STANDARD_INSTRUCTIONS[`${examType}:${taskNumber}`];
  if (!instruction) return { instruction: undefined, tokensText: conditionText };

  const pattern =
    "^\\s*" +
    instruction
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/[её]/gi, "[её]")
      .replace(/\s+/g, "\\s+");
  const match = conditionText.match(new RegExp(pattern, "i"));
  const tokensText = match ? conditionText.slice(match[0].length).trim() : conditionText;

  return { instruction, tokensText: tokensText || conditionText };
};

const problemSizeFor = (text) => {
  const len = String(text).length;
  if (len <= 60) return 48;
  if (len <= 120) return 44;
  if (len <= 200) return 40;
  return 36;
};

/**
 * Безопасные общие хуки — без намёка на ответ. Задание не даёт отдельного
 * поля для крючка (весь контент уже придуман в n8n заранее для голоса, а не
 * для титульного экрана), поэтому выбираем детерминированно по id, чтобы
 * один и тот же task_id всегда давал один и тот же ролик при повторном
 * запуске.
 */
const GENERIC_HOOKS = [
  ["Решишь это задание?"],
  ["Сможешь ответить?"],
  ["Проверь себя —", "знаешь ответ?"],
  ["А ты решишь", "это задание?"],
  ["Слабо ответить", "за 10 секунд?"],
];
const hookFor = (id) => {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GENERIC_HOOKS[hash % GENERIC_HOOKS.length];
};

const id = sanitizeId(taskId ?? taskData.task_number ?? "task");
const palette = paletteFor(taskData.subject);
const hook = hookFor(id);
const answer = String(taskData.answer).trim();
const checkLines = Array.isArray(align.checkLines) ? align.checkLines : [];

const taskNumber = Number(taskData.task_number) || 0;
const { instruction, tokensText } = splitInstruction(
  taskData.condition_text,
  examType,
  taskNumber,
  taskData.instruction,
);
const problemSize = problemSizeFor(tokensText);

const audioSync = {
  src: audioSrc,
  totalSec: align.totalSec,
  conditionSec: align.conditionSec,
  stepSec: [],
  answerSec: align.answerSec,
  correctAtSec: align.correctAtSec,
  checkAtSec: align.checkAtSec,
  outroSec: align.outroSec,
};

for (const [key, value] of Object.entries(audioSync)) {
  if (key === "src" || key === "stepSec") continue;
  if (typeof value !== "number" || Number.isNaN(value)) {
    console.error(
      `ОШИБКА: align.json не содержит числового поля "${key}" — тайминг не собран.`,
    );
    process.exit(1);
  }
}

const j = (v) => JSON.stringify(v);

const checkField =
  checkLines.length > 0
    ? `check: (\n    <>\n      ${checkLines
        .map((line) => `<div>${j(line)}</div>`)
        .join("\n      ")}\n    </>\n  ),`
    : "";

const source = `// АВТОГЕНЕРИРОВАНО build-dynamic-task.mjs — не редактировать руками.
// Источник: render-on-demand.yml, task_id = ${j(String(taskId ?? ""))}.
// Перезаписывается транзитно в CI и никогда не коммитится обратно.

import { w } from "./dsl";
import type { AudioSync, TaskDef } from "./types";

const audioSync: AudioSync = ${JSON.stringify(audioSync, null, 2)};

export const DYNAMIC_TASK: TaskDef = {
  id: ${j(id)},
  number: ${taskNumber},
  examType: ${j(examType)},
  subject: ${j(String(taskData.subject))},
  palette: ${j(palette)},
  hook: ${JSON.stringify(hook)},
  pillLabel: "Задание",
${instruction ? `  instruction: ${j(instruction)},\n` : ""}
  tokens: w(${j(tokensText)}),
  problemSize: ${problemSize},

  solutions: [],
  answerSeconds: 11,
  audioSync,

  answerLead: "Ответ",
  answer: ${j(answer)},
  ${checkField}
};

export const DYNAMIC_TASKS: TaskDef[] = [DYNAMIC_TASK];
`;

writeFileSync(outPath, source, "utf8");
if (idOutPath) writeFileSync(idOutPath, id, "utf8");
console.log(`Сгенерирован ${outPath} (id=${id}, examType=${examType}, palette=${palette})`);
