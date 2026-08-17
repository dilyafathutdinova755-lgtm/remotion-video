import { V } from "../MathBits";
import { makeSolution, line, card, arrow } from "../Solution";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Два сосуда с растворами кислоты. Ответ 15%.
 * 60x + 20y = 30·80 и (x+y)/2 = 45  →  3x + y = 120, x + y = 90  →  x = 15.
 */
export const acid: TaskDef = {
  id: "Acid",
  number: 10,

  tokens: [
    ...w("Имеется два сосуда."),
    ...w("Первый содержит 60 кг,"),
    ...w("а второй — 20 кг растворов кислоты различной концентрации."),
    ...w(
      "Если эти растворы смешать, то получится раствор, содержащий 30% кислоты.",
    ),
    ...w(
      "Если же смешать равные массы этих растворов, то получится раствор, содержащий 45% кислоты.",
    ),
    ...w("Сколько процентов кислоты содержится в первом сосуде?"),
  ],
  problemSize: 44,
  timerSize: 32,

  solutions: [
    {
      seconds: 12,
      Component: makeSolution({
        step: "1",
        title: "Составляем уравнения",
        seconds: 12,
        items: [
          line(
            <>
              Пусть в первом сосуде <V>x</V>% кислоты, а во втором — <V>y</V>%.
            </>,
          ),
          line(<>Смешали все 60 и 20 кг — вышло 30%:</>),
          card(
            <>
              60<V>x</V>
              <span style={{ margin: "0 12px" }}>+</span>20<V>y</V>
              <span style={{ margin: "0 14px" }}>=</span>30 · 80
            </>,
            { size: 44 },
          ),
          line(<>Смешали равные массы — вышло 45%:</>),
          card(
            <>
              <V>x</V>
              <span style={{ margin: "0 12px" }}>+</span>
              <V>y</V>
              <span style={{ margin: "0 14px" }}>=</span>90
            </>,
            { size: 44 },
          ),
        ],
      }),
    },
    {
      seconds: 12,
      Component: makeSolution({
        step: "2",
        title: "Решаем систему",
        seconds: 12,
        items: [
          line(<>Первое уравнение делим на 20:</>),
          card(
            <>
              3<V>x</V>
              <span style={{ margin: "0 12px" }}>+</span>
              <V>y</V>
              <span style={{ margin: "0 14px" }}>=</span>120
            </>,
          ),
          arrow(),
          line(
            <>
              Вычитаем из него <V>x</V> + <V>y</V> = 90:
            </>,
          ),
          card(
            <>
              2<V>x</V> = 30
              <span style={{ margin: "0 20px" }}>⟹</span>
              <V>x</V> ={" "}
              <span style={{ color: "#1d4ed8", fontWeight: 700 }}>15</span>
            </>,
            { accent: true, size: 44 },
          ),
        ],
      }),
    },
  ],

  answerLead: "В первом сосуде кислоты",
  answerFormula: <>во втором тогда 90 − 15 = 75%</>,
  answer: "15",
  unit: "процентов",
  check: <>60 · 0,15 + 20 · 0,75 = 24 кг, а 24 : 80 = 30%</>,
};
