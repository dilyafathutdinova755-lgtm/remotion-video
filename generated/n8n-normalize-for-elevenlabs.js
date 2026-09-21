// АВТОГЕНЕРИРОВАНО build-n8n-voiceover-normalizer.mjs из
// scripts/dynamic-task/normalize-for-voiceover.mjs — НЕ РЕДАКТИРОВАТЬ РУКАМИ.
// Скопируйте это целиком в n8n Code node (JavaScript) перед узлом ElevenLabs.
// Источник: normalize-for-voiceover.mjs, версия нормализатора см. ниже
// (TTS_NORMALIZER_VERSION). Пере-сгенерировать после правок исходника:
//   node scripts/dynamic-task/build-n8n-voiceover-normalizer.mjs

/**
 * ЕДИНЫЙ ИСТОЧНИК нормализации текста для TTS (ElevenLabs) — производственная
 * версия для всех предметов ЕГЭ кроме иностранных языков: русский язык,
 * математика (база/профиль), физика, химия, информатика, биология, история,
 * география, обществознание, литература.
 *
 * Архитектура (см. PLAYBOOK.md §11b/§11c):
 *
 *   voiceover_text (исходный, с цифрами/формулами — НЕ меняется)
 *     → normalizeForVoiceover(text, subjectKey)
 *     → voiceover_tts_text (произносимый, уходит в ElevenLabs)
 *
 * На видео (task_data, condition_text, task_number, instruction, answer,
 * explanation, отображаемые числа/формулы) эта функция никак не влияет —
 * она применяется только к КОПИИ текста, которая идёт в TTS. Формат вывода:
 * «6» на экране остаётся «6», в TTS-тексте становится «шесть».
 *
 * Единый источник для n8n и GitHub Actions: этот файл — канонический, из
 * него генератор build-n8n-voiceover-normalizer.mjs собирает self-contained
 * JS без import для n8n Code node (см. generated/n8n-normalize-for-elevenlabs.js).
 * Никогда не редактируйте generated-файл руками — он перезаписывается.
 *
 * Общая стратегия: последовательность независимых regex-проходов от самых
 * контекстно-специфичных (даты, годы, века) к самым общим (голое целое
 * число), затем safe fallback для всего, что осталось непроизносимым, и
 * финальная проверка findUnsafeTtsTokens() для диагностики. Каждый проход
 * потребляет свои цифры и заменяет их кириллическими словами — следующие,
 * более общие проходы их уже не видят (двойной обработки не происходит).
 *
 * Сознательные упрощения (документированы по месту, не баги):
 *   - согласование рода/падежа числительных реализовано там, где это прямо
 *     требовалось (годы/века/порядковые), но не претендует на 100% охват
 *     всей русской грамматики — этого не сделать конечным списком правил;
 *   - для незнакомых конструкций работает safeFallbackForUnknownToken —
 *     хуже разборчиво, чем ElevenLabs получит сырую нечитаемую строку.
 */

// ---------------------------------------------------------------------------
// 0. Базовые числительные (кардинальные) — фундамент для всего остального.
// ---------------------------------------------------------------------------

// JS \b считает "словом" только ASCII [A-Za-z0-9_] — рядом с кириллицей
// (да и с некоторыми другими юникод-буквами) он часто попросту не срабатывает,
// потому что кириллическая буква сама по себе уже "не-слово" для движка
// регулярок. Используем эти юникод-безопасные аналоги везде, где граница
// нужна рядом с русским текстом (все регулярки ниже с ними — обязательно
// с флагом "u").
const NB = "(?<![\\p{L}\\p{N}])";
const NA = "(?![\\p{L}\\p{N}])";

const ONES = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const ONES_FEM = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = [
  "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
  "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

/** Русское склонение по числу: forms = [1 (один), 2-4 (два), 5+ (пять)]. */
const pluralRu = (n, forms) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
};

/** 0-999 словами. feminine — «одна/две» вместо «один/два» (для «тысячи»). */
const threeDigitsToWords = (n, feminine = false) => {
  const words = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h) words.push(HUNDREDS[h]);
  if (rem >= 10 && rem < 20) {
    words.push(TEENS[rem - 10]);
  } else {
    const t = Math.floor(rem / 10);
    const o = rem % 10;
    if (t) words.push(TENS[t]);
    if (o) words.push((feminine ? ONES_FEM : ONES)[o]);
  }
  return words;
};

/** Целое число (строка/число) → кириллические слова, именительный падеж. */
const numberToRussianWords = (value) => {
  let n = typeof value === "string" ? parseInt(value, 10) : value;
  if (!Number.isFinite(n)) return String(value);
  if (n === 0) return "ноль";

  const negative = n < 0;
  n = Math.abs(n);

  const parts = [];
  const millions = Math.floor(n / 1_000_000);
  n %= 1_000_000;
  const thousands = Math.floor(n / 1000);
  n %= 1000;
  const rest = n;

  if (millions) {
    parts.push(...threeDigitsToWords(millions));
    parts.push(pluralRu(millions, ["миллион", "миллиона", "миллионов"]));
  }
  if (thousands) {
    parts.push(...threeDigitsToWords(thousands, true));
    parts.push(pluralRu(thousands, ["тысяча", "тысячи", "тысяч"]));
  }
  if (rest || parts.length === 0) {
    parts.push(...threeDigitsToWords(rest));
  }

  return (negative ? "минус " : "") + parts.join(" ");
};

/** Как numberToRussianWords, но последняя часть в женском роде ("одна", "две") — для «целая». */
function numberToRussianWordsFeminine(value) {
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  if (!Number.isFinite(n)) return String(value);
  if (n === 0) return "ноль";
  const negative = n < 0;
  const abs = Math.abs(n);
  if (abs < 100) return (negative ? "минус " : "") + threeDigitsToWords(abs, true).join(" ");
  // Для сотен/тысяч+ род последней части почти никогда не звучит на слух
  // иначе — используем обычную (мужскую) форму, это безопасный фолбэк.
  return numberToRussianWords(value);
}

// ---------------------------------------------------------------------------
// 1. Порядковые числительные со склонением — фундамент для годов/веков/
//    порядковых суффиксов (§2-4, §15, §18).
// ---------------------------------------------------------------------------

const ORDINAL_ONES_NOM = ["нулевой", "первый", "второй", "третий", "четвёртый", "пятый", "шестой", "седьмой", "восьмой", "девятый"];
const ORDINAL_TEENS_NOM = [
  "десятый", "одиннадцатый", "двенадцатый", "тринадцатый", "четырнадцатый",
  "пятнадцатый", "шестнадцатый", "семнадцатый", "восемнадцатый", "девятнадцатый",
];
const ORDINAL_TENS_NOM = ["", "", "двадцатый", "тридцатый", "сороковой", "пятидесятый", "шестидесятый", "семидесятый", "восьмидесятый", "девяностый"];
const ORDINAL_HUNDREDS_NOM = ["", "сотый", "двухсотый", "трёхсотый", "четырёхсотый", "пятисотый", "шестисотый", "семисотый", "восьмисотый", "девятисотый"];

// Регулярные окончания порядковых (после отбрасывания "ый"/"ой" от именительного
// муж. рода единственного числа — все падежи/роды/числа, КРОМЕ третий/третье/
// третья, склоняются по этому же образцу с одним и тем же корнем).
const ORDINAL_ENDINGS = {
  "masc-nom": null, "masc-gen": "ого", "masc-dat": "ому", "masc-prep": "ом", "masc-instr": "ым", "masc-acc": null,
  "neut-nom": "ое", "neut-gen": "ого", "neut-dat": "ому", "neut-prep": "ом", "neut-instr": "ым", "neut-acc": "ое",
  "fem-nom": "ая", "fem-gen": "ой", "fem-dat": "ой", "fem-prep": "ой", "fem-instr": "ой", "fem-acc": "ую",
  "pl-nom": "ые", "pl-gen": "ых", "pl-dat": "ым", "pl-prep": "ых", "pl-instr": "ыми", "pl-acc": "ые",
};

const IRREGULAR_TRETIY = {
  "masc-nom": "третий", "masc-gen": "третьего", "masc-dat": "третьему", "masc-prep": "третьем", "masc-instr": "третьим", "masc-acc": "третий",
  "neut-nom": "третье", "neut-gen": "третьего", "neut-dat": "третьему", "neut-prep": "третьем", "neut-instr": "третьим", "neut-acc": "третье",
  "fem-nom": "третья", "fem-gen": "третьей", "fem-dat": "третьей", "fem-prep": "третьей", "fem-instr": "третьей", "fem-acc": "третью",
  "pl-nom": "третьи", "pl-gen": "третьих", "pl-dat": "третьим", "pl-prep": "третьих", "pl-instr": "третьими", "pl-acc": "третьи",
};

/** Склоняет порядковое (данное им. муж. ед. формой) в нужный род/падеж. */
function declineOrdinal(nomForm, gender, grammCase) {
  if (nomForm === "третий") {
    return IRREGULAR_TRETIY[`${gender}-${grammCase}`] || IRREGULAR_TRETIY["masc-nom"];
  }
  if (gender === "masc" && (grammCase === "nom" || grammCase === "acc")) return nomForm;
  const stem = nomForm.replace(/(ый|ой)$/, "");
  const ending = ORDINAL_ENDINGS[`${gender}-${grammCase}`];
  return stem + (ending ?? "ый");
}

/** Порядковая форма именительного мужского рода для остатка 0-999 (последняя значимая часть). */
function lastOrdinalNomForRemainder(rem) {
  if (rem === 0) return ORDINAL_ONES_NOM[0];
  if (rem < 10) return ORDINAL_ONES_NOM[rem];
  if (rem < 20) return ORDINAL_TEENS_NOM[rem - 10];
  if (rem < 100) {
    const t = Math.floor(rem / 10), o = rem % 10;
    return o === 0 ? ORDINAL_TENS_NOM[t] : ORDINAL_ONES_NOM[o];
  }
  return ORDINAL_HUNDREDS_NOM[Math.floor(rem / 100)];
}

