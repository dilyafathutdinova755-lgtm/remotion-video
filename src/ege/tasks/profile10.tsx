import type { ReactNode } from "react";
import { V, Frac } from "../MathBits";
import { makeSolution, line, card, arrow, beatsToItemAt } from "../Solution";
import type { SolutionItem } from "../Solution";
import { COLORS } from "../theme";
import { w } from "./dsl";
import type { TaskDef, AudioSync } from "./types";

/**
 * Задание 10 ЕГЭ по профильной математике: текстовые задачи на движение,
 * работу, смеси и прогрессии.
 *
 * Разбор рассчитан на того, кто тему не знает: сначала проговаривается, что
 * за что обозначаем и почему уравнение выглядит именно так, и только потом
 * идут вычисления. Дискриминант не пропускается — без него решение
 * квадратного уравнения выглядит фокусом.
 *
 * Отдельной сцены с ответом нет: последний шаг и есть ответ, повторять его
 * следующим кадром — дублирование.
 */

const SUBJECT = "в ЕГЭ по профильной математике";
const ACCENT = { color: COLORS.accent, fontWeight: 700 } as const;
const NOTE = { color: COLORS.textMuted } as const;

const base = (
  id: string,
  hook: string[],
  illustration: string,
  problemSize = 44,
) => ({
  id,
  illustration,
  number: 10,
  subject: SUBJECT,
  hook,
  problemSize,
  answerRecap: false,
});

const step = (
  n: string,
  title: string,
  seconds: number,
  items: SolutionItem[],
  itemAt?: number[],
) => ({
  seconds,
  Component: makeSolution({ step: n, title, seconds, items, itemAt }),
});

/** Хвост последнего шага: сам ответ и строчка проверки под ним. */
const finish = (answer: ReactNode, note: string): SolutionItem[] => [
  card(answer, { accent: true, size: 46 }),
  line(<span style={NOTE}>{note}</span>),
];

// --- движение ----------------------------------------------------------------

export const ship200: TaskDef = {
  ...base("Ship200", ["Найдёшь скорость", "течения?"], "ship", 42),

  tokens: w(
    "Теплоход проходит по течению реки до пункта назначения 200 км и после стоянки возвращается в пункт отправления. Найдите скорость течения, если скорость теплохода в неподвижной воде равна 15 км/ч, стоянка длится 10 часов, а в пункт отправления теплоход возвращается через 40 часов после отплытия из него. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Сколько времени он плыл", 7.5, [
      line(<>Из сорока часов десять теплоход просто стоял у причала.</>),
      card(<>40 − 10 = 30 часов в пути</>, { size: 46 }),
    ]),
    step("2", "Обозначаем скорость течения", 10, [
      line(
        <>
          Пусть течение <V>x</V> км/ч. По течению река помогает, поэтому
          скорость 15 + <V>x</V>; против течения мешает — 15 − <V>x</V>.
        </>,
      ),
      line(
        <>Время — это путь, делённый на скорость. Туда и обратно по 200 км:</>,
      ),
      card(
        <>
          <Frac
            num="200"
            den={
              <>
                15 + <V>x</V>
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>+</span>
          <Frac
            num="200"
            den={
              <>
                15 − <V>x</V>
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>=</span>30
        </>,
        { size: 42 },
      ),
    ]),
    step("3", "Решаем уравнение", 10, [
      line(
        <>
          Общий знаменатель — (15 + <V>x</V>)(15 − <V>x</V>), а это 225 −{" "}
          <V>x</V>²:
        </>,
      ),
      card(
        <span>
          6000 = 30 · (225 − <V>x</V>²)
        </span>,
        { size: 44 },
      ),
      arrow(),
      card(
        <span>
          225 − <V>x</V>² = 200 ⟹ <V>x</V>² = 25
        </span>,
        { size: 42 },
      ),
      ...finish(
        <span>
          <V>x</V> = <span style={ACCENT}>5</span> км/ч
        </span>,
        "По течению 20 км/ч — это 10 часов, против 10 км/ч — 20 часов. Вместе 30.",
      ),
    ]),
  ],

  answer: "5",
};

export const twoCars78: TaskDef = {
  ...base("TwoCars", ["Выехали вместе", "Кто быстрее?"], "car", 40),

  tokens: w(
    "Из пункта A в пункт B одновременно выехали два автомобиля. Первый проехал с постоянной скоростью весь путь. Второй проехал первую половину пути со скоростью, меньшей скорости первого на 13 км/ч, а вторую половину пути — со скоростью 78 км/ч, в результате чего прибыл в пункт B одновременно с первым автомобилем. Найдите скорость первого автомобиля, если известно, что она больше 48 км/ч. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Обозначаем скорости", 9, [
      line(
        <>
          Пусть первый едет <V>x</V> км/ч. Тогда на первой половине второй ехал{" "}
          <V>x</V> − 13, а на второй — 78.
        </>,
      ),
      line(<>Длина пути не дана — обозначим весь путь 2S, тогда половина S.</>),
    ]),
    step("2", "Приехали одновременно", 9.5, [
      line(
        <>
          Значит их времена равны. У первого 2S : <V>x</V>, у второго два куска
          по S. Буква S сокращается — длина пути не важна:
        </>,
      ),
      card(
        <>
          <Frac num="2" den={<V>x</V>} />
          <span style={{ margin: "0 14px" }}>=</span>
          <Frac
            num="1"
            den={
              <>
                <V>x</V> − 13
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>+</span>
          <Frac num="1" den="78" />
        </>,
        { size: 42 },
      ),
    ]),
    step("3", "Решаем уравнение", 10.5, [
      line(<>После приведения к общему знаменателю остаётся квадратное:</>),
      card(
        <span>
          <V>x</V>² − 91<V>x</V> + 2028 = 0
        </span>,
        { size: 44 },
      ),
      arrow(),
      card(<span>D = 8281 − 8112 = 169, √D = 13</span>, { size: 40 }),
      arrow(),
      ...finish(
        <span>
          <V>x</V> = 52 или 39, нужно &gt; 48 ⟹ <span style={ACCENT}>52</span>
        </span>,
        "На трассе 156 км оба тратят по 3 часа — сходится.",
      ),
    ]),
  ],

  answer: "52",
};

export const twoCars24: TaskDef = {
  ...base("Prof10TwoCars24", ["Первая половина —", "24 км/ч"], "route", 42),

  tokens: w(
    "Из пункта A в пункт B одновременно выехали два автомобиля. Первый проехал с постоянной скоростью весь путь. Второй проехал первую половину пути со скоростью 24 км/ч, а вторую половину пути — со скоростью, на 16 км/ч большей скорости первого, в результате чего прибыл в пункт B одновременно с первым автомобилем. Найдите скорость первого автомобиля. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Обозначаем скорости", 9, [
      line(
        <>
          Пусть первый едет <V>x</V> км/ч. Второй первую половину ехал 24, а
          вторую — на 16 больше первого, то есть <V>x</V> + 16.
        </>,
      ),
      line(<>Весь путь обозначим 2S, тогда каждая половина — это S.</>),
    ]),
    step("2", "Приехали одновременно", 9.5, [
      line(<>Времена равны, и буква S при сокращении уходит:</>),
      card(
        <>
          <Frac num="2" den={<V>x</V>} />
          <span style={{ margin: "0 14px" }}>=</span>
          <Frac num="1" den="24" />
          <span style={{ margin: "0 14px" }}>+</span>
          <Frac
            num="1"
            den={
              <>
                <V>x</V> + 16
              </>
            }
          />
        </>,
        { size: 42 },
      ),
    ]),
    step("3", "Решаем уравнение", 10.5, [
      line(<>Приводим к общему знаменателю и упрощаем:</>),
      card(
        <span>
          <V>x</V>² − 8<V>x</V> − 768 = 0
        </span>,
        { size: 44 },
      ),
      arrow(),
      card(<span>D = 64 + 3072 = 3136, √D = 56</span>, { size: 40 }),
      arrow(),
      ...finish(
        <span>
          <V>x</V> = <span style={ACCENT}>32</span> км/ч
        </span>,
        "Второй корень −24 отбрасываем: скорость не бывает отрицательной.",
      ),
    ]),
  ],

  answer: "32",
};

