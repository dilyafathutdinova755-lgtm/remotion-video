import type { ReactNode } from "react";
import { makeSolution, line, card, arrow } from "../Solution";
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

/** Ошибочный или исправленный фрагмент — крупно, в карточке. */
const Phrase: React.FC<{ children: ReactNode; bad?: boolean }> = ({ children, bad }) => (
  <span style={{ color: bad ? "#b42318" : COLORS.blue, fontWeight: 700 }}>«{children}»</span>
);

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
  /** Почему это ошибка. */
  why: ReactNode;
  /** Ответ — слово, которое выписывают. */
  answer: string;
  /** Строчка под ответом. */
  check: ReactNode;
  problemSize?: number;
  timerSize?: number;
};

export const makeLexTask = (spec: LexSpec): TaskDef => {
  const removing = spec.kind === "remove";

  return {
    id: spec.id,
    number: 6,
    subject: "в ЕГЭ по русскому языку",
    titleNoun: "Решение задания",
    pillLabel: "Задание",
    instruction: removing ? REMOVE : REPLACE,

    tokens: w(spec.sentence),
    problemSize: spec.problemSize ?? 44,
    timerSize: spec.timerSize ?? 32,

    solutions: [
      {
        seconds: 10,
        Component: makeSolution({
          step: "1",
          title: "Находим ошибку",
          seconds: 10,
          items: [
            line(
              <>
                Ошибка в сочетании <Phrase bad>{spec.bad}</Phrase>.
              </>,
            ),
            line(spec.why),
            card(
              <span style={{ color: "#b42318" }}>{spec.bad}</span>,
              { size: 46 },
            ),
          ],
        }),
      },
      {
        seconds: 10,
        Component: makeSolution({
          step: "2",
          title: "Исправляем",
          seconds: 10,
          items: [
            line(
              removing ? (
                <>Убираем лишнее слово — смысл не меняется:</>
              ) : (
                <>Подбираем слово, которое сочетается верно:</>
              ),
            ),
            card(<span style={{ color: "#b42318" }}>{spec.bad}</span>, { size: 42 }),
            arrow(),
            card(<span style={{ color: COLORS.blue }}>{spec.good}</span>, {
              accent: true,
              size: 46,
            }),
          ],
        }),
      },
    ],

    answerLead: removing ? "Лишнее слово" : "Верное слово",
    answerFormula: (
      <>
        <span style={{ color: "#b42318" }}>{spec.bad}</span>
        <span style={{ margin: "0 20px", color: COLORS.blueLine }}>→</span>
        <span style={{ color: COLORS.blue }}>{spec.good}</span>
      </>
    ),
    answer: spec.answer,
    check: (
      <>
        {spec.errorType}: {spec.check}
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
  why: <>Старик — это и есть пожилой человек, признак уже заложен в самом слове.</>,
  answer: "пожилой",
  check: <>определение повторяет то, что уже сказано существительным</>,
  problemSize: 46,
  timerSize: 34,
});

export const lexLeitmotiv = makeLexTask({
  id: "LexLeitmotiv",
  kind: "remove",
  sentence:
    "Музыка является главным лейтмотивом повести Л.Н. Толстого «Крейцерова соната»: музыкальная тема на протяжении определённого периода жизни персонажа начинает звучать для него по-разному, открывая читателям изменения, которые с ним произошли, и позволяя осознать влияние, которое оказала музыка на его жизнь.",
  errorType: "Плеоназм",
  bad: "главный лейтмотив",
  good: "лейтмотив",
  why: <>Лейтмотив — это и есть ведущий, главный мотив произведения.</>,
  answer: "главным",
  check: <>«лейт-» по-немецки и значит «ведущий»</>,
  problemSize: 36,
  timerSize: 26,
});

export const lexPresledovalo = makeLexTask({
  id: "LexPresledovalo",
  kind: "replace",
  sentence:
    "Объединение трёх театральных школ в специализированное училище направляло важную цель — повысить качество подготовки молодых актёров.",
  errorType: "Нарушение сочетаемости",
  bad: "направляло цель",
  good: "преследовало цель",
  why: <>Цель ставят, достигают или преследуют, но не «направляют».</>,
  answer: "преследовало",
  check: <>глагол не сочетается с этим существительным</>,
  problemSize: 46,
  timerSize: 34,
});

export const lexRoda = makeLexTask({
  id: "LexRoda",
  kind: "remove",
  sentence: "На уроке истории России мы изучали правление династии рода Рюриковичей.",
  errorType: "Плеоназм",
  bad: "династия рода",
  good: "династия Рюриковичей",
  why: <>Династия — это и есть ряд правителей одного рода.</>,
  answer: "рода",
  check: <>значение «рода» целиком входит в слово «династия»</>,
  problemSize: 50,
  timerSize: 36,
});

export const lexProlivnoy = makeLexTask({
  id: "LexProlivnoy",
  kind: "remove",
  sentence:
    "Свежий пассат, приятная погода, но около полудня начался проливной ливень, правда, непродолжительный.",
  errorType: "Плеоназм",
  bad: "проливной ливень",
  good: "ливень",
  why: <>Ливень — это и есть проливной, очень сильный дождь.</>,
  answer: "проливной",
  check: <>определение дублирует значение существительного</>,
  problemSize: 48,
  timerSize: 35,
});

export const lexGovorit = makeLexTask({
  id: "LexGovorit",
  kind: "replace",
  sentence:
    "Устав от незаканчивающейся болтовни, я спросил у Маши, когда она прекратит гутарить.",
  errorType: "Диалектизм",
  bad: "прекратит гутарить",
  good: "прекратит говорить",
  why: <>«Гутарить» — южнорусское диалектное слово, в литературной речи оно неуместно.</>,
  answer: "говорить",
  check: <>нужен нейтральный литературный синоним</>,
  problemSize: 48,
  timerSize: 35,
});

export const lexOkazala = makeLexTask({
  id: "LexOkazala",
  kind: "replace",
  sentence:
    "Когда у моей подруги случилась неприятность, она пришла ко мне, чтобы я дала ей поддержку.",
  errorType: "Нарушение сочетаемости",
  bad: "дала поддержку",
  good: "оказала поддержку",
  why: <>Поддержку оказывают — это устойчивое сочетание, и заменить в нём глагол нельзя.</>,
  answer: "оказала",
  check: <>устойчивое сочетание разрушено подменой глагола</>,
  problemSize: 48,
  timerSize: 35,
});

export const lexSvyoklu = makeLexTask({
  id: "LexSvyoklu",
  kind: "replace",
  sentence:
    "На исходе сентября и октября мы принялись рубить капусту, мочить яблоки и груши, квасить бураки и заготавливать на зиму другие овощи и коренья для домашнего употребления.",
  errorType: "Диалектизм",
  bad: "квасить бураки",
  good: "квасить свёклу",
  why: <>«Бураки» — областное название свёклы, рядом с нейтральными словами оно выбивается.</>,
  answer: "свёклу",
  check: <>в ответе принимается и написание через «е»</>,
  problemSize: 42,
  timerSize: 30,
});

export const lexZaklyatym = makeLexTask({
  id: "LexZaklyatym",
  kind: "replace",
  sentence:
    "Иван, которого Маша считала закадычным врагом и всегда старалась задеть за живое, не реагировал на её провокации.",
  errorType: "Нарушение сочетаемости",
  bad: "закадычный враг",
  good: "заклятый враг",
  why: <>Закадычным бывает друг, а враг — заклятым. Устойчивые сочетания перепутаны.</>,
  answer: "заклятым",
  check: <>«закадычный» сочетается только со словом «друг»</>,
  problemSize: 46,
  timerSize: 34,
});

export const lexKamennye = makeLexTask({
  id: "LexKamennye",
  kind: "replace",
  sentence:
    "Тут уже кончались деревянные, выложенные изразцами ступени, сменившие широкие каменистые ступени нижних этажей.",
  errorType: "Смешение паронимов",
  bad: "каменистые ступени",
  good: "каменные ступени",
  why: <>Каменистым бывает берег или почва — усыпанные камнями. Сделанное из камня — каменное.</>,
  answer: "каменные",
  check: <>каменистый — «покрытый камнями», каменный — «из камня»</>,
  problemSize: 46,
  timerSize: 34,
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
