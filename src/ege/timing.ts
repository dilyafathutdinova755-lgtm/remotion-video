/**
 * Тайминг ролика. Все длительности — в кадрах при 30 fps.
 *
 * Длительность сцены с условием не задаётся руками, а считается из самого
 * текста: каждому слову отводится время пропорционально его длине. Поэтому
 * условие можно править, не пересчитывая кадры.
 */

import { VIDEO } from "./theme";
import { isFourSlidesTask, type FourSlidesTaskDef, type TaskDef, type Token } from "./tasks/types";

/**
 * Старая модель задачи (всё, кроме four-slides-v1) — buildScenes() и всё,
 * что она использует, рассчитаны только на эту форму; four-slides-v1 своя
 * тайминг-логика ниже (buildFourSlidesScenes/totalFourSlidesFrames).
 */
type OldTaskDef = Exclude<TaskDef, FourSlidesTaskDef>;

export const sec = (s: number) => Math.round(s * VIDEO.fps);

/**
 * Длительности анимаций подбирались на глаз при 30 fps и записаны в кадрах.
 * При смене частоты их надо пересчитать, иначе всё пойдёт вдвое быстрее —
 * включая скорость чтения условия, от которой зависит длина сцены.
 */
export const f30 = (frames: number) => Math.round((frames * VIDEO.fps) / 30);

/**
 * Сколько кадров нужно на слово: короткие служебные пробегаются быстро,
 * длинные — дольше. Плюс небольшая пауза на знаках препинания.
 */
export const wordFrames = (word: string): number => {
  const letters = word.replace(/[^0-9A-Za-zА-Яа-яЁё%]/g, "").length;
  const pause = /[.,?!]$/.test(word) ? 5 : 0;
  return f30(Math.round(7 + letters * 1.25) + pause);
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
export const instructionFrames = (task: OldTaskDef): number =>
  task.instruction
    ? task.instruction
        .trim()
        .split(/\s+/)
        .reduce((acc, word) => acc + wordFrames(word), 0)
    : 0;

/** Сколько кадров занимает прочтение всего, что есть на карточке. */
/** Появление списка вариантов: по строке за раз, читать их вслух не надо. */
export const OPTION_STEP = f30(12);

export const problemReadingFrames = (task: OldTaskDef): number => {
  if (task.options) {
    // Формулировку проговаривают, варианты только показывают
    return instructionFrames(task) + task.options.length * OPTION_STEP;
  }

  const raw = instructionFrames(task) + buildReading(task.tokens).total;
  // Длинный текст глазами просматривают быстрее, чем короткий читают
  const dense = task.tokens.length > 45 ? 0.86 : 1;
  return Math.round(raw * dense);
};

export const buildScenes = (task: OldTaskDef): Scenes => {
  // Тайминг по реальной озвучке — длительности сцен берутся из секунд в
  // audioSync, а не оцениваются по числу слов (см. PLAYBOOK.md).
  if (task.audioSync) {
    const a = task.audioSync;
    // answerSec есть только там, где сцена ответа звучит отдельно от шагов
    // разбора (история-19, где шагов нет вовсе). У математики её нет: там
    // ответ — последняя реплика последнего шага, и `scenes.answer` остаётся
    // 0 через answerRecap: false.
    const hasAnswerBreak = a.answerSec !== undefined;
    const starts = [
      0,
      a.conditionSec,
      ...a.stepSec,
      ...(hasAnswerBreak ? [a.answerSec as number] : []),
      a.outroSec,
      a.totalSec,
    ];
    // starts: [хук=0, условие, шаг1, шаг2, …, (ответ), финал, конец]
    const durations = starts.slice(1).map((s, i) => sec(s - starts[i]));
    const stepCount = a.stepSec.length;
    return {
      title: durations[0],
      problem: durations[1],
      solutions: durations.slice(2, 2 + stepCount),
      answer: hasAnswerBreak
        ? durations[2 + stepCount]
        : task.answerRecap === false
          ? 0
          : sec(task.answerSeconds ?? 7),
      outro: durations[durations.length - 1],
    };
  }

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

/**
 * Тайминг для video_structure_version="four-slides-v1" — четыре сцены
 * (Title/Problem/Answer/CTA) считаются НАПРЯМУЮ из реальных границ
 * audioSync (см. align.py: run_four_slides_v1), без всякой оценки по
 * словам. ЗАПРЕЩЕНО: возвращать старое поведение "ProblemScene во время
 * explanation" — эта функция не даёт для этого никакой возможности,
 * Problem у four-slides-v1 всегда заканчивается ровно на answerSec.
 */
export type FourSlidesScenes = {
  title: number;
  problem: number;
  answer: number;
  outro: number;
};

export const buildFourSlidesScenes = (task: FourSlidesTaskDef): FourSlidesScenes => {
  const a = task.audioSync;
  return {
    title: sec(a.introSec),
    problem: sec(a.answerSec - a.introSec),
    answer: sec(a.outroSec - a.answerSec),
    outro: sec(a.totalSec - a.outroSec),
  };
};

export const totalFourSlidesFrames = (task: FourSlidesTaskDef): number => {
  const s = buildFourSlidesScenes(task);
  return s.title + s.problem + s.answer + s.outro;
};

export const totalFrames = (task: OldTaskDef): number => {
  const s = buildScenes(task);
  return (
    s.title +
    s.problem +
    s.solutions.reduce((a, b) => a + b, 0) +
    s.answer +
    s.outro
  );
};

/** Диспетчер по video_structure_version — нужен там, где список задач
 * смешивает старую модель и four-slides-v1 (Root.tsx: <Composition>
 * перебирает все TASKS одним циклом). */
export const totalFramesFor = (task: TaskDef): number =>
  isFourSlidesTask(task) ? totalFourSlidesFrames(task) : totalFrames(task);