export const overtake: TaskDef = {
  ...base(
    "Prof10Overtake",
    ["Обогнал на шоссе", "Сколько между ними?"],
    "road",
    46,
  ),

  tokens: w(
    "Автомобиль, движущийся с постоянной скоростью 80 км/ч по прямому шоссе, обгоняет другой автомобиль, движущийся в ту же сторону с постоянной скоростью 50 км/ч. Каким будет расстояние (в километрах) между этими автомобилями через 20 минут после обгона?",
  ),

  solutions: [
    step("1", "На сколько он отрывается", 8, [
      line(
        <>
          Едут в одну сторону, поэтому важна не сама скорость, а разница: на
          столько первый уезжает вперёд за час.
        </>,
      ),
      card(<>80 − 50 = 30 км за час</>, { size: 46 }),
    ]),
    step("2", "Считаем за 20 минут", 8.5, [
      line(<>20 минут — это треть часа, значит и отрыв будет втрое меньше:</>),
      ...finish(
        <span>
          30 : 3 = <span style={ACCENT}>10</span> км
        </span>,
        "Оба едут равномерно, поэтому расстояние растёт с постоянной скоростью.",
      ),
    ]),
  ],

  answer: "10",
};

export const cyclist75: TaskDef = {
  ...base(
    "Prof10Cyclist75",
    ["Отстал на 6 часов", "Какая скорость?"],
    "bicycle",
    44,
  ),

  tokens: w(
    "Из пункта A в пункт B, расстояние между которыми 75 км, одновременно выехали автомобилист и велосипедист. Известно, что за час автомобилист проезжает на 40 км больше, чем велосипедист. Определите скорость велосипедиста, если известно, что он прибыл в пункт B на 6 часов позже автомобилиста. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Обозначаем скорости", 8.5, [
      line(
        <>
          Пусть велосипедист едет <V>x</V> км/ч. Автомобилист на 40 быстрее,
          значит <V>x</V> + 40.
        </>,
      ),
    ]),
    step("2", "Записываем разницу во времени", 9.5, [
      line(
        <>
          Время каждого — это 75, делённое на его скорость. Велосипедист в пути
          на 6 часов дольше:
        </>,
      ),
      card(
        <>
          <Frac num="75" den={<V>x</V>} />
          <span style={{ margin: "0 14px" }}>−</span>
          <Frac
            num="75"
            den={
              <>
                <V>x</V> + 40
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>=</span>6
        </>,
        { size: 42 },
      ),
    ]),
    step("3", "Решаем уравнение", 10, [
      line(<>Умножаем всё на знаменатели и упрощаем:</>),
      card(
        <span>
          <V>x</V>² + 40<V>x</V> − 500 = 0
        </span>,
        { size: 44 },
      ),
      arrow(),
      card(<span>D = 1600 + 2000 = 3600, √D = 60</span>, { size: 40 }),
      arrow(),
      ...finish(
        <span>
          <V>x</V> = <span style={ACCENT}>10</span> км/ч
        </span>,
        "Проверка: 75 : 10 = 7,5 ч, 75 : 50 = 1,5 ч. Разница ровно 6.",
      ),
    ]),
  ],

  answer: "10",
};

// --- смеси и сплавы ----------------------------------------------------------

export const mixThree: TaskDef = {
  ...base(
    "Prof10Mix3",
    ["Три раствора в один", "Сколько процентов?"],
    "flask",
    42,
  ),

  tokens: w(
    "Смешали 6 литров 7-процентного водного раствора некоторого вещества с 12 литрами 37-процентного водного раствора этого же вещества и с 2 литрами 2-процентного водного раствора этого же вещества. Сколько процентов составляет концентрация получившегося раствора?",
  ),

  solutions: [
    step("1", "Считаем чистое вещество", 9.5, [
      line(<>Проценты складывать нельзя — сложим сами литры вещества:</>),
      card(<>7% от 6 л = 0,42 л</>, { size: 40 }),
      card(<>37% от 12 л = 4,44 л</>, { size: 40 }),
      card(<>2% от 2 л = 0,04 л</>, { size: 40 }),
    ]),
    step("2", "Делим на весь объём", 9.5, [
      line(<>Вещества набралось 0,42 + 4,44 + 0,04 = 4,9 л.</>),
      line(<>А всего раствора 6 + 12 + 2 = 20 л:</>),
      ...finish(
        <span>
          4,9 : 20 = 0,245 = <span style={ACCENT}>24,5</span>%
        </span>,
        "Ответ обязан лежать между 2% и 37% — иначе где-то ошибка.",
      ),
    ]),
  ],

  answer: "24,5",
};

export const alloys350: TaskDef = {
  ...base(
    "Prof10Alloys350",
    ["Два сплава", "На сколько разница?"],
    "ingot",
    44,
  ),

  tokens: w(
    "Имеется два сплава. Первый содержит 15% никеля, второй — 25% никеля. Из этих двух сплавов получили третий сплав массой 350 кг, содержащий 20% никеля. На сколько килограммов масса первого сплава была меньше массы второго?",
  ),

  solutions: [
    step("1", "Смотрим на проценты", 8.5, [
      line(<>Было 15% и 25%, а получилось 20%.</>),
      card(<>15 … 20 … 25</>, { size: 48 }),
      line(<>Двадцать стоит ровно посередине между ними.</>),
    ]),
    step("2", "Что это значит", 9, [
      line(
        <>
          Середина выходит только тогда, когда обоих сплавов взяли поровну — как
          среднее двух чисел.
        </>,
      ),
      card(<>350 : 2 = по 175 кг</>, { size: 46 }),
      ...finish(
        <span>
          175 − 175 = <span style={ACCENT}>0</span>
        </span>,
        "Проверка: 26,25 + 43,75 = 70 кг никеля, а это ровно 20% от 350.",
      ),
    ]),
  ],

  answer: "0",
};

export const dilute: TaskDef = {
  ...base("Prof10Dilute", ["Долили воды", "Что с концентрацией?"], "drop", 44),

  tokens: w(
    "В сосуд, содержащий 70 литров 92-процентного водного раствора некоторого вещества, добавили 10 литров воды. Сколько процентов составляет концентрация получившегося раствора?",
  ),

  solutions: [
    step("1", "Вещество никуда не делось", 9, [
      line(<>Долили чистую воду, значит вещества осталось столько же:</>),
      card(<>92% от 70 л = 64,4 л</>, { size: 46 }),
    ]),
    step("2", "А раствора стало больше", 9, [
      line(<>Теперь его 70 + 10 = 80 литров. Считаем долю вещества:</>),
      ...finish(
        <span>
          64,4 : 80 = 0,805 = <span style={ACCENT}>80,5</span>%
        </span>,
        "Концентрация упала: то же вещество делим на больший объём.",
      ),
    ]),
  ],

  answer: "80,5",
};

// --- работа ------------------------------------------------------------------

