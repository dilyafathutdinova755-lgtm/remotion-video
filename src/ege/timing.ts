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
  timer: number;
  solutions: number[];
  answer: number;
  outro: number;
};

export const buildScenes = (task: TaskDef): Scenes => ({
  title: sec(6),
  problem: READ_DELAY + buildReading(task.tokens).total + sec(1.6),
  timer: sec(8),
  solutions: task.solutions.map((s) => sec(s.seconds)),
  answer: sec(7),
  outro: sec(6),
});

export const totalFrames = (task: TaskDef): number => {
  const s = buildScenes(task);
  return (
    s.title +
    s.problem +
    s.timer +
    s.solutions.reduce((a, b) => a + b, 0) +
    s.answer +
    s.outro
  );
};
