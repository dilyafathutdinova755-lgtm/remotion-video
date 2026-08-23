import { V, Frac } from "../MathBits";
import { makeSolution, line, card, arrow } from "../Solution";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Мотоциклист догоняет автомобиль. Ответ 240 км.
 * d/v = 1 + d/80 и 420/v = 1 + d/40  →  d² − 170d − 16800 = 0  →  d = 240
 * (скорость автомобиля при этом 60 км/ч).
 */
export const motorcycle420: TaskDef = {
  id: "Motorcycle420",
  number: 10,
  hook: ["Догонит и успеет", "вернуться?"],

  tokens: [
    ...w("Расстояние между городами A и B равно 420 км."),
    ...w("Из города A в город B выехал автомобиль,"),
    ...w(
      "а через 1 час следом за ним со скоростью 80 км/ч выехал мотоциклист,",
    ),
    ...w("догнал автомобиль в городе C и повернул обратно."),
    ...w(
      "Когда он вернулся в A, автомобиль прибыл в B. Найдите расстояние от A до C.",
    ),
  ],
  problemSize: 42,

  solutions: [
    {
      seconds: 10,
      Component: makeSolution({
        step: "1",
        title: "Составляем уравнения",
        seconds: 10,
        items: [
          line(
            <>
              Пусть AC = <V>d</V> км, а скорость автомобиля <V>v</V> км/ч.
            </>,
          ),
          line(<>Мотоциклист догнал автомобиль в C, выехав на час позже:</>),
          card(
            <>
              <Frac num={<V>d</V>} den={<V>v</V>} />
              <span style={{ margin: "0&nbsp;14px" }}>=</span>1
              <span style={{ margin: "0&nbsp;12px" }}>+</span>
              <Frac num={<V>d</V>} den="80" />
            </>,
            { size: 46 },
          ),
          line(
            <>
              Обратно в A он вернулся ровно тогда, когда автомобиль пришёл в B:
            </>,
          ),
          card(
            <>
              <Frac num="420" den={<V>v</V>} />
              <span style={{ margin: "0&nbsp;14px" }}>=</span>1
              <span style={{ margin: "0&nbsp;12px" }}>+</span>
              <Frac num={<V>d</V>} den="40" />
            </>,
            { size: 46 },
          ),
        ],
      }),
    },
    {
      seconds: 11,
      Component: makeSolution({
        step: "2",
        title: "Решаем систему",
        seconds: 11,
        items: [
          line(
            <>
              Из первого уравнения <V>v</V> = 80<V>d</V> / (80 + <V>d</V>).
              Подставляем во второе:
            </>,
          ),
          card(
            <>
              <V>d</V>²<span style={{ margin: "0&nbsp;12px" }}>−</span>170
              <V>d</V>
              <span style={{ margin: "0&nbsp;12px" }}>−</span>16800
              <span style={{ margin: "0&nbsp;14px" }}>=</span>0
            </>,
            { size: 44 },
          ),
          arrow(),
          card(<>D = 96&nbsp;100, &nbsp; √D = 310</>),
          arrow(),
          card(
            <>
              <V>d</V>
              <span style={{ margin: "0&nbsp;14px" }}>=</span>
              <Frac num="170 + 310" den="2" />
              <span style={{ margin: "0&nbsp;14px" }}>=</span>
              <span style={{ color: "#1d4ed8", fontWeight: 700 }}>240</span>
            </>,
            { accent: true },
          ),
        ],
      }),
    },
  ],

  answerLead: "Расстояние от A до C",
  answerFormula: (
    <>
      автомобиль: 420 : 60 = 7 ч,&nbsp;&nbsp; мотоцикл: 1 + 2 · 240 : 80 = 7 ч
    </>
  ),
  answer: "240",
  unit: "км",
  check: <>скорость автомобиля 60 км/ч, оба приходят на седьмом часу</>,
};