export const details345: TaskDef = {
  ...base(
    "Prof10Details345",
    ["345 и 476 деталей", "Кто быстрее?"],
    "bolt",
    42,
  ),

  tokens: w(
    "На изготовление 345 деталей первый рабочий тратит на 10 часов меньше, чем второй рабочий на изготовление 476 таких же деталей. Известно, что первый рабочий за час делает на 5 деталей больше, чем второй. Сколько деталей в час делает первый рабочий?",
  ),

  solutions: [
    step("1", "Обозначаем скорость работы", 8.5, [
      line(
        <>
          Пусть первый делает <V>x</V> деталей в час. Второй на 5 меньше, значит{" "}
          <V>x</V> − 5.
        </>,
      ),
    ]),
    step("2", "Записываем время", 9.5, [
      line(
        <>
          Время — это детали, делённые на скорость. Первый тратит на 10 часов
          меньше, поэтому прибавим их к его времени:
        </>,
      ),
      card(
        <>
          <Frac num="345" den={<V>x</V>} />
          <span style={{ margin: "0 14px" }}>+</span>10
          <span style={{ margin: "0 14px" }}>=</span>
          <Frac
            num="476"
            den={
              <>
                <V>x</V> − 5
              </>
            }
          />
        </>,
        { size: 42 },
      ),
    ]),
    step("3", "Решаем уравнение", 10.5, [
      line(<>Умножаем на знаменатели и приводим подобные:</>),
      card(
        <span>
          10<V>x</V>² − 181<V>x</V> − 1725 = 0
        </span>,
        { size: 42 },
      ),
      arrow(),
      card(<span>D = 101 761, √D = 319</span>, { size: 42 }),
      arrow(),
      ...finish(
        <span>
          <V>x</V> = <span style={ACCENT}>25</span> деталей в час
        </span>,
        "Проверка: 345 : 25 = 13,8 ч, 476 : 20 = 23,8 ч. Разница ровно 10.",
      ),
    ]),
  ],

  answer: "25",
};

export const pumps: TaskDef = {
  ...base("Prof10Pumps", ["Три насоса разом", "За сколько минут?"], "tank", 44),

  tokens: w(
    "Первый насос наполняет бак за 70 минут, второй — за 40 минут, а третий — за треть часа. За сколько минут наполнят бак три насоса, работая одновременно?",
  ),

  solutions: [
    step("1", "Кто сколько успевает за минуту", 9.5, [
      line(<>Треть часа — это 20 минут. Весь бак примем за единицу.</>),
      line(<>Тогда за минуту каждый насос наполняет свою долю бака:</>),
      card(
        <>
          <Frac num="1" den="70" />
          <span style={{ margin: "0 22px" }} />
          <Frac num="1" den="40" />
          <span style={{ margin: "0 22px" }} />
          <Frac num="1" den="20" />
        </>,
        { size: 42 },
      ),
    ]),
    step("2", "Складываем доли", 9, [
      line(<>Общий знаменатель — 280:</>),
      card(
        <>
          <Frac num="4" den="280" />
          <span style={{ margin: "0 12px" }}>+</span>
          <Frac num="7" den="280" />
          <span style={{ margin: "0 12px" }}>+</span>
          <Frac num="14" den="280" />
          <span style={{ margin: "0 14px" }}>=</span>
          <Frac num="25" den="280" />
        </>,
        { size: 40 },
      ),
    ]),
    step("3", "Делим бак на скорость", 8.5, [
      line(
        <>
          Дробь сокращается до <Frac num="5" den="56" /> бака в минуту:
        </>,
      ),
      ...finish(
        <span>
          1 : <Frac num="5" den="56" /> = <span style={ACCENT}>11,2</span> мин
        </span>,
        "Втроём быстрее самого быстрого насоса — так и должно быть.",
      ),
    ]),
  ],

  answer: "11,2",
};

// --- прогрессия --------------------------------------------------------------

export const fence: TaskDef = {
  ...base("Prof10Fence", ["Каждый день", "красят больше"], "roller", 44),

  tokens: w(
    "Бригада маляров красит забор длиной 487,5 метра, ежедневно увеличивая норму покраски на одно и то же число метров. Известно, что за первый и последний день в сумме бригада покрасила 75 метров забора. Определите, сколько дней бригада маляров красила весь забор.",
  ),

  solutions: [
    step("1", "Что за последовательность", 8.5, [
      line(
        <>
          Каждый день прибавляют одно и то же число метров — это арифметическая
          прогрессия.
        </>,
      ),
    ]),
    step("2", "Хитрость суммы", 9.5, [
      line(
        <>
          В такой прогрессии первый и последний в сумме дают столько же, сколько
          второй и предпоследний, и так далее.
        </>,
      ),
      line(<>Поэтому вся сумма — это полусумма крайних, умноженная на дни:</>),
      card(
        <span>
          S = <Frac num={<>a₁ + aₙ</>} den="2" /> · n
        </span>,
        { size: 44 },
      ),
    ]),
    step("3", "Подставляем числа", 8.5, [
      line(<>Сумма крайних дней известна — 75 метров:</>),
      card(
        <span>
          487,5 = <Frac num="75" den="2" /> · n
        </span>,
        { size: 44 },
      ),
      arrow(),
      ...finish(
        <span>
          n = <span style={ACCENT}>13</span> дней
        </span>,
        "Ни первый день, ни шаг прироста знать так и не понадобилось.",
      ),
    ]),
  ],

  answer: "13",
};

// --- партия 2: движение -------------------------------------------------------

// Тайминг сцен взят из реальной озвучки (ElevenLabs), присланной и
// размеченной пользователем 29.08.2026 — паузы найдены автоматически
// (ffmpeg silencedetect) и выровнены по количеству слов на реплику.
const ship96Audio: AudioSync = {
  src: "audio/prof10-12.mp3",
  totalSec: 91.72,
  conditionSec: 8.0,
  stepSec: [24.72, 45.44],
  outroSec: 88.57,
  stepBeats: { 1: { itemCounts: [4, 2], atSec: [30.22] } },
};

const ship96Step2Items: SolutionItem[] = [
  line(
    <>
      Общий знаменатель — (20 + <V>x</V>)(20 − <V>x</V>), а это 400 −{" "}
      <V>x</V>². В числителе <V>x</V> сокращается сам собой:
    </>,
  ),
  card(
    <>
      96 · 40 = 10 · (400 − <V>x</V>²)
    </>,
    { size: 42 },
  ),
  arrow(),
  card(
    <>
      384 = 400 − <V>x</V>² ⟹ <V>x</V>² = 16
    </>,
    { size: 40 },
  ),
  ...finish(
    <span>
      <V>x</V> = <span style={ACCENT}>4</span> км/ч
    </span>,
    "По течению 24 км/ч — 4 часа пути, против течения 16 км/ч — 6 часов. Вместе 10.",
  ),
];

