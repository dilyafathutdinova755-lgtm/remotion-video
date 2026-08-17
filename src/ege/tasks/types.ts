import type { ReactNode } from "react";

/** Векторные иллюстрации из src/ege/Art.tsx. */
export type ArtName =
  | "worker"
  | "order"
  | "duo"
  | "question"
  | "pipe"
  | "gear"
  | "ship"
  | "car"
  | "moto"
  | "flask"
  | "bike"
  | "speed";

/**
 * Подсказка к куску условия. В тексте не рисуется — всплывает крупно
 * в нижней части кадра, когда чтение доходит до этого места.
 *
 * Либо картинки (несколько, чтобы количество отражало условие: «двое
 * рабочих» — две фигурки), либо просто число: часы и минуты картинкой
 * не изобразить, циферблат тут только мешает.
 */
export type Cue =
  | { art: ArtName[]; label: string }
  | { number: string; unit: string; label: string };

/** Кусок условия: слово или привязка подсказки к этому месту текста. */
export type Token = string | Cue;

export const isCue = (t: Token): t is Cue => typeof t !== "string";

export const isNumberCue = (c: Cue): c is { number: string; unit: string; label: string } =>
  "number" in c;

/** Сцена решения: сколько секунд держится и что рисует. */
export type SolutionScene = {
  seconds: number;
  Component: React.FC;
};

/**
 * Полное описание задачи. Всё, что меняется от ролика к ролику, живёт
 * здесь; сцены забирают это из контекста и остаются общими.
 */
export type TaskDef = {
  /** id композиции Remotion, например "Task10". */
  id: string;
  /** Номер задания в ЕГЭ. */
  number: number;

  /** Условие: слова вперемешку со стикерами. */
  tokens: Token[];
  /** Кегль условия — длинные тексты набираем мельче, чтобы влезали. */
  problemSize: number;
  /** Кегль условия на сцене с таймером. */
  timerSize: number;

  solutions: SolutionScene[];

  /** Подводка над формулой ответа. */
  answerLead: string;
  answerFormula: ReactNode;
  /** Само число ответа и единицы измерения. */
  answer: string;
  unit: string;
  /** Строчка проверки под ответом. */
  check: ReactNode;
};
