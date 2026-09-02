import { w } from "./dsl";
import type { AudioSync, TaskDef } from "./types";

/**
 * Задание 7 ЕГЭ по русскому языку: ошибка в образовании формы слова.
 *
 * Условие вслух не читается — пять словосочетаний надо разглядеть, а не
 * прослушать. Поэтому проговаривается только формулировка, варианты
 * появляются строка за строкой, и в конце сцены остаётся пауза на подумать.
 * Отдельного кадра с таймером нет.
 */

const INSTRUCTION =
  "В одном из выделенных слов допущена ошибка в образовании формы слова. Исправьте ошибку и запишите слово правильно.";

type FormSpec = {
  id: string;
  /** Крючок на титульном кадре, по строке. */
  hook: string[];
  /** Пять словосочетаний; выделенное слово набрано капсом. */
  options: string[];
  /** Неверное словосочетание — целиком, как в списке. */
  wrong: string;
  /** Правильная форма, её и записывают в бланк. */
  answer: string;
  /** В чём ошибка — по предложению на строку. */
  why: string[];
  optionSize?: number;
  audioSync?: AudioSync;
};

const makeFormTask = (spec: FormSpec): TaskDef => ({
  id: spec.id,
  number: 7,
  subject: "в ЕГЭ по русскому языку",
  palette: "pink",
  hook: spec.hook,
  pillLabel: "Задание",
  instruction: INSTRUCTION,

  // Условие живёт в options; tokens нужны типу и озвучке формулировки
  tokens: w(INSTRUCTION),
  options: spec.options,
  problemSize: spec.optionSize ?? 46,

  // Разбирать по шагам нечего: ошибка либо видна, либо нет
  solutions: [],
  answerSeconds: 11,
  audioSync: spec.audioSync,

  answerLead: "Правильно",
  wrongNote: spec.wrong,
  answer: spec.answer,
  check: (
    <>
      {spec.why.map((sentence, i) => (
        <div key={i}>{sentence}</div>
      ))}
    </>
  ),
});

export const formDvuh = makeFormTask({
  id: "Rus7Dvuh",
  hook: ["Найдёшь ошибку", "в форме слова?"],
  options: [
    "опытные КОНСТРУКТОРЫ",
    "ЗАМЁРЗ на снегу",
    "к ДВУХ тысячи двадцать первому году",
    "килограмм БАКЛАЖАНОВ",
    "выглядел ВЕСЕЛЕЕ",
  ],
  wrong: "к ДВУХ тысячи двадцать первому году",
  answer: "две",
  why: [
    "В составном порядковом числительном склоняется только последнее слово.",
    "«К две тысячи двадцать первому году» — начало остаётся неизменным.",
  ],
  optionSize: 42,
});

export const formMolot = makeFormTask({
  id: "Rus7Molot",
  hook: ["Одно слово здесь", "лишнее"],
  options: [
    "ЧЕТЫРЬМЯСТАМИ отзывами",
    "земные НЕДРА",
    "помыть ШАМПУНЕМ",
    "МЕЛИТЬ зерно на мельнице",
    "ПОСКОЛЬЗНУЛСЯ на льду",
  ],
  wrong: "МЕЛИТЬ зерно на мельнице",
  answer: "молоть",
  why: [
    "Зерно мелют — от глагола «молоть».",
    "«Мелить» значит натирать мелом, это другое слово.",
  ],
});

export const formPovidlom1 = makeFormTask({
  id: "Rus7Povidlo1",
  hook: ["Пирог с чем?"],
  options: [
    "ПРОМОК под дождём",
    "более ПЯТИСОТ заявлений",
    "вкусные КРЕНДЕЛИ",
    "пирог с ПОВИДЛОЙ",
    "голос ЗВОНЧЕ",
  ],
  wrong: "пирог с ПОВИДЛОЙ",
  answer: "повидлом",
  why: [
    "«Повидло» — существительное среднего рода, а не женского.",
    "В творительном падеже — повидлом, как «с маслом».",
  ],
});