export const ship96: TaskDef = {
  ...base("Prof10Ship96", ["Теплоход туда и обратно", "Какое течение?"], "river", 42),
  audioSync: ship96Audio,

  tokens: w(
    "Теплоход совершает рейс: 96 км по течению и 96 км обратно. Его собственная скорость — 20 км/ч, а общее время в пути (без учёта стоянок) — 10 часов. Определите скорость течения реки. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Обозначаем скорость течения", 10, [
      line(
        <>
          Пусть течение <V>x</V> км/ч. По течению река помогает — скорость
          20 + <V>x</V>; против течения мешает — 20 − <V>x</V>.
        </>,
      ),
      line(
        <>Время — это путь, делённый на скорость, и в обе стороны по 96 км:</>,
      ),
      card(
        <>
          <Frac
            num="96"
            den={
              <>
                20 + <V>x</V>
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>+</span>
          <Frac
            num="96"
            den={
              <>
                20 − <V>x</V>
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>=</span>10
        </>,
        { size: 38 },
      ),
    ]),
    step(
      "2",
      "Решаем уравнение",
      10.5,
      ship96Step2Items,
      beatsToItemAt(
        ship96Step2Items,
        ship96Audio.stepBeats![1].itemCounts,
        ship96Audio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "4",
};

const raftBoatAudio: AudioSync = {
  src: "audio/prof10-13.mp3",
  totalSec: 56.89,
  conditionSec: 8.07,
  stepSec: [21.75, 32.62],
  outroSec: 54.14,
  stepBeats: { 1: { itemCounts: [4, 3], atSec: [14.72] } },
};

const raftBoatStep2Items: SolutionItem[] = [
  line(<>Катер в 4 раза быстрее течения — это его собственная скорость:</>),
  card(<>4 · 4 = 16 км/ч</>, { size: 44 }),
  line(<>По течению река ему ещё и помогает:</>),
  card(<>16 + 4 = 20 км/ч</>, { size: 44 }),
  arrow(),
  ...finish(
    <span>
      60 : 20 = <span style={ACCENT}>3</span> часа
    </span>,
    "Скорость катера в 4 раза больше течения — считать можно без уравнений.",
  ),
];

export const raftBoat: TaskDef = {
  ...base(
    "Prof10RaftBoat",
    ["Плот сказал скорость реки", "Догонит катер?"],
    "ship",
    44,
  ),
  audioSync: raftBoatAudio,

  tokens: w(
    "Плот проплывает 24 км за 6 часов. Катер, чья собственная скорость в 4 раза больше скорости течения, должен пройти 60 км по течению. Сколько времени у него на это уйдёт? Ответ дайте в часах.",
  ),

  solutions: [
    step("1", "Узнаём скорость течения", 8.5, [
      line(<>Плот сам не плывёт — его скорость и есть скорость течения:</>),
      card(<>24 : 6 = 4 км/ч</>, { size: 46 }),
    ]),
    step(
      "2",
      "Находим скорость катера",
      9.5,
      raftBoatStep2Items,
      beatsToItemAt(
        raftBoatStep2Items,
        raftBoatAudio.stepBeats![1].itemCounts,
        raftBoatAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "3",
};

const ship6048Audio: AudioSync = {
  src: "audio/prof10-14.mp3",
  totalSec: 77.32,
  conditionSec: 8.44,
  stepSec: [21.09, 39.83],
  outroSec: 74.34,
  stepBeats: { 1: { itemCounts: [4, 3], atSec: [21.34] } },
};

const ship6048Step2Items: SolutionItem[] = [
  line(<>После общего знаменателя получаем квадратное уравнение:</>),
  card(
    <>
      <V>v</V>² + 12<V>v</V> − 448 = 0
    </>,
    { size: 42 },
  ),
  arrow(),
  card(<>D = 144 + 1792 = 1936, √D = 44</>, { size: 40 }),
  arrow(),
  ...finish(
    <span>
      <V>v</V> = <span style={ACCENT}>16</span> км/ч
    </span>,
    "Проверка: по течению 20 км/ч — 3 часа, против течения 12 км/ч — 4 часа. Разница ровно 1 час.",
  ),
];

export const ship6048: TaskDef = {
  ...base(
    "Prof10Ship6048",
    ["На час быстрее по течению", "Какая скорость судна?"],
    "river",
    42,
  ),
  audioSync: ship6048Audio,

  tokens: w(
    "Теплоходу требуется на 1 час меньше, чтобы преодолеть 60 км по течению, чем 48 км против течения. Известно, что скорость течения составляет 4 км/ч. Найдите собственную скорость судна. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Обозначаем время", 10, [
      line(
        <>
          Пусть <V>v</V> — собственная скорость теплохода. По течению{" "}
          <V>v</V> + 4, против течения — <V>v</V> − 4.
        </>,
      ),
      line(<>Против течения путь короче, но идёт дольше — на целый час:</>),
      card(
        <>
          <Frac
            num="48"
            den={
              <>
                <V>v</V> − 4
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>−</span>
          <Frac
            num="60"
            den={
              <>
                <V>v</V> + 4
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>=</span>1
        </>,
        { size: 40 },
      ),
    ]),
    step(
      "2",
      "Решаем уравнение",
      10.5,
      ship6048Step2Items,
      beatsToItemAt(
        ship6048Step2Items,
        ship6048Audio.stepBeats![1].itemCounts,
        ship6048Audio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "16",
};

const boat3624Audio: AudioSync = {
  src: "audio/prof10-15.mp3",
  totalSec: 71.55,
  conditionSec: 7.23,
  stepSec: [20.23, 36.8],
  outroSec: 68.52,
  stepBeats: { 1: { itemCounts: [5, 3], atSec: [21.03] } },
};

const boat3624Step2Items: SolutionItem[] = [
  line(<>Умножаем на оба знаменателя и раскрываем скобки:</>),
  card(
    <>
      60<V>v</V> − 36 = 4<V>v</V>² − 36
    </>,
    { size: 40 },
  ),
  arrow(),
  line(<>Минус 36 сокращается с обеих сторон:</>),
  card(
    <>
      60<V>v</V> = 4<V>v</V>²
    </>,
    { size: 42 },
  ),
  arrow(),
  ...finish(
    <span>
      <V>v</V> = <span style={ACCENT}>15</span> км/ч
    </span>,
    "Проверка: по течению 18 км/ч — 2 часа, против течения 12 км/ч — тоже 2 часа. Вместе 4.",
  ),
];

export const boat3624: TaskDef = {
  ...base(
    "Prof10Boat3624",
    ["Лодка против и по течению", "Сколько у неё сил?"],
    "ship",
    42,
  ),
  audioSync: boat3624Audio,

  tokens: w(
    "Моторная лодка преодолела 36 км по течению и 24 км против течения, потратив на всю дистанцию 4 часа. Скорость течения — 3 км/ч. Найдите собственную скорость лодки. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Обозначаем скорость", 9.5, [
      line(
        <>
          Пусть <V>v</V> — собственная скорость лодки. По течению{" "}
          <V>v</V> + 3, против течения — <V>v</V> − 3.
        </>,
      ),
      card(
        <>
          <Frac
            num="36"
            den={
              <>
                <V>v</V> + 3
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>+</span>
          <Frac
            num="24"
            den={
              <>
                <V>v</V> − 3
              </>
            }
          />
          <span style={{ margin: "0 14px" }}>=</span>4
        </>,
        { size: 40 },
      ),
    ]),
    step(
      "2",
      "Решаем уравнение",
      10,
      boat3624Step2Items,
      beatsToItemAt(
        boat3624Step2Items,
        boat3624Audio.stepBeats![1].itemCounts,
        boat3624Audio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "15",
};

const busAvgAudio: AudioSync = {
  src: "audio/prof10-16.mp3",
  totalSec: 69.3,
  conditionSec: 6.97,
  stepSec: [18.94, 37.19],
  outroSec: 66.67,
  stepBeats: { 1: { itemCounts: [2, 2], atSec: [14.34] } },
};

const busAvgStep2Items: SolutionItem[] = [
  line(
    <>
      Всё время — вдвое больше одного отрезка: <Frac num="S" den="20" />.
    </>,
  ),
  line(
    <>
      Средняя скорость — весь путь 3S, делённый на это время. Буква S
      сокращается, остаётся:
    </>,
  ),
  ...finish(
    <span>
      3 · 20 = <span style={ACCENT}>60</span> км/ч
    </span>,
    "Так совпало, что оба отрезка заняли одно и то же время — иначе среднее не совпало бы с обычным средним 40 и 80.",
  ),
];

export const busAvg: TaskDef = {
  ...base(
    "Prof10BusAvg",
    ["Треть пути медленно", "Какая скорость в среднем?"],
    "roadFlat",
    44,
  ),
  audioSync: busAvgAudio,

  tokens: w(
    "Автобус преодолел первую треть дороги со скоростью 40 км/ч, а оставшиеся две трети — со скоростью 80 км/ч. Найдите среднюю скорость автобуса на всём пути. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Считаем время по частям", 9.5, [
      line(<>Обозначим весь путь 3S, тогда треть — это S, а остаток — 2S.</>),
      card(
        <>
          <Frac num="S" den="40" />
          <span style={{ margin: "0 14px" }}>=</span>
          <Frac num="2S" den="80" />
        </>,
        { size: 42 },
      ),
      line(<>Значит оба отрезка заняли одинаковое время.</>),
    ]),
    step(
      "2",
      "Находим среднюю скорость",
      9,
      busAvgStep2Items,
      beatsToItemAt(
        busAvgStep2Items,
        busAvgAudio.stepBeats![1].itemCounts,
        busAvgAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "60",
};

const cyclistAvgAudio: AudioSync = {
  src: "audio/prof10-17.mp3",
  totalSec: 57.21,
  conditionSec: 7.64,
  stepSec: [19.63],
  outroSec: 54.45,
  stepBeats: { 0: { itemCounts: [2, 2], atSec: [17.31] } },
};

const cyclistAvgStep1Items: SolutionItem[] = [
  line(
    <>
      Средняя скорость — это путь, делённый на время, а не среднее самих
      скоростей:
    </>,
  ),
  card(<>10 · 1 + 20 · 3 = 70 км</>, { size: 46 }),
  ...finish(
    <span>
      70 : 4 = <span style={ACCENT}>17,5</span> км/ч
    </span>,
    "Если бы усреднить сами скорости, вышло бы 15 — но на быстром участке велосипедист провёл больше времени.",
  ),
];

export const cyclistAvg: TaskDef = {
  ...base(
    "Prof10CyclistAvg",
    ["Час медленно, три быстро", "Средняя скорость?"],
    "bicycle",
    46,
  ),
  audioSync: cyclistAvgAudio,

  tokens: w(
    "Велосипедист ехал 1 час со скоростью 10 км/ч, а затем 3 часа со скоростью 20 км/ч. Найдите его среднюю скорость на протяжении всего пути. Ответ дайте в км/ч.",
  ),

  solutions: [
    step(
      "1",
      "Считаем весь путь",
      8.5,
      cyclistAvgStep1Items,
      beatsToItemAt(
        cyclistAvgStep1Items,
        cyclistAvgAudio.stepBeats![0].itemCounts,
        cyclistAvgAudio.stepBeats![0].atSec,
      ),
    ),
  ],

  answer: "17,5",
};

const cyclistRestAudio: AudioSync = {
  src: "audio/prof10-18.mp3",
  totalSec: 67.55,
  conditionSec: 8.16,
  stepSec: [26.37, 44.8],
  outroSec: 64.76,
  stepBeats: { 1: { itemCounts: [2, 2], atSec: [10.07] } },
};

const cyclistRestStep2Items: SolutionItem[] = [
  line(
    <>
      Время берём целиком, включая отдых — ведь спрашивают про всё это
      время:
    </>,
  ),
  card(<>2 + 1 + 1 = 4 часа</>, { size: 46 }),
  ...finish(
    <span>
      34 : 4 = <span style={ACCENT}>8,5</span> км/ч
    </span>,
    "Отдых увеличивает время, но не путь — поэтому средняя скорость ниже, чем без остановки.",
  ),
];

export const cyclistRest: TaskDef = {
  ...base(
    "Prof10CyclistRest",
    ["Ехал, отдыхал, снова ехал", "Какая скорость в итоге?"],
    "map",
    40,
  ),
  audioSync: cyclistRestAudio,

  tokens: w(
    "Велосипедист ехал из A в B 2 часа со скоростью 12 км/ч, затем отдыхал 1 час, после чего продолжил путь из A в C ещё 1 час со скоростью 10 км/ч. Найдите его среднюю скорость за всё это время. Ответ дайте в км/ч.",
  ),

  solutions: [
    step("1", "Считаем путь", 9, [
      line(
        <>
          До B — 2 часа по 12: 24 км. После отдыха ещё 1 час по 10: 10 км.
          Час отдыха расстояния не даёт.
        </>,
      ),
      card(<>24 + 10 = 34 км</>, { size: 46 }),
    ]),
    step(
      "2",
      "Считаем время",
      8,
      cyclistRestStep2Items,
      beatsToItemAt(
        cyclistRestStep2Items,
        cyclistRestAudio.stepBeats![1].itemCounts,
        cyclistRestAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "8,5",
};

// --- партия 2: работа -----------------------------------------------------------

const twoWorkersAudio: AudioSync = {
  src: "audio/prof10-19.mp3",
  totalSec: 46.65,
  conditionSec: 8.18,
  stepSec: [17.05],
  outroSec: 43.93,
  stepBeats: { 0: { itemCounts: [2, 2], atSec: [18.49] } },
};

const twoWorkersStep1Items: SolutionItem[] = [
  line(
    <>
      Весь заказ — единица. За день первый делает{" "}
      <Frac num="1" den="12" />, второй — <Frac num="1" den="6" />:
    </>,
  ),
  card(
    <>
      <Frac num="1" den="12" />
      <span style={{ margin: "0 14px" }}>+</span>
      <Frac num="1" den="6" />
      <span style={{ margin: "0 14px" }}>=</span>
      <Frac num="1" den="4" />
    </>,
    { size: 42 },
  ),
  ...finish(
    <span>
      1 : <Frac num="1" den="4" /> = <span style={ACCENT}>4</span> дня
    </span>,
    "Вместе быстрее, чем у самого быстрого рабочего в одиночку — так и должно быть.",
  ),
];

export const twoWorkers: TaskDef = {
  ...base(
    "Prof10TwoWorkers",
    ["Один заказ, два рабочих", "За сколько дней вместе?"],
    "worker",
    46,
  ),
  audioSync: twoWorkersAudio,

  tokens: w(
    "Первый рабочий выполняет заказ за 12 дней, второй — за 6 дней. За сколько дней они выполнят заказ, работая вместе? Ответ дайте в днях.",
  ),

  solutions: [
    step(
      "1",
      "Складываем скорости работы",
      9,
      twoWorkersStep1Items,
      beatsToItemAt(
        twoWorkersStep1Items,
        twoWorkersAudio.stepBeats![0].itemCounts,
        twoWorkersAudio.stepBeats![0].atSec,
      ),
    ),
  ],

  answer: "4",
};

const ivanPetrAudio: AudioSync = {
  src: "audio/prof10-20.mp3",
  totalSec: 68.44,
  conditionSec: 8.78,
  stepSec: [24.24, 34.65],
  outroSec: 65.52,
  stepBeats: { 1: { itemCounts: [2, 2], atSec: [20.27] } },
};

const ivanPetrStep2Items: SolutionItem[] = [
  line(
    <>
      Осталась половина. Вместе за час делают{" "}
      <Frac num="1" den="4" /> + <Frac num="1" den="6" /> ={" "}
      <Frac num="5" den="12" />:
    </>,
  ),
  card(
    <>
      <Frac num="1" den="2" /> : <Frac num="5" den="12" />
      <span style={{ margin: "0 14px" }}>=</span>1,2 ч
    </>,
    { size: 42 },
  ),
  ...finish(
    <span>
      2 + 1,2 = <span style={ACCENT}>3,2</span> часа
    </span>,
    "Проверка: 2 часа один плюс 1,2 часа вместе — доклад закончен ровно тогда.",
  ),
];

export const ivanPetr: TaskDef = {
  ...base(
    "Prof10IvanPetr",
    ["Сначала один, потом вдвоём", "Сколько часов писали доклад?"],
    "gears",
    42,
  ),
  audioSync: ivanPetrAudio,

  tokens: w(
    "Иван может написать доклад за 4 часа, а Пётр — за 6 часов. Сначала 2 часа работал Иван один, потом к нему подключился Пётр, и доклад был закончен вместе. Сколько всего часов был написан доклад? Ответ дайте в часах.",
  ),

  solutions: [
    step("1", "Что сделал Иван один", 9, [
      line(
        <>
          За час Иван делает <Frac num="1" den="4" /> доклада. За 2 часа —
          половину:
        </>,
      ),
      card(
        <>
          2 · <Frac num="1" den="4" />
          <span style={{ margin: "0 14px" }}>=</span>
          <Frac num="1" den="2" />
        </>,
        { size: 42 },
      ),
    ]),
    step(
      "2",
      "Дописывают вместе",
      9.5,
      ivanPetrStep2Items,
      beatsToItemAt(
        ivanPetrStep2Items,
        ivanPetrAudio.stepBeats![1].itemCounts,
        ivanPetrAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "3,2",
};

const twoBrigadesAudio: AudioSync = {
  src: "audio/prof10-21.mp3",
  totalSec: 53.79,
  conditionSec: 7.15,
  stepSec: [21.25, 31.7],
  outroSec: 50.86,
  stepBeats: { 1: { itemCounts: [1, 2], atSec: [12.73] } },
};

const twoBrigadesStep2Items: SolutionItem[] = [
  line(
    <>
      Осталось <Frac num="3" den="5" />. Вместе бригады делают{" "}
      <Frac num="1" den="10" /> + <Frac num="1" den="15" /> ={" "}
      <Frac num="1" den="6" /> заказа в день:
    </>,
  ),
  ...finish(
    <span>
      <Frac num="3" den="5" /> : <Frac num="1" den="6" /> ={" "}
      <span style={ACCENT}>3,6</span> дня
    </span>,
    "Первая бригада работала одна, вторая подключилась только на этот последний участок.",
  ),
];

export const twoBrigades: TaskDef = {
  ...base(
    "Prof10TwoBrigades",
    ["Одна бригада начала", "Сколько доделывали вместе?"],
    "factory",
    42,
  ),
  audioSync: twoBrigadesAudio,

  tokens: w(
    "Первая бригада может выполнить заказ за 10 дней, вторая — за 15 дней. Первая бригада проработала 4 дня одна, после чего обе бригады закончили заказ, работая вместе. Сколько дней бригады работали вместе? Ответ дайте в днях.",
  ),

  solutions: [
    step("1", "Что сделала первая бригада одна", 9, [
      line(
        <>
          За день первая делает <Frac num="1" den="10" /> заказа. За 4 дня —
        </>,
      ),
      card(
        <>
          4 · <Frac num="1" den="10" />
          <span style={{ margin: "0 14px" }}>=</span>
          <Frac num="2" den="5" />
        </>,
        { size: 42 },
      ),
    ]),
    step(
      "2",
      "Доделывают вместе",
      9.5,
      twoBrigadesStep2Items,
      beatsToItemAt(
        twoBrigadesStep2Items,
        twoBrigadesAudio.stepBeats![1].itemCounts,
        twoBrigadesAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "3,6",
};

const threePipesAudio: AudioSync = {
  src: "audio/prof10-22.mp3",
  totalSec: 64.86,
  conditionSec: 8.03,
  stepSec: [23.73, 42.01],
  outroSec: 61.84,
  stepBeats: { 1: { itemCounts: [1, 2], atSec: [10.16] } },
};

const threePipesStep2Items: SolutionItem[] = [
  line(<>Бассейн наполняется на треть в час, значит целиком — за:</>),
  ...finish(
    <span>
      1 : <Frac num="1" den="3" /> = <span style={ACCENT}>3</span> часа
    </span>,
    "Две трубы наливают быстрее, чем третья сливает — поэтому бассейн всё-таки заполнится.",
  ),
];

export const threePipes: TaskDef = {
  ...base(
    "Prof10ThreePipes",
    ["Две трубы льют, одна сливает", "За сколько наполнится бассейн?"],
    "pipe",
    42,
  ),
  audioSync: threePipesAudio,

  tokens: w(
    "Первая труба наполняет бассейн за 6 часов, вторая — за 4 часа. Третья труба, наоборот, сливает воду из полного бассейна за 12 часов. За сколько часов наполнится пустой бассейн, если открыть все три трубы одновременно? Ответ дайте в часах.",
  ),

  solutions: [
    step("1", "Складываем скорости", 9.5, [
      line(
        <>
          За час первая наполняет <Frac num="1" den="6" />, вторая{" "}
          <Frac num="1" den="4" />, а третья, наоборот, отнимает{" "}
          <Frac num="1" den="12" /> — она сливает воду:
        </>,
      ),
      card(
        <>
          <Frac num="1" den="6" />
          <span style={{ margin: "0 12px" }}>+</span>
          <Frac num="1" den="4" />
          <span style={{ margin: "0 12px" }}>−</span>
          <Frac num="1" den="12" />
          <span style={{ margin: "0 14px" }}>=</span>
          <Frac num="1" den="3" />
        </>,
        { size: 40 },
      ),
    ]),
    step(
      "2",
      "Считаем время",
      8,
      threePipesStep2Items,
      beatsToItemAt(
        threePipesStep2Items,
        threePipesAudio.stepBeats![1].itemCounts,
        threePipesAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "3",
};

// --- партия 2: смеси и сплавы ----------------------------------------------------

const alloyZincAudio: AudioSync = {
  src: "audio/prof10-23.mp3",
  totalSec: 79.2,
  conditionSec: 7.34,
  stepSec: [24.49, 43.62],
  outroSec: 76.58,
  stepBeats: { 1: { itemCounts: [2, 3], atSec: [22.82] } },
};

const alloyZincStep2Items: SolutionItem[] = [
  line(<>Раскрываем скобки и приводим подобные:</>),
  card(
    <>
      −0,21<V>x</V> = 4,83 − 6,3 = −1,47
    </>,
    { size: 40 },
  ),
  arrow(),
  ...finish(
    <span>
      <V>x</V> = <span style={ACCENT}>7</span> кг
    </span>,
    "Значит от второго сплава взяли 14 кг: 7 · 9% + 14 · 30% = 4,83 кг цинка — ровно 23% от 21.",
  ),
];

export const alloyZinc: TaskDef = {
  ...base(
    "Prof10AlloyZinc",
    ["Два сплава смешали", "Сколько взяли от первого?"],
    "ingot",
    40,
  ),
  audioSync: alloyZincAudio,

  tokens: w(
    "Имеется два сплава меди и цинка. Первый сплав содержит 9% цинка, второй — 30% цинка. Из этих сплавов получили 21 кг нового сплава, содержащего 23% цинка. Сколько килограммов взяли от первого сплава? Ответ дайте в кг.",
  ),

  solutions: [
    step("1", "Обозначаем массу первого сплава", 9.5, [
      line(
        <>
          Пусть от первого взяли <V>x</V> кг, тогда от второго — 21 − <V>x</V>.
          Цинк из первого — 0,09<V>x</V>, из второго — 0,30(21 − <V>x</V>).
          Вместе это 23% от 21 кг:
        </>,
      ),
      card(
        <>
          0,09<V>x</V> + 0,30(21 − <V>x</V>) = 4,83
        </>,
        { size: 38 },
      ),
    ]),
    step(
      "2",
      "Решаем уравнение",
      9.5,
      alloyZincStep2Items,
      beatsToItemAt(
        alloyZincStep2Items,
        alloyZincAudio.stepBeats![1].itemCounts,
        alloyZincAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "7",
};

const acidWaterAudio: AudioSync = {
  src: "audio/prof10-24.mp3",
  totalSec: 39.55,
  conditionSec: 6.79,
  stepSec: [15.14, 25.82],
  outroSec: 36.88,
  stepBeats: { 1: { itemCounts: [1, 2], atSec: [9.06] } },
};

const acidWaterStep2Items: SolutionItem[] = [
  line(<>Теперь его 120 + 80 = 200 г. Считаем долю кислоты:</>),
  ...finish(
    <span>
      6 : 200 = <span style={ACCENT}>3</span>%
    </span>,
    "Та же кислота теперь растворена в большем объёме — концентрация упала.",
  ),
];

export const acidWater: TaskDef = {
  ...base(
    "Prof10AcidWater",
    ["Долили воды в кислоту", "Какая теперь концентрация?"],
    "drop",
    44,
  ),
  audioSync: acidWaterAudio,

  tokens: w(
    "К 120 г раствора кислоты с концентрацией 5% долили 80 г воды. Какой стала концентрация кислоты? Ответ дайте в процентах.",
  ),

  solutions: [
    step("1", "Кислота никуда не делась", 9, [
      line(<>Долили чистую воду — самой кислоты не прибавилось:</>),
      card(<>5% от 120 г = 6 г</>, { size: 46 }),
    ]),
    step(
      "2",
      "А раствора стало больше",
      9,
      acidWaterStep2Items,
      beatsToItemAt(
        acidWaterStep2Items,
        acidWaterAudio.stepBeats![1].itemCounts,
        acidWaterAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "3",
};

const tinAddAudio: AudioSync = {
  src: "audio/prof10-25.mp3",
  totalSec: 56.53,
  conditionSec: 6.71,
  stepSec: [18.33, 32.78],
  outroSec: 53.91,
  stepBeats: { 1: { itemCounts: [2, 3], atSec: [19.28] } },
};

const tinAddStep2Items: SolutionItem[] = [
  line(
    <>
      Масса сплава станет 24 + <V>x</V>, а доля меди должна стать 40%:
    </>,
  ),
  card(
    <>
      <Frac num="10,8" den={<>24 + <V>x</V></>} />
      <span style={{ margin: "0 14px" }}>=</span>0,40
    </>,
    { size: 42 },
  ),
  arrow(),
  ...finish(
    <span>
      24 + <V>x</V> = 27 ⟹ <V>x</V> = <span style={ACCENT}>3</span> кг
    </span>,
    "Меди не прибавилось, зато общая масса выросла — доля меди и просела с 45% до 40%.",
  ),
];

export const tinAdd: TaskDef = {
  ...base(
    "Prof10TinAdd",
    ["Добавили чистое олово", "Сколько килограммов?"],
    "scales",
    42,
  ),
  audioSync: tinAddAudio,

  tokens: w(
    "Сплав меди и олова массой 24 кг содержит 45% меди. Сколько килограммов чистого олова нужно добавить, чтобы содержание меди в сплаве стало 40%? Ответ дайте в кг.",
  ),

  solutions: [
    step("1", "Меди по-прежнему столько же", 9, [
      line(<>Добавляют чистое олово — медь никуда не девается:</>),
      card(<>45% от 24 кг = 10,8 кг меди</>, { size: 42 }),
    ]),
    step(
      "2",
      "Составляем уравнение",
      9.5,
      tinAddStep2Items,
      beatsToItemAt(
        tinAddStep2Items,
        tinAddAudio.stepBeats![1].itemCounts,
        tinAddAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "3",
};

// У этой задачи в озвучке разбор идёт тремя репликами подряд ("решаем
// систему" → "подставляем, находим c1" → "ответ"), а на экране между
// первой и второй ничего не меняется — карточка с c2=25 просто висит,
// пока голос договаривает вывод c1, и только потом появляется стрелка
// с готовым ответом. Поэтому вторая реплика не превращается в отдельный
// пункт: она просто "занимает" время внутри первого пункта.
const twoSolutionsAudio: AudioSync = {
  src: "audio/prof10-26.mp3",
  totalSec: 80.77,
  conditionSec: 6.86,
  stepSec: [25.04, 50.66],
  outroSec: 78.16,
  stepBeats: { 1: { itemCounts: [2, 3], atSec: [23.65] } },
};

const twoSolutionsStep2Items: SolutionItem[] = [
  line(
    <>
      Первое уравнение умножаем на 3, второе на 2 и вычитаем — <V>c</V>₁
      сокращается:
    </>,
  ),
  card(
    <>
      10<V>c</V>₂ = 250 ⟹ <V>c</V>₂ = 25
    </>,
    { size: 42 },
  ),
  arrow(),
  ...finish(
    <span>
      <V>c</V>₁ = <span style={ACCENT}>50%</span>,{" "}
      <V>c</V>₂ = <span style={ACCENT}>25%</span>
    </span>,
    "Проверка: 6 · 50 + 4 · 25 = 400 — ровно то, что дано во втором смешивании.",
  ),
];

export const twoSolutions: TaskDef = {
  ...base(
    "Prof10TwoSolutions",
    ["Смешали по-разному", "Какая концентрация была изначально?"],
    "flask",
    40,
  ),
  audioSync: twoSolutionsAudio,

  tokens: w(
    "При смешивании 4 кг первого раствора и 6 кг второго получается 35-процентный раствор. Если же смешать 6 кг первого раствора и 4 кг второго, получится 40-процентный раствор. Найдите концентрацию (в процентах) каждого из исходных растворов.",
  ),

  solutions: [
    step("1", "Записываем систему", 10, [
      line(
        <>
          Пусть <V>c</V>₁ и <V>c</V>₂ — концентрации растворов в процентах:
        </>,
      ),
      card(
        <>
          4<V>c</V>₁ + 6<V>c</V>₂ = 350
        </>,
        { size: 40 },
      ),
      card(
        <>
          6<V>c</V>₁ + 4<V>c</V>₂ = 400
        </>,
        { size: 40 },
      ),
    ]),
    step(
      "2",
      "Решаем систему",
      10.5,
      twoSolutionsStep2Items,
      beatsToItemAt(
        twoSolutionsStep2Items,
        twoSolutionsAudio.stepBeats![1].itemCounts,
        twoSolutionsAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "50% и 25%",
};

const raisinsAudio: AudioSync = {
  src: "audio/prof10-27.mp3",
  totalSec: 56.11,
  conditionSec: 7.84,
  stepSec: [21.45, 35.93],
  outroSec: 53.35,
  stepBeats: { 1: { itemCounts: [2, 2], atSec: [14.91] } },
};

const raisinsStep2Items: SolutionItem[] = [
  line(<>В винограде воды 90%, значит сухого вещества только 10%:</>),
  card(<>10% от G = 19 кг</>, { size: 44 }),
  ...finish(
    <span>
      G = <span style={ACCENT}>190</span> кг
    </span>,
    "Виноград почти весь — вода, поэтому его требуется в разы больше, чем изюма.",
  ),
];

export const raisins: TaskDef = {
  ...base(
    "Prof10Raisins",
    ["Виноград высыхает", "Сколько нужно на кило изюма?"],
    "drop",
    42,
  ),
  audioSync: raisinsAudio,

  tokens: w(
    "Изюм получается в процессе сушки винограда. Сколько килограммов винограда потребуется для получения 20 килограммов изюма, если виноград содержит 90% воды, а изюм содержит 5% воды? Ответ дайте в кг.",
  ),

  solutions: [
    step("1", "Твёрдого вещества в изюме", 9, [
      line(<>При сушке уходит только вода, сухое вещество остаётся:</>),
      card(<>95% от 20 кг = 19 кг</>, { size: 46 }),
    ]),
    step(
      "2",
      "Это же вещество было в винограде",
      9.5,
      raisinsStep2Items,
      beatsToItemAt(
        raisinsStep2Items,
        raisinsAudio.stepBeats![1].itemCounts,
        raisinsAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "190",
};

const mushroomsAudio: AudioSync = {
  src: "audio/prof10-28.mp3",
  totalSec: 58.46,
  conditionSec: 7.08,
  stepSec: [16.9, 28.04],
  outroSec: 55.71,
  stepBeats: { 1: { itemCounts: [2, 2], atSec: [18.99] } },
};

const mushroomsStep2Items: SolutionItem[] = [
  line(
    <>
      В сухих грибах это вещество — уже 88% массы, ведь воды там только
      12%:
    </>,
  ),
  card(<>10 : 0,88 ≈ 11,36 кг</>, { size: 44 }),
  ...finish(
    <span>
      100 : 11,36 ≈ <span style={ACCENT}>8,8</span> раза
    </span>,
    "То же сухое вещество теперь занимает почти всю массу — вот масса и падает в разы.",
  ),
];

export const mushrooms: TaskDef = {
  ...base(
    "Prof10Mushrooms",
    ["Грибы высохли", "Во сколько раз похудели?"],
    "percent",
    42,
  ),
  audioSync: mushroomsAudio,

  tokens: w(
    "Свежие грибы содержат 90% воды, а сухие грибы содержат 12% воды. Во сколько раз уменьшится масса грибов после сушки?",
  ),

  solutions: [
    step("1", "Берём 100 кг свежих грибов", 9, [
      line(<>Воды 90%, значит сухого вещества 10 кг — оно не меняется:</>),
      card(<>10% от 100 кг = 10 кг</>, { size: 46 }),
    ]),
    step(
      "2",
      "Ищем сухую массу",
      9.5,
      mushroomsStep2Items,
      beatsToItemAt(
        mushroomsStep2Items,
        mushroomsAudio.stepBeats![1].itemCounts,
        mushroomsAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "8,8",
};

export const raspberry: TaskDef = {
  ...base(
    "Prof10Raspberry",
    ["Малина потеряла массу", "Какая влажность осталась?"],
    "drop",
    42,
  ),

  tokens: w(
    "Свежая малина содержит 85% влаги. Во время сушки она теряет 80% от своей первоначальной массы. Какой стала влажность (в процентах) полученной сушёной малины?",
  ),

  solutions: [
    step("1", "Берём 100 кг свежей малины", 9, [
      line(<>Влаги 85%, значит сухого вещества 15 кг — оно не меняется:</>),
      card(<>15% от 100 кг = 15 кг</>, { size: 46 }),
    ]),
    step("2", "Считаем воду в остатке", 9.5, [
      line(<>Малина потеряла 80% массы — осталось только 20 кг:</>),
      card(<>20 − 15 = 5 кг воды</>, { size: 46 }),
      ...finish(
        <span>
          5 : 20 = <span style={ACCENT}>25</span>%
        </span>,
        "Сухого вещества стало почти столько же, сколько всей массы — влажность резко упала.",
      ),
    ]),
  ],

  answer: "25",
};

// --- партия 2: прогрессии -------------------------------------------------------

export const gravelTruck: TaskDef = {
  ...base(
    "Prof10GravelTruck",
    ["Грузовик возит всё больше", "Сколько щебня в пятый день?"],
    "truck",
    40,
  ),

  tokens: w(
    "Грузовик перевозит партию щебня массой 60 тонн, ежедневно увеличивая норму перевозки на одно и то же число тонн. Известно, что за первый день грузовик перевёз 4 тонны щебня, а вся работа была выполнена за 8 дней. Определите, сколько тонн щебня было перевезено за пятый день. Ответ дайте в тоннах.",
  ),

  solutions: [
    step("1", "Считаем шаг прогрессии", 10, [
      line(
        <>
          Сумма арифметической прогрессии — полусумма первого и последнего
          члена, умноженная на дни. Первый день — 4 тонны, дней — 8:
        </>,
      ),
      card(
        <>
          60 = 4 · (8 + 7<V>d</V>)
        </>,
        { size: 42 },
      ),
    ]),
    step("2", "Находим шаг и день", 9, [
      line(<>Делим на 4 и находим шаг прогрессии:</>),
      card(
        <>
          15 = 8 + 7<V>d</V> ⟹ <V>d</V> = 1
        </>,
        { size: 42 },
      ),
      arrow(),
      ...finish(
        <span>
          4 + 4 · 1 = <span style={ACCENT}>8</span> тонн
        </span>,
        "Пятый день — это первый день плюс четыре шага прогрессии.",
      ),
    ]),
  ],

  answer: "8",
};

const amphitheaterAudio: AudioSync = {
  src: "audio/prof10-31.mp3",
  totalSec: 55.56,
  conditionSec: 6.57,
  stepSec: [17.8, 32.33],
  outroSec: 52.9,
  stepBeats: { 1: { itemCounts: [1, 2], atSec: [18.4] } },
};

const amphitheaterStep2Items: SolutionItem[] = [
  line(<>Сумма — полусумма первого и последнего ряда, умноженная на 14:</>),
  ...finish(
    <span>
      (20 + 59) · 7 = <span style={ACCENT}>553</span> места
    </span>,
    "Половину числа рядов (7) умножаем сразу на сумму крайних — так быстрее, чем находить каждый ряд отдельно.",
  ),
];

export const amphitheater: TaskDef = {
  ...base(
    "Prof10Amphitheater",
    ["Ряды растут на одно и то же", "Сколько мест в зале?"],
    "ascent",
    40,
  ),
  audioSync: amphitheaterAudio,

  tokens: w(
    "В амфитеатре расположены 14 рядов. В первом ряду установлены 20 мест, а в каждом следующем ряду — на 3 места больше, чем в предыдущем. Сколько всего мест в амфитеатре?",
  ),

  solutions: [
    step("1", "Находим последний ряд", 9, [
      line(<>Каждый ряд на 3 места больше предыдущего. Ряд номер 14:</>),
      card(<>20 + 13 · 3 = 59 мест</>, { size: 44 }),
    ]),
    step(
      "2",
      "Считаем сумму",
      9,
      amphitheaterStep2Items,
      beatsToItemAt(
        amphitheaterStep2Items,
        amphitheaterAudio.stepBeats![1].itemCounts,
        amphitheaterAudio.stepBeats![1].atSec,
      ),
    ),
  ],

  answer: "553",
};

export const PROFILE_10_TASKS: TaskDef[] = [
  ship200,
  twoCars78,
  twoCars24,
  overtake,
  cyclist75,
  mixThree,
  alloys350,
  dilute,
  details345,
  pumps,
  fence,
  ship96,
  raftBoat,
  ship6048,
  boat3624,
  busAvg,
  cyclistAvg,
  cyclistRest,
  twoWorkers,
  ivanPetr,
  twoBrigades,
  threePipes,
  alloyZinc,
  acidWater,
  tinAdd,
  twoSolutions,
  raisins,
  mushrooms,
  raspberry,
  gravelTruck,
  amphitheater,
];
