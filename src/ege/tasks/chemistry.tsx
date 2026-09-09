import { w } from "./dsl";
import type { AudioSync, TaskDef } from "./types";

/**
 * Задание 11 ЕГЭ по химии: из пяти вариантов выбрать два (иногда три или
 * один) верных — гомологи, изомеры, тип гибридизации, число σ-связей,
 * функциональная группа и так далее. Ответ традиционно записывают как
 * склеенные цифры по возрастанию («35», «245»…).
 *
 * Формат ближе к заданию 7 по русскому (formword.tsx): условие вслух не
 * читается целиком — только формулировка вопроса, а сами пять вариантов
 * (формулы, термины) появляются строка за строкой, и дальше пауза, пока
 * зритель их разглядывает. Отличия: формулировка вопроса у каждой карточки
 * своя (в отличие от Rus7, где она одна на все), и нет «неверного варианта
 * с зачёркиванием» — ответ здесь не исправление одной ошибки, а выбор
 * нескольких верных пунктов, поэтому `wrongNote` не используется.
 *
 * `optionsHighlight: false` — варианты набраны заглавными буквами внутри
 * формул («C5H11OH»), и обычная для Rus7 подсветка капс-слова регуляркой
 * подсвечивала бы там случайные куски формул. Здесь выделять нечего — все
 * пять вариантов равноправны, отличает их только сам ответ.
 */

type ChemSpec = {
  id: string;
  /** Крючок на титульном кадре, по строке. Никогда не называет вещество/ответ. */
  hook: string[];
  /** Формулировка вопроса — своя для каждой карточки, читается вслух. */
  instruction: string;
  /** Пять (иногда четыре) вариантов без номера — номер добавляется сам. */
  options: string[];
  /** Ответ склеенными цифрами по возрастанию, как пишут в бланке ЕГЭ. */
  answer: string;
  /** Объяснение — по предложению на строку. */
  why: string[];
  optionSize?: number;
  audioSync?: AudioSync;
};

const makeChemTask = (spec: ChemSpec): TaskDef => ({
  id: spec.id,
  number: 11,
  subject: "в ЕГЭ по химии",
  hook: spec.hook,
  pillLabel: "Задание",
  instruction: spec.instruction,

  // Условие живёт в options; tokens нужны типу и озвучке формулировки
  tokens: w(spec.instruction),
  options: spec.options.map((o, i) => `${i + 1}) ${o}`),
  optionsHighlight: false,
  problemSize: spec.optionSize ?? 46,

  // Разбирать по шагам нечего: ответ — это выбор, а не вычисление
  solutions: [],
  answerSeconds: 12,
  audioSync: spec.audioSync,

  answerLead: "Правильно",
  answer: spec.answer,
  check: (
    <>
      {spec.why.map((sentence, i) => (
        <div key={i}>{sentence}</div>
      ))}
    </>
  ),
});

const spirtIzomeriyaAudio: AudioSync = {
  src: "audio/chem11-spirtizomeriya.mp3",
  totalSec: 33.959184,
  conditionSec: 5.797551,
  stepSec: [],
  answerSec: 14.16415,
  correctAtSec: 14.16415,
  checkAtSec: 16.934558,
  outroSec: 31.19898,
};

export const chemSpirtIzomeriya = makeChemTask({
  id: "Chem11SpirtIzomeriya",
  hook: ["Один тип изомерии", "здесь ни при чём"],
  instruction:
    "Из предложенного перечня выберите два вида изомерии, которые не характерны для спирта состава C5H11OH.",
  options: [
    "изомерия углеродного скелета",
    "изомерия положения гидроксильной группы",
    "геометрическая изомерия",
    "межклассовая изомерия",
    "изомерия положения кратной связи",
  ],
  answer: "35",
  why: [
    "Спирт C5H11OH предельный — двойных связей в нём нет, а без них невозможны ни геометрическая изомерия, ни изомерия положения кратной связи.",
    "Изомерия скелета, положения гидроксильной группы и межклассовая (с эфирами) для него как раз характерны.",
  ],
  optionSize: 36,
  audioSync: spirtIzomeriyaAudio,
});

const metanalAudio: AudioSync = {
  src: "audio/chem11-metanal.mp3",
  totalSec: 33.802449,
  conditionSec: 6.922744,
  stepSec: [],
  answerSec: 12.936032,
  correctAtSec: 12.936032,
  checkAtSec: 15.423016,
  outroSec: 31.261497,
};

