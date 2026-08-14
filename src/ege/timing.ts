/**
 * Тайминг ролика. Все длительности — в кадрах при 30 fps.
 *
 * Длительность сцены с условием считается из самих слов: каждое слово
 * подсвечивается ровно столько, сколько его читают, поэтому суммарная
 * длина сцены выводится из массива слов, а не задаётся руками.
 */

import { VIDEO } from "./theme";

export const sec = (s: number) => Math.round(s * VIDEO.fps);

/** Условие задачи, разбитое на слова для «караоке»-подсветки. */
export const PROBLEM_WORDS = [
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
] as const;

/**
 * Сколько кадров держится подсветка на слове: короткие служебные слова
 * пробегаются быстро, длинные — дольше. Плюс небольшая пауза на знаках
 * препинания, как при настоящем чтении.
 */
export const wordFrames = (word: string): number => {
  const letters = word.replace(/[^0-9A-Za-zА-Яа-яЁё%]/g, "").length;
  const pause = /[.,]$/.test(word) ? 5 : 0;
  return Math.round(7 + letters * 1.25) + pause;
};

export const WORD_FRAMES = PROBLEM_WORDS.map(wordFrames);

/** Кадр начала подсветки каждого слова, относительно начала чтения. */
export const WORD_STARTS = WORD_FRAMES.reduce<number[]>((acc, d, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + WORD_FRAMES[i - 1]);
  return acc;
}, []);

export const READING_FRAMES = WORD_FRAMES.reduce((a, b) => a + b, 0);

/** Пауза перед началом чтения — чтобы текст успел появиться. */
export const READ_DELAY = sec(1.2);

export const SCENES = {
  title: sec(4.5),
  problem: READ_DELAY + READING_FRAMES + sec(1.6),
  timer: sec(7),
  solution1: sec(13),
  solution2: sec(11.5),
  solution3: sec(13.5),
  answer: sec(6.5),
} as const;

export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);
