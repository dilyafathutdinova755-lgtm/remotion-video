import { V, Frac } from "../MathBits";
import { COLORS } from "../theme";
import { makeSolution, line, card, arrow } from "../Solution";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Два автомобиля из A в B. Ответ 52 км/ч.
 * 1/x = 1/(2(x−13)) + 1/156  →  x² − 91x + 2028 = 0  →  x = 52 или 39,
 * по условию x > 48.
 */
export const twoCars: TaskDef = {
  id: "TwoCars",
  number: 10,
  hook: ["Выехали вместе", "Кто быстрее?"],

  tokens: [
    ...w("Из пункта A в пункт B одновременно выехали два автомобиля."),
    ...w("Первый проехал с постоянной скоростью весь путь."),
    ...w(
      "Второй проехал первую половину пути со скоростью, меньшей скорости первого на 13 км/ч,",
    ),
    ...w("а вторую половину пути — со скоростью 78 км/ч,"),
    ...w(
      "в результате чего прибыл в пункт B одновременно с первым автомобилем.",
    ),
    ...w(
      "Найдите скорость первого автомобиля, если известно, что она больше 48 км/ч.",
    ),
  ],
  problemSize: 42,

  solutions: [
    {
      seconds: 10,
      Component: makeSolution({
        step: "1",
        title: "Составляем уравнение",
        seconds: 10,
        items: [
          line(
            <>
              Пусть скорость первого <V>x</V> км/ч, тогда на первой половине
              второй ехал <V>x</V> − 13.
            </>,
          ),
          line(
            <>
              Времена в пути равны, а путь у обоих один и тот же — он
              сокращается:
            </>,
          ),
          card(
            <>
              <Frac num="1" den={<V>x</V>} />
              <span style={{ margin: "0&nbsp;14px" }}>=</span>
              <Frac
                num="1"
                den={
                  <>
                    2(<V>x</V> − 13)
                  </>
                }
              />
              <span style={{ margin: "0&nbsp;14px" }}>+</span>
              <Frac num="1" den="156" />
            </>,
            { size: 46 },
          ),
        ],
      }),
    },
    {
      seconds: 10.5,
      Component: makeSolution({
        step: "2",
        title: "Решаем уравнение",
        seconds: 10.5,
        items: [
          line(<>Приводим к общему знаменателю и упрощаем:</>),
          card(
            <>
              <V>x</V>²<span style={{ margin: "0&nbsp;12px" }}>−</span>91
              <V>x</V>
              <span style={{ margin: "0&nbsp;12px" }}>+</span>2028
              <span style={{ margin: "0&nbsp;14px" }}>=</span>0
            </>,
          ),
          arrow(),
          card(
            <>
              D = 169, √D = 13
              <span style={{ margin: "0&nbsp;20px" }}>⟹</span>
              <V>x</V> = 52 или 39
            </>,
            { size: 42 },
          ),
          arrow(),
          card(
            <>
              по условию <V>x</V> &gt; 48
              <span style={{ margin: "0&nbsp;20px" }}>⟹</span>
              <V>x</V> ={" "}
              <span style={{ color: COLORS.accent, fontWeight: 700 }}>52</span>
              <span style={{ marginLeft: 14 }}>км/ч</span>
            </>,
            { accent: true, size: 42 },
          ),
          line(
            <span style={{ color: COLORS.textMuted }}>
              Проверка: на трассе 156 км оба тратят по 3 часа.
            </span>,
          ),
        ],
      }),
    },
  ],

  // Разбор уже привёл к ответу — отдельной сцены с повтором нет
  answerRecap: false,
  answer: "52",
};