export const chemMetanal = makeChemTask({
  id: "Chem11Metanal",
  hook: ["Метаналь и формальдегид —", "что тут вообще выбирать?"],
  instruction:
    "Из предложенного перечня выберите два утверждения, которые характеризуют метаналь и формальдегид.",
  options: [
    "являются гомологами",
    "являются структурными изомерами",
    "одно и то же вещество",
    "являются карбонильными производными",
    "являются геометрическими изомерами",
  ],
  answer: "34",
  why: [
    "Метаналь — систематическое название, формальдегид — тривиальное: это одно и то же вещество CH2O, значит не гомологи и не изомеры — там нужны разные вещества.",
    "При этом оно действительно карбонильное соединение — альдегид с группой С=О.",
  ],
  optionSize: 38,
  audioSync: metanalAudio,
});

const gomologiBenzolaAudio: AudioSync = {
  src: "audio/chem11-gomologibenzola.mp3",
  totalSec: 39.88898,
  conditionSec: 6.897914,
  stepSec: [],
  answerSec: 13.375828,
  correctAtSec: 13.375828,
  checkAtSec: 16.51,
  outroSec: 36.963628,
};

export const chemGomologiBenzola = makeChemTask({
  id: "Chem11GomologiBenzola",
  hook: ["Из пяти веществ —", "два гомолога"],
  instruction:
    "Из предложенного перечня выберите два вещества, которые являются гомологами бензола.",
  options: [
    "циклогексан",
    "толуол",
    "ацетилен",
    "винилбензол (стирол)",
    "фенилэтан (этилбензол)",
  ],
  answer: "25",
  why: [
    "Гомологи бензола — арены той же общей формулы с алкильными заместителями вместо водорода в кольце. Толуол и этилбензол под это подходят.",
    "Циклогексан не ароматичен, ацетилен вообще из другого класса, а стирол из-за двойной связи в боковой цепи имеет другую общую формулу.",
  ],
  audioSync: gomologiBenzolaAudio,
});

const izomeryPentenaAudio: AudioSync = {
  src: "audio/chem11-izomerypentena.mp3",
  totalSec: 27.08898,
  conditionSec: 5.966463,
  stepSec: [],
  answerSec: 10.599819,
  correctAtSec: 10.599819,
  checkAtSec: 13.063288,
  outroSec: 24.318277,
};

export const chemIzomeryPentena = makeChemTask({
  id: "Chem11IzomeryPentena",
  hook: ["Пять формул —", "две изомерны"],
  instruction:
    "Из предложенного перечня выберите два вещества, которые являются изомерами.",
  options: [
    "3-метилпентен-1",
    "пентадиен-1,3",
    "пентен-2",
    "гексан",
    "метилциклопентан",
  ],
  answer: "15",
  why: [
    "Изомеры обязаны иметь одинаковую молекулярную формулу. У 3-метилпентена-1 и метилциклопентана она совпадает — C6H12.",
    "У остальных формулы другие: пентадиен-1,3 — C5H8, пентен-2 — C5H10, гексан — C6H14.",
  ],
  audioSync: izomeryPentenaAudio,
});

const sp3Audio: AudioSync = {
  src: "audio/chem11-sp3.mp3",
  totalSec: 38.347755,
  conditionSec: 6.86517,
  stepSec: [],
  answerSec: 15.252245,
  correctAtSec: 15.252245,
  checkAtSec: 18.959501,
  outroSec: 35.607166,
};

export const chemSp3 = makeChemTask({
  id: "Chem11Sp3",
  hook: ["Проверь гибридизацию", "всех атомов сразу"],
  instruction:
    "Из предложенного перечня выберите все вещества, в молекулах которых атомы углерода находятся только в sp3-гибридном состоянии.",
  options: ["бензол", "циклогексан", "гексен", "гексан", "метилциклопропан"],
  answer: "245",
  why: [
    "sp3 — это состояние насыщенного атома углерода без кратных связей. Циклогексан, гексан и метилциклопропан полностью предельные.",
    "В бензоле все атомы sp2, в гексене два атома при двойной связи — sp2.",
  ],
  audioSync: sp3Audio,
});

const izomeryPropanolaAudio: AudioSync = {
  src: "audio/chem11-izomerypropanola.mp3",
  totalSec: 34.690612,
  conditionSec: 6.880317,
  stepSec: [],
  answerSec: 13.235465,
  correctAtSec: 13.235465,
  checkAtSec: 15.978141,
  outroSec: 31.816145,
};