export const formOkrep = makeFormTask({
  id: "Rus7Okrep",
  hook: ["Вырос и… как?"],
  options: [
    "вырос и ОКРЕПНУЛ",
    "ПРОМОК под дождём",
    "РАЗОЖЖЁМ огонь",
    "ПОЛОЩИ бельё",
    "СМОГУ ПОБЕДИТЬ",
  ],
  wrong: "вырос и ОКРЕПНУЛ",
  answer: "окреп",
  why: [
    "У глаголов на -нуть суффикс в прошедшем времени выпадает.",
    "Окрепнуть — окреп, как «промокнуть — промок».",
  ],
});

export const formPovidlom2 = makeFormTask({
  id: "Rus7Povidlo2",
  hook: ["Пирожки с чем?"],
  options: [
    "золочёные КУПОЛА",
    "ПОЕЗЖАЙ вперёд",
    "пирожки с ПОВИДЛОЙ",
    "более СТРОГО",
    "пара ПОЛОТЕНЕЦ",
  ],
  wrong: "пирожки с ПОВИДЛОЙ",
  answer: "повидлом",
  why: [
    "«Повидло» — среднего рода, формы «повидла» у него нет.",
    "Правильный творительный падеж — повидлом.",
  ],
});

export const formKrasivee = makeFormTask({
  id: "Rus7Krasivee",
  hook: ["Как сказать", "про сравнение?"],
  options: [
    "КРАСИВШЕ",
    "ДВЕ седьмых",
    "много ВИШЕН",
    "ПОСАДИ дерево",
    "пара БОТИНОК",
  ],
  wrong: "КРАСИВШЕ",
  answer: "красивее",
  why: [
    "Сравнительная степень «красивого» образуется суффиксом -ее.",
    "Формы «красивше» в литературном языке нет.",
  ],
});

export const formMesyatsy = makeFormTask({
  id: "Rus7Mesyatsy",
  hook: ["Зимние… что?"],
  options: [
    "прошли наиболее УСПЕШНО",
    "зимние МЕСЯЦА",
    "СЕМЬЮСТАМИ солдатами",
    "ПРОПОЛОЩИ бельё",
    "в ТЫСЯЧА девятисотом году",
  ],
  wrong: "зимние МЕСЯЦА",
  answer: "месяцы",
  why: [
    "Множественное число слова «месяц» — месяцы, с окончанием -ы.",
    "Окончание -а здесь просторечное.",
  ],
  optionSize: 44,
});

export const formMongolov = makeFormTask({
  id: "Rus7Mongolov",
  hook: ["Встретил группу", "кого?"],
  options: [
    "ПОЕЗЖАЙ прямо",
    "СЕМЬЮДЕСЯТЬЮ рублями",
    "я встретил группу МОНГОЛ",
    "более СИЛЬНЫЙ соперник",
    "известные ДОКТОРА",
  ],
  wrong: "группу МОНГОЛ",
  answer: "монголов",
  why: [
    "Названия народов на -л дают в родительном падеже окончание -ов.",
    "Монголов — как «монголов, таджиков»; нулевое окончание у «турок, цыган».",
  ],
  optionSize: 44,
});

export const formChetyrem = makeFormTask({
  id: "Rus7Chetyrem",
  hook: ["Сколько подруг?"],
  options: [
    "с СЕМЬЮСТАМИ жителями",
    "СЕРЬЁЗНЕЙШЕЕ испытание",
    "ИХ игрушки",
    "ЧЕТВЕРЫМ подругам",
    "пять БЛЮДЕЦ",
  ],
  wrong: "ЧЕТВЕРЫМ подругам",
  answer: "четырём",
  why: [
    "Собирательные числительные не сочетаются с существительными женского рода.",
    "Нужно количественное: четырём подругам.",
  ],
  optionSize: 44,
});

export const formIh = makeFormTask({
  id: "Rus7Ih",
  hook: ["Чьей работой?"],
  options: [
    "молодые БУХГАЛТЕРЫ",
    "ИХНЕЙ работой",
    "в течение ТРИДЦАТИ ПЯТИ минут",
    "дамских ТУФЕЛЬ",
    "пять ГРАММОВ",
  ],
  wrong: "ИХНЕЙ работой",
  answer: "их",
  why: [
    "Притяжательного местоимения «ихний» в русском языке нет.",
    "Принадлежность передаётся формой «их»: их работой.",
  ],
  optionSize: 44,
});