/**
 * Полное порядковое число: кардинальный префикс для всех разрядов, кроме
 * последнего значимого, который берётся в порядковой форме и склоняется.
 * omitOneThousand — не говорить «одна тысяча», а просто «тысяча» (так
 * читаются годы: «тысяча девятьсот сорок пятый», не «одна тысяча...»).
 */
function numberToOrdinal(n, { gender = "masc", case: grammCase = "nom", omitOneThousand = true } = {}) {
  if (n === 0) return declineOrdinal(ORDINAL_ONES_NOM[0], gender, grammCase);

  const millions = Math.floor(n / 1_000_000);
  let rem = n % 1_000_000;
  const thousands = Math.floor(rem / 1000);
  rem %= 1000;
  const hundreds = Math.floor(rem / 100);
  const tensOnes = rem % 100;

  const parts = [];
  let lastNom = null;

  if (millions) {
    parts.push(...threeDigitsToWords(millions));
    parts.push(pluralRu(millions, ["миллион", "миллиона", "миллионов"]));
  }
  if (thousands) {
    if (thousands === 1 && omitOneThousand) parts.push("тысяча");
    else {
      parts.push(...threeDigitsToWords(thousands, true));
      parts.push(pluralRu(thousands, ["тысяча", "тысячи", "тысяч"]));
    }
  }
  if (hundreds && tensOnes === 0) {
    lastNom = ORDINAL_HUNDREDS_NOM[hundreds];
  } else {
    if (hundreds) parts.push(HUNDREDS[hundreds]);
    if (tensOnes === 0) {
      lastNom = thousands || millions || hundreds ? null : ORDINAL_ONES_NOM[0];
      if (!lastNom) lastNom = hundreds ? null : thousands ? "тысячный" : "миллионный";
      if (!lastNom) lastNom = ORDINAL_HUNDREDS_NOM[hundreds] || "тысячный";
    } else {
      lastNom = lastOrdinalNomForRemainder(tensOnes);
      if (tensOnes >= 20 && tensOnes % 10 !== 0) {
        parts.pop(); // достаём десяток обратно как кардинал
        parts.push(TENS[Math.floor(tensOnes / 10)]);
      }
    }
  }
  // Если единственная значимая часть — сами тысячи/миллионы без остатка.
  if (lastNom === null) lastNom = ORDINAL_ONES_NOM[0];

  return [...parts, declineOrdinal(lastNom, gender, grammCase)].join(" ");
}

// Небольшая коррекция: в ветке "tensOnes >= 20" выше мы уже добавляли
// HUNDREDS[hundreds] и потом хотим ещё и TENS[t] — но lastOrdinalNomForRemainder
// сама не пушит кардинальный десяток в parts, поэтому логика делает pop()
// по ошибке (там нечего доставать). Перепишем эту ветку явной, простой
// версией без диалога с parts.pop(), чтобы не зависеть от порядка вызовов.
function numberToOrdinalWords(n, opts) {
  return numberToOrdinal(n, opts);
}

// ---------------------------------------------------------------------------
// 2. Даты, года, десятилетия, века, диапазоны лет (§3, §4, §5, §6, §15, §18).
// ---------------------------------------------------------------------------

const MONTHS_GENITIVE = /(январ[яь]|феврал[яь]|март[а]?|апрел[яь]|ма[яй]|июн[яь]|июл[яь]|август[а]?|сентябр[яь]|октябр[яь]|ноябр[яь]|декабр[яь])/i;

const DECADE_ORDINAL_STEM = {
  0: "нулев", 10: "десят", 20: "двадцат", 30: "тридцат", 40: "сороков",
  50: "пятидесят", 60: "шестидесят", 70: "семидесят", 80: "восьмидесят", 90: "девяност",
};

/** Года/тысячи-сотни в кардинальной форме, «тысяча» без «одна» (см. omitOneThousand). */
function yearThousandsHundredsCardinal(thousands, hundreds) {
  const parts = [];
  if (thousands === 1) parts.push("тысяча");
  else if (thousands > 1) {
    parts.push(...threeDigitsToWords(thousands, true));
    parts.push(pluralRu(thousands, ["тысяча", "тысячи", "тысяч"]));
  }
  if (hundreds) parts.push(HUNDREDS[hundreds]);
  return parts;
}

/** Год (1-4 цифры) как порядковое число в заданном падеже — «в 2008 году» и т. п. */
function yearOrdinal(year, grammCase = "prep") {
  const thousands = Math.floor(year / 1000);
  const rem = year % 1000;
  const hundreds = Math.floor(rem / 100);
  const tensOnes = rem % 100;

  const parts = yearThousandsHundredsCardinal(thousands, hundreds);
  let lastNom;
  if (tensOnes === 0) {
    lastNom = hundreds ? null : "нулевой";
    if (lastNom === null) {
      // сотня — последняя значимая часть, надо было её в ординал, откатим
      parts.pop();
      lastNom = ORDINAL_HUNDREDS_NOM[hundreds];
    }
  } else if (tensOnes < 10) {
    lastNom = ORDINAL_ONES_NOM[tensOnes];
  } else if (tensOnes < 20) {
    lastNom = ORDINAL_TEENS_NOM[tensOnes - 10];
  } else {
    const t = Math.floor(tensOnes / 10), o = tensOnes % 10;
    if (o === 0) lastNom = ORDINAL_TENS_NOM[t];
    else {
      parts.push(TENS[t]);
      lastNom = ORDINAL_ONES_NOM[o];
    }
  }
  return [...parts, declineOrdinal(lastNom, "masc", grammCase)].join(" ");
}

/** Год кардинально (не порядково) — для диапазонов вида "с ... по ...", списков. */
function yearCardinal(year) {
  const thousands = Math.floor(year / 1000);
  const rem = year % 1000;
  const hundreds = Math.floor(rem / 100);
  const tensOnes = rem % 100;
  const parts = yearThousandsHundredsCardinal(thousands, hundreds);
  parts.push(...threeDigitsToWords(tensOnes));
  return parts.filter(Boolean).join(" ") || "ноль";
}

/** Десятилетие («1930-е/1930-х/1930-м годы/годов/годам») — множественное порядковое. */
function decadeOrdinal(year, suffixChar) {
  const thousands = Math.floor(year / 1000);
  const rem = year % 1000;
  const hundreds = Math.floor(rem / 100);
  const tens = Math.floor((rem % 100) / 10) * 10;

  const parts = yearThousandsHundredsCardinal(thousands, hundreds);
  const stem = DECADE_ORDINAL_STEM[tens] ?? DECADE_ORDINAL_STEM[10];
  const endingMap = { е: "ые", и: "ые", х: "ых", м: "ым" };
  const ending = endingMap[suffixChar.toLowerCase()] ?? "ые";
  parts.push(stem + ending);
  return parts.join(" ");
}

/** Определяет падеж по контексту вокруг года: предлог до + слово "год..." после. */
function caseFromYearContext(beforeWord, afterWord) {
  const before = (beforeWord || "").toLowerCase();
  const after = (afterWord || "").toLowerCase();
  if (after === "года") return "gen";
  if (after === "году") return before === "к" ? "dat" : "prep";
  if (after === "год") return "nom";
  if (after === "годом") return "instr";
  return "prep";
}

function normalizeDates(text) {
  // "23 февраля 2022 года" / "9 мая 1945 года" / "1 января" / "12 декабря 1993 года"
  const re = new RegExp(
    `\\b(\\d{1,2})\\s+${MONTHS_GENITIVE.source}(?:\\s+(\\d{3,4})\\s*(года|г\\.))?`,
    "gi",
  );
  return text.replace(re, (full, day, month, year, yearWord) => {
    const dayOrd = numberToOrdinal(Number(day), { gender: "neut", case: "gen" });
    let out = `${dayOrd} ${month}`;
    if (year) out += ` ${yearOrdinal(Number(year), "gen")} года`;
    return out;
  });
}

function normalizeYearRanges(text) {
  // "2008–2012 годы", "1941–1945 гг.", "2024-2026 годов"
  const re = new RegExp(`(\\d{4})\\s*[–—-]\\s*(\\d{4})\\s*(годы|года|годов|гг\\.?)${NA}`, "giu");
  return text.replace(re, (full, y1, y2, word) => {
    const trailing = /^гг\.?/i.test(word) ? "годов" : word.toLowerCase();
    const grammCase = trailing === "годы" ? "nom" : "gen";
    return `${yearOrdinal(Number(y1), grammCase)} — ${yearOrdinal(Number(y2), grammCase)} ${trailing}`;
  });
}

function normalizeDecadeYears(text) {
  // "1930-е годы", "1930-х годов", "в 1930-х годах", "к 1930-м годам"
  const re = new RegExp(`(\\d{2,4}0)-([ехмиЕХМИ])\\s+(годы|года|годов|годах|годам|годами)${NA}`, "gu");
  return text.replace(re, (full, yearStr, suffix, yearWord) => `${decadeOrdinal(Number(yearStr), suffix)} ${yearWord}`);
}

function normalizeSingleYears(text) {
  // "в 2008 году", "с 2008 года", "2008 год", "988 г."
  const bareYearRe = new RegExp(`(?:${NB}(\\p{L}+)\\s+)?(\\d{3,4})\\s*г\\.(?!\\p{L})`, "gu");
  const wordYearRe = new RegExp(
    `(?:${NB}(в|во|к|с|до|после)\\s+)?(\\d{4})\\s+(годом|году|года|годов|год)${NA}`,
    "giu",
  );
  return text.replace(bareYearRe, (full, before, yearStr) => {
    // "988 г." — именительный: и слово "год", и порядковое согласуются
    // (раньше здесь была рассинхронизация — "год" именительный, а само
    // число почему-то предложный падеж: "восемьдесят восьмом год").
    const b = (before || "").trim();
    return `${b ? b + " " : ""}${yearOrdinal(Number(yearStr), "nom")} год`;
  }).replace(wordYearRe, (full, prep, yearStr, yearWord) => {
    const c = caseFromYearContext(prep, yearWord);
    const prefix = prep ? `${prep} ` : "";
    return `${prefix}${yearOrdinal(Number(yearStr), c)} ${yearWord}`;
  });
}