export const chemIzomeryPropanola = makeChemTask({
  id: "Chem11IzomeryPropanola",
  hook: ["Два вещества", "повторяют пропанол-2"],
  instruction:
    "Из предложенного перечня выберите два вещества, которые являются изомерами пропанола-2.",
  options: [
    "C2H5–O–CH3",
    "CH3–CH(CH3)–CH2OH",
    "CH3–CH2–CH2–OH",
    "CH3–CH(OH)–CH2–CH3",
    "CH3–CH2OH",
  ],
  answer: "13",
  why: [
    "Пропанол-2 — это C3H8O. Такая же формула у метилэтилового эфира и у пропанола-1.",
    "Варианты два и четыре — это уже C4H10O, а вариант пять — этанол, C2H6O.",
  ],
  audioSync: izomeryPropanolaAudio,
});

const izomeryHlorbutanaAudio: AudioSync = {
  src: "audio/chem11-izomeryhlorbutana.mp3",
  totalSec: 31.791,
  conditionSec: 6.227528,
  stepSec: [],
  answerSec: 12.6839,
  correctAtSec: 12.6839,
  checkAtSec: 15.371519,
  outroSec: 29.066395,
};

export const chemIzomeryHlorbutana = makeChemTask({
  id: "Chem11IzomeryHlorbutana",
  hook: ["Найди все изомеры", "одного хлоралкана"],
  instruction:
    "Из предложенного перечня выберите все вещества, которые являются структурными изомерами 1-хлорбутана.",
  options: [
    "2-хлорбутан",
    "хлорциклобутан",
    "хлорциклопропан",
    "2-метил-2-хлорпропан",
    "2-метил-1-хлорциклопропан",
  ],
  answer: "14",
  why: [
    "1-хлорбутан — это C4H9Cl. Та же формула у 2-хлорбутана и у 2-метил-2-хлорпропана (трет-бутилхлорида).",
    "Циклические варианты из-за кольца теряют два атома водорода — их формулы уже другие.",
  ],
  optionSize: 42,
  audioSync: izomeryHlorbutanaAudio,
});

const sigma8Audio: AudioSync = {
  src: "audio/chem11-8sigma.mp3",
  totalSec: 41.404063,
  conditionSec: 7.520159,
  stepSec: [],
  answerSec: 13.957732,
  correctAtSec: 13.957732,
  checkAtSec: 17.832472,
  outroSec: 38.79356,
};

export const chem8Sigma = makeChemTask({
  id: "Chem118Sigma",
  hook: ["Посчитай сигма-связи —", "их ровно восемь"],
  instruction:
    "Из предложенного перечня выберите два вещества, в молекулах которых имеется восемь сигма-связей.",
  options: ["этанол", "этаналь", "пропанол", "диметиловый эфир", "этановая кислота"],
  answer: "14",
  why: [
    "В этаноле: связь С–С, связь С–О, связь О–Н и пять связей С–Н — итого восемь.",
    "В диметиловом эфире: две связи С–О и шесть связей С–Н — тоже восемь. У остальных веществ сигма-связей больше или меньше.",
  ],
  audioSync: sigma8Audio,
});

const sigma6Audio: AudioSync = {
  src: "audio/chem11-6sigma.mp3",
  totalSec: 38.608938,
  conditionSec: 6.192222,
  stepSec: [],
  answerSec: 12.402426,
  correctAtSec: 12.402426,
  checkAtSec: 15.796417,
  outroSec: 35.923537,
};

export const chem6Sigma = makeChemTask({
  id: "Chem116Sigma",
  hook: ["А здесь связей", "вдвое меньше"],
  instruction:
    "Из предложенного перечня выберите два вещества, молекулы которых имеют шесть сигма-связей.",
  options: ["пропин", "циклопропан", "пропен", "пропадиен", "циклобутан"],
  answer: "14",
  why: [
    "В пропине тройная связь даёт одну сигма-связь, плюс связь С–С и четыре С–Н — итого шесть.",
    "В пропадиене две двойные связи дают по одной сигма-связи каждая, плюс четыре С–Н — тоже шесть. Циклические варианты и пропен дают другое число связей.",
  ],
  audioSync: sigma6Audio,
});

const dveParyAudio: AudioSync = {
  src: "audio/chem11-dvepary.mp3",
  totalSec: 27.715875,
  conditionSec: 6.152222,
  stepSec: [],
  answerSec: 11.534943,
  correctAtSec: 11.534943,
  checkAtSec: 14.397415,
  outroSec: 24.93678,
};

