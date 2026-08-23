import { COLORS } from "../theme";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Задание 6 ЕГЭ по русскому: лексическая ошибка в предложении.
 *
 * Все десять роликов устроены одинаково — меняется только предложение и
 * разбор, поэтому описание задачи собирается фабрикой, а не пишется
 * вёрсткой по разу на задание.
 */

const REMOVE =
  "Отредактируйте предложение: исправьте лексическую ошибку, исключив лишнее слово. Выпишите это слово.";
const REPLACE =
  "Отредактируйте предложение: исправьте лексическую ошибку, заменив неверно употреблённое слово. Выпишите это слово.";

/** Цвет ошибочного фрагмента. */
const BAD = "#b42318";

type LexSpec = {
  id: string;
  /** Убрать лишнее слово или заменить неверное. */
  kind: "remove" | "replace";
  /** Предложение с ошибкой. */
  sentence: string;
  /** Тип ошибки: плеоназм, сочетаемость, диалектизм, паронимы. */
  errorType: string;
  /** Ошибочное сочетание. */
  bad: string;
  /** Оно же после правки. */
  good: string;
  /** Почему это ошибка — по предложению на строку. */
  why: string[];
  /** Ответ — слово, которое выписывают. */
  answer: string;
  problemSize?: number;
};

export const makeLexTask = (spec: LexSpec): TaskDef => {
  const removing = spec.kind === "remove";

  return {
    id: spec.id,
    number: 6,
    subject: "в ЕГЭ по русскому языку",
    hook: removing ? ["Найдёшь лишнее", "слово?"] : ["Найдёшь ошибку?"],
    pillLabel: "Задание",
    instruction: removing ? REMOVE : REPLACE,

    tokens: w(spec.sentence),
    problemSize: spec.problemSize ?? 44,

    // Считать тут нечего: ответ виден сразу, разбивать его на шаги незачем
    solutions: [],
    answerSeconds: 12,

    answerLead: removing ? "Лишнее слово" : "Верное слово",
    answerFormula: (
      <>
        <span style={{ color: BAD }}>{spec.bad}</span>
        <span style={{ margin: "0&nbsp;20px", color: COLORS.accentLine }}>
          →
        </span>
        <span style={{ color: COLORS.accent }}>{spec.good}</span>
      </>
    ),
    answer: spec.answer,
    check: (
      <>
        <div style={{ fontWeight: 600 }}>{spec.errorType}</div>
        {spec.why.map((sentence, i) => (
          <div key={i}>{sentence}</div>
        ))}
      </>
    ),
  };
};

export const lexPozhiloy = makeLexTask({
  id: "LexPozhiloy",
  kind: "remove",
  sentence:
    "Хотя пожилой старик видел лишь одним глазом, но против молодости и силы он имел многолетнюю мудрость и опытность.",
  errorType: "Плеоназм",
  bad: "пожилой старик",
  good: "старик",
  why: [
    "Старик — это и есть пожилой человек.",
    "Признак уже заложен в самом слове.",
  ],
  answer: "пожилой",
  problemSize: 46,
});

export const lexLeitmotiv = makeLexTask({
  id: "LexLeitmotiv",
  kind: "remove",
  sentence:
    "Музыка является главным лейтмотивом повести Л.Н. Толстого «Крейцерова соната»: музыкальная тема на протяжении определённого периода жизни персонажа начинает звучать для него по-разному, открывая читателям изменения, которые с ним произошли, и позволяя осознать влияние, которое оказала музыка на его жизнь.",
  errorType: "Плеоназм",
  bad: "главный лейтмотив",
  good: "лейтмотив",
  why: [
    "Лейтмотив — это и есть ведущий, главный мотив.",
    "Определение «главный» лишь повторяет его.",
  ],
  answer: "главным",
  problemSize: 36,
});

export const lexPresledovalo = makeLexTask({
  id: "LexPresledovalo",
  kind: "replace",
  sentence:
    "Объединение трёх театральных школ в специализированное училище направляло важную цель — повысить качество подготовки молодых актёров.",
  errorType: "Нарушение сочетаемости",
  bad: "направляло цель",
  good: "преследовало цель",
  why: [
    "Цель ставят, достигают или преследуют.",
    "Направлять её нельзя — слова не сочетаются.",
  ],
  answer: "преследовало",
  problemSize: 46,
});