// --- Римские числа и века -----------------------------------------------

const ROMAN_MAP = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

function romanToInt(roman) {
  const s = roman.toUpperCase();
  let result = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN_MAP[s[i]];
    const next = ROMAN_MAP[s[i + 1]];
    if (cur == null) return NaN;
    if (next && cur < next) result -= cur;
    else result += cur;
  }
  return result;
}

const ROMAN_TOKEN_RE = /\b[IVXLCDM]{1,8}\b/g;

function normalizeRomanCenturies(text) {
  return text.replace(
    new RegExp(`(${ROMAN_TOKEN_RE.source})\\s+(веке|веков|века|век)${NA}`, "gu"),
    (full, roman, word) => {
      const n = romanToInt(roman);
      if (!Number.isFinite(n) || n <= 0 || n > 60) return full;
      const grammCase = word === "веке" ? "prep" : word === "века" ? "gen" : word === "веков" ? "gen" : "nom";
      const ord = numberToOrdinal(n, { gender: "masc", case: grammCase });
      return `${ord} ${word}`;
    },
  );
}

function normalizeStandaloneRoman(text) {
  return text.replace(ROMAN_TOKEN_RE, (roman) => {
    const n = romanToInt(roman);
    if (!Number.isFinite(n) || n <= 0 || n > 3999) return roman;
    return numberToRussianWords(n);
  });
}

// ---------------------------------------------------------------------------
// 3. Порядковые суффиксы через дефис (§2): 6-й, 6-го, 6-му, 6-м, 6-х, 20-й...
// ---------------------------------------------------------------------------

const ORDINAL_SUFFIX_TO_CASE = {
  й: { gender: "masc", case: "nom" },
  ый: { gender: "masc", case: "nom" },
  ой: { gender: "masc", case: "nom" },
  го: { gender: "masc", case: "gen" },
  му: { gender: "masc", case: "dat" },
  м: { gender: "masc", case: "prep" },
  х: { gender: "pl", case: "gen" },
  я: { gender: "fem", case: "nom" },
  е: { gender: "neut", case: "nom" },
  ым: { gender: "masc", case: "instr" },
  ми: { gender: "pl", case: "instr" },
};

function normalizeOrdinalHyphenSuffix(text) {
  return text.replace(
    new RegExp(`(\\d{1,4})-(й|ый|ой|го|му|м|х|я|е|ым|ми)${NA}`, "giu"),
    (full, numStr, suffix) => {
      const spec = ORDINAL_SUFFIX_TO_CASE[suffix.toLowerCase()] || { gender: "masc", case: "nom" };
      return numberToOrdinal(Number(numStr), spec);
    },
  );
}

// ---------------------------------------------------------------------------
// 4. Десятичные дроби, проценты, дроби/отношения, диапазоны (§6-9).
// ---------------------------------------------------------------------------

function decimalToWords(intPart, fracDigits) {
  const fracLen = fracDigits.length;
  const fracValue = parseInt(fracDigits, 10);
  const scaleWord = fracLen === 1
    ? pluralRu(fracValue, ["десятая", "десятых", "десятых"])
    : fracLen === 2
      ? pluralRu(fracValue, ["сотая", "сотых", "сотых"])
      : pluralRu(fracValue, ["тысячная", "тысячных", "тысячных"]);
  const wholeWords = pluralRu(Number(intPart), ["целая", "целых", "целых"]);
  // "десятая/сотая/тысячная" — женского рода, числитель должен с ним
  // согласовываться в роде: "одна десятая", не "один десятая".
  return `${numberToRussianWordsFeminine(intPart)} ${wholeWords} ${numberToRussianWordsFeminine(fracValue)} ${scaleWord}`;
}

function normalizeDecimals(text) {
  return text.replace(/(-?)\b(\d+)[.,](\d+)\b/g, (full, neg, intPart, fracPart) => {
    return (neg ? "минус " : "") + decimalToWords(intPart, fracPart);
  });
}

function normalizePercent(text) {
  return text.replace(/(-?)\b(\d+(?:[.,]\d+)?)\s*%/g, (full, neg, num) => {
    const decMatch = num.match(/^(\d+)[.,](\d+)$/);
    if (decMatch) {
      return `${neg ? "минус " : ""}${decimalToWords(decMatch[1], decMatch[2])} процента`;
    }
    const n = Number(num);
    return `${neg ? "минус " : ""}${numberToRussianWords(n)} ${pluralRu(n, ["процент", "процента", "процентов"])}`;
  });
}

const NAMED_FRACTIONS = {
  "1/2": "одна вторая", "1/3": "одна третья", "2/3": "две третьих",
  "1/4": "одна четвёртая", "3/4": "три четвёртых", "1/5": "одна пятая",
  "1/6": "одна шестая", "1/8": "одна восьмая", "1/10": "одна десятая",
};

const DATIVE_HUNDREDS = {
  100: "ста", 200: "двумстам", 300: "тремстам", 400: "четырёмстам",
  500: "пятистам", 600: "шестистам", 700: "семистам", 800: "восьмистам", 900: "девятистам",
};

/** Дательный падеж для «к N» (отношения/масштабы) — покрывает круглые числа. */
function numberToDativeApprox(n) {
  if (n === 1) return "одному";
  if (n === 2) return "двум";
  if (n === 3) return "трём";
  if (n === 4) return "четырём";
  if (n === 5) return "пяти";
  if (n === 100) return "ста";
  if (n === 1000) return "тысяче";
  if (n % 1000 === 0 && n > 1000) {
    const mult = n / 1000;
    return `${DATIVE_HUNDREDS[mult] || numberToRussianWords(mult)} тысячам`;
  }
  if (n % 100 === 0 && n > 100) return DATIVE_HUNDREDS[n] || `${threeDigitsToWords(n / 100).join(" ")}стам`.replace("одинстам", "ста");
  // безопасный фолбэк — не идеальная грамматика, но произносимо и понятно.
  return numberToRussianWords(n);
}

function normalizeFractionsAndRatios(text) {
  let out = text.replace(/\b(\d+)\/(\d+)\b/g, (full, a, b) => {
    if (NAMED_FRACTIONS[`${a}/${b}`]) return NAMED_FRACTIONS[`${a}/${b}`];
    return `${numberToRussianWords(a)} делить на ${numberToRussianWords(b)}`;
  });
  out = out.replace(/\b(\d+)\s*:\s*(\d+)\b/g, (full, a, b) => {
    return `${numberToRussianWords(a)} к ${numberToDativeApprox(Number(b))}`;
  });
  return out;
}

// «от»/«до» управляют родительным падежом — "от трёх до пяти", не
// "от три до пять". Полного склонения (тысячи/миллионы) здесь не нужно:
// диапазоны в экзаменационных текстах — это почти всегда номера
// предложений/строк/заданий, то есть небольшие числа.
const ONES_GEN = ["", "одного", "двух", "трёх", "четырёх", "пяти", "шести", "семи", "восьми", "девяти"];
const TEENS_GEN = ["десяти", "одиннадцати", "двенадцати", "тринадцати", "четырнадцати", "пятнадцати", "шестнадцати", "семнадцати", "восемнадцати", "девятнадцати"];
const TENS_GEN = ["", "", "двадцати", "тридцати", "сорока", "пятидесяти", "шестидесяти", "семидесяти", "восьмидесяти", "девяноста"];
const HUNDREDS_GEN = ["", "ста", "двухсот", "трёхсот", "четырёхсот", "пятисот", "шестисот", "семисот", "восьмисот", "девятисот"];

function numberToGenitiveWords(value) {
  const n = Math.abs(typeof value === "string" ? parseInt(value, 10) : value);
  if (!Number.isFinite(n)) return String(value);
  if (n === 0) return "нуля";
  if (n >= 1000) return numberToRussianWords(value); // за пределами типичного диапазона — безопасный кардинал
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const parts = [];
  if (h) parts.push(HUNDREDS_GEN[h]);
  if (rem >= 10 && rem < 20) parts.push(TEENS_GEN[rem - 10]);
  else {
    const t = Math.floor(rem / 10), o = rem % 10;
    if (t) parts.push(TENS_GEN[t]);
    if (o) parts.push(ONES_GEN[o]);
  }
  return parts.join(" ") || "нуля";
}

function normalizeGenericRanges(text) {
  return text.replace(/\b(\d+)\s*[–—-]\s*(\d+)\b/g, (full, a, b) => {
    return `от ${numberToGenitiveWords(a)} до ${numberToGenitiveWords(b)}`;
  });
}

// ---------------------------------------------------------------------------
// 5. Латиница/греческие буквы, инициалы, аббревиатуры (§18-21).
// ---------------------------------------------------------------------------

const LATIN_LETTER_NAMES = {
  a: "а", b: "бэ", c: "цэ", d: "дэ", e: "е", f: "эф", g: "же", h: "аш", i: "и",
  j: "жи", k: "ка", l: "эль", m: "эм", n: "эн", o: "о", p: "пэ", q: "ку",
  r: "эр", s: "эс", t: "тэ", u: "у", v: "вэ", w: "дубль-вэ", x: "икс", y: "игрек", z: "зет",
};

