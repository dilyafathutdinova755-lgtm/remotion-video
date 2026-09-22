#!/usr/bin/env node
/**
 * Собирает src/ege/tasks/_dynamic.generated.tsx для разового рендера в CI
 * (render-on-demand.yml) из трёх источников:
 *   - task_data (JSON от n8n: exam, subject, task_number, condition_text,
 *     answer, voiceover_text, account; необязательно — instruction, если
 *     n8n хочет явно задать приглушённую формулировку над условием, см.
 *     splitInstruction ниже);
 *   - JSON от align.py (тайминг по реальной озвучке; checkLines оттуда
 *     сознательно НЕ используются — explanation в AnswerScene динамических
 *     задач не показывается текстом, см. комментарий у поля check ниже);
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

const REQUIRED_FIELDS = ["exam", "subject", "task_number", "answer"];
for (const f of REQUIRED_FIELDS) {
  if (!taskData[f] && taskData[f] !== 0) {
    console.error(`ОШИБКА: в task_data нет обязательного поля "${f}"`);
    process.exit(1);
  }
}

/**
 * condition_text — единственный источник текста самой карточки (task.tokens).
 * Раньше пустая/пробельная строка формально проходила общий REQUIRED_FIELDS
 * (это truthy-значение), а после splitInstruction() ниже могла и вовсе
 * схлопнуться в "" — когда явный/стандартный instruction совпадает со ВСЕМ
 * condition_text целиком (например, если n8n по ошибке прислал в
 * condition_text только саму формулировку без материала задания). Старый
 * код в этом случае тихо подставлял назад исходный, ещё не разрезанный
 * conditionText — то есть склеивал instruction обратно с условием вместо
 * явного отказа, и результат зависел от того, что окажется в тексте.
 * Теперь вместо угадывания — жёсткий fail-fast с одним и тем же понятным
 * сообщением в обоих случаях: лучше видимый сбой CI и невыпущенное видео,
 * чем ролик без условия задания.
 */
const FAIL_NO_CONDITION = "Dynamic task has no usable condition_text; refusing to render";
const requireUsableConditionText = (text, reason) => {
  if (typeof text !== "string" || text.trim() === "") {
    console.error(`ОШИБКА: ${FAIL_NO_CONDITION} (${reason})`);
    process.exit(1);
  }
};

requireUsableConditionText(
  taskData.condition_text,
  "task_data.condition_text отсутствует, не строка или состоит из одних пробелов",
);

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
 * Некоторые номера заданий (6, 7 и 8 по русскому) имеют раз и навсегда
 * стандартизированную формулировку — ту же самую, что и в lexical.tsx /
 * formword.tsx / oge8.tsx. В карточке (ProblemScene.tsx) она рисуется
 * отдельным приглушённым блоком НАД самим условием (`task.instruction`), а
 * не сплошным текстом вперемешку с ним (`task.tokens`) — раньше динамический
 * рендер этот блок вообще не заполнял, и весь condition_text шёл одним
 * жирным куском без разделения на «формулировка» / «условие». Отсюда и был
 * визуальный дефект.
 *
 * У задания 6 таких формулировок ровно две — «исключив лишнее слово» или
 * «заменив неверно употреблённое слово» (см. REMOVE/REPLACE в lexical.tsx),
 * поэтому значение может быть не только строкой, но и списком вариантов:
 * тогда проверяются все по очереди, пока один не совпадёт с condition_text.
 *
 * Для заданий, где формулировка — часть самого предложения (задание 9),
 * автоматической формулировки нет вовсе — n8n может прислать её явно через
 * необязательное поле task_data.instruction.
 */