export const lexRoda = makeLexTask({
  id: "LexRoda",
  kind: "remove",
  sentence:
    "На уроке истории России мы изучали правление династии рода Рюриковичей.",
  errorType: "Плеоназм",
  bad: "династия рода",
  good: "династия Рюриковичей",
  why: [
    "Династия — это и есть ряд правителей одного рода.",
    "Слово «рода» ничего не добавляет.",
  ],
  answer: "рода",
  problemSize: 50,
});

export const lexProlivnoy = makeLexTask({
  id: "LexProlivnoy",
  kind: "remove",
  sentence:
    "Свежий пассат, приятная погода, но около полудня начался проливной ливень, правда, непродолжительный.",
  errorType: "Плеоназм",
  bad: "проливной ливень",
  good: "ливень",
  why: [
    "Ливень — это и есть проливной дождь.",
    "Определение дублирует само слово.",
  ],
  answer: "проливной",
  problemSize: 48,
});

export const lexGovorit = makeLexTask({
  id: "LexGovorit",
  kind: "replace",
  sentence:
    "Устав от незаканчивающейся болтовни, я спросил у Маши, когда она прекратит гутарить.",
  errorType: "Диалектизм",
  bad: "прекратит гутарить",
  good: "прекратит говорить",
  why: [
    "«Гутарить» — южнорусское диалектное слово.",
    "В литературной речи оно неуместно.",
  ],
  answer: "говорить",
  problemSize: 48,
});

export const lexOkazala = makeLexTask({
  id: "LexOkazala",
  kind: "replace",
  sentence:
    "Когда у моей подруги случилась неприятность, она пришла ко мне, чтобы я дала ей поддержку.",
  errorType: "Нарушение сочетаемости",
  bad: "дала поддержку",
  good: "оказала поддержку",
  why: [
    "Поддержку оказывают — это устойчивое сочетание.",
    "Заменить в нём глагол нельзя.",
  ],
  answer: "оказала",
  problemSize: 48,
});

export const lexSvyoklu = makeLexTask({
  id: "LexSvyoklu",
  kind: "replace",
  sentence:
    "На исходе сентября и октября мы принялись рубить капусту, мочить яблоки и груши, квасить бураки и заготавливать на зиму другие овощи и коренья для домашнего употребления.",
  errorType: "Диалектизм",
  bad: "квасить бураки",
  good: "квасить свёклу",
  why: [
    "«Бураки» — областное название свёклы.",
    "Рядом с нейтральными словами оно выбивается.",
  ],
  answer: "свёклу",
  problemSize: 42,
});

export const lexZaklyatym = makeLexTask({
  id: "LexZaklyatym",
  kind: "replace",
  sentence:
    "Иван, которого Маша считала закадычным врагом и всегда старалась задеть за живое, не реагировал на её провокации.",
  errorType: "Нарушение сочетаемости",
  bad: "закадычный враг",
  good: "заклятый враг",
  why: [
    "Закадычным бывает друг, а враг — заклятым.",
    "Устойчивые сочетания перепутаны.",
  ],
  answer: "заклятым",
  problemSize: 46,
});

export const lexKamennye = makeLexTask({
  id: "LexKamennye",
  kind: "replace",
  sentence:
    "Тут уже кончались деревянные, выложенные изразцами ступени, сменившие широкие каменистые ступени нижних этажей.",
  errorType: "Смешение паронимов",
  bad: "каменистые ступени",
  good: "каменные ступени",
  why: [
    "Каменистым бывает берег или почва — усыпанные камнями.",
    "Сделанное из камня — каменное.",
  ],
  answer: "каменные",
  problemSize: 46,
});

export const LEXICAL_TASKS: TaskDef[] = [
  lexPozhiloy,
  lexLeitmotiv,
  lexPresledovalo,
  lexRoda,
  lexProlivnoy,
  lexGovorit,
  lexOkazala,
  lexSvyoklu,
  lexZaklyatym,
  lexKamennye,
];