// --- партия 2 (20 карточек) ---------------------------------------------

const obgryzannoeAudio: AudioSync = {
  src: "audio/rus7-obgryzannoe.mp3",
  totalSec: 24.111,
  conditionSec: 5.646553,
  stepSec: [],
  answerSec: 12.465986,
  correctAtSec: 15.11644,
  checkAtSec: 16.751088,
  outroSec: 21.476916,
};

export const formObgryzannoe = makeFormTask({
  id: "Rus7Obgryzannoe",
  hook: ["Одна ошибка", "спряталась здесь"],
  options: [
    "день был сверхъестественно ЖАРОК",
    "ОБГРЫЗАННОЕ яблоко",
    "ЭКИПИРУЕТ солдат",
    "новые ПЛЕЕРЫ",
    "любители горных ЛЫЖ",
  ],
  wrong: "ОБГРЫЗАННОЕ яблоко",
  answer: "обгрызенное",
  why: [
    "Причастие от глагола «обгрызть» образуется с суффиксом -енн-, а не -анн-.",
  ],
  optionSize: 42,
  audioSync: obgryzannoeAudio,
});

const posleDnyaAudio: AudioSync = {
  src: "audio/rus7-posle-dnya.mp3",
  totalSec: 24.26775,
  conditionSec: 5.827732,
  stepSec: [],
  answerSec: 12.792789,
  correctAtSec: 15.677029,
  checkAtSec: 17.434739,
  outroSec: 21.796825,
};

export const formPosleDnya = makeFormTask({
  id: "Rus7PosleDnya",
  hook: ["Пять слов —", "одно неверное"],
  options: [
    "после ДЕНЬ рождения",
    "горсть ФИНИКОВ",
    "прозрачных ВУАЛЕЙ",
    "МРАЧНЕЙШИЙ взгляд",
    "ДОСТИГ вершины",
  ],
  wrong: "после ДЕНЬ рождения",
  answer: "дня",
  why: ["Предлог «после» требует родительного падежа — «после ДНЯ рождения»."],
  audioSync: posleDnyaAudio,
});

const bashkirovAudio: AudioSync = {
  src: "audio/rus7-bashkirov.mp3",
  totalSec: 27.715875,
  conditionSec: 6.463288,
  stepSec: [],
  answerSec: 13.260567,
  correctAtSec: 16.083673,
  checkAtSec: 16.883243,
  outroSec: 25.169456,
};

export const formBashkirov = makeFormTask({
  id: "Rus7Bashkirov",
  hook: ["Сможешь найти", "ошибку с первого раза?"],
  options: [
    "БРЕДЁТ по лесу",
    "петь ГРОМЧЕ",
    "ОГЛОХ от шума",
    "праздник БАШКИРОВ",
    "высокотехнологичные ОТРАСЛИ",
  ],
  wrong: "праздник БАШКИРОВ",
  answer: "башкир",
  why: [
    "У названий ряда народов (башкиры, буряты, турки) в родительном падеже множественного числа нулевое окончание.",
  ],
  optionSize: 44,
  audioSync: bashkirovAudio,
});

const guashemAudio: AudioSync = {
  src: "audio/rus7-guashem.mp3",
  totalSec: 26.044063,
  conditionSec: 6.02093,
  stepSec: [],
  answerSec: 12.7222,
  correctAtSec: 15.59746,
  checkAtSec: 16.329887,
  outroSec: 23.532585,
};

export const formGuashem = makeFormTask({
  id: "Rus7Guashem",
  hook: ["Здесь всего", "одна неточность"],
  options: [
    "СУЖУ матч",
    "покрасили ГУАШЕМ",
    "СКРЕЖЕЩЕТ зубами",
    "изготовление кожаных СЁДЕЛ",
    "фарфоровые БЛЮДЦА",
  ],
  wrong: "покрасили ГУАШЕМ",
  answer: "гуашью",
  why: [
    "«Гуашь» — существительное женского рода на -ь, в творительном падеже оно оканчивается на -ью.",
  ],
  optionSize: 44,
  audioSync: guashemAudio,
});

