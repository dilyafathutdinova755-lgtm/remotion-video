import { V, Frac } from "../MathBits";
import { makeSolution, line, card, arrow } from "../Solution";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Трубы, резервуар 180 литров. Ответ 10 л/мин.
 * 180/x − 180/(x+8) = 8  →  x² + 8x − 180 = 0  →  x = 10.
 */
export const pipes180: TaskDef = {
  id: "Pipes180",
  number: 10,

  tokens: [
    ...w(
      "Первая труба пропускает на 8 литров воды в минуту меньше, чем вторая.",
    ),
    ...w(
      "Сколько литров воды в минуту пропускает первая труба, если резервуар объёмом 180 литров",
    ),
    ...w("она заполняет на 8 минут дольше, чем вторая?"),
  ],
  problemSize: 48,
  timerSize: 35,

  solutions: [
    {
      seconds: 9,
      Component: makeSolution({
        step: "1",
        title: "Составляем уравнение",
        seconds: 9,
        items: [
          line(
            <>
              Пусть первая труба даёт <V>x</V> литров в минуту, тогда вторая —{" "}
              <V>x</V> + 8.
            </>,
          ),
          line(
            <>Один и тот же резервуар первая наполняет на 8 минут дольше:</>,
          ),
          card(
            <>
              <Frac num="180" den={<V>x</V>} />
              <span style={{ margin: "0 14px" }}>−</span>
              <Frac
                num="180"
                den={
                  <>
                    <V>x</V> + 8
                  </>
                }
              />
              <span style={{ margin: "0 16px" }}>=</span>8
            </>,
            { size: 48 },
          ),
        ],
      }),
    },
    {
      seconds: 10,
      Component: makeSolution({
        step: "2",
        title: "Решаем уравнение",
        seconds: 10,
        items: [
          line(
            <>
              Умножаем на <V>x</V>(<V>x</V> + 8) и делим на 8:
            </>,
          ),
          card(
            <>
              1440
              <span style={{ margin: "0 14px" }}>=</span>8<V>x</V>²
              <span style={{ margin: "0 12px" }}>+</span>64<V>x</V>
            </>,
            { size: 44 },
          ),
          arrow(),
          card(
            <>
              <V>x</V>²<span style={{ margin: "0 12px" }}>+</span>8<V>x</V>
              <span style={{ margin: "0 12px" }}>−</span>180
              <span style={{ margin: "0 14px" }}>=</span>0
            </>,
          ),
          arrow(),
          card(
            <>
              D = 784, √D = 28
              <span style={{ margin: "0 20px" }}>⟹</span>
              <V>x</V> ={" "}
              <span style={{ color: "#1d4ed8", fontWeight: 700 }}>10</span>
            </>,
            { accent: true, size: 44 },
          ),
        ],
      }),
    },
  ],

  answerLead: "Первая труба пропускает",
  answerFormula: <>180 : 10 = 18 мин,&nbsp;&nbsp; 180 : 18 = 10 мин</>,
  answer: "10",
  unit: "л/мин",
  check: <>18 − 10 = 8 минут — как в условии</>,
};