export const chemDvePary = makeChemTask({
  id: "Chem11DvePary",
  hook: ["Две пары", "выглядят одинаково"],
  instruction:
    "Из предложенного перечня выберите две пары веществ, которые являются изомерами.",
  options: [
    "циклобутан и бутен-2",
    "циклобутан и бутан",
    "этанол и диметиловый эфир",
    "этанол и ацетальдегид",
    "пропан и циклопропан",
  ],
  answer: "13",
  why: [
    "Циклобутан и бутен-2 имеют одну формулу C4H8, этанол и диметиловый эфир — одну формулу C2H6O.",
    "В остальных парах формулы разные.",
  ],
  optionSize: 42,
  audioSync: dveParyAudio,
});

const ryadyC7H12Audio: AudioSync = {
  src: "audio/chem11-ryadyc7h12.mp3",
  totalSec: 44.74775,
  conditionSec: 7.114762,
  stepSec: [],
  answerSec: 16.187392,
  correctAtSec: 16.187392,
  checkAtSec: 18.46,
  outroSec: 41.776757,
};

export const chemRyadyC7H12 = makeChemTask({
  id: "Chem11RyadyC7H12",
  hook: ["Один и тот же ряд,", "только не для всех"],
  instruction:
    "Из предложенного перечня выберите все углеводороды, относящиеся к тем же гомологическим рядам, к которым относится вещество состава C7H12.",
  options: ["метан", "этилен", "бензол", "ацетилен", "циклопентен"],
  answer: "45",
  why: [
    "Формула C7H12 отвечает общей формуле с двумя степенями непредельности — под неё подходят и алкины (ацетилен), и циклоалкены с одним кольцом и одной двойной связью (циклопентен).",
    "Метан — алкан, этилен — алкен, бензол — арен: у всех другая общая формула.",
  ],
  audioSync: ryadyC7H12Audio,
});

const sp3Sp2Audio: AudioSync = {
  src: "audio/chem11-sp3sp2.mp3",
  totalSec: 45.949375,
  conditionSec: 6.359705,
  stepSec: [],
  answerSec: 15.782925,
  correctAtSec: 15.782925,
  checkAtSec: 19.459637,
  outroSec: 43.226961,
};

export const chemSp3Sp2 = makeChemTask({
  id: "Chem11Sp3Sp2",
  hook: ["Один атом углерода —", "другая гибридизация"],
  instruction:
    "Из предложенного перечня выберите все вещества, в молекулах которых атомы углерода находятся в состоянии sp3- и sp2-гибридизации.",
  options: ["пропин", "пропен", "пропан", "толуол", "циклогексен"],
  answer: "245",
  why: [
    "В пропене два атома при двойной связи sp2, третий, метильный — sp3. В толуоле кольцо целиком sp2, а метильная группа — sp3.",
    "В циклогексене два атома при двойной связи sp2, остальные четыре в кольце — sp3. В пропине есть тройная связь и sp-гибридизация, а в пропане только sp3.",
  ],
  audioSync: sp3Sp2Audio,
});

const spSp3Audio: AudioSync = {
  src: "audio/chem11-spsp3.mp3",
  totalSec: 37.799125,
  conditionSec: 5.435918,
  stepSec: [],
  answerSec: 15.074989,
  correctAtSec: 15.074989,
  checkAtSec: 17.522426,
  outroSec: 35.15712,
};

export const chemSpSp3 = makeChemTask({
  id: "Chem11SpSp3",
  hook: ["А тут ищем", "тройную связь"],
  instruction:
    "Из предложенного перечня выберите все вещества, в молекулах которых атомы углерода находятся в состояниях sp- и sp3-гибридизации.",
  options: ["пропин", "пропен", "пропан", "бутин", "толуол"],
  answer: "14",
  why: [
    "sp-гибридизация — признак тройной связи. У пропина и бутина она есть, и при этом у обоих остаются насыщенные, sp3, атомы в цепи.",
    "В пропене и толуоле есть только sp2 и sp3, в пропане — только sp3.",
  ],
  audioSync: spSp3Audio,
});

const neGomologiEfiraAudio: AudioSync = {
  src: "audio/chem11-negomologiefira.mp3",
  totalSec: 37.564063,
  conditionSec: 6.036145,
  stepSec: [],
  answerSec: 12.479819,
  correctAtSec: 12.479819,
  checkAtSec: 15.149909,
  outroSec: 35.136009,
};

