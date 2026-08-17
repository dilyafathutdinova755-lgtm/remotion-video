import { V, Frac } from "../MathBits";
import { makeSolution, line, card, arrow } from "../Solution";
import { w, art, num, question } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Теплоход, 200 км туда и обратно. Ответ 5 км/ч.
 * 200/(15+x) + 200/(15−x) = 30  →  x² = 25  →  x = 5.
 */
export const ship200: TaskDef = {
  id: "Ship200",
  number: 10,

  tokens: [
    ...w("Теплоход проходит по течению реки до пункта назначения 200 км"),
    num("200", "км"),
    ...w("и после стоянки возвращается в пункт отправления."),
    art(["ship"], "теплоход"),
    ...w("Найдите скорость течения, если скорость теплохода в неподвижной воде равна 15 км/ч,"),
    num("15", "км/ч"),
    ...w("стоянка длится 10 часов,"),
    num("10", "часов"),
    ...w("а в пункт отправления теплоход возвращается через 40 часов после отплытия из него."),
    num("40", "часов"),
    question(),
  ],
  problemSize: 44,
  timerSize: 32,

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
              Пусть скорость течения <V>x</V> км/ч. По течению теплоход идёт 15 + <V>x</V>, против —
              15 − <V>x</V>.
            </>,
          ),
          line(<>В движении он провёл 40 − 10 = 30 часов:</>),
          card(
            <>
              <Frac num="200" den={<>15 + <V>x</V></>} />
              <span style={{ margin: "0 14px" }}>+</span>
              <Frac num="200" den={<>15 − <V>x</V></>} />
              <span style={{ margin: "0 16px" }}>=</span>30
            </>,
            { size: 46 },
          ),
        ],
      }),
    },
    {
      seconds: 12.5,
      Component: makeSolution({
        step: "2",
        title: "Решаем уравнение",
        seconds: 12.5,
        items: [
          line(<>Приводим к общему знаменателю:</>),
          card(
            <>
              6000
              <span style={{ margin: "0 14px" }}>=</span>30(225 − <V>x</V>²)
            </>,
            { size: 44 },
          ),
          arrow(),
          card(
            <>
              225 − <V>x</V>²<span style={{ margin: "0 14px" }}>=</span>200
            </>,
          ),
          arrow(),
          card(
            <>
              <V>x</V>² = 25
              <span style={{ margin: "0 20px" }}>⟹</span>
              <V>x</V> = <span style={{ color: "#1d4ed8", fontWeight: 700 }}>5</span>
            </>,
            { accent: true, size: 44 },
          ),
        ],
      }),
    },
  ],

  answerLead: "Скорость течения реки",
  answerFormula: <>200 : 20 + 200 : 10 = 10 + 20 = 30 ч</>,
  answer: "5",
  unit: "км/ч",
  check: <>30 часов в пути и 10 часов стоянки — те самые 40</>,
};
