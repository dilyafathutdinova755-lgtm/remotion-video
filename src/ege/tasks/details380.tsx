import { V, Frac } from "../MathBits";
import { makeSolution, line, card, arrow } from "../Solution";
import { w, art, num, question } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Заказ на 380 деталей. Ответ 20 деталей в час.
 * 380/(x−1) − 380/x = 1  →  x² − x − 380 = 0  →  x = 20.
 */
export const details380: TaskDef = {
  id: "Details380",
  number: 10,

  tokens: [
    ...w("Заказ на 380 деталей"),
    num("380", "деталей"),
    ...w("первый рабочий выполняет на 1 час быстрее, чем второй."),
    art(["worker", "worker"], "двое рабочих"),
    ...w(
      "Сколько деталей в час делает первый рабочий, если известно, что он за час делает на 1 деталь больше?",
    ),
    art(["gear"], "детали"),
    question(),
  ],
  problemSize: 50,
  timerSize: 36,

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
              Пусть первый делает <V>x</V> деталей в час, тогда второй — <V>x</V> − 1.
            </>,
          ),
          line(<>На весь заказ второй тратит на час больше:</>),
          card(
            <>
              <Frac num="380" den={<><V>x</V> − 1</>} />
              <span style={{ margin: "0 14px" }}>−</span>
              <Frac num="380" den={<V>x</V>} />
              <span style={{ margin: "0 16px" }}>=</span>1
            </>,
            { size: 48 },
          ),
        ],
      }),
    },
    {
      seconds: 12,
      Component: makeSolution({
        step: "2",
        title: "Решаем уравнение",
        seconds: 12,
        items: [
          line(
            <>
              Умножаем на <V>x</V>(<V>x</V> − 1):
            </>,
          ),
          card(
            <>
              380<V>x</V>
              <span style={{ margin: "0 12px" }}>−</span>380(<V>x</V> − 1)
              <span style={{ margin: "0 14px" }}>=</span>
              <V>x</V>(<V>x</V> − 1)
            </>,
            { size: 44 },
          ),
          arrow(),
          card(
            <>
              <V>x</V>²<span style={{ margin: "0 12px" }}>−</span>
              <V>x</V>
              <span style={{ margin: "0 12px" }}>−</span>380
              <span style={{ margin: "0 14px" }}>=</span>0
            </>,
          ),
          arrow(),
          card(
            <>
              D = 1521, √D = 39
              <span style={{ margin: "0 20px" }}>⟹</span>
              <V>x</V> = <span style={{ color: "#1d4ed8", fontWeight: 700 }}>20</span>
            </>,
            { accent: true, size: 44 },
          ),
        ],
      }),
    },
  ],

  answerLead: "Первый рабочий делает",
  answerFormula: <>380 : 20 = 19 ч,&nbsp;&nbsp; 380 : 19 = 20 ч</>,
  answer: "20",
  unit: "деталей в час",
  check: <>20 − 19 = 1 час — как в условии</>,
};