export const chemNeGomologiEfira = makeChemTask({
  id: "Chem11NeGomologiEfira",
  hook: ["Не всё, что похоже,", "гомолог"],
  instruction:
    "Из предложенного перечня выберите все вещества, которые не являются гомологами диметилового эфира.",
  options: [
    "метилэтиловый эфир",
    "уксуснометиловый эфир",
    "метилпропиловый эфир",
    "диэтиловый эфир",
    "этиловый эфир уксусной кислоты",
  ],
  answer: "25",
  why: [
    "Диметиловый эфир — простой эфир. Метилэтиловый, метилпропиловый и диэтиловый эфиры — тоже простые эфиры, отличаются числом групп CH2, то есть гомологи.",
    "А «уксуснометиловый эфир» и «этиловый эфир уксусной кислоты» — это сложные эфиры, другой класс соединений, не гомологи.",
  ],
  optionSize: 40,
  audioSync: neGomologiEfiraAudio,
});

const paryGomologovAudio: AudioSync = {
  src: "audio/chem11-parygomologov.mp3",
  totalSec: 39.810563,
  conditionSec: 6.52771,
  stepSec: [],
  answerSec: 11.772562,
  correctAtSec: 11.772562,
  checkAtSec: 14.321995,
  outroSec: 37.039615,
};

export const chemParyGomologov = makeChemTask({
  id: "Chem11ParyGomologov",
  hook: ["Найди пары,", "которые правда родня"],
  instruction:
    "Из предложенного перечня выберите все пары веществ, которые являются гомологами.",
  options: [
    "бензол и стирол",
    "толуол и этилбензол",
    "фенол и крезол",
    "бензол и фенол",
    "толуол и метилбензол",
  ],
  answer: "23",
  why: [
    "Толуол и этилбензол отличаются на группу CH2 в боковой цепи, фенол и крезол — тем же в кольце: это гомологи.",
    "Бензол и стирол из-за двойной связи в боковой цепи не подходят под одну общую формулу, бензол и фенол — разные классы, а толуол и метилбензол — вообще одно и то же вещество под двумя названиями.",
  ],
  audioSync: paryGomologovAudio,
});

const neIzomeryButenaAudio: AudioSync = {
  src: "audio/chem11-neizomeributena.mp3",
  totalSec: 33.149375,
  conditionSec: 6.842902,
  stepSec: [],
  answerSec: 12.820317,
  correctAtSec: 12.820317,
  checkAtSec: 15.554626,
  outroSec: 30.177959,
};

export const chemNeIzomeryButena = makeChemTask({
  id: "Chem11NeIzomeryButena",
  hook: ["Пять веществ.", "Два — не изомеры бутена"],
  instruction:
    "Из предложенного перечня выберите все вещества, которые не являются изомерами бутена-2.",
  options: [
    "2-метилпропен",
    "этилциклопропан",
    "бутен-1",
    "метилциклобутан",
    "циклобутан",
  ],
  answer: "24",
  why: [
    "Бутен-2 — это C4H8. Такая же формула у 2-метилпропена, бутена-1 и циклобутана — все они изомеры.",
    "А этилциклопропан и метилциклобутан из-за лишнего атома углерода в кольце — уже C5H10, другая формула.",
  ],
  audioSync: neIzomeryButenaAudio,
});

const cisTransAudio: AudioSync = {
  src: "audio/chem11-cistrans.mp3",
  totalSec: 41.325688,
  conditionSec: 7.192177,
  stepSec: [],
  answerSec: 13.210635,
  correctAtSec: 13.210635,
  checkAtSec: 16.305714,
  outroSec: 38.393537,
};

export const chemCisTrans = makeChemTask({
  id: "Chem11CisTrans",
  hook: ["Не каждый двойной связью", "получит пару"],
  instruction:
    "Из предложенного перечня выберите все вещества, которые существуют в виде цис-транс-изомеров.",
  options: ["пентен-2", "гексен-3", "пропилен", "бутен-2", "бутен-1"],
  answer: "124",
  why: [
    "Цис-транс-изомерия возможна, только если у обоих атомов при двойной связи два разных заместителя. У пентена-2, гексена-3 и бутена-2 это условие выполняется.",
    "А у пропилена и бутена-1 на конце двойной связи стоит группа с двумя одинаковыми атомами водорода — цис-транс-форм для них не существует.",
  ],
  audioSync: cisTransAudio,
});

const cisTrans2Audio: AudioSync = {
  src: "audio/chem11-cistrans2.mp3",
  totalSec: 42.605688,
  conditionSec: 6.508322,
  stepSec: [],
  answerSec: 12.945351,
  correctAtSec: 12.945351,
  checkAtSec: 15.616236,
  outroSec: 39.852494,
};