const vysochaishayaAudio: AudioSync = {
  src: "audio/rus7-vysochaishaya.mp3",
  totalSec: 30.040813,
  conditionSec: 6.423243,
  stepSec: [],
  answerSec: 13.707007,
  correctAtSec: 17.121451,
  checkAtSec: 17.877732,
  outroSec: 27.183673,
};

export const formVysochaishaya = makeFormTask({
  id: "Rus7Vysochaishaya",
  hook: ["Один вариант", "здесь не пройдёт"],
  options: [
    "стопка ПРОСТЫНЬ",
    "шёлк невероятно ГЛАДОК",
    "восемь МЕТРОВ шёлка",
    "самая ВЫСОЧАЙШАЯ гора",
    "НЕОБЫЧНОЕ хобби",
  ],
  wrong: "самая ВЫСОЧАЙШАЯ гора",
  answer: "высокая",
  why: [
    "«Самая» уже выражает превосходную степень, добавлять к ней ещё суффикс -айш- нельзя — двойная превосходная степень.",
  ],
  audioSync: vysochaishayaAudio,
});

const semistamiAudio: AudioSync = {
  src: "audio/rus7-semistami.mp3",
  totalSec: 27.951,
  conditionSec: 6.038957,
  stepSec: [],
  answerSec: 14.235488,
  correctAtSec: 17.166939,
  checkAtSec: 19.159615,
  outroSec: 25.212585,
};

export const formSemistami = makeFormTask({
  id: "Rus7Semistami",
  hook: ["Проверь себя", "за 10 секунд"],
  options: [
    "голос необычно ЗВОНОК",
    "СЕМИСТАМИ рублями",
    "из родных ЗАХОЛУСТИЙ",
    "масса пушечных ЯДЕР",
    "коробки на ШКАФУ",
  ],
  wrong: "СЕМИСТАМИ рублями",
  answer: "семьюстами",
  why: [
    "В составном числительном «семьсот» при склонении изменяются обе части — семьюстами.",
  ],
  audioSync: semistamiAudio,
});

const polotentsevAudio: AudioSync = {
  src: "audio/rus7-polotentsev.mp3",
  totalSec: 27.559125,
  conditionSec: 5.866349,
  stepSec: [],
  answerSec: 13.805805,
  correctAtSec: 16.658594,
  checkAtSec: 18.87644,
  outroSec: 24.950317,
};

export const formPolotentsev = makeFormTask({
  id: "Rus7Polotentsev",
  hook: ["Только один", "вариант неправильный"],
  options: [
    "напряжение лицевых МЫШЦ",
    "биржевые МАКЛЕРЫ",
    "стопка ПОЛОТЕНЦЕВ",
    "покупка цветочных СЕМЯН",
    "препарат почти БЕЗБОЛЕЗНЕН",
  ],
  wrong: "стопка ПОЛОТЕНЦЕВ",
  answer: "полотенец",
  why: [
    "У существительного «полотенце» в родительном падеже множественного числа нулевое окончание.",
  ],
  optionSize: 44,
  audioSync: polotentsevAudio,
});

const pasportyAudio: AudioSync = {
  src: "audio/rus7-pasporty.mp3",
  totalSec: 26.592625,
  conditionSec: 5.272517,
  stepSec: [],
  answerSec: 12.884762,
  correctAtSec: 15.923311,
  checkAtSec: 17.898005,
  outroSec: 23.956916,
};

export const formPasporty = makeFormTask({
  id: "Rus7Pasporty",
  hook: ["Найдётся ли", "здесь ошибка?"],
  options: [
    "ПРИВЕДШИЙ к победе",
    "заграничные ПАСПОРТЫ",
    "МЕТЧЕ стрелка",
    "РИСУЮЩИЙ картину",
    "купил ПИДЖАК",
  ],
  wrong: "заграничные ПАСПОРТЫ",
  answer: "паспорта",
  why: [
    "У существительного «паспорт» в именительном падеже множественного числа ударное окончание -а.",
  ],
  audioSync: pasportyAudio,
});

