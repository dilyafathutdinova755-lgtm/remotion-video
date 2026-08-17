import { V, Frac } from "../MathBits";
import { makeSolution, line, card, arrow } from "../Solution";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Трубы 660 и 570 литров. Ответ 22 л/мин.
 * 660/x − 570/(x+8) = 11  →  11x² − 2x − 5280 = 0  →  x = 22.
 */
export const pipes660: TaskDef = {
  id: "Pipes660",
  number: 10,

  tokens: [
    ...w(
      "Первая труба пропускает на 8 литров воды в минуту меньше, чем вторая.",
    ),
    ...w(
      "Сколько литров воды в минуту пропускает первая труба, если резервуар объёмом 660 литров",
    ),
    ...w("она заполняет на 11 минут дольше,"),
    ...w("чем вторая труба заполняет резервуар объёмом 570 литров?"),
  ],
  problemSize: 46,
  timerSize: 34,

  solutions: [
    {
      seconds: 11,
      Component: makeSolution({
        step: "1",
        title: "Составляем уравнение",
        seconds: 11,
        items: [
          line(
            <>
              Пусть первая труба даёт <V>x</V> литров в минуту, тогда вторая —{" "}
              <V>x</V> + 8.
            </>,
          ),
          line(<>Первая наполняет свой резервуар на 11 минут дольше:</>),
          card(
            <>
              <Frac num="660" den={<V>x</V>} />
              <span style={{ margin: "0 14px" }}>−</span>
              <Frac
                num="570"
                den={
                  <>
                    <V>x</V> + 8
                  </>
                }
              />
              <span style={{ margin: "0 16px" }}>=</span>11
            </>,
            { size: 48 },
          ),
        ],
      }),
    },
    {
      seconds: 13.5,
      Component: makeSolution({
        step: "2",
        title: "Решаем уравнение",
        seconds: 13.5,
        items: [
          line(
            <>
              Умножаем обе части на <V>x</V>(<V>x</V> + 8) и приводим подобные:
            </>,
          ),
          card(
            <>
              11<V>x</V>²<span style={{ margin: "0 12px" }}>−</span>2<V>x</V>
              <span style={{ margin: "0 12px" }}>−</span>5280
              <span style={{ margin: "0 14px" }}>=</span>0
            </>,
          ),
          arrow(),
          card(<>D = 232 324, &nbsp; √D = 482</>),
          arrow(),
          card(
            <>
              <V>x</V>
              <span style={{ margin: "0 14px" }}>=</span>
              <Frac num="2 + 482" den="22" />
              <span style={{ margin: "0 14px" }}>=</span>
              <span style={{ color: "#1d4ed8", fontWeight: 700 }}>22</span>
            </>,
            { accent: true },
          ),
        ],
      }),
    },
  ],

  answerLead: "Первая труба пропускает",
  answerFormula: <>660 : 22 = 30 мин,&nbsp;&nbsp; 570 : 30 = 19 мин</>,
  answer: "22",
  unit: "л/мин",
  check: <>30 − 19 = 11 минут — ровно как в условии</>,
};