export const chemCisTrans2 = makeChemTask({
  id: "Chem11CisTrans2",
  hook: ["Тут двойных связей", "вообще не будет"],
  instruction:
    "Из предложенного перечня выберите два вещества, которые существуют в виде цис- и транс-изомеров.",
  options: [
    "пентин-2",
    "1-хлорпропен",
    "1,1-дифенилэтилен",
    "3,3,3-трифторпропен",
    "бутен-2",
  ],
  answer: "25",
  why: [
    "У 1-хлорпропена и бутена-2 на каждом атоме при двойной связи по два разных заместителя — цис-транс-изомерия есть.",
    "У пентина-2 связь тройная, у 1,1-дифенилэтилена на одном атоме два одинаковых фенила, у трифторпропена на конце двойной связи снова две одинаковые группы — везде изомерии нет.",
  ],
  audioSync: cisTrans2Audio,
});

const dveParyIzomerov2Audio: AudioSync = {
  src: "audio/chem11-dveparyizomerov2.mp3",
  totalSec: 35.78775,
  conditionSec: 6.752653,
  stepSec: [],
  answerSec: 11.896485,
  correctAtSec: 11.896485,
  checkAtSec: 14.487687,
  outroSec: 32.983855,
};

export const chemDveParyIzomerov2 = makeChemTask({
  id: "Chem11DveParyIzomerov2",
  hook: ["Одна и та же формула —", "у совсем разных веществ"],
  instruction:
    "Из предложенного перечня выберите две пары веществ, которые являются изомерами.",
  options: [
    "пентан и пентадиен",
    "уксусная кислота и метилформиат",
    "этин и ацетилен",
    "этанол и этаналь",
    "ацетон и пропаналь",
  ],
  answer: "25",
  why: [
    "У уксусной кислоты и метилформиата общая формула C2H4O2, у ацетона и пропаналя — C3H6O.",
    "Пентан и пентадиен формулами отличаются, этин и ацетилен — вообще одно и то же вещество под двумя названиями, а этанол и этаналь — разные формулы.",
  ],
  optionSize: 40,
  audioSync: dveParyIzomerov2Audio,
});

const karbonilAudio: AudioSync = {
  src: "audio/chem11-karbonil.mp3",
  totalSec: 33.567313,
  conditionSec: 6.354989,
  stepSec: [],
  answerSec: 11.142925,
  correctAtSec: 11.142925,
  checkAtSec: 13.917438,
  outroSec: 31.009796,
};

export const chemKarbonil = makeChemTask({
  id: "Chem11Karbonil",
  hook: ["Две функциональные группы", "из пяти веществ"],
  instruction:
    "Из предложенного перечня выберите два вещества, которые содержат карбонильную группу.",
  options: ["рибоза", "глицерин", "уксусная кислота", "этаналь", "этанол"],
  answer: "14",
  why: [
    "Рибоза в открытой форме — альдопентоза с альдегидной, карбонильной группой, этаналь — тоже альдегид.",
    "Глицерин и этанол — спирты, карбонила у них нет. Карбоксильную группу уксусной кислоты здесь отдельно не считаем карбонильной — в задании 11 это разные категории.",
  ],
  audioSync: karbonilAudio,
});

const karboksilAudio: AudioSync = {
  src: "audio/chem11-karboksil.mp3",
  totalSec: 29.152625,
  conditionSec: 5.93517,
  stepSec: [],
  answerSec: 11.499184,
  correctAtSec: 11.499184,
  checkAtSec: 14.06932,
  outroSec: 26.181474,
};

export const chemKarboksil = makeChemTask({
  id: "Chem11Karboksil",
  hook: ["А здесь ищем", "другую группу"],
  instruction:
    "Из предложенного перечня выберите два вещества, которые содержат карбоксильную группу.",
  options: ["глюкоза", "формальдегид", "глицин", "пропионовая кислота", "анилин"],
  answer: "34",
  why: [
    "У глицина и пропионовой кислоты есть группа –COOH.",
    "У глюкозы и формальдегида — альдегидная группа, а не карбоксильная, у анилина — аминогруппа.",
  ],
  audioSync: karboksilAudio,
});

const coohAudio: AudioSync = {
  src: "audio/chem11-cooh.mp3",
  totalSec: 37.146063,
  conditionSec: 6.74966,
  stepSec: [],
  answerSec: 14.934739,
  correctAtSec: 14.934739,
  checkAtSec: 17.761361,
  outroSec: 34.161202,
};