const pomidorAudio: AudioSync = {
  src: "audio/rus7-pomidor.mp3",
  totalSec: 28.525688,
  conditionSec: 5.697642,
  stepSec: [],
  answerSec: 13.116553,
  correctAtSec: 15.673946,
  checkAtSec: 17.524989,
  outroSec: 26.001202,
};

export const formPomidor = makeFormTask({
  id: "Rus7Pomidor",
  hook: ["Пять слов.", "Одна ловушка"],
  options: [
    "стоял в очереди после НЕЁ",
    "вещи лежат в ШКАФУ",
    "рассказы о нашем КРАЕ",
    "килограмм ПОМИДОР",
    "романтических ГЕРОИНЬ",
  ],
  wrong: "килограмм ПОМИДОР",
  answer: "помидоров",
  why: [
    "У существительного «помидор», в отличие от «яблок» или «баклажан», в родительном падеже множественного числа сохраняется окончание -ов.",
  ],
  audioSync: pomidorAudio,
});

const reituzovAudio: AudioSync = {
  src: "audio/rus7-reituzov.mp3",
  totalSec: 27.79425,
  conditionSec: 6.289615,
  stepSec: [],
  answerSec: 13.530023,
  correctAtSec: 16.193401,
  checkAtSec: 17.918322,
  outroSec: 25.112381,
};

export const formReituzov = makeFormTask({
  id: "Rus7Reituzov",
  hook: ["Твоя грамотность", "под проверкой"],
  options: [
    "медных ГРОШЕЙ",
    "ЛЕГЧЕ пёрышка",
    "девять ДЫНЬ",
    "пара РЕЙТУЗОВ",
    "снять МОКАСИН с ноги",
  ],
  wrong: "пара РЕЙТУЗОВ",
  answer: "рейтуз",
  why: [
    "У существительного «рейтузы» в родительном падеже множественного числа нулевое окончание, как у «сапог» или «чулок».",
  ],
  audioSync: reituzovAudio,
});

const chasovenAudio: AudioSync = {
  src: "audio/rus7-chasoven.mp3",
  totalSec: 27.715875,
  conditionSec: 5.459184,
  stepSec: [],
  answerSec: 12.714694,
  correctAtSec: 16.001406,
  checkAtSec: 17.833016,
  outroSec: 25.249252,
};

export const formChasoven = makeFormTask({
  id: "Rus7Chasoven",
  hook: ["Легко ошибиться", "в одном месте"],
  options: [
    "большинство КАЛМЫКОВ",
    "удар бешено ХЛЁСТОК",
    "русских КНЯЗЕЙ",
    "строительство новых ЧАСОВЕНЬ",
    "греческих БОГИНЬ",
  ],
  wrong: "строительство новых ЧАСОВЕНЬ",
  answer: "часовен",
  why: [
    "У существительного «часовня» в родительном падеже множественного числа окончание -ен (как у «башня» — «башен»).",
  ],
  optionSize: 44,
  audioSync: chasovenAudio,
});

const doktoryAudio: AudioSync = {
  src: "audio/rus7-doktory.mp3",
  totalSec: 24.26775,
  conditionSec: 4.434853,
  stepSec: [],
  answerSec: 11.51805,
  correctAtSec: 14.226417,
  checkAtSec: 15.821156,
  outroSec: 21.501474,
};

export const formDoktory = makeFormTask({
  id: "Rus7Doktory",
  hook: ["Здесь есть", "подвох"],
  options: [
    "КЛАЛА на стол",
    "уважаемые ДОКТОРЫ",
    "ЧЕТЫРЁМСТАМ ученикам",
    "бой Кремлевских КУРАНТОВ",
    "шёл навстречу ЕМУ",
  ],
  wrong: "уважаемые ДОКТОРЫ",
  answer: "доктора",
  why: [
    "У существительного «доктор» в именительном падеже множественного числа ударное окончание -а.",
  ],
  audioSync: doktoryAudio,
});

const getrovAudio: AudioSync = {
  src: "audio/rus7-getrov.mp3",
  totalSec: 27.79425,
  conditionSec: 6.741247,
  stepSec: [],
  answerSec: 14.385442,
  correctAtSec: 17.87483,
  checkAtSec: 18.706304,
  outroSec: 25.218617,
};