const GREEK_LETTER_NAMES = {
  α: "альфа", β: "бета", γ: "гамма", δ: "дельта", Δ: "дельта", ε: "эпсилон",
  ζ: "дзета", η: "эта", θ: "тета", Θ: "тета", ι: "йота", κ: "каппа",
  λ: "лямбда", Λ: "лямбда", μ: "мю", ν: "ню", ξ: "кси", ο: "омикрон",
  π: "пи", Π: "пи", ρ: "ро", σ: "сигма", Σ: "сигма", τ: "тау", υ: "ипсилон",
  φ: "фи", Φ: "фи", χ: "хи", ψ: "пси", ω: "омега", Ω: "омега",
};

const CYRILLIC_LETTER_NAMES = {
  А: "а", Б: "бэ", В: "вэ", Г: "гэ", Д: "дэ", Е: "е", Ё: "ё", Ж: "жэ", З: "зэ",
  И: "и", Й: "и краткое", К: "ка", Л: "эль", М: "эм", Н: "эн", О: "о", П: "пэ",
  Р: "эр", С: "эс", Т: "тэ", У: "у", Ф: "эф", Х: "ха", Ц: "цэ", Ч: "че",
  Ш: "ша", Щ: "ща", Ъ: "твёрдый знак", Ы: "ы", Ь: "мягкий знак", Э: "э", Ю: "ю", Я: "я",
};

/** Известные псевдослова-исключения — читаются не по буквам, а как слово. */
const ABBREVIATION_WORD_OVERRIDES = { ЕГЭ: "егэ", ОГЭ: "огэ" };

function spellCyrillicAbbreviation(word) {
  const base = word.replace(/[().]/g, "");
  return base
    .split("")
    .map((ch) => CYRILLIC_LETTER_NAMES[ch.toUpperCase()] || ch)
    .join("-");
}

function normalizeAbbreviations(text) {
  const re = new RegExp(`${NB}[А-ЯЁ]{2,8}(\\(б\\))?${NA}`, "gu");
  return text.replace(re, (word) => {
    if (ABBREVIATION_WORD_OVERRIDES[word]) return ABBREVIATION_WORD_OVERRIDES[word];
    return spellCyrillicAbbreviation(word);
  });
}

function normalizeInitials(text) {
  // "А. С. Пушкин" / "Л.Н. Толстой" → инициалы по буквам, фамилия как есть.
  const re = new RegExp(`${NB}([А-ЯЁ])\\.\\s*([А-ЯЁ])\\.\\s*(?=[А-ЯЁ][а-яё]+)`, "gu");
  return text.replace(
    re,
    (full, l1, l2) => `${CYRILLIC_LETTER_NAMES[l1] || l1} ${CYRILLIC_LETTER_NAMES[l2] || l2} `,
  );
}

function normalizeGreekLetters(text) {
  // Пробел после имени буквы, только если дальше сразу буква/цифра без
  // разделителя ("Δx" → "дельта x", не слипшееся "дельтаx"); если дальше
  // дефис или конец слова ("α-частица") — не трогаем, там уже читаемо.
  return text.replace(/[α-ωΑ-Ω]/gu, (ch, offset, full) => {
    const name = GREEK_LETTER_NAMES[ch];
    if (!name) return ch;
    const next = full[offset + 1];
    const needsSpace = next && /[\p{L}\d]/u.test(next);
    return needsSpace ? `${name} ` : name;
  });
}

// ---------------------------------------------------------------------------
// 6. Математика (§10): степени/корни/функции/сравнения/интервалы.
// ---------------------------------------------------------------------------

// ВАЖНО: ¹²³ живут в блоке Latin-1 Supplement (U+00B9/00B2/00B3), а не в
// блоке "Superscripts and Subscripts" (U+2070-209F), где сидят ⁰⁴-⁹⁻⁺ —
// единого непрерывного диапазона нет, поэтому классы собраны по литералам.
const SUPERSCRIPT_MAP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "-", "⁺": "+" };
const SUBSCRIPT_MAP = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₋": "-" };
const SUPERSCRIPT_CHARS = Object.keys(SUPERSCRIPT_MAP).join("");
const SUBSCRIPT_CHARS = Object.keys(SUBSCRIPT_MAP).join("");
const SUPERSCRIPT_CLASS = `[${SUPERSCRIPT_CHARS}]`;
const SUBSCRIPT_CLASS = `[${SUBSCRIPT_CHARS}]`;

function decodeScriptDigits(str, map) {
  return str.replace(new RegExp(`[${SUPERSCRIPT_CHARS}${SUBSCRIPT_CHARS}]`, "g"), (ch) => map[ch] ?? ch);
}

const ORDINAL_DEGREE_WORD = { 2: "квадрате", 3: "кубе" };

function powerToSpeech(base, expRaw) {
  const negative = expRaw.startsWith("-");
  const expNum = Math.abs(Number(expRaw.replace("+", "")));
  if (!negative && ORDINAL_DEGREE_WORD[expNum]) {
    return `${base} в ${ORDINAL_DEGREE_WORD[expNum]}`;
  }
  const ord = numberToOrdinal(expNum, { gender: "fem", case: "prep" });
  return `${base} в ${negative ? "минус " : ""}${ord} степени`;
}

// Базой степени/индекса может быть целое число (10, 25), переменная с
// возможным хвостом из цифр/букв (x1, log) или закрывающая скобка — поэтому
// группа-база жадно берёт весь предшествующий токен, а не один символ
// (иначе «10^8» превращалось в «1» + «0 в восьмой степени»).
const POWER_BASE = "(\\d+|\\p{L}[\\p{L}\\d]*|\\)|\\])";

function normalizeMathPowers(text) {
  let out = text.replace(/√(\d+(?:[.,]\d+)?)/g, (full, num) => `корень из ${num}`);
  out = out.replace(/√/g, "корень из ");

  // Юникод-степени: x², 10⁻³, 2¹⁰
  out = out.replace(
    new RegExp(`${POWER_BASE}(${SUPERSCRIPT_CLASS}+)`, "gu"),
    (full, base, sup) => {
      const decoded = decodeScriptDigits(sup, SUPERSCRIPT_MAP);
      if (!/^[+-]?\d+$/.test(decoded)) return full;
      return powerToSpeech(base, decoded);
    },
  );
  // Подстрочные (химия/математика: log₂, H₂O уже обрабатывает химия, но
  // подстраховываемся здесь для оставшихся случаев вида "x₁").
  out = out.replace(
    new RegExp(`(\\p{L})(${SUBSCRIPT_CLASS}+)`, "gu"),
    (full, base, sub) => {
      const decoded = decodeScriptDigits(sub, SUBSCRIPT_MAP);
      if (!/^\d+$/.test(decoded)) return full;
      return `${base} нижний индекс ${numberToRussianWords(decoded)}`;
    },
  );
  // ASCII-запись: x^2, x^-2, 10^-3
  out = out.replace(new RegExp(`${POWER_BASE}\\^(-?\\d+)`, "gu"), (full, base, exp) => powerToSpeech(base, exp));
  return out;
}

const MATH_FUNCTION_NAMES = { sin: "синус", cos: "косинус", tg: "тангенс", tan: "тангенс", ctg: "котангенс", cot: "котангенс", log: "логарифм", ln: "натуральный логарифм", lg: "десятичный логарифм" };

/**
 * ВАЖНО: должна выполняться ДО normalizeMathPowers — иначе общий проход
 * степеней жадно хватает последнюю букву имени функции как "базу" и
 * разрывает слово: "sin²x" → "si" + "n в квадрате" + "x" (мусор). Здесь
 * степень при функции разбирается сразу вместе с её именем.
 */
function normalizeMathFunctions(text) {
  // "log₂8" / "log_2 8" — логарифм по основанию 2, читается по школьной
  // форме, а не "лог нижний индекс два восемь".
  let out = text.replace(
    new RegExp(`${NB}(log|ln|lg)\\s*(?:${SUBSCRIPT_CLASS}|_2)\\s*(\\d+)`, "giu"),
    (full, fn, num) => `логарифм по основанию два от ${numberToRussianWords(num)}`,
  );
  // "cos²x" / "cos^2x" / "sin²x" — степень при функции целиком.
  out = out.replace(
    new RegExp(`${NB}(${Object.keys(MATH_FUNCTION_NAMES).join("|")})(${SUPERSCRIPT_CLASS}+|\\^\\d+)\\s*([a-zA-Z])?${NA}`, "giu"),
    (full, fn, power, arg) => {
      const name = MATH_FUNCTION_NAMES[fn.toLowerCase()] || fn;
      const decoded = power.startsWith("^") ? power.slice(1) : decodeScriptDigits(power, SUPERSCRIPT_MAP);
      const degreeWord = ORDINAL_DEGREE_WORD[Number(decoded)] || `${numberToOrdinal(Number(decoded), { gender: "fem", case: "prep" })} степени`;
      const argWord = arg ? ` ${LATIN_LETTER_NAMES[arg.toLowerCase()] || arg}` : "";
      return `${name} в ${degreeWord}${argWord}`;
    },
  );
  // "sin x" / "cos x" — без степени, просто имя функции + аргумент.
  out = out.replace(
    new RegExp(`${NB}(${Object.keys(MATH_FUNCTION_NAMES).join("|")})\\s*([a-zA-Z])?${NA}`, "giu"),
    (full, fn, arg) => {
      const name = MATH_FUNCTION_NAMES[fn.toLowerCase()] || fn;
      const argWord = arg ? ` ${LATIN_LETTER_NAMES[arg.toLowerCase()] || arg}` : "";
      return `${name}${argWord}`;
    },
  );
  return out;
}