export const chemCooh = makeChemTask({
  id: "Chem11Cooh",
  hook: ["Ещё одна группа —", "тоже два вещества"],
  instruction:
    "Из предложенного перечня выберите два вещества, которые содержат функциональную группу –COOH.",
  options: ["олеиновая кислота", "анилин", "метилформиат", "глицерин", "глицин"],
  answer: "15",
  why: [
    "У олеиновой кислоты и у глицина есть свободная группа –COOH.",
    "У метилформиата это сложноэфирная группа без OH, у анилина — аминогруппа, у глицерина — только гидроксильные группы.",
  ],
  audioSync: coohAudio,
});

const chisloIzomerovAudio: AudioSync = {
  src: "audio/chem11-chisloizomerov.mp3",
  totalSec: 38.530563,
  conditionSec: 6.255261,
  stepSec: [],
  answerSec: 17.205351,
  correctAtSec: 17.205351,
  checkAtSec: 19.979569,
  outroSec: 35.502902,
};

export const chemChisloIzomerov = makeChemTask({
  id: "Chem11ChisloIzomerov",
  hook: ["Число эфиров", "и число спиртов"],
  instruction:
    "Из предложенного перечня выберите два ответа, в которых указано число изомерных простых эфиров и число изомерных спиртов состава C3H8O.",
  options: ["1", "2", "3", "4", "изомеров нет"],
  answer: "12",
  why: [
    "У состава C3H8O ровно один простой эфир — метилэтиловый — и ровно два спирта: пропанол-1 и пропанол-2.",
    "Больше вариантов расположения атомов при трёх углеродах и одном кислороде такого типа не даёт.",
  ],
  audioSync: chisloIzomerovAudio,
});

const gomologiMetilaminaAudio: AudioSync = {
  src: "audio/chem11-gomologimetilamina.mp3",
  totalSec: 37.146063,
  conditionSec: 6.909524,
  stepSec: [],
  answerSec: 12.462744,
  correctAtSec: 12.462744,
  checkAtSec: 14.989932,
  outroSec: 34.494626,
};

export const chemGomologiMetilamina = makeChemTask({
  id: "Chem11GomologiMetilamina",
  hook: ["Гомологи амина —", "не все похожие вещества"],
  instruction:
    "Из предложенного перечня выберите все вещества, которые являются гомологами метиламина.",
  options: ["CH3(CH2)2CH2NH2", "NH2CH2COOH", "CH3NHCH3", "C2H5NH2", "C6H5NH2"],
  answer: "14",
  why: [
    "Метиламин — первичный амин, и его гомологи — тоже первичные амины с прямой заменой групп CH2: бутиламин и этиламин подходят.",
    "Глицин — аминокислота, другой класс, диметиламин — вторичный амин, анилин — ароматический амин с совсем другой общей формулой.",
  ],
  audioSync: gomologiMetilaminaAudio,
});

const sopryazhenieAudio: AudioSync = {
  src: "audio/chem11-sopryazhenie.mp3",
  totalSec: 39.706063,
  conditionSec: 6.721542,
  stepSec: [],
  answerSec: 12.584535,
  correctAtSec: 12.584535,
  checkAtSec: 15.670045,
  outroSec: 37.179955,
};

export const chemSopryazhenie = makeChemTask({
  id: "Chem11Sopryazhenie",
  hook: ["Система связей —", "не везде одна"],
  instruction:
    "Из предложенного перечня выберите два вещества, которые имеют систему сопряжённых связей.",
  options: ["фенол", "бутадиен-1,3", "циклогексен", "2-метилбутан", "бутин-1"],
  answer: "12",
  why: [
    "В феноле пи-система кольца сопряжена с неподелённой парой кислорода, в бутадиене-1,3 сопряжены две двойные связи через одинарную.",
    "В циклогексене двойная связь одна и изолированная, у 2-метилбутана двойных связей нет вовсе, у бутина-1 тройная связь тоже изолирована.",
  ],
  audioSync: sopryazhenieAudio,
});

const ketonyAudio: AudioSync = {
  src: "audio/chem11-ketony.mp3",
  totalSec: 33.724063,
  conditionSec: 6.209252,
  stepSec: [],
  answerSec: 11.139229,
  correctAtSec: 11.139229,
  checkAtSec: 13.93195,
  outroSec: 30.832449,
};

export const chemKetony = makeChemTask({
  id: "Chem11Ketony",
  hook: ["Два вещества", "относятся к одному классу"],
  instruction: "Из предложенного перечня выберите два вещества, которые относятся к кетонам.",
  options: ["формалин", "ацетон", "этилацетат", "бутанон", "глюкоза"],
  answer: "24",
  why: [
    "У ацетона и бутанона карбонильная группа стоит внутри углеродной цепи — это и есть признак кетона.",
    "Формалин — раствор альдегида, этилацетат — сложный эфир, глюкоза в открытой форме — тоже альдегид, а не кетон.",
  ],
  audioSync: ketonyAudio,
});