export const formGetrov = makeFormTask({
  id: "Rus7Getrov",
  hook: ["Одно слово", "написано неверно"],
  options: [
    "становиться всё ГИБЧЕ",
    "деревянных БРУСЬЕВ",
    "застёгивать пуговицы ГЕТРОВ",
    "группа КИРГИЗОВ",
    "много ДЕЛ",
  ],
  wrong: "застёгивать пуговицы ГЕТРОВ",
  answer: "гетр",
  why: [
    "У существительного «гетры» в родительном падеже множественного числа нулевое окончание.",
  ],
  optionSize: 44,
  audioSync: getrovAudio,
});

const naperekorNeyAudio: AudioSync = {
  src: "audio/rus7-naperekorney.mp3",
  totalSec: 28.10775,
  conditionSec: 5.517959,
  stepSec: [],
  answerSec: 12.462426,
  correctAtSec: 16.100227,
  checkAtSec: 17.725351,
  outroSec: 25.416757,
};

export const formNaperekorNey = makeFormTask({
  id: "Rus7NaperekorNey",
  hook: ["Найдёшь то,", "что не так?"],
  options: [
    "КРАСИВЕЕ других",
    "королевские ПОВАРА",
    "поступил наперекор НЕЙ",
    "НАПРЯГИТЕ мышцы",
    "намного ЧИЩЕ",
  ],
  wrong: "поступил наперекор НЕЙ",
  answer: "ей",
  why: [
    "«Наперекор» — предлог, после которого местоимение 3-го лица не получает начального «н» (как «вопреки», «согласно»).",
  ],
  audioSync: naperekorNeyAudio,
});

const tabuAudio: AudioSync = {
  src: "audio/rus7-tabu.mp3",
  totalSec: 26.592625,
  conditionSec: 5.314739,
  stepSec: [],
  answerSec: 12.133787,
  correctAtSec: 14.796939,
  checkAtSec: 16.614082,
  outroSec: 23.916916,
};

export const formTabu = makeFormTask({
  id: "Rus7Tabu",
  hook: ["Проверка", "на внимательность"],
  options: [
    "НИЖЕ сестры",
    "сотни АКРОВ",
    "ДРЕВНИЙ табу",
    "содержимое каменных ЧАШ",
    "пришивание оторванных ПУГОВИЦ",
  ],
  wrong: "ДРЕВНИЙ табу",
  answer: "древнее",
  why: [
    "«Табу» — несклоняемое существительное среднего рода, прилагательное должно с ним согласовываться: «древнее табу».",
  ],
  optionSize: 44,
  audioSync: tabuAudio,
});

const oladyevAudio: AudioSync = {
  src: "audio/rus7-oladyev.mp3",
  totalSec: 25.312625,
  conditionSec: 5.504467,
  stepSec: [],
  answerSec: 12.566213,
  correctAtSec: 16.08195,
  checkAtSec: 17.134649,
  outroSec: 22.833356,
};

export const formOladyev = makeFormTask({
  id: "Rus7Oladyev",
  hook: ["Один из пяти —", "неверный"],
  options: [
    "МОЮЩИЕСЯ обои",
    "племена БЕДУИНОВ",
    "стопка ОЛАДЬЕВ",
    "ПЯТЬ ножниц",
    "СТАРШИЙ брат",
  ],
  wrong: "стопка ОЛАДЬЕВ",
  answer: "оладий",
  why: [
    "У существительного «оладья» в родительном падеже множественного числа форма «оладий».",
  ],
  audioSync: oladyevAudio,
});

const dzhinsAudio: AudioSync = {
  src: "audio/rus7-dzhins.mp3",
  totalSec: 25.0775,
  conditionSec: 5.68898,
  stepSec: [],
  answerSec: 12.424376,
  correctAtSec: 15.599297,
  checkAtSec: 16.568776,
  outroSec: 22.492404,
};