const STANDARD_INSTRUCTIONS = {
  "ege:6": [
    "Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово.",
    "Отредактируйте предложение: исправьте лексическую ошибку, заменив неверно употреблённое слово. Выпишите это слово.",
  ],
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
 *
 * Если explicit не передан, перебираются все стандартные варианты для этого
 * номера задания (строка или массив строк) — побеждает тот, что реально
 * находится в начале condition_text; если ни один не подошёл, инструкция не
 * показывается (как и раньше — лучше её не показать, чем показать не ту).
 *
 * Важно: если после вырезания instruction от condition_text ничего не
 * остаётся (instruction совпал со ВСЕМ текстом), tokensText здесь
 * возвращается пустым, а НЕ подменяется обратно исходным conditionText —
 * склеивать instruction с условием как fallback запрещено (см.
 * requireUsableConditionText выше и её вызов сразу после этой функции,
 * который и превращает пустой tokensText в явный fail-fast).
 */
const splitInstruction = (conditionText, examType, taskNumber, explicit) => {
  const matchAt = (instruction) => {
    const pattern =
      "^\\s*" +
      instruction
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/[её]/gi, "[её]")
        .replace(/\s+/g, "\\s+");
    return conditionText.match(new RegExp(pattern, "i"));
  };

  if (explicit != null && explicit !== "") {
    const instruction = String(explicit);
    const match = matchAt(instruction);
    const tokensText = (match ? conditionText.slice(match[0].length) : conditionText).trim();
    return { instruction, tokensText };
  }

  const standard = STANDARD_INSTRUCTIONS[`${examType}:${taskNumber}`];
  const candidates = Array.isArray(standard) ? standard : standard ? [standard] : [];
  for (const instruction of candidates) {
    const match = matchAt(instruction);
    if (match) {
      return { instruction, tokensText: conditionText.slice(match[0].length).trim() };
    }
  }

  return { instruction: undefined, tokensText: conditionText.trim() };
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

const taskNumber = Number(taskData.task_number) || 0;
const { instruction, tokensText } = splitInstruction(
  taskData.condition_text,
  examType,
  taskNumber,
  taskData.instruction,
);
requireUsableConditionText(
  tokensText,
  "после отделения instruction от condition_text для карточки не осталось текста",
);
const problemSize = problemSizeFor(tokensText);

/**
 * У гуманитарных предметов (русский язык, литература, история,
 * обществознание) без отдельной озвученной фразы «Ответ: ...» align.py
 * сознательно не кладёт в align.json answerSec/correctAtSec/checkAtSec —
 * отдельного AnswerScene у такого ролика вообще нет (см. align.py и
 * PLAYBOOK.md §11d). hasAnswerMarker отличает этот случай от технических
 * предметов и от гуманитарных с «Ответ:» (переходный период, backward
 * compat) — там все три поля всегда числа, как и раньше.
 */
const hasAnswerMarker =
  typeof align.answerSec === "number" && !Number.isNaN(align.answerSec);

const audioSync = {
  src: audioSrc,
  totalSec: align.totalSec,
  conditionSec: align.conditionSec,
  stepSec: [],
  ...(hasAnswerMarker
    ? {
        answerSec: align.answerSec,
        correctAtSec: align.correctAtSec,
        checkAtSec: align.checkAtSec,
      }
    : {}),
  outroSec: align.outroSec,
};

const ALWAYS_REQUIRED_NUMERIC = ["totalSec", "conditionSec", "outroSec"];
for (const key of ALWAYS_REQUIRED_NUMERIC) {
  const value = audioSync[key];
  if (typeof value !== "number" || Number.isNaN(value)) {
    console.error(
      `ОШИБКА: align.json не содержит числового поля "${key}" — тайминг не собран.`,
    );
    process.exit(1);
  }
}
if (hasAnswerMarker) {
  for (const key of ["correctAtSec", "checkAtSec"]) {
    const value = audioSync[key];
    if (typeof value !== "number" || Number.isNaN(value)) {
      console.error(
        `ОШИБКА: align.json содержит answerSec, но не содержит числового поля "${key}" — тайминг не собран.`,
      );
      process.exit(1);
    }
  }
}

const j = (v) => JSON.stringify(v);

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
${
  hasAnswerMarker
    ? ""
    : `  // Гуманитарный предмет без отдельной озвученной фразы "Ответ:" —
  // answerRecap: false отключает AnswerScene целиком (buildScenes() в
  // timing.ts обнуляет scenes.answer), ProblemScene держится до самого
  // CTA/Outro. См. align.py и PLAYBOOK.md §11d.
  answerRecap: false,\n`
}  audioSync,

  answerLead: "Ответ",
  answer: ${j(answer)},
  // check сознательно не заполняется: explanation в этом пайплайне звучит
  // ДО "Ответ:", пока на экране ещё видна карточка условия (см.
  // фиксированный порядок сегментов в PLAYBOOK.md §11b), и повторно
  // текстом под ответом уже не показывается — align.py всё ещё отдаёт его
  // в checkLines (полезно для отладки), но здесь эти строки не используются.
  // answer в данных остаётся всегда (для таблицы/проверки), даже когда
  // отдельного AnswerScene нет — см. answerRecap выше.
};

export const DYNAMIC_TASKS: TaskDef[] = [DYNAMIC_TASK];
`;

writeFileSync(outPath, source, "utf8");
if (idOutPath) writeFileSync(idOutPath, id, "utf8");
console.log(`Сгенерирован ${outPath} (id=${id}, examType=${examType}, palette=${palette})`);