const izomerButanolaAudio: AudioSync = {
  src: "audio/chem11-izomerbutanola.mp3",
  totalSec: 32.7575,
  conditionSec: 6.956576,
  stepSec: [],
  answerSec: 9.920839,
  correctAtSec: 9.920839,
  checkAtSec: 11.681859,
  outroSec: 30.182472,
};

export const chemIzomerButanola = makeChemTask({
  id: "Chem11IzomerButanola",
  hook: ["Изомер спирта —", "только один из четырёх"],
  instruction: "Изомером бутанола-1 является:",
  options: ["CH3(CH2)2CH2OH", "CH3CH(OH)CH2CH3", "CH3–O–C2H5", "CH3CH2CH2CHO"],
  answer: "2",
  why: [
    "Бутанол-1 — это C4H10O. Та же формула у бутанола-2, то есть у второго варианта.",
    "Первый вариант — это сам бутанол-1, не изомер самому себе; третий — эфир другой формулы; четвёртый — бутаналь, альдегид с другой формулой.",
  ],
  audioSync: izomerButanolaAudio,
});

const gibridizatsiyaAudio: AudioSync = {
  src: "audio/chem11-gibridizatsiya.mp3",
  totalSec: 34.586063,
  conditionSec: 6.70585,
  stepSec: [],
  answerSec: 15.607347,
  correctAtSec: 15.607347,
  checkAtSec: 18.701338,
  outroSec: 31.629864,
};

export const chemGibridizatsiya = makeChemTask({
  id: "Chem11Gibridizatsiya",
  hook: ["Одна молекула —", "два типа гибридизации"],
  instruction:
    "Из предложенного перечня выберите два типа гибридизации орбиталей атома углерода, которые есть в молекуле 2-метилбутена-2.",
  options: ["sp3", "sp2", "sp", "sp3 и sp", "sp2 и sp"],
  answer: "12",
  why: [
    "В молекуле 2-метилбутена-2 два атома при двойной связи — sp2, а все три метильные группы — sp3.",
    "Тройной связи, а значит и sp-гибридизации, в этой молекуле нет вовсе.",
  ],
  audioSync: gibridizatsiyaAudio,
});

const toluolAudio: AudioSync = {
  src: "audio/chem11-toluol.mp3",
  totalSec: 38.269375,
  conditionSec: 5.916054,
  stepSec: [],
  answerSec: 10.900998,
  correctAtSec: 10.900998,
  checkAtSec: 13.380091,
  outroSec: 35.366553,
};

export const chemToluol = makeChemTask({
  id: "Chem11Toluol",
  hook: ["Два признака", "одной молекулы"],
  instruction: "Из предложенного перечня выберите две характеристики молекулы толуола.",
  options: [
    "sp2-гибридизация всех атомов углерода",
    "sp3-гибридизация всех атомов углерода",
    "sp2 и sp3-гибридизация атомов углерода",
    "равномерное распределение электронной плотности пи-электронной системы",
    "повышение электронной плотности пи-электронного облака в положениях 2, 4, 6 ароматического кольца",
  ],
  answer: "35",
  why: [
    "В толуоле шесть атомов кольца — sp2, а атом углерода метильной группы — sp3, значит гибридизация смешанная.",
    "Метильная группа — донор электронной плотности, она смещает пи-электроны кольца несимметрично, повышая плотность именно в орто- и пара-положениях, поэтому равномерного распределения на самом деле нет.",
  ],
  optionSize: 32,
  audioSync: toluolAudio,
});

export const CHEMISTRY_TASKS: TaskDef[] = [
  chemSpirtIzomeriya,
  chemMetanal,
  chemGomologiBenzola,
  chemIzomeryPentena,
  chemSp3,
  chemIzomeryPropanola,
  chemIzomeryHlorbutana,
  chem8Sigma,
  chem6Sigma,
  chemDvePary,
  chemRyadyC7H12,
  chemSp3Sp2,
  chemSpSp3,
  chemNeGomologiEfira,
  chemParyGomologov,
  chemNeIzomeryButena,
  chemCisTrans,
  chemCisTrans2,
  chemDveParyIzomerov2,
  chemKarbonil,
  chemKarboksil,
  chemCooh,
  chemChisloIzomerov,
  chemGomologiMetilamina,
  chemSopryazhenie,
  chemKetony,
  chemIzomerButanola,
  chemGibridizatsiya,
  chemToluol,
];
