import { V, Frac } from "../MathBits";
import { makeSolution, line, card, arrow } from "../Solution";
import { w, art, num, question } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Велосипедист, 70 км туда и обратно. Ответ 10 км/ч.
 * 70/v = 70/(v+3) + 3  →  v² + 3v − 70 = 0  →  v = 7, обратно v + 3 = 10.
 *
 * Спрашивают скорость на обратном пути, а не найденное из уравнения v —
 * на этом чаще всего и теряют балл.
 */
export const cyclist70: TaskDef = {
  id: "Cyclist70",
  number: 10,

  tokens: [
    ...w("Велосипедист выехал с постоянной скоростью из города A в город B, расстояние между которыми равно 70 км."),
    num("70", "км"),
    art(["bike"], "велосипедист"),
    ...w("На следующий день он отправился обратно в A со скоростью на 3 км/ч больше прежней."),
    num("3", "км/ч"),
    ...w("По дороге он сделал остановку на 3 часа."),
    num("3", "часа"),
    ...w("В результате велосипедист затратил на обратный путь столько же времени, сколько на путь из A в B."),
    ...w("Найдите скорость велосипедиста на пути из B в A."),
    question(),
  ],
  problemSize: 40,
  timerSize: 29,

  solutions: [
    {
      seconds: 11.5,
      Component: makeSolution({
        step: "1",
        title: "Составляем уравнение",
        seconds: 11.5,
        items: [
          line(
            <>
              Пусть скорость из A в B равна <V>v</V> км/ч, тогда обратно — <V>v</V> + 3.
            </>,
          ),
          line(<>Обратный путь вместе с остановкой занял столько же времени:</>),
          card(
            <>
              <Frac num="70" den={<V>v</V>} />
              <span style={{ margin: "0 14px" }}>=</span>
              <Frac num="70" den={<><V>v</V> + 3</>} />
              <span style={{ margin: "0 14px" }}>+</span>3
            </>,
            { size: 46 },
          ),
        ],
      }),
    },
    {
      seconds: 13,
      Component: makeSolution({
        step: "2",
        title: "Решаем уравнение",
        seconds: 13,
        items: [
          line(
            <>
              Умножаем на <V>v</V>(<V>v</V> + 3) и делим на 3:
            </>,
          ),
          card(
            <>
              <V>v</V>²<span style={{ margin: "0 12px" }}>+</span>3<V>v</V>
              <span style={{ margin: "0 12px" }}>−</span>70
              <span style={{ margin: "0 14px" }}>=</span>0
            </>,
          ),
          arrow(),
          card(
            <>
              D = 289, √D = 17
              <span style={{ margin: "0 20px" }}>⟹</span>
              <V>v</V> = 7
            </>,
            { size: 44 },
          ),
          arrow(),
          card(
            <>
              обратно:&nbsp; <V>v</V> + 3 ={" "}
              <span style={{ color: "#1d4ed8", fontWeight: 700 }}>10</span>
            </>,
            { accent: true, size: 44 },
          ),
        ],
      }),
    },
  ],

  answerLead: "Скорость на пути из B в A",
  answerFormula: <>70 : 7 = 10 ч&nbsp;&nbsp;и&nbsp;&nbsp;70 : 10 + 3 = 10 ч</>,
  answer: "10",
  unit: "км/ч",
  check: <>спрашивают скорость обратного пути, а не найденное из уравнения 7</>,
};