export const formDzhins = makeFormTask({
  id: "Rus7Dzhins",
  hook: ["Здесь всего", "одна опечатка формы"],
  options: [
    "пять КАРАТ",
    "НИКОМУ не говори",
    "плащ чрезвычайно ЛЁГОК",
    "в карман ДЖИНС",
    "все ОБРАЗУЕТСЯ",
  ],
  wrong: "в карман ДЖИНС",
  answer: "джинсов",
  why: [
    "У существительного «джинсы» в родительном падеже множественного числа окончание -ов.",
  ],
  audioSync: dzhinsAudio,
});

const kislAudio: AudioSync = {
  src: "audio/rus7-kisl.mp3",
  totalSec: 27.402438,
  conditionSec: 5.528866,
  stepSec: [],
  answerSec: 12.802608,
  correctAtSec: 16.242789,
  checkAtSec: 18.219342,
  outroSec: 24.478413,
};

export const formKisl = makeFormTask({
  id: "Rus7Kisl",
  hook: ["Сможешь", "поймать ошибку?"],
  options: [
    "земные НЕДРА",
    "крыжовник слишком КИСЛ",
    "скоро ОПРОТИВЕЕТ",
    "лунные КРАТЕРЫ",
    "несколько РЕМНЕЙ",
  ],
  wrong: "крыжовник слишком КИСЛ",
  answer: "кисел",
  why: [
    "В краткой форме прилагательного «кислый» между согласными появляется беглая гласная — «кисел».",
  ],
  audioSync: kislAudio,
});

const svetlAudio: AudioSync = {
  src: "audio/rus7-svetl.mp3",
  totalSec: 27.088938,
  conditionSec: 5.585125,
  stepSec: [],
  answerSec: 12.590045,
  correctAtSec: 16.341066,
  checkAtSec: 18.315692,
  outroSec: 24.512812,
};

export const formSvetl = makeFormTask({
  id: "Rus7Svetl",
  hook: ["Пятеро,", "но один лишний"],
  options: [
    "ХИТРЕЙШИЙ приём",
    "вечер был необычайно СВЕТЛ",
    "празднование КРЕСТИН",
    "КОНСТРУКТОРСКОЕ бюро",
    "австралийских АБОРИГЕНОВ",
  ],
  wrong: "вечер был необычайно СВЕТЛ",
  answer: "светел",
  why: [
    "В краткой форме прилагательного «светлый» между согласными появляется беглая гласная — «светел».",
  ],
  optionSize: 44,
  audioSync: svetlAudio,
});

const pyatTselykhAudio: AudioSync = {
  src: "audio/rus7-pyattselykh.mp3",
  totalSec: 24.764063,
  conditionSec: 5.152449,
  stepSec: [],
  answerSec: 11.836871,
  correctAtSec: 15.012358,
  checkAtSec: 16.568299,
  outroSec: 22.183333,
};

export const formPyatTselykh = makeFormTask({
  id: "Rus7PyatTselykh",
  hook: ["Сложный случай", "формы слова"],
  options: [
    "к ПЯТЬ целым четырём шестым",
    "до СКОЛЬКИХ работаешь",
    "вид его чудовищно МРАЧЕН",
    "ЗАСЕКИ время",
    "вода речных УСТЬЕВ",
  ],
  wrong: "к ПЯТЬ целым четырём шестым",
  answer: "пяти",
  why: [
    "Числительное в составе дробного числительного склоняется — «к ПЯТИ целым четырём шестым».",
  ],
  optionSize: 44,
  audioSync: pyatTselykhAudio,
});

export const FORM_WORD_TASKS: TaskDef[] = [
  formDvuh,
  formMolot,
  formPovidlom1,
  formOkrep,
  formPovidlom2,
  formKrasivee,
  formMesyatsy,
  formMongolov,
  formChetyrem,
  formIh,
  formObgryzannoe,
  formPosleDnya,
  formBashkirov,
  formGuashem,
  formVysochaishaya,
  formSemistami,
  formPolotentsev,
  formPasporty,
  formPomidor,
  formReituzov,
  formChasoven,
  formDoktory,
  formGetrov,
  formNaperekorNey,
  formTabu,
  formOladyev,
  formDzhins,
  formKisl,
  formSvetl,
  formPyatTselykh,
];
