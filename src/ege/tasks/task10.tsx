import { V } from "../MathBits";
import type { TaskDef } from "./types";
import { SolutionOne } from "./task10-solution1";
import { SolutionTwo } from "./task10-solution2";

/**
 * Задание 10: кепки и футболки.
 *
 * Решение идёт через отношение цен: 3y = 0,55·2x = 1,1x, отсюда 30y = 11x,
 * значит x = 30t, y = 11t; 3x − 2y = 68t = 1020, t = 15, x − y = 19t = 285.
 */
export const task10: TaskDef = {
  id: "Task10",
  number: 10,

  tokens: [
    "Цена",
    "трёх",
    "кепок",
    "меньше",
    "цены",
    "двух",
    "футболок",
    "на",
    "45%.",
    "Разница",
    "в",
    "стоимости",
    "между",
    "тремя",
    "футболками",
    "и",
    "двумя",
    "кепками",
    "составляет",
    "1020",
    "рублей.",
    "Найдите,",
    "на",
    "сколько",
    "рублей",
    "футболка",
    "дороже",
    "кепки.",
  ],
  problemSize: 52,
  timerSize: 40,

  solutions: [
    { seconds: 10, Component: SolutionOne },
    { seconds: 12.5, Component: SolutionTwo },
  ],

  answerLead: "Футболка дороже кепки на",
  answerFormula: (
    <>
      <V>x</V>
      <span style={{ margin: "0 14px" }}>−</span>
      <V>y</V>
      <span style={{ margin: "0 18px" }}>=</span>
      19<V>t</V>
      <span style={{ margin: "0 18px" }}>=</span>
      19&nbsp;·&nbsp;15
      <span style={{ margin: "0 18px" }}>=</span>
      <span style={{ color: "#1d4ed8", fontWeight: 700 }}>285</span>
    </>
  ),
  answer: "285",
  unit: "рублей",
  check: (
    <>
      <V>x</V> = 450, <V>y</V> = 165: &nbsp;3&nbsp;·&nbsp;165 = 495 =
      0,55&nbsp;·&nbsp;900
    </>
  ),
};
