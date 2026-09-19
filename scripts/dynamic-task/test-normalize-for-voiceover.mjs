#!/usr/bin/env node
/**
 * Автономный тест normalizeForVoiceover() — без фреймворка (в проекте его
 * нет), просто assert + процесс завершается кодом 1 при первом провале.
 * Запуск: node scripts/dynamic-task/test-normalize-for-voiceover.mjs
 */
import assert from "node:assert/strict";
import {
  normalizeForVoiceover,
  numberToRussianWords,
} from "./normalize-for-voiceover.mjs";

let passed = 0;
const check = (name, actual, expected) => {
  try {
    assert.equal(actual, expected);
    passed++;
  } catch {
    console.error(`✗ ${name}`);
    console.error(`  ожидалось: ${JSON.stringify(expected)}`);
    console.error(`  получено:  ${JSON.stringify(actual)}`);
    process.exitCode = 1;
  }
};

// --- примеры чисел из задания -----------------------------------------
check("numberToRussianWords(6)", numberToRussianWords(6), "шесть");
check("numberToRussianWords(7)", numberToRussianWords(7), "семь");
check("numberToRussianWords(8)", numberToRussianWords(8), "восемь");
check("numberToRussianWords(9)", numberToRussianWords(9), "девять");
check("numberToRussianWords(10)", numberToRussianWords(10), "десять");
check("numberToRussianWords(11)", numberToRussianWords(11), "одиннадцать");
check("numberToRussianWords(12)", numberToRussianWords(12), "двенадцать");
check("numberToRussianWords(20)", numberToRussianWords(20), "двадцать");
check("numberToRussianWords(25)", numberToRussianWords(25), "двадцать пять");
check("numberToRussianWords(100)", numberToRussianWords(100), "сто");
check("numberToRussianWords(0)", numberToRussianWords(0), "ноль");
check("numberToRussianWords(1000)", numberToRussianWords(1000), "одна тысяча");
check("numberToRussianWords(2024)", numberToRussianWords(2024), "две тысячи двадцать четыре");

// --- сценарий 1: №6 -----------------------------------------------------
check(
  "задание 6",
  normalizeForVoiceover("Решаем задание 6 из ОГЭ по русскому языку."),
  "Решаем задание шесть из ОГЭ по русскому языку.",
);

// --- сценарий 2: №7 -------------------------------------------------------
check(
  "задание 7",
  normalizeForVoiceover("Решаем задание 7."),
  "Решаем задание семь.",
);

// --- сценарий 3: №8 -------------------------------------------------------
check(
  "задание 8",
  normalizeForVoiceover("Решаем задание 8."),
  "Решаем задание восемь.",
);

// --- сценарий 4: число внутри условия ------------------------------------
check(
  "число в условии",
  normalizeForVoiceover("Укажите значение 15."),
  "Укажите значение пятнадцать.",
);

// --- сценарий 5: несколько чисел в одном условии -------------------------
check(
  "несколько чисел",
  normalizeForVoiceover("В классе 20 парт и 25 стульев, за задней партой сидят 2 ученика."),
  "В классе двадцать парт и двадцать пять стульев, за задней партой сидят два ученика.",
);

// --- сценарий 6: число уже словами — не трогаем и не дублируем ----------
check(
  "уже словами (не хардкод №6)",
  normalizeForVoiceover("Решаем задание шестого варианта."),
  "Решаем задание шестого варианта.",
);
check(
  "уже словами, число из примера",
  normalizeForVoiceover("Ответ — двадцать пять."),
  "Ответ — двадцать пять.",
);

// --- сценарий 7: математические обозначения не ломаем --------------------
check(
  "химическая формула",
  normalizeForVoiceover("Вещество состава C5H11OH — это спирт."),
  "Вещество состава C5H11OH — это спирт.",
);
check(
  "переменная с числом",
  normalizeForVoiceover("Найдите корень уравнения x2 - 9 = 0."),
  "Найдите корень уравнения x2 - девять = ноль.",
);
check(
  "дробь",
  normalizeForVoiceover("Ответ запишите в виде дроби 3/4."),
  "Ответ запишите в виде дроби 3/4.",
);
check(
  "степень",
  normalizeForVoiceover("Вычислите x^2 при x = 5."),
  "Вычислите x^2 при x = пять.",
);
check(
  "проценты",
  normalizeForVoiceover("Концентрация раствора — 15%."),
  "Концентрация раствора — 15%.",
);
check(
  "десятичная дробь",
  normalizeForVoiceover("Масса образца — 3,5 грамма."),
  "Масса образца — 3,5 грамма.",
);
check(
  "десятичная дробь с точкой",
  normalizeForVoiceover("Постоянная равна 3.14."),
  "Постоянная равна 3.14.",
);

// --- итоговая проверка: не осталось "голых" цифр там, где их быть не должно
const fullExample =
  "Решаем задание 6 из ОГЭ по русскому языку. " +
  "Раскройте скобки: (ЧЕТЫРЕСТА) книгами заставили весь новый стеллаж библиотеки. " +
  "Ответ: четырьмястами. " +
  "Это числительное сложное, поэтому склоняются обе части слова. " +
  "Скачивай бесплатно. Ссылка в шапке профиля.";
const normalized = normalizeForVoiceover(fullExample);
check("не осталось голых цифр в обычном тексте", /\d/.test(normalized), false);
check(
  "полный пример: итоговый текст",
  normalized,
  "Решаем задание шесть из ОГЭ по русскому языку. " +
    "Раскройте скобки: (ЧЕТЫРЕСТА) книгами заставили весь новый стеллаж библиотеки. " +
    "Ответ: четырьмястами. " +
    "Это числительное сложное, поэтому склоняются обе части слова. " +
    "Скачивай бесплатно. Ссылка в шапке профиля.",
);

if (process.exitCode === 1) {
  console.error(`\nПровалено. Пройдено: ${passed}.`);
  process.exit(1);
} else {
  console.log(`Все тесты пройдены (${passed}).`);
}