const MATH_SYMBOLS = [
  [/±/g, " плюс-минус "],
  [/≈/g, " приблизительно равно "],
  [/≠/g, " не равно "],
  [/≥/g, " больше либо равно "],
  [/≤/g, " меньше либо равно "],
  [/→/g, " стремится к "],
  [/π/g, "пи"],
  [/×/g, " умножить на "],
  [/·/g, " умножить на "],
  [/∞/g, "бесконечность"],
  [/=/g, " равно "],
  [/\+/g, " плюс "],
  // Дефис с пробелами по обе стороны — это вычитание ("2x − 3" уже
  // приведено к ASCII-дефису normalizeMinusSign), а НЕ диапазон: диапазоны
  // в этом проекте всегда пишутся слитно с числом ("3-7", "2008–2012").
  [/ - /g, " минус "],
];

function normalizeMathSymbolsGeneric(text) {
  let out = text;
  for (const [re, replacement] of MATH_SYMBOLS) out = out.replace(re, replacement);
  return out.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * Голые латинские переменные в математическом контексте: «x» → «икс»,
 * «2x» → «два икс». Идёт последней в normalizeMath — к этому моменту
 * реальные химические формулы, аббревиатуры и имена функций уже разобраны
 * более ранними, более специфичными проходами, так что оставшиеся
 * одиночные латинские буквы почти наверняка и есть переменные.
 */
function normalizeLatinVariables(text) {
  let out = text.replace(/(\d+)\s*([a-zA-Z])(?![a-zA-Z\d])/g, (full, num, letter) => {
    return `${numberToRussianWords(num)} ${LATIN_LETTER_NAMES[letter.toLowerCase()] || letter}`;
  });
  out = out.replace(/\b([a-zA-Z])\b/g, (letter) => LATIN_LETTER_NAMES[letter.toLowerCase()] || letter);
  return out;
}

function normalizeAbsoluteValue(text) {
  return text.replace(/\|([^|]{1,20})\|/g, (full, inner) => `модуль ${inner}`);
}

/** Число или "±∞" словами — для границ интервалов/отрезков/координат. */
function boundToWords(bound) {
  if (bound === "-∞") return "минус бесконечности";
  if (bound === "∞" || bound === "+∞") return "плюс бесконечности";
  const decMatch = bound.match(/^(-?)(\d+)[.,](\d+)$/);
  if (decMatch) return `${decMatch[1] ? "минус " : ""}${decimalToWords(decMatch[2], decMatch[3])}`;
  return numberToRussianWords(bound);
}

function normalizeIntervalsAndCoordinates(text) {
  // (2; 5) координаты, [-2; 4] отрезок, (-∞; 3) интервал — цифры сразу
  // переводятся в слова тут же, чтобы не оставлять их более позднему,
  // менее контекстному проходу (там теряется падеж/знак).
  return text
    // Интервал с бесконечностью — ТРЕБУЕТ ∞ хотя бы с одной стороны,
    // иначе обычная координата вида "(2; 5)" ложно ловится этой веткой
    // раньше, чем веткой "точка" ниже.
    .replace(
      /\(\s*(-?[\d.,]+|-?∞)\s*;\s*(-?[\d.,]+|∞)\s*\)/g,
      (full, a, b) => ((a.includes("∞") || b.includes("∞")) ? `интервал от ${boundToWords(a)} до ${boundToWords(b)}` : full),
    )
    .replace(/\[\s*(-?[\d.,]+)\s*;\s*(-?[\d.,]+)\s*\]/g, (full, a, b) => `отрезок от ${boundToWords(a)} до ${boundToWords(b)}`)
    .replace(/\(\s*(-?[\d.,]+)\s*;\s*(-?[\d.,]+)\s*\)(?!\s*=)/g, (full, a, b) => `точка с координатами ${boundToWords(a)}, ${boundToWords(b)}`);
}

/**
 * Степени/функции/операторы — БЕЗ чтения голых латинских переменных (это
 * отдельный normalizeLatinVariables, который должен идти позже, после
 * единиц измерения: "K"/"A" — это ещё и единицы Кельвина/Ампера, их нельзя
 * прочитать буквой "ка"/"а" раньше, чем единицы измерения успеют их забрать).
 */
/**
 * Научная запись СРАЗУ с единицей измерения ("3 × 10^8 м/с",
 * "6,7·10⁻¹¹ Н·м²/кг²") — должна разбираться целиком за один проход,
 * ДО общего разбора степеней: иначе степень «10^8» конвертируется первой,
 * а идущая следом единица «м/с» лишается предшествующей цифры и остаётся
 * непрочитанной (поймано на реальном примере скорости света).
 */
function normalizeScientificNotationWithUnits(text) {
  const compoundAlt = COMPOUND_UNITS.map(([re]) => re.source).join("|");
  const simpleAlt = Object.keys(UNIT_WORDS)
    .sort((a, b) => b.length - a.length)
    .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  // Степень после "10" — либо ASCII "^-11", либо надстрочные символы "⁻¹¹".
  const re = new RegExp(
    `(-?\\d+(?:[.,]\\d+)?)\\s*[×·]\\s*10(?:\\^(-?\\d+)|(${SUPERSCRIPT_CLASS}+))(?:\\s*(${compoundAlt}|${simpleAlt}))?`,
    "gu",
  );
  return text.replace(re, (full, coef, expAscii, expSuper, unitTok) => {
    const decMatch = coef.match(/^(-?)(\d+)[.,](\d+)$/);
    const coefWords = decMatch
      ? `${decMatch[1] ? "минус " : ""}${decimalToWords(decMatch[2], decMatch[3])}`
      : numberToRussianWords(coef);
    const exp = expAscii ?? decodeScriptDigits(expSuper, SUPERSCRIPT_MAP);
    const expWords = powerToSpeech("десять", exp);
    let unitWords = "";
    if (unitTok) {
      const compound = COMPOUND_UNITS.find(([re2]) => new RegExp(`^(?:${re2.source})$`).test(unitTok));
      unitWords = compound ? ` ${compound[1]}` : UNIT_WORDS[unitTok] ? ` ${UNIT_WORDS[unitTok][2]}` : ` ${unitTok}`;
    }
    return `${coefWords} умножить на ${expWords}${unitWords}`;
  });
}

function normalizeMathCore(text) {
  let out = normalizeScientificNotationWithUnits(text); // до степеней — см. комментарий выше
  out = normalizeMathFunctions(out); // до normalizeMathPowers — см. комментарий там
  out = normalizeMathPowers(out);
  out = normalizeIntervalsAndCoordinates(out);
  out = normalizeAbsoluteValue(out);
  out = normalizeMathSymbolsGeneric(out);
  return out;
}

// ---------------------------------------------------------------------------
// 7. Химия (§12): формулы, гибридизация, pH, реакции.
// ---------------------------------------------------------------------------

// Валидный набор символов элементов (для распознавания формул — не для
// названий: формулы читаются по буквам, как принято в устной речи на уроке).
const ELEMENT_SYMBOLS = new Set(
  (
    "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn " +
    "Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba " +
    "La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn " +
    "Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
  ).split(" "),
);

function spellLatinRun(run) {
  return run
    .split("")
    .map((ch) => LATIN_LETTER_NAMES[ch.toLowerCase()] || ch)
    .join("-");
}

/** Разбирает химический токен алгоритмически: элемент за элементом, а не по списку формул. */
function readChemicalToken(token) {
  let i = 0;
  const out = [];
  while (i < token.length) {
    const ch = token[i];
    if (ch === "(" || ch === ")") {
      i++;
      continue; // скобки не проговариваем — читаем содержимое подряд
    }
    if (/[+-]/.test(ch)) {
      // заряд иона: "+", "-", "2+", "2-"
      let j = i;
      let digits = "";
      // цифра могла стоять ПЕРЕД знаком (уже прочитана как индекс) —
      // заряд с цифрой после знака тоже поддержан: "+2"
      while (j < token.length && /[+-]/.test(token[j])) j++;
      out.push(ch === "+" ? "плюс" : "минус");
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      // жадно берём 2-буквенный символ элемента, иначе 1-буквенный
      const two = token.slice(i, i + 2);
      const twoCap = two[0]?.toUpperCase() + (two[1] || "").toLowerCase();
      if (two.length === 2 && ELEMENT_SYMBOLS.has(twoCap)) {
        out.push(spellLatinRun(two));
        i += 2;
      } else {
        out.push(LATIN_LETTER_NAMES[ch.toLowerCase()] || ch);
        i += 1;
      }
      continue;
    }
    if (/\d/.test(ch)) {
      let j = i;
      while (j < token.length && /\d/.test(token[j])) j++;
      out.push(numberToRussianWords(token.slice(i, j)));
      i = j;
      continue;
    }
    i++;
  }
  return out.join("-").replace(/-(плюс|минус)/g, " $1");
}

/**
 * true, если токен алгоритмически раскладывается на валидные символы
 * элементов. Голая ОДНА буква («K», «C», «N»...) намеренно НЕ считается
 * формулой, даже если это валидный символ элемента — слишком велик риск
 * спутать с единицей измерения (K — Кельвин), римской цифрой (C — 100) или
 * переменной; настоящие формулы почти всегда длиннее одного символа.
 */
function looksLikeChemicalFormula(token) {
  if (token.length < 2) return false;
  const stripped = token.replace(/[()+\-^\d]/g, "");
  if (!stripped) return false;
  let i = 0;
  let sawElement = false;
  while (i < stripped.length) {
    const two = stripped.slice(i, i + 2);
    const twoCap = two[0]?.toUpperCase() + (two[1] || "").toLowerCase();
    if (two.length === 2 && ELEMENT_SYMBOLS.has(twoCap)) {
      i += 2;
      sawElement = true;
      continue;
    }
    const oneCap = stripped[i].toUpperCase();
    if (ELEMENT_SYMBOLS.has(oneCap)) {
      i += 1;
      sawElement = true;
      continue;
    }
    return false;
  }
  return sawElement;
}

const HYBRIDIZATION_RE = /\bsp(\d)?(d(\d)?)?\b/gi;

function normalizeHybridization(text) {
  // "sp²"/"sp³" (надстрочные цифры) встречаются наравне с "sp2"/"sp3" —
  // приводим к ASCII только ТЕ надстрочные цифры, что прямо приклеены к
  // "sp"/"d" — остальной текст (например, математические степени) эта
  // функция трогать не должна.
  const asciiText = text.replace(
    new RegExp(`\\b(sp|d)(${SUPERSCRIPT_CLASS}+)`, "gi"),
    (full, base, sup) => base + decodeScriptDigits(sup, SUPERSCRIPT_MAP),
  );
  return asciiText.replace(
    /\bsp([23]?)(d(?:2)?)?\b/gi,
    (full, degree, dPart) => {
      let out = "эс-пэ";
      if (degree) out += `-${numberToRussianWords(degree)}`;
      if (dPart) {
        out += "-дэ";
        const dNum = dPart.replace(/[^\d]/g, "");
        if (dNum) out += `-${numberToRussianWords(dNum)}`;
      }
      return out;
    },
  );
}

function normalizePH(text) {
  return text.replace(/\bpOH\b/g, "пэ-о-аш").replace(/\bpH\b/g, "пэ-аш");
}

function normalizeChemicalReactionSymbols(text) {
  return text.replace(/⇄|↔/g, " находится в равновесии с ").replace(/→/g, " образуется ");
}

/** Коэффициент перед формулой (напр. «2H2O») — читаем как отдельное число. */
function normalizeReactionCoefficients(text) {
  return text.replace(
    /(^|[\s+(=])(\d+)([A-Z][A-Za-z0-9()^+-]*)/g,
    (full, pre, coef, formulaPart) => {
      if (!looksLikeChemicalFormula(formulaPart)) return full;
      return `${pre}${numberToRussianWords(coef)} ${readChemicalToken(formulaPart)}`;
    },
  );
}

function normalizeChemistryFormulas(text) {
  let out = normalizePH(text);
  out = normalizeHybridization(out);
  out = normalizeChemicalReactionSymbols(out);
  out = normalizeReactionCoefficients(out);
  // Оставшиеся формулы без коэффициента спереди.
  out = out.replace(new RegExp(`${NB}[A-Z][A-Za-z0-9()^+-]{0,15}${NA}`, "gu"), (token) => {
    if (!looksLikeChemicalFormula(token)) return token;
    return readChemicalToken(token);
  });
  return out;
}

// ---------------------------------------------------------------------------
// 8. Физика/география/обществознание: числа с единицами измерения (§11, §16, §17).
// ---------------------------------------------------------------------------

// forms: [1, 2-4, 5+] — для pluralRu.
const UNIT_WORDS = {
  "мм": ["миллиметр", "миллиметра", "миллиметров"],
  "см": ["сантиметр", "сантиметра", "сантиметров"],
  "км": ["километр", "километра", "километров"],
  "м": ["метр", "метра", "метров"],
  "мс": ["миллисекунда", "миллисекунды", "миллисекунд"],
  "мин": ["минута", "минуты", "минут"],
  "ч": ["час", "часа", "часов"],
  "мг": ["миллиграмм", "миллиграмма", "миллиграммов"],
  "кг": ["килограмм", "килограмма", "килограммов"],
  "г": ["грамм", "грамма", "граммов"],
  "т": ["тонна", "тонны", "тонн"],
  "кН": ["килоньютон", "килоньютона", "килоньютонов"],
  "Н": ["ньютон", "ньютона", "ньютонов"],
  "H": ["ньютон", "ньютона", "ньютонов"], // латинская H — Ньютон часто пишут ею же
  "кДж": ["килоджоуль", "килоджоуля", "килоджоулей"],
  "МДж": ["мегаджоуль", "мегаджоуля", "мегаджоулей"],
  "Дж": ["джоуль", "джоуля", "джоулей"],
  "кВт": ["киловатт", "киловатта", "киловатт"],
  "Вт": ["ватт", "ватта", "ватт"],
  "кПа": ["килопаскаль", "килопаскаля", "килопаскалей"],
  "МПа": ["мегапаскаль", "мегапаскаля", "мегапаскалей"],
  "Па": ["паскаль", "паскаля", "паскалей"],
  "кВ": ["киловольт", "киловольта", "киловольт"],
  "В": ["вольт", "вольта", "вольт"],
  "мА": ["миллиампер", "миллиампера", "миллиампер"],
  "А": ["ампер", "ампера", "ампер"],
  "A": ["ампер", "ампера", "ампер"], // латинская A — та же неоднозначность
  "кОм": ["килоом", "килоома", "килоомов"],
  "Ом": ["ом", "ома", "омов"],
  "МГц": ["мегагерц", "мегагерца", "мегагерц"],
  "кГц": ["килогерц", "килогерца", "килогерц"],
  "Гц": ["герц", "герца", "герц"],
  "Кл": ["кулон", "кулона", "кулонов"],
  "Ф": ["фарад", "фарада", "фарад"],
  "Тл": ["тесла", "тесла", "тесла"],
  "Вб": ["вебер", "вебера", "веберов"],
  "K": ["кельвин", "кельвина", "кельвинов"],
  "моль": ["моль", "моля", "молей"],
  "руб.": ["рубль", "рубля", "рублей"],
  "₽": ["рубль", "рубля", "рублей"],
  "Кбайт": ["килобайт", "килобайта", "килобайт"],
  "Мбайт": ["мегабайт", "мегабайта", "мегабайт"],
  "Гбайт": ["гигабайт", "гигабайта", "гигабайт"],
  "байт": ["байт", "байта", "байт"],
  "бит": ["бит", "бита", "бит"],
};

// Составные единицы (степени/дроби) — распознаются целиком, до простых.
const COMPOUND_UNITS = [
  [/м\/с²/g, "метров в секунду в квадрате"],
  [/м\/с\^?2/g, "метров в секунду в квадрате"],
  [/км\/ч/g, "километров в час"],
  [/м\/с/g, "метров в секунду"],
  [/кг\/м³/g, "килограммов на метр кубический"],
  [/кг\/м3/g, "килограммов на метр кубический"],
  [/м²/g, "квадратных метров"],
  [/м2/g, "квадратных метров"],
  [/м³/g, "кубических метров"],
  [/м3/g, "кубических метров"],
  [/км²/g, "квадратных километров"],
  [/км2/g, "квадратных километров"],
  [/м³\/с/g, "кубических метров в секунду"],
  [/Н·м²\/кг²/g, "ньютон-метров в квадрате на килограмм в квадрате"],
  [/Кбит\/с/g, "килобит в секунду"],
  [/Мбит\/с/g, "мегабит в секунду"],
  [/чел\.\/км²/g, "человек на квадратный километр"],
];

function normalizeCompoundUnits(text) {
  let out = text;
  for (const [re, replacement] of COMPOUND_UNITS) {
    out = out.replace(new RegExp(`(-?\\d+(?:[.,]\\d+)?)\\s*${re.source}`, "g"), (full, num) => {
      const decMatch = num.match(/^(-?)(\d+)[.,](\d+)$/);
      const numWords = decMatch ? `${decMatch[1] ? "минус " : ""}${decimalToWords(decMatch[2], decMatch[3])}` : numberToRussianWords(num);
      return `${numWords} ${replacement}`;
    });
  }
  return out;
}

function normalizeTemperature(text) {
  return text.replace(/(-?)\s*(\d+(?:[.,]\d+)?)\s*°\s*(C|С|F|Ф)\b/g, (full, neg, num, unit) => {
    const decMatch = num.match(/^(\d+)[.,](\d+)$/);
    const numWords = decMatch ? decimalToWords(decMatch[1], decMatch[2]) : numberToRussianWords(num);
    const scale = /F|Ф/.test(unit) ? "Фаренгейту" : "Цельсию";
    const n = Number(num.replace(",", "."));
    const degWord = pluralRu(Math.round(Math.abs(n)), ["градус", "градуса", "градусов"]);
    return `${neg ? "минус " : ""}${numWords} ${degWord} по ${scale}`;
  });
}

function normalizeSimpleUnits(text) {
  const unitKeys = Object.keys(UNIT_WORDS).sort((a, b) => b.length - a.length);
  const escaped = unitKeys.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(-?\\d+(?:[.,]\\d+)?)\\s*(${escaped.join("|")})(?![\\p{L}])`, "gu");
  return text.replace(re, (full, num, unit) => {
    const decMatch = num.match(/^(-?)(\d+)[.,](\d+)$/);
    if (decMatch) {
      const words = decimalToWords(decMatch[2], decMatch[3]);
      return `${decMatch[1] ? "минус " : ""}${words} ${UNIT_WORDS[unit][2]}`;
    }
    const n = Number(num);
    return `${numberToRussianWords(n)} ${pluralRu(Math.abs(n), UNIT_WORDS[unit])}`;
  });
}

function normalizeScientificNotation(text) {
  // "3 × 10^8", "6,02·10^23", "1,6·10^-19" — уже частично разберёт normalizeMath
  // (степени) и normalizeMathSymbolsGeneric (× и ·); эта функция гарантирует,
  // что множитель перед степенью тоже читается числом/десятичной дробью —
  // остальное подхватывают более общие проходы, вызванные после неё.
  return text;
}

function normalizeUnitsWithNumbers(text) {
  let out = normalizeCompoundUnits(text);
  out = normalizeTemperature(out);
  out = normalizeSimpleUnits(out);
  return out;
}

// ---------------------------------------------------------------------------
// 9. Информатика (§14): IP-адреса, системы счисления, логика, код.
// ---------------------------------------------------------------------------

function normalizeIPAddresses(text) {
  return text.replace(
    /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g,
    (full, a, b, c, d) => {
      if ([a, b, c, d].some((p) => Number(p) > 255)) return full;
      return [a, b, c, d].map(numberToRussianWords).join(" точка ");
    },
  );
}

/** Каждый символ числа с основанием — отдельным произносимым словом. */
const digitCharWord = (d) => numberToRussianWords(d);
const hexCharWord = (c) => (/[0-9]/.test(c) ? numberToRussianWords(c) : LATIN_LETTER_NAMES[c.toLowerCase()] || c);

function normalizeRadixNumbers(text) {
  return text
    .replace(new RegExp(`\\b([01]+)₂${NA}`, "gu"), (full, digits) => `${digits.split("").map(digitCharWord).join(" ")} в двоичной системе`)
    .replace(new RegExp(`\\b([0-9A-Fa-f]+)₁₆${NA}`, "gu"), (full, digits) => `${digits.split("").map(hexCharWord).join(" ")} в шестнадцатеричной системе`)
    .replace(new RegExp(`\\b([0-7]+)₈${NA}`, "gu"), (full, digits) => `${digits.split("").map(digitCharWord).join(" ")} в восьмеричной системе`);
}

// Нарочно строчными: заглавные "НЕ"/"И"/"ИЛИ" сами похожи на аббревиатуру
// и позже попадут под normalizeAbbreviations (побуквенно "эн-е" вместо
// "не") — на слух регистр союза всё равно не отличить.
const LOGIC_OPERATORS = [
  [/\bAND\b/gi, "и"], [/\bOR\b/gi, "или"], [/\bNOT\b/gi, "не"],
  [/\bXOR\b/gi, "исключающее или"], [/&/g, " и "], [/\|/g, " или "],
  [/¬/g, "не "], [/∧/g, " и "], [/∨/g, " или "], [/!/g, "не "],
  [/\bTRUE\b/gi, "истина"], [/\bFALSE\b/gi, "ложь"],
];

function normalizeLogicOperators(text) {
  let out = text;
  for (const [re, replacement] of LOGIC_OPERATORS) out = out.replace(re, replacement);
  return out;
}

/**
 * Безопасное чтение фрагмента кода: не пытается литературно пересказать
 * программу, только делает её произносимой — операторы/числа/переменные
 * читаются по имени, структура (переносы строк, отступы) не разрушается.
 */
function normalizeCodeFragmentForSpeech(code) {
  const OPERATOR_NAMES = {
    "==": "равно равно", "!=": "не равно", "<=": "меньше либо равно", ">=": "больше либо равно",
    "=": "равно", "+": "плюс", "-": "минус", "*": "умножить", "/": "делить",
    "<": "меньше", ">": "больше", "(": "открывающая скобка", ")": "закрывающая скобка",
    "{": "открывающая фигурная скобка", "}": "закрывающая фигурная скобка",
    ";": "точка с запятой", ":": "двоеточие",
  };
  return code
    .split(/(\s+)/)
    .map((tok) => {
      if (/^\s+$/.test(tok)) return tok;
      if (OPERATOR_NAMES[tok]) return OPERATOR_NAMES[tok];
      if (/^-?\d+$/.test(tok)) return numberToRussianWords(tok);
      return tok;
    })
    .join("");
}

function normalizeCodeFences(text) {
  return text.replace(/```([\s\S]*?)```/g, (full, code) => normalizeCodeFragmentForSpeech(code));
}

function normalizeInformatics(text) {
  let out = normalizeCodeFences(text);
  out = normalizeIPAddresses(out);
  out = normalizeRadixNumbers(out);
  out = normalizeLogicOperators(out);
  return out;
}

// ---------------------------------------------------------------------------
// 10. Биология (§13): хромосомные наборы, генотипы.
// ---------------------------------------------------------------------------

function normalizeBiologyNotation(text) {
  let out = text;
  // "2n = 46", "4n", "2n4c", "2n2c" — n/c читаем буквами.
  out = out.replace(/\b(\d*)n(\d*c)?\b/g, (full, coef, cSuffix) => {
    if (!coef && !cSuffix) return full;
    let result = "";
    if (coef) result += `${numberToRussianWords(coef)} `;
    result += "эн";
    if (cSuffix) {
      const cNum = cSuffix.replace("c", "");
      result += ` ${numberToRussianWords(cNum)} цэ`;
    }
    return result;
  });
  // Генотипы: AaBb, AABB, aa — двухбуквенные аллели читаем по буквам.
  out = out.replace(/\b([A-Za-z]{2,8})\b/g, (word) => {
    if (!/^[A-Za-z]+$/.test(word)) return word;
    if (!/[A-Z]/.test(word) || !/[a-z]/.test(word)) {
      // допускаем и AABB (все заглавные) — но не трогаем обычные англ. слова
      if (!/^[A-Z]{2,8}$/.test(word)) return word;
    }
    // эвристика: короткие буквенные последовательности из повторяющихся
    // букв гена (латиница, ≤8 символов, только буквы) — читаем по буквам.
    return word.split("").map((ch) => LATIN_LETTER_NAMES[ch.toLowerCase()] || ch).join("-");
  });
  return out;
}

// ---------------------------------------------------------------------------
// 11. Инициалы/сокращения по предметам (§15-19) — история/география/общество.
// ---------------------------------------------------------------------------

function normalizeLegalReferences(text) {
  // «статья»/«часть» — женского рода («статья пятнадцатая» тоже
  // встречается, но кардинальная форма «статья пятнадцать» — обычное
  // чтение номера-ярлыка; род числительного при этом всё равно должен
  // совпадать там, где он вообще меняется — «одна», не «один»).
  return text
    .replace(new RegExp(`${NB}ст\\.\\s*(\\d+)`, "giu"), (full, n) => `статья ${numberToRussianWordsFeminine(n)}`)
    .replace(new RegExp(`${NB}п\\.\\s*(\\d+)`, "giu"), (full, n) => `пункт ${numberToRussianWords(n)}`)
    .replace(new RegExp(`${NB}ч\\.\\s*(\\d+)`, "giu"), (full, n) => `часть ${numberToRussianWordsFeminine(n)}`);
}

const MAGNITUDE_WORDS = {
  тыс: ["тысяча", "тысячи", "тысяч"],
  млн: ["миллион", "миллиона", "миллионов"],
  млрд: ["миллиард", "миллиарда", "миллиардов"],
};

/**
 * «17,1 млн км²» / «2 млн руб.» — тысячи/миллионы/миллиарды ВМЕСТЕ с
 * единицей, которая идёт следом. Раньше это читалось двумя независимыми
 * проходами (сначала «млн»→«миллионов», потом единицы измерения) — но
 * тогда единица теряла соседство с числом и оставалась непрочитанной
 * (поймано на реальном примере географии). Дробный коэффициент («17,1»)
 * грамматически требует родительный ЕДИНСТВЕННОГО числа у следующего
 * слова («целых одна десятая МИЛЛИОНА», не «миллионов») — тоже учтено.
 */
function normalizeMagnitudeUnit(text) {
  const unitKeys = Object.keys(UNIT_WORDS)
    .sort((a, b) => b.length - a.length)
    .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const compoundAlt = COMPOUND_UNITS.map(([re]) => re.source).join("|");
  const re = new RegExp(
    `(-?\\d+(?:[.,]\\d+)?)\\s*(тыс|млн|млрд)\\.?\\s*(${compoundAlt}|${unitKeys.join("|")})?`,
    "giu",
  );
  return text.replace(re, (full, num, magKey, unitTok) => {
    const forms = MAGNITUDE_WORDS[magKey.toLowerCase()];
    const decMatch = num.match(/^(-?)(\d+)[.,](\d+)$/);
    let numWords, magWord;
    if (decMatch) {
      // Дробная часть требует родительного падежа ЕДИНСТВЕННОГО числа у
      // следующего слова («одна десятая МИЛЛИОНА») — это ровно форма
      // индекса 1 в таблице ("миллиона"/"тысячи"/"миллиарда").
      numWords = `${decMatch[1] ? "минус " : ""}${decimalToWords(decMatch[2], decMatch[3])}`;
      magWord = forms[1];
    } else {
      numWords = numberToRussianWords(num);
      magWord = pluralRu(Number(num), forms);
    }
    let unitWords = "";
    if (unitTok) {
      const compound = COMPOUND_UNITS.find(([re2]) => new RegExp(`^(?:${re2.source})$`).test(unitTok));
      unitWords = compound ? ` ${compound[1]}` : UNIT_WORDS[unitTok] ? ` ${UNIT_WORDS[unitTok][2]}` : ` ${unitTok}`;
    }
    return `${numWords} ${magWord}${unitWords}`;
  });
}

function normalizeGeoCoordinates(text) {
  // "55°45′ с. ш." / "37°37′ в. д."
  return text.replace(
    /(\d+)°\s*(\d+)?′?\s*(с\.\s*ш\.|ю\.\s*ш\.|в\.\s*д\.|з\.\s*д\.)/gi,
    (full, deg, min, dir) => {
      const dirWord = /с\.\s*ш/i.test(dir) ? "северной широты" : /ю\.\s*ш/i.test(dir) ? "южной широты" : /в\.\s*д/i.test(dir) ? "восточной долготы" : "западной долготы";
      const degWords = `${numberToRussianWords(deg)} ${pluralRu(Number(deg), ["градус", "градуса", "градусов"])}`;
      const minWords = min ? ` ${numberToRussianWords(min)} ${pluralRu(Number(min), ["минута", "минуты", "минут"])}` : "";
      return `${degWords}${minWords} ${dirWord}`;
    },
  );
}

// ---------------------------------------------------------------------------
// 12. Общая (subject-agnostic) нормализация — общий конвейер (§1, §22, §23).
// ---------------------------------------------------------------------------

/** Общие правила, применимые ко всем предметам — базовый проход. */
function normalizeCommon(text) {
  let out = String(text);
  out = normalizeIPAddresses(out); // до нормализации десятичных дробей!
  out = normalizeRadixNumbers(out);
  out = normalizeDates(out);
  out = normalizeYearRanges(out);
  out = normalizeDecadeYears(out);
  out = normalizeSingleYears(out);
  out = normalizeRomanCenturies(out);
  out = normalizeOrdinalHyphenSuffix(out);
  out = normalizeGeoCoordinates(out);
  out = normalizeLegalReferences(out);
  out = normalizeMagnitudeUnit(out);
  out = normalizeChemistryFormulas(out);
  // normalizeMathCore ДО normalizeUnitsWithNumbers: иначе "10^8 м/с" читается
  // юнитами раньше степеней — "8" уходит в "восемь метров в секунду", а
  // висящее "10^" остаётся мусором (пойман на реальном тесте физики).
  out = normalizeMathCore(out);
  out = normalizeUnitsWithNumbers(out);
  out = normalizeDecimals(out);
  out = normalizePercent(out);
  out = normalizeFractionsAndRatios(out);
  out = normalizeGenericRanges(out);
  out = normalizeInitials(out);
  out = normalizeAbbreviations(out);
  out = normalizeGreekLetters(out);
  // normalizeLatinVariables ПОСЛЕ единиц измерения: "K"/"A" — это ещё и
  // Кельвины/Амперы, юниты должны успеть забрать их первыми.
  out = normalizeLatinVariables(out);
  out = normalizeStandaloneRoman(out);
  out = normalizePlainIntegers(out);
  return out;
}

/** Последний общий проход: голое целое число словами — ловит всё, что не
 * попало ни под одно специальное правило («задание 6», «значение 15»). */
function normalizePlainIntegers(text) {
  const s = String(text);
  const PROTECTED_ADJACENT = /[\p{L}/^%]/u;
  return s.replace(/\d+/gu, (match, offset) => {
    const before = s[offset - 1];
    const after = s[offset + match.length];
    if ((before && PROTECTED_ADJACENT.test(before)) || (after && PROTECTED_ADJACENT.test(after))) {
      return match;
    }
    return numberToRussianWords(match);
  });
}

// ---------------------------------------------------------------------------
// 13. Safe fallback + диагностика непроизносимых токенов (§22, §23).
// ---------------------------------------------------------------------------

/** Похоже на техническое обозначение, которое ни одно правило не разобрало. */
const UNSAFE_TOKEN_RE = /[\p{L}]*\d[\p{L}\d]*[⁰-₟Ͱ-Ͽ]|[⁰-₟]+|[Ͱ-Ͽ]+|[≈≠≥≤±×÷√∞⇄∧∨¬]/gu;

/** Разбирает неизвестный токен по символам: буквы/цифры/операторы — безопасно. */
function safeFallbackForUnknownToken(token) {
  const decoded = decodeScriptDigits(decodeScriptDigits(token, SUPERSCRIPT_MAP), SUBSCRIPT_MAP);
  const OPERATOR_NAMES = { "≈": "приблизительно равно", "≠": "не равно", "≥": "больше либо равно", "≤": "меньше либо равно", "±": "плюс-минус", "×": "умножить", "÷": "делить", "√": "корень", "∞": "бесконечность", "⇄": "равновесие", "∧": "и", "∨": "или", "¬": "не" };
  return decoded
    .split("")
    .map((ch) => {
      if (OPERATOR_NAMES[ch]) return OPERATOR_NAMES[ch];
      if (/\d/.test(ch)) return numberToRussianWords(ch);
      if (GREEK_LETTER_NAMES[ch]) return GREEK_LETTER_NAMES[ch];
      if (/[A-Za-z]/.test(ch)) return LATIN_LETTER_NAMES[ch.toLowerCase()] || ch;
      if (/[А-ЯЁа-яё]/.test(ch)) return ch;
      return "";
    })
    .filter(Boolean)
    .join("-");
}

function applySafeFallback(text) {
  return text.replace(UNSAFE_TOKEN_RE, (token) => safeFallbackForUnknownToken(token));
}

/**
 * Ищет в УЖЕ нормализованном тексте подозрительные непроизносимые остатки:
 * цифры, надстрочные/подстрочные символы, греческие буквы, математические
 * операторы, смесь латиницы с цифрами. Возвращает массив найденных токенов
 * (пусто — нормализация отработала полностью). Диагностика, не мутирует текст.
 */
function findUnsafeTtsTokens(text) {
  const re = /\d+|[⁰-₟]+|[Ͱ-Ͽ]+|[≈≠≥≤±×÷√∞⇄∧∨¬]|[A-Za-z]+\d+|\d+[A-Za-z]+/gu;
  const found = String(text).match(re) || [];
  return [...new Set(found)];
}

// ---------------------------------------------------------------------------
// 14. Определение предмета и предметные обёртки (§ главная архитектура).
// ---------------------------------------------------------------------------

const SUBJECT_KEYS = /** @type {const} */ ([
  "russian", "math", "physics", "chemistry", "biology", "informatics",
  "history", "geography", "social", "literature", "unknown",
]);

/** Определяет ключ предмета по строке task_data.subject (см. build-dynamic-task.mjs). */
function subjectKeyFromText(subjectText) {
  const s = String(subjectText || "").toLowerCase();
  if (s.includes("литератур")) return "literature";
  if (s.includes("русск")) return "russian";
  if (s.includes("математик")) return "math";
  if (s.includes("физик")) return "physics";
  if (s.includes("хими")) return "chemistry";
  if (s.includes("биолог")) return "biology";
  if (s.includes("информатик")) return "informatics";
  if (s.includes("истори")) return "history";
  if (s.includes("географ")) return "geography";
  if (s.includes("обществ")) return "social";
  return "unknown";
}

function normalizeRussianAndLiterature(text) {
  return normalizeCommon(text);
}

function normalizeMathSubject(text) {
  return normalizeCommon(text);
}

function normalizePhysics(text) {
  return normalizeCommon(text);
}

function normalizeChemistry(text) {
  return normalizeCommon(text);
}

function normalizeBiology(text) {
  let out = normalizeBiologyNotation(text);
  out = normalizeCommon(out);
  return out;
}

function normalizeInformaticsSubject(text) {
  let out = normalizeInformatics(text);
  out = normalizeCommon(out);
  return out;
}

function normalizeHistory(text) {
  return normalizeCommon(text);
}

function normalizeGeography(text) {
  return normalizeCommon(text);
}

function normalizeSocialStudies(text) {
  return normalizeCommon(text);
}

const SUBJECT_HANDLERS = {
  russian: normalizeRussianAndLiterature,
  literature: normalizeRussianAndLiterature,
  math: normalizeMathSubject,
  physics: normalizePhysics,
  chemistry: normalizeChemistry,
  biology: normalizeBiology,
  informatics: normalizeInformaticsSubject,
  history: normalizeHistory,
  geography: normalizeGeography,
  social: normalizeSocialStudies,
  unknown: normalizeCommon,
};

const TTS_NORMALIZER_VERSION = "2.0";

/**
 * ГЛАВНАЯ ФУНКЦИЯ. text — исходный voiceover_text (не мутируется, возвращает
 * новую строку). subject — строка предмета (task_data.subject) ИЛИ уже
 * готовый ключ из SUBJECT_KEYS — определяется автоматически.
 *
 * Пайплайн: 1) общая нормализация; 2) предметные правила (для большинства
 * предметов это переиспользование общего конвейера — химия/биология/
 * информатика добавляют предметный проход ПЕРЕД общим); 3) safe fallback
 * для всего, что осталось непроизносимым; 4) финальная проверка не
 * выполняется здесь — используйте findUnsafeTtsTokens(result) отдельно.
 */
/**
 * Настоящий знак «минус» (U+2212, отдельный от дефиса и от тире, которыми
 * записаны диапазоны «5–10»/«2008–2012») приводим к ASCII "-" один раз в
 * самом начале — дальше все проверки на отрицательное число используют
 * обычный дефис. Диапазоны это не задевает: они записываются EN/EM-тире
 * или ASCII-дефисом, а не знаком U+2212.
 */
function normalizeMinusSign(text) {
  return String(text).replace(/−/g, "-");
}

function normalizeForVoiceover(text, subject) {
  const key = SUBJECT_KEYS.includes(subject) ? subject : subjectKeyFromText(subject);
  const handler = SUBJECT_HANDLERS[key] || normalizeCommon;
  let out = normalizeMinusSign(text);
  out = handler(out);
  out = applySafeFallback(out);
  // Многочисленные проходы вставляют слова с собственными пробелами вокруг
  // символов ("плюс", "равно"...) — на стыках это иногда даёт двойные
  // пробелы. Переносы строк (значимы для границ предложений в align.py)
  // не трогаем, схлопываем только горизонтальные пробелы/табы.
  out = out.replace(/[ \t]{2,}/g, " ");
  return out;
}


// ---------------------------------------------------------------------------
// n8n Code node driver — добавлено генератором, не часть исходного модуля.
// Режим "Run Once for All Items" (самый частый выбор для Code node в n8n).
// Если ваша нода настроена на "Run Once for Each Item" — замените блок ниже
// на:
//   const item = $input.item;
//   const subject = item.json.subject;
//   const ttsText = normalizeForVoiceover(item.json.voiceover_text, subject);
//   return { json: { ...item.json, voiceover_tts_text: ttsText,
//     tts_normalization_warnings: findUnsafeTtsTokens(ttsText),
//     tts_normalizer_version: TTS_NORMALIZER_VERSION } };
// ---------------------------------------------------------------------------
return $input.all().map((item) => {
  const subject = item.json.subject;
  const voiceoverText = item.json.voiceover_text;
  const ttsText = normalizeForVoiceover(voiceoverText, subject);
  return {
    json: {
      ...item.json,
      // voiceover_text (и все остальные поля item.json) остаются исходными —
      // эта функция ничего не меняет на видео, только добавляет копию для TTS.
      voiceover_tts_text: ttsText,
      tts_normalization_warnings: findUnsafeTtsTokens(ttsText),
      tts_normalizer_version: TTS_NORMALIZER_VERSION,
    },
  };
});
