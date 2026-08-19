import { makeSolution, line, card, arrow } from "../Solution";
import { COLORS } from "../theme";
import { w } from "./dsl";
import type { TaskDef } from "./types";

/**
 * Задание 7 ЕГЭ по информатике: объём файла, скорость передачи, палитра.
 *
 * Разбор пошаговый, как в математике, но сцены короче — задачи в один-два
 * умножения, задерживаться на них не на чем.
 */

const SUBJECT = "в ЕГЭ по информатике";
/**
 * Подсветка ответа внутри формулы. Карточка формулы — inline-flex, поэтому
 * такой span становится отдельным флекс-элементом и пробелы вокруг него
 * схлопываются: содержимое приходится заворачивать в общий <span>.
 */
const ACCENT = { color: COLORS.blue, fontWeight: 700 } as const;

/** Общая часть описания: предмет, номер задания, кегли. */
const base = (id: string, hook: string, problemSize = 46, timerSize = 34) => ({
  id,
  number: 7,
  subject: SUBJECT,
  hook,
  pillLabel: "Задание",
  titleNoun: "Решение задания",
  problemSize,
  timerSize,
  // Разбор пошаговый, как в математике, но листаем быстро — как в русском
  answerSeconds: 6,
});

const NBSP = String.fromCharCode(0xa0);
/** 15000 → «15 000»: toLocaleString ставит неразрывный пробел, меняем на обычный. */
const ru = (n: number) => n.toLocaleString("ru-RU").split(NBSP).join(" ");

// --- квадро-звук: три задачи, отличаются только размером файла -------------

/**
 * Поток одинаков во всех трёх: 4 канала · 32 бита · 16 000 Гц = 250 Кбайт/с.
 * Меняется только размер файла, поэтому описание собирается фабрикой.
 */
const makeAudioTask = (
  id: string,
  sizeKb: number,
  seconds: number,
): TaskDef => ({
  ...base(id, "Сколько длится запись?", 44, 32),

  tokens: w(
    `На студии при четырёхканальной (квадро) звукозаписи с 32-битным разрешением и частотой дискретизации 16 КГц записан звуковой файл. Сжатие данных не производилось. Известно, что размер файла оказался ${ru(sizeKb)} Кбайт. Сколько времени длится звуковая запись?`,
  ),

  solutions: [
    {
      seconds: 7.5,
      Component: makeSolution({
        step: "1",
        title: "Считаем поток",
        seconds: 7.5,
        items: [
          line(<>Четыре канала по 32 бита, 16 000 отсчётов в секунду:</>),
          card(<>4 · 32 · 16 000 = 2 048 000 бит/с</>, { size: 42 }),
          arrow(),
          card(<>2 048 000 : 8 : 1024 = 250 Кбайт/с</>, { size: 42 }),
        ],
      }),
    },
    {
      seconds: 7.5,
      Component: makeSolution({
        step: "2",
        title: "Делим объём на поток",
        seconds: 7.5,
        items: [
          line(
            <>
              Файл весит {ru(sizeKb)} Кбайт, за секунду записывается 250 Кбайт:
            </>,
          ),
          card(
            <span>
              {ru(sizeKb)} : 250 = <span style={ACCENT}>{seconds}</span> с
            </span>,
            { accent: true, size: 46 },
          ),
        ],
      }),
    },
  ],

  answerLead: "Длительность записи",
  answerFormula: <>{ru(sizeKb)} Кбайт : 250 Кбайт/с</>,
  answer: String(seconds),
  unit: "секунд",
  check: (
    <>поток квадро: 4 · 32 · 16 000 = 2 048 000 бит/с, это ровно 250 Кбайт/с</>
  ),
});

export const audio15000 = makeAudioTask("Info7Audio15000", 15000, 60);
export const audio24500 = makeAudioTask("Info7Audio24500", 24500, 98);
export const audio24000 = makeAudioTask("Info7Audio24000", 24000, 96);

// --- модем и страницы текста: две задачи ------------------------------------

/** Символы → байты → биты → делим на скорость модема. */
const makePagesTask = (
  id: string,
  speed: number,
  pages: number,
  lines: number,
  chars: number,
  bytes: number,
  seconds: number,
): TaskDef => {
  const symbols = pages * lines * chars;
  const bits = symbols * bytes * 8;

  return {
    ...base(id, "За сколько секунд уйдёт текст?", 46, 34),

    tokens: w(
      `Сколько секунд потребуется модему, передающему сообщения со скоростью ${ru(speed)} бит/с, чтобы передать ${pages} страниц текста в ${lines} строк по ${chars} символов каждая, при условии, что каждый символ кодируется ${bytes} байт${bytes === 1 ? "ом" : "ами"}?`,
    ),

    solutions: [
      {
        seconds: 8,
        Component: makeSolution({
          step: "1",
          title: "Считаем объём",
          seconds: 8,
          items: [
            line(<>Сначала — сколько всего символов:</>),
            card(
              <>
                {pages} · {lines} · {chars} = {ru(symbols)}
              </>,
              { size: 44 },
            ),
            arrow(),
            card(
              <>
                {ru(symbols)} · {bytes} · 8 = {ru(bits)} бит
              </>,
              { size: 42 },
            ),
          ],
        }),
      },
      {
        seconds: 7.5,
        Component: makeSolution({
          step: "2",
          title: "Делим на скорость",
          seconds: 7.5,
          items: [
            line(<>Объём делим на скорость модема:</>),
            card(
              <span>
                {ru(bits)} : {ru(speed)} = <span style={ACCENT}>{seconds}</span>{" "}
                с
              </span>,
              { accent: true, size: 42 },
            ),
          ],
        }),
      },
    ],

    answerLead: "Передача займёт",
    answerFormula: (
      <>
        {ru(bits)} бит : {ru(speed)} бит/с
      </>
    ),
    answer: String(seconds),
    unit: "секунд",
    check: (
      <>
        символов {ru(symbols)}, по {bytes} байт{bytes === 1 ? "у" : "а"} — это{" "}
        {ru(bits)} бит
      </>
    ),
  };
};

