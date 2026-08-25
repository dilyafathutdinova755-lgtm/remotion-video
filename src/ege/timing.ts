/**
 * Тайминг ролика. Все длительности — в кадрах при 30 fps.
 *
 * Длительность сцены с условием не задаётся руками, а считается из самого
 * текста: каждому слову отводится время пропорционально его длине. Поэтому
 * условие можно править, не пересчитывая кадры.
 */

import { VIDEO } from "./theme";
import type { TaskDef, Token } from "./tasks/types";

export const sec = (s: number) => Math.round(s * VIDEO.fps);

/**
 * Сколько кадров нужно на слово: короткие служебные пробегаются быстро,
 * длинные — дольше. Плюс небольшая пауза на знаках препинания.
 */
export const wordFrames = (word: string): number => {
  const letters = word.replace(/[^0-9A-Za-zА-Яа-яЁё%]/g, "").length;
  const pause = /[.,?!]$/.test(word) ? 5 : 0;
  return Math.round(7 + letters * 1.25) + pause;
};

export const tokenFrames = (t: Token): number => wordFrames(t);

/** Пауза перед началом чтения — чтобы текст успел появиться. */
export const READ_DELAY = sec(1.2);

export type Reading = {
  /** Кадр появления каждого токена, от начала сцены. */
  starts: number[];
  /** Сколько кадров занимает всё прочтение. */
  total: number;
};

export const buildReading = (tokens: Token[]): Reading => {
  const frames = tokens.map(tokenFrames);
  const starts: number[] = [];
  let acc = READ_DELAY;

  for (const f of frames) {
    starts.push(acc);
    acc += f;
  }

  return { starts, total: acc - READ_DELAY };
};

export type Scenes = {
  title: number;
  problem: number;
  solutions: number[];
  answer: number;
  outro: number;
};

/** Формулировку задания тоже надо успеть прочитать. */
export const instructionFrames = (task: TaskDef): number =>
  task.instruction
    ? task.instruction
        .trim()
        .split(/\s+/)
        .reduce((acc, word) => acc + wordFrames(word), 0)
    : 0;

/** Сколько кадров занимает прочтение всего, что есть на карточке. */
/** Появление списка вариантов: по строке за раз, читать их вслух не надо. */
export const OPTION_STEP = 12;

export const problemReadingFrames = (task: TaskDef): number => {
  if (task.options) {
    // Формулировку проговаривают, варианты только показывают
    return instructionFrames(task) + task.options.length * OPTION_STEP;
  }

  const raw = instructionFrames(task) + buildReading(task.tokens).total;
  // Длинный текст глазами просматривают быстрее, чем короткий читают
  const dense = task.tokens.length > 45 ? 0.86 : 1;
  return Math.round(raw * dense);
};

export const buildScenes = (task: TaskDef): Scenes => {
  return {
    // Открывающий кадр: вопрос-хук вместо заставки
    title: sec(4),
    // Условие показывается один раз, поэтому даём его дочитать
    // Три секунды в конце — время подумать; отдельной сцены таймера нет
    problem: READ_DELAY + problemReadingFrames(task) + sec(3),
    solutions: task.solutions.map((s) => sec(s.seconds)),
    // Разбор уже привёл к ответу — повторять его отдельной сценой незачем
    answer: task.answerRecap === false ? 0 : sec(task.answerSeconds ?? 7),
    // CTA-карточка по ТЗ: 2-3 секунды
    outro: sec(3),
  };
};

export const totalFrames = (task: TaskDef): number => {
  const s = buildScenes(task);
  return (
    s.title +
    s.problem +
    s.solutions.reduce((a, b) => a + b, 0) +
    s.answer +
    s.outro
  );
};
