#!/usr/bin/env node
/**
 * Тест-сьют нормализатора TTS — без фреймворка (в проекте его нет), просто
 * assert + процесс завершается кодом 1 при первом провале, но продолжает
 * проверять всё остальное (чтобы за один прогон было видно все провалы).
 * Запуск: node scripts/dynamic-task/test-normalize-for-voiceover.mjs
 */
import assert from "node:assert/strict";
import {
  normalizeForVoiceover,
  normalizeCommon,
  numberToRussianWords,
  numberToOrdinal,
  romanToInt,
  findUnsafeTtsTokens,
  safeFallbackForUnknownToken,
  subjectKeyFromText,
  TTS_NORMALIZER_VERSION,
} from "./normalize-for-voiceover.mjs";

let passed = 0;
let failed = 0;
const check = (name, actual, expected) => {
  try {
    assert.equal(actual, expected);
    passed++;
  } catch {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ожидалось: ${JSON.stringify(expected)}`);
    console.error(`  получено:  ${JSON.stringify(actual)}`);
  }
};
const checkTrue = (name, actual) => check(name, Boolean(actual), true);

const N = (text, subject) => normalizeForVoiceover(text, subject);

// =========================================================================
// 0. Числительные — примитивы
// =========================================================================
check("num 0", numberToRussianWords(0), "ноль");
check("num 6", numberToRussianWords(6), "шесть");
check("num 7", numberToRussianWords(7), "семь");
check("num 8", numberToRussianWords(8), "восемь");
check("num 9", numberToRussianWords(9), "девять");
check("num 10", numberToRussianWords(10), "десять");
check("num 11", numberToRussianWords(11), "одиннадцать");
check("num 12", numberToRussianWords(12), "двенадцать");
check("num 20", numberToRussianWords(20), "двадцать");
check("num 25", numberToRussianWords(25), "двадцать пять");
check("num 100", numberToRussianWords(100), "сто");
check("num 1000", numberToRussianWords(1000), "одна тысяча");
check("num 2024", numberToRussianWords(2024), "две тысячи двадцать четыре");
check("num -5", numberToRussianWords(-5), "минус пять");
check("num 1000000", numberToRussianWords(1000000), "один миллион");
check("num 3000000000".slice(0, -1), numberToRussianWords(300000000), "триста миллионов");

// Порядковые
check("ord 8 prep", numberToOrdinal(8, { case: "prep" }), "восьмом");
check("ord 3 gen (irregular)", numberToOrdinal(3, { case: "gen" }), "третьего");
check("ord 21 nom", numberToOrdinal(21, { case: "nom" }), "двадцать первый");
check("ord 100 nom", numberToOrdinal(100, { case: "nom" }), "сотый");

// Римские
check("roman XX", romanToInt("XX"), 20);
check("roman XIX", romanToInt("XIX"), 19);
check("roman XXI", romanToInt("XXI"), 21);
check("roman I", romanToInt("I"), 1);

// =========================================================================
// 1. РУССКИЙ ЯЗЫК (§26)
// =========================================================================
check("ru: задание 6", N("Решаем задание 6", "russian"), "Решаем задание шесть");
check("ru: значение 15", N("Укажите значение 15", "russian"), "Укажите значение пятнадцать");
check("ru: в 2008 году", N("В 2008 году", "russian"), "В две тысячи восьмом году");
check("ru: к 1930-м годам", N("к 1930-м годам", "russian"), "к тысяча девятьсот тридцатым годам");
check("ru: в 1930-х годах", N("в 1930-х годах", "russian"), "в тысяча девятьсот тридцатых годах");
check("ru: 2008-2012 годы", N("2008–2012 годы", "russian"), "две тысячи восьмой — две тысячи двенадцатый годы");
check(
  "ru: 23 февраля 2022 года",
  N("23 февраля 2022 года", "russian"),
  "двадцать третьего февраля две тысячи двадцать второго года",
);
check("ru: XX век", N("XX век", "russian"), "двадцатый век");
check("ru: в XIX веке", N("в XIX веке", "russian"), "в девятнадцатом веке");
check("ru: предложения 3-5", N("предложения 3–5", "russian"), "предложения от трёх до пяти");
check(
  "ru: реальный пример (1930-е + 2008)",
  N(
    "Этот исключительно эксклюзивный автомобиль, вид которого отсылает к 1930-м годам, был изготовлен в 2008 году по заказу коллекционера Ролланда Холла.",
    "russian",
  ),
  "Этот исключительно эксклюзивный автомобиль, вид которого отсылает к тысяча девятьсот тридцатым годам, был изготовлен в две тысячи восьмом году по заказу коллекционера Ролланда Холла.",
);
check("ru: задание 7", N("Решаем задание 7", "russian"), "Решаем задание семь");
check("ru: задание 8", N("Решаем задание 8", "russian"), "Решаем задание восемь");
check("ru: с 2008 года", N("с 2008 года", "russian"), "с две тысячи восьмого года");
check("ru: 988 г.", N("Это произошло в 988 г.", "russian"), "Это произошло в девятьсот восемьдесят восьмой год");
check("ru: 6-й", N("в 6-м предложении", "russian"), "в шестом предложении");
check("ru: 20-й век", N("до 20-го века", "russian"), "до двадцатого века");
check("ru: слово уже словом — не трогаем", N("Решаем задание шестого варианта.", "russian"), "Решаем задание шестого варианта.");
check("ru: Ответ — двадцать пять (не трогаем)", N("Ответ — двадцать пять.", "russian"), "Ответ — двадцать пять.");

// =========================================================================
// 2. МАТЕМАТИКА (§26)
// =========================================================================
check("math: x^2+2x-3=0", N("x² + 2x − 3 = 0", "math"), "икс в квадрате плюс два икс минус три равно ноль");
check("math: sqrt25=5", N("√25 = 5", "math"), "корень из двадцать пять равно пять");
check("math: sin2x+cos2x=1", N("sin²x + cos²x = 1", "math"), "синус в квадрате икс плюс косинус в квадрате икс равно один");
check("math: 3/4", N("3/4", "math"), "три четвёртых");
check("math: 0,25", N("0,25", "math"), "ноль целых двадцать пять сотых");
check("math: 15%", N("15%", "math"), "пятнадцать процентов");
check("math: x cubed", N("x³", "math"), "икс в кубе");
check("math: x^5", N("x^5", "math"), "икс в пятой степени");
check("math: 10^-3", N("10^-3", "math"), "десять в минус третьей степени");
check("math: 1/2 named", N("1/2", "math"), "одна вторая");
check("math: interval", N("[-2; 4]", "math"), "отрезок от минус два до четыре");
check("math: точка", N("(2; 5)", "math"), "точка с координатами два, пять");
check("math: abs value", N("|x|", "math"), "модуль икс");
check("math: pi", N("π", "math"), "пи");
check("math: log base 2", N("log₂8", "math"), "логарифм по основанию два от восемь");
check("math: bare variable", N("x", "math"), "икс");
check("math: coefficient var", N("2x", "math"), "два икс");
check("math: не равно", N("x ≠ 5", "math"), "икс не равно пять");

// =========================================================================
// 3. ФИЗИКА (§26)
// =========================================================================
check("phys: 20 м/с", N("Скорость равна 20 м/с", "physics"), "Скорость равна двадцать метров в секунду");
check("phys: 10 м/с2", N("Ускорение 10 м/с²", "physics"), "Ускорение десять метров в секунду в квадрате");
check("phys: -20 C", N("Температура −20 °C", "physics"), "Температура минус двадцать градусов по Цельсию");
check(
  "phys: гравитационная постоянная",
  N("6,7·10⁻¹¹ Н·м²/кг²", "physics"),
  "шесть целых семь десятых умножить на десять в минус одиннадцатой степени ньютон-метров в квадрате на килограмм в квадрате",
);
check("phys: скорость света", N("3 × 10^8 м/с", "physics"), "три умножить на десять в восьмой степени метров в секунду");
check("phys: 5 кг", N("масса 5 кг", "physics"), "масса пять килограммов");
check("phys: 20 K", N("температура 20 K", "physics"), "температура двадцать кельвинов");
check("phys: 5 A", N("сила тока 5 A", "physics"), "сила тока пять ампер");
check("phys: 100 км/ч", N("скорость 100 км/ч", "physics"), "скорость сто километров в час");

// =========================================================================
// 4. ХИМИЯ (§26)
// =========================================================================
check("chem: sp3", N("sp3", "chemistry"), "эс-пэ-три");
check("chem: sp2 superscript", N("sp²", "chemistry"), "эс-пэ-два");
check("chem: pH 7", N("pH 7", "chemistry"), "пэ-аш семь");
check("chem: pOH", N("pOH", "chemistry"), "пэ-о-аш");
check("chem: H2O", N("H2O", "chemistry"), "аш-два-о");
check("chem: C5H11OH", N("C5H11OH", "chemistry"), "цэ-пять-аш-одиннадцать-о-аш");
check("chem: H2SO4", N("H2SO4", "chemistry"), "аш-два-эс-о-четыре");
check("chem: Ca(OH)2", N("Ca(OH)2", "chemistry"), "цэ-а-о-аш-два");
check("chem: Al2(SO4)3", N("Al2(SO4)3", "chemistry"), "а-эль-два-эс-о-четыре-три");
check("chem: Ca2+", N("Ca2+", "chemistry"), "цэ-а-два плюс");
check("chem: SO4^2-", N("SO4^2-", "chemistry"), "эс-о-четыре-два минус");
check("chem: NaOH (no digits)", N("NaOH", "chemistry"), "эн-а-о-аш");
check("chem: reaction", N("2H2 + O2 → 2H2O", "chemistry"), "два аш-два плюс о-два образуется два аш-два-о");
check("chem: sp3d2", N("sp3d2", "chemistry"), "эс-пэ-три-дэ-два");

// =========================================================================
// 5. БИОЛОГИЯ (§26)
// =========================================================================
check("bio: ДНК", N("ДНК", "biology"), "дэ-эн-ка");
check("bio: АТФ", N("АТФ", "biology"), "а-тэ-эф");
check("bio: 2n=46", N("2n = 46", "biology"), "два эн равно сорок шесть");
check("bio: 2n4c", N("2n4c", "biology"), "два эн четыре цэ");
check("bio: AaBb", N("AaBb", "biology"), "а-а-бэ-бэ");
check("bio: AABB", N("AABB", "biology"), "а-а-бэ-бэ");

// =========================================================================
// 6. ИНФОРМАТИКА (§26)
// =========================================================================
check(
  "info: IP",
  N("192.168.0.1", "informatics"),
  "сто девяносто два точка сто шестьдесят восемь точка ноль точка один",
);
check("info: 2^10", N("2^10", "informatics"), "два в десятой степени");
check("info: 1024 Кбайт", N("1024 Кбайт", "informatics"), "одна тысяча двадцать четыре килобайта");
check("info: 100 Мбит/с", N("100 Мбит/с", "informatics"), "сто мегабит в секунду");
check("info: binary", N("101101₂", "informatics"), "один ноль один один ноль один в двоичной системе");
check("info: hex", N("A3F₁₆", "informatics"), "а три эф в шестнадцатеричной системе");
check("info: A AND B", N("A AND B", "informatics"), "а и бэ");
check("info: NOT A", N("NOT A", "informatics"), "не а");
check("info: TRUE/FALSE", N("TRUE OR FALSE", "informatics"), "истина или ложь");
checkTrue(
  "info: code fence readable (variables+operators spoken, not raw)",
  (() => {
    const out = N("```\nx = 1 + 2\n```", "informatics");
    return out.includes("равно") && out.includes("плюс") && out.includes("один") && out.includes("два");
  })(),
);

// =========================================================================
// 7. ИСТОРИЯ (§26)
// =========================================================================
check("hist: 1941-1945 гг.", N("1941–1945 гг.", "history"), "тысяча девятьсот сорок первого — тысяча девятьсот сорок пятого годов");
check("hist: XVIII век", N("XVIII век", "history"), "восемнадцатый век");
check("hist: initials", N("А. С. Пушкин", "history"), "а эс Пушкин");
check("hist: СССР", N("СССР", "history"), "эс-эс-эс-эр");
check("hist: РСФСР", N("РСФСР", "history"), "эр-эс-эф-эс-эр");
check("hist: 988 г.", N("Крещение Руси произошло в 988 г.", "history"), "Крещение Руси произошло в девятьсот восемьдесят восьмой год");

// =========================================================================
// 8. ГЕОГРАФИЯ (§26)
// =========================================================================
check("geo: с.ш.", N("55°45′ с. ш.", "geography"), "пятьдесят пять градусов сорок пять минут северной широты");
check("geo: в.д.", N("37°37′ в. д.", "geography"), "тридцать семь градусов тридцать семь минут восточной долготы");
check("geo: высота", N("5642 м", "geography"), "пять тысяч шестьсот сорок два метра");
check("geo: площадь", N("17,1 млн км²", "geography"), "семнадцать целых одна десятая миллиона квадратных километров");
check("geo: масштаб", N("1:100000", "geography"), "один к ста тысячам");

// =========================================================================
// 9. ОБЩЕСТВОЗНАНИЕ (§26)
// =========================================================================
check("soc: 15%", N("15%", "social"), "пятнадцать процентов");
check("soc: 2 млн руб.", N("2 млн руб.", "social"), "два миллиона рублей");
check("soc: ст. 15 РФ", N("ст. 15 Конституции РФ", "social"), "статья пятнадцать Конституции эр-эф");
check("soc: ч. 1 ст. 20", N("ч. 1 ст. 20", "social"), "часть одна статья двадцать");

// =========================================================================
// 10. ЛИТЕРАТУРА (§26)
// =========================================================================
check("lit: initials", N("Л. Н. Толстой", "literature"), "эль эн Толстой");
check("lit: XIX век", N("XIX век", "literature"), "девятнадцатый век");
check("lit: строки 5-10", N("строки 5–10", "literature"), "строки от пяти до десяти");

// =========================================================================
// 11. Общие числа (§1)
// =========================================================================
check("common: 0", N("Ответ: 0.", "russian"), "Ответ: ноль.");
check("common: 100", N("В классе 100 учеников.", "russian"), "В классе сто учеников.");
check("common: 1000+", N("Население — 15000 человек.", "geography"), "Население — пятнадцать тысяч человек.");
check("common: миллионы", N("2000000 рублей", "social"), "два миллиона рублей");

// =========================================================================
// 12. Сокращения/буквы (§19-21)
// =========================================================================
check("abbr: ЕГЭ как слово", N("ЕГЭ тренажёр", "russian"), "егэ тренажёр");
check("abbr: ОГЭ как слово", N("ОГЭ тренажёр", "russian"), "огэ тренажёр");
check("abbr: РФ по буквам", N("РФ", "social"), "эр-эф");
check("greek: alpha", N("α-частица", "physics"), "альфа-частица");
check("greek: delta uppercase", N("Δx", "physics"), "дельта икс");
check("latin var: y", N("y = 2x", "math"), "игрек равно два икс");

// =========================================================================
// 13. Safe fallback / диагностика (§22-23)
// =========================================================================
check("fallback: mixed token", safeFallbackForUnknownToken("Q7"), "ку-семь");
checkTrue("unsafe tokens empty for clean text", findUnsafeTtsTokens(N("Решаем задание 6", "russian")).length === 0);
checkTrue(
  "unsafe tokens empty for math example",
  findUnsafeTtsTokens(N("x² + 2x − 3 = 0", "math")).length === 0,
);
checkTrue(
  "unsafe tokens empty for chemistry example",
  findUnsafeTtsTokens(N("H2SO4", "chemistry")).length === 0,
);
checkTrue(
  "unsafe tokens empty for physics scientific notation",
  findUnsafeTtsTokens(N("3 × 10^8 м/с", "physics")).length === 0,
);
check("normalizer version", TTS_NORMALIZER_VERSION, "2.0");

// =========================================================================
// 14. Определение предмета по строке
// =========================================================================
check("subject: русский язык", subjectKeyFromText("в ЕГЭ по русскому языку"), "russian");
check("subject: профильная математика", subjectKeyFromText("профильная математика"), "math");
check("subject: физика", subjectKeyFromText("физика"), "physics");
check("subject: химия", subjectKeyFromText("в ЕГЭ по химии"), "chemistry");
check("subject: биология", subjectKeyFromText("биология"), "biology");
check("subject: информатика", subjectKeyFromText("информатика"), "informatics");
check("subject: история", subjectKeyFromText("история"), "history");
check("subject: география", subjectKeyFromText("география"), "geography");
check("subject: обществознание", subjectKeyFromText("обществознание"), "social");
check("subject: литература", subjectKeyFromText("литература"), "literature");
check("subject: неизвестный -> unknown", subjectKeyFromText("испанский язык"), "unknown");

// =========================================================================
// 15. РЕГРЕССИОННЫЕ ТЕСТЫ (§27)
// =========================================================================
{
  const original = "Решаем задание 6 из ОГЭ по русскому языку.";
  const originalCopy = String(original);
  N(original, "russian");
  check("regression: исходная строка не мутируется", original, originalCopy);
}
{
  // normalizeCommon — чистая функция: один и тот же вход даёт один и тот же выход.
  const a = normalizeCommon("В 2008 году произошло 15 событий.");
  const b = normalizeCommon("В 2008 году произошло 15 событий.");
  check("regression: normalizeCommon детерминирована", a, b);
}
check(
  "regression: не осталось цифр в обычном предложении",
  /\d/.test(N("В 2008 году было 15 заданий.", "russian")),
  false,
);
check(
  "regression: явное указание subject как ключа работает так же, как строка",
  N("H2O", "chemistry"),
  N("H2O", "в ЕГЭ по химии"),
);

// Полный пример с фиксированным порядком: вступление → условие → объяснение
// → «Ответ:» → CTA — нормализация не должна путать маркеры сегментации.
{
  const full =
    "Решаем задание 6 по русскому языку из приложения «ЕГЭ Тренажёр». " +
    "Спустя 15 минут после старта он подошёл к (СВОЙ) мотоциклу и завёл двигатель. " +
    "Местоимение согласуется с существительным в женском роде и дательном падеже, поэтому нужна форма своей. " +
    "Ответ: своей. Скачивай бесплатно. Ссылка в шапке профиля.";
  const normalized = N(full, "russian");
  checkTrue("full example: содержит 'шесть'", normalized.includes("шесть"));
  checkTrue("full example: содержит 'пятнадцать'", normalized.includes("пятнадцать"));
  checkTrue("full example: маркер 'Ответ:' сохранён", normalized.includes("Ответ:"));
  checkTrue("full example: CTA-маркер сохранён", normalized.includes("Скачивай бесплатно"));
  checkTrue("full example: нет голых цифр", !/\d/.test(normalized));
}

if (failed > 0) {
  console.error(`\nПровалено: ${failed}. Пройдено: ${passed}.`);
  process.exit(1);
} else {
  console.log(`Все тесты пройдены (${passed}).`);
}