export const pages28 = makePagesTask("Info7Pages28", 74368, 28, 56, 83, 2, 28);
export const pages98 = makePagesTask("Info7Pages98", 43904, 98, 56, 77, 1, 77);

// --- палитра растрового изображения -----------------------------------------

export const palette: TaskDef = {
  ...base("Info7Palette", "Сколько цветов влезет?", 42, 31),

  tokens: w(
    "Автоматическая камера производит растровые изображения размером 600 на 1000 пикселей. Для кодирования цвета каждого пикселя используется одинаковое количество бит, коды пикселей записываются в файл один за другим без промежутков. Объём файла с изображением не может превышать 250 Кбайт без учёта размера заголовка файла. Какое максимальное количество цветов можно использовать в палитре?",
  ),

  solutions: [
    {
      seconds: 8.5,
      Component: makeSolution({
        step: "1",
        title: "Сколько бит на пиксель",
        seconds: 8.5,
        items: [
          line(<>Пикселей в кадре: 600 · 1000 = 600 000.</>),
          line(<>Переводим предел объёма в биты:</>),
          card(<>250 · 1024 · 8 = 2 048 000 бит</>, { size: 44 }),
          arrow(),
          card(<>2 048 000 : 600 000 ≈ 3,41 бита на пиксель</>, { size: 40 }),
        ],
      }),
    },
    {
      seconds: 8,
      Component: makeSolution({
        step: "2",
        title: "Округляем вниз",
        seconds: 8,
        items: [
          line(
            <>
              Бит на пиксель — целое число, и превышать предел нельзя. Значит их
              не больше трёх.
            </>,
          ),
          card(
            <span>
              2³ = <span style={ACCENT}>8</span> цветов
            </span>,
            { accent: true, size: 48 },
          ),
        ],
      }),
    },
  ],

  answerLead: "Максимум цветов в палитре",
  answerFormula: <>3 бита на пиксель → 2³</>,
  answer: "8",
  unit: "цветов",
  check: (
    <>
      600 000 · 3 = 1 800 000 бит, а при 4 битах вышло бы 2 400 000 — уже больше
      предела
    </>
  ),
};

// --- текст через модемное соединение ----------------------------------------

export const unicode10s: TaskDef = {
  ...base("Info7Unicode", "Сколько символов успело уйти?", 46, 34),

  tokens: w(
    "Скорость передачи данных через модемное соединение равна 51200 бит/с. Передача текстового файла через это соединение заняла 10 с. Определите, сколько символов содержал переданный текст, если известно, что он был представлен в 8-битной кодировке Unicode.",
  ),

  solutions: [
    {
      seconds: 7,
      Component: makeSolution({
        step: "1",
        title: "Считаем объём",
        seconds: 7,
        items: [
          line(<>Скорость умножаем на время передачи:</>),
          card(<>51 200 · 10 = 512 000 бит</>, { size: 46 }),
        ],
      }),
    },
    {
      seconds: 7,
      Component: makeSolution({
        step: "2",
        title: "Делим на кодировку",
        seconds: 7,
        items: [
          line(<>Каждый символ занимает 8 бит:</>),
          card(
            <span>
              512 000 : 8 = <span style={ACCENT}>64 000</span>
            </span>,
            { accent: true, size: 46 },
          ),
        ],
      }),
    },
  ],

  answerLead: "В тексте было",
  answerFormula: <>512 000 бит : 8 бит</>,
  answer: "64000",
  unit: "символов",
  check: <>8-битная кодировка — это ровно один байт на символ</>,
};

// --- изображение через модем -------------------------------------------------

export const image240x1890: TaskDef = {
  ...base("Info7Image", "За сколько уйдёт картинка?", 46, 34),

  tokens: w(
    "Сколько секунд потребуется обычному модему, передающему сообщения со скоростью 33 600 бит/с, чтобы передать цветное растровое изображение размером 240 на 1890 пикселей, при условии, что цвет каждого пикселя кодируется 8 байтами?",
  ),

  solutions: [
    {
      seconds: 8,
      Component: makeSolution({
        step: "1",
        title: "Считаем объём",
        seconds: 8,
        items: [
          line(<>Пикселей в изображении: 240 · 1890 = 453 600.</>),
          card(<>453 600 · 8 = 3 628 800 байт</>, { size: 44 }),
          arrow(),
          card(<>3 628 800 · 8 = 29 030 400 бит</>, { size: 44 }),
        ],
      }),
    },
    {
      seconds: 7.5,
      Component: makeSolution({
        step: "2",
        title: "Делим на скорость",
        seconds: 7.5,
        items: [
          line(<>Объём делим на скорость модема:</>),
          card(
            <span>
              29 030 400 : 33 600 = <span style={ACCENT}>864</span> с
            </span>,
            { accent: true, size: 42 },
          ),
        ],
      }),
    },
  ],

  answerLead: "Передача займёт",
  answerFormula: <>29 030 400 бит : 33 600 бит/с</>,
  answer: "864",
  unit: "секунд",
  check: (
    <>8 байт на пиксель — это 64 бита, цвет закодирован очень расточительно</>
  ),
};

export const INFORMATICS_TASKS: TaskDef[] = [
  palette,
  unicode10s,
  image240x1890,
  audio15000,
  pages28,
  pages98,
  audio24500,
  audio24000,
];
