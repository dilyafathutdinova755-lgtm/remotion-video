import { V } from "../MathBits";
import { makeSolution, line, card, arrow } from "../Solution";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Два сплава с медью. Ответ 30 кг.
 * 0,4(m+10) + 0,25m = 0,35(2m+10)  →  m = 10, масса третьего 2m + 10 = 30.
 *
 * Спрашивают массу третьего сплава, а не найденное из уравнения m.
 */
export const alloys: TaskDef = {
  id: "Alloys",
  number: 10,
  hook: "Два сплава. А масса третьего?",

  tokens: [
    ...w("Имеется два сплава."),
    ...w("Первый сплав содержит 40% меди,"),
    ...w("второй — 25% меди."),
    ...w("Масса первого сплава больше массы второго на 10 кг."),
    ...w("Из этих двух сплавов получили третий сплав, содержащий 35% меди."),
    ...w("Найдите массу третьего сплава."),
  ],
  problemSize: 46,
  timerSize: 34,

  solutions: [
    {
      seconds: 9.5,
      Component: makeSolution({
        step: "1",
        title: "Составляем уравнение",
        seconds: 9.5,
        items: [
          line(
            <>
              Пусть масса второго сплава <V>m</V> кг, тогда первого — <V>m</V> +
              10.
            </>,
          ),
          line(
            <>
              Меди в третьем сплаве ровно столько, сколько было в первых двух:
            </>,
          ),
          card(
            <>
              0,4(<V>m</V> + 10)
              <span style={{ margin: "0 12px" }}>+</span>0,25<V>m</V>
              <span style={{ margin: "0 14px" }}>=</span>0,35(2<V>m</V> + 10)
            </>,
            { size: 40 },
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
          line(<>Раскрываем скобки:</>),
          card(
            <>
              0,65<V>m</V>
              <span style={{ margin: "0 12px" }}>+</span>4
              <span style={{ margin: "0 14px" }}>=</span>0,7<V>m</V>
              <span style={{ margin: "0 12px" }}>+</span>3,5
            </>,
            { size: 44 },
          ),
          arrow(),
          card(
            <>
              0,05<V>m</V> = 0,5
              <span style={{ margin: "0 20px" }}>⟹</span>
              <V>m</V> = 10
            </>,
            { size: 44 },
          ),
          arrow(),
          card(
            <>
              третий сплав: 2<V>m</V> + 10 ={" "}
              <span style={{ color: "#1d4ed8", fontWeight: 700 }}>30</span>
            </>,
            { accent: true, size: 42 },
          ),
        ],
      }),
    },
  ],

  answerLead: "Масса третьего сплава",
  answerFormula: <>20 кг + 10 кг = 30 кг</>,
  answer: "30",
  unit: "кг",
  check: <>меди 0,4 · 20 + 0,25 · 10 = 10,5 кг, а 10,5 : 30 = 35%</>,
};
