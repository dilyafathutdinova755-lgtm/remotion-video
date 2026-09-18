import { COLORS } from "../theme";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Задание 9 ОГЭ по русскому языку: заменить словосочетание, построенное на
 * одном виде подчинительной связи (согласование / управление /
 * примыкание), синонимичным словосочетанием с другим видом связи,
 * указанным в задании.
 *
 * Правило либо знаешь, либо нет — считать и разбирать по шагам нечего,
 * поэтому `solutions: []`, как у русского-7 и химии-11. В отличие от
 * русского-7 здесь нет списка вариантов и нет неверного варианта для
 * зачёркивания (`wrongNote` не используется) — ответ показывает переход
 * «было → стало» через стрелку, как у русского-6 (`lexical.tsx`).
 *
 * Ответ на бланке ОГЭ пишется слитно, без пробела между словами — так и
 * задано в поле `answer`; для читаемости на экране формула перехода
 * (`answerFormula`) показывает то же словосочетание с пробелом.
 */

const SUBJECT = "в ОГЭ по русскому языку";
const NOTE = { color: COLORS.textMuted } as const;

type LinkKind = "управление" | "согласование" | "примыкание";

type Oge9Spec = {
  id: string;
  hook: string[];
  /** Исходное словосочетание, как в условии. */
  phrase: string;
  /** Вид связи в исходном словосочетании. */
  from: LinkKind;
  /** Вид связи, который нужно получить. */
  to: LinkKind;
  /** Результат — с пробелом, для читаемости на экране. */
  result: string;
  /** Ответ на бланк — то же самое слитно, без пробела. */
  answer: string;
  /** Пояснение — по строке на мысль. */
  why: string[];
  problemSize?: number;
};

const makeOge9Task = (spec: Oge9Spec): TaskDef => ({
  id: spec.id,
  number: 9,
  examType: "oge",
  subject: SUBJECT,
  palette: "blue",
  hook: spec.hook,
  pillLabel: "Задание",

  tokens: w(
    `Замените словосочетание «${spec.phrase}», построенное на основе ${spec.from}, синонимичным словосочетанием со связью ${spec.to}.`,
  ),
  problemSize: spec.problemSize ?? 42,

  // Правило либо знаешь, либо нет — разбирать по шагам нечего
  solutions: [],
  answerSeconds: 11,

  answerLead: `${spec.from} → ${spec.to}`,
  answerFormula: (
    <>
      <span style={NOTE}>{spec.phrase}</span>
      <span style={{ margin: "0 20px", color: COLORS.accentLine }}>→</span>
      <span style={{ color: COLORS.accent }}>{spec.result}</span>
    </>
  ),
  answer: spec.answer,
  check: (
    <>
      {spec.why.map((sentence, i) => (
        <div key={i}>{sentence}</div>
      ))}
    </>
  ),
});

export const oge9KurtkaOtsa = makeOge9Task({
  id: "Oge9KurtkaOtsa",
  hook: ["КУРТКА ОТЦА", "а через согласование?"],
  phrase: "куртка отца",
  from: "управление",
  to: "согласование",
  result: "отцовская куртка",
  answer: "отцовскаякуртка",
  why: [
    "«Куртка отца» — управление: зависимое слово стоит в родительном падеже.",
    "Через согласование — прилагательное, согласованное в роде, числе и падеже: «отцовская куртка».",
  ],
});

export const oge9SholkovyShaf = makeOge9Task({
  id: "Oge9SholkovyShaf",
  hook: ["ШЁЛКОВЫЙ ШАРФ", "а через управление?"],
  phrase: "шёлковый шарф",
  from: "согласование",
  to: "управление",
  result: "шарф из шёлка",
  answer: "шарфизшёлка",
  why: [
    "«Шёлковый шарф» — согласование: прилагательное согласуется с существительным.",
    "Через управление — существительное в косвенном падеже с предлогом: «шарф из шёлка».",
  ],
});

export const oge9VagonPoezda = makeOge9Task({
  id: "Oge9VagonPoezda",
  hook: ["ВАГОН ПОЕЗДА", "а через согласование?"],
  phrase: "вагон поезда",
  from: "управление",
  to: "согласование",
  result: "поездной вагон",
  answer: "поездновагон",
  why: [
    "«Вагон поезда» — управление: зависимое слово в родительном падеже.",
    "Через согласование — «поездной вагон».",
  ],
});

export const oge9ChitatVyrazitelno = makeOge9Task({
  id: "Oge9ChitatVyrazitelno",
  hook: ["ЧИТАТЬ ВЫРАЗИТЕЛЬНО", "а через управление?"],
  phrase: "читать выразительно",
  from: "примыкание",
  to: "управление",
  result: "читать с выразительностью",
  answer: "читатьсвыразительностью",
  why: [
    "«Читать выразительно» — примыкание: наречие просто примыкает к глаголу, без изменения формы.",
    "Через управление — существительное в нужном падеже с предлогом: «читать с выразительностью».",
  ],
  problemSize: 44,
});

export const oge9RabochyStol = makeOge9Task({
  id: "Oge9RabochyStol",
  hook: ["РАБОЧИЙ СТОЛ", "а через управление?"],
  phrase: "рабочий стол",
  from: "согласование",
  to: "управление",
  result: "стол для работы",
  answer: "столдляработы",
  why: [
    "«Рабочий стол» — согласование: прилагательное согласуется с существительным.",
    "Через управление — «стол для работы».",
  ],
});

export const oge9UtrennyayaProgulka = makeOge9Task({
  id: "Oge9UtrennyayaProgulka",
  hook: ["УТРЕННЯЯ ПРОГУЛКА", "а через управление?"],
  phrase: "утренняя прогулка",
  from: "согласование",
  to: "управление",
  result: "прогулка утром",
  answer: "прогулкаутром",
  why: [
    "«Утренняя прогулка» — согласование: прилагательное согласуется с существительным.",
    "Через управление — «прогулка утром».",
  ],
});

export const oge9LyubitIskrenne = makeOge9Task({
  id: "Oge9LyubitIskrenne",
  hook: ["ЛЮБИТЬ ИСКРЕННЕ", "а через управление?"],
  phrase: "любить искренне",
  from: "примыкание",
  to: "управление",
  result: "любить с искренностью",
  answer: "любитьсискренностью",
  why: [
    "«Любить искренне» — примыкание: наречие просто примыкает к глаголу.",
    "Через управление — «любить с искренностью».",
  ],
  problemSize: 44,
});

export const oge9PrikazDirektora = makeOge9Task({
  id: "Oge9PrikazDirektora",
  hook: ["ПРИКАЗ ДИРЕКТОРА", "а через согласование?"],
  phrase: "приказ директора",
  from: "управление",
  to: "согласование",
  result: "директорский приказ",
  answer: "директорскийприказ",
  why: [
    "«Приказ директора» — управление: зависимое слово в родительном падеже.",
    "Через согласование — «директорский приказ».",
  ],
});

export const OGE9_TASKS: TaskDef[] = [
  oge9KurtkaOtsa,
  oge9SholkovyShaf,
  oge9VagonPoezda,
  oge9ChitatVyrazitelno,
  oge9RabochyStol,
  oge9UtrennyayaProgulka,
  oge9LyubitIskrenne,
  oge9PrikazDirektora,
];
