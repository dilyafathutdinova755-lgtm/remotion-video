import type { ReactNode } from "react";

/** Кусок условия — слово. */
export type Token = string;

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

  /** Предмет — строка под заголовком. По умолчанию профильная математика. */
  subject?: string;
  /** «задачи» или «задания» в заголовке. */
  titleNoun?: string;
  /** Надпись на плашке над условием. */
  pillLabel?: string;

  /**
   * Формулировка задания над самим условием. У математики её нет — там
   * задача и есть формулировка; у русского это отдельная строка вида
   * «Отредактируйте предложение…».
   */
  instruction?: string;

  /** Условие, разбитое на слова. */
  tokens: Token[];
  /** Кегль условия — длинные тексты набираем мельче, чтобы влезали. */
  problemSize: number;
  /** Кегль условия на сцене с таймером. */
  timerSize: number;

  solutions: SolutionScene[];

  /** Подводка над формулой ответа. */
  answerLead: string;
  answerFormula: ReactNode;
  /** Сам ответ. */
  answer: string;
  /** Единицы измерения; у ответа-слова их нет. */
  unit?: string;
  /** Кегль ответа. Не задан — считается из длины слова. */
  answerSize?: number;
  /** Строчка проверки под ответом. */
  check: ReactNode;
};

/**
 * Кегль ответа: длинное слово вроде «преследовало» в 132 пункта не влезает
 * по ширине кадра, поэтому размер подбирается по числу знаков.
 */
export const answerFontSize = (task: TaskDef): number =>
  task.answerSize ?? Math.min(132, Math.floor(1111 / Math.max(task.answer.length, 1)));
