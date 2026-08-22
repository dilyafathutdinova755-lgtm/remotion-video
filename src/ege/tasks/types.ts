import type { ReactNode } from "react";

/** Кусок условия — слово. */
export type Token = string;

/** Сцена решения: сколько секунд держится и что рисует. */
export type SolutionScene = {
  seconds: number;
  Component: React.FC;
};

/** Всё, что есть у любой задачи независимо от того, чем она заканчивается. */
type TaskCommon = {
  /** id композиции Remotion, например "Task10". */
  id: string;
  /** Номер задания в ЕГЭ. */
  number: number;

  /** Предмет — строка под заголовком. По умолчанию профильная математика. */
  subject?: string;
  /** Вопрос на хук-кадре в первые секунды ролика. */
  hook?: string;
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

  /** Пошаговый разбор. У коротких заданий его может не быть вовсе. */
  solutions: SolutionScene[];

  /** Длительность финальной сцены: если разбора нет, ей нужно больше времени. */
  answerSeconds?: number;
};

/** Ответ-значение: число или слово, которое вписывают в бланк. */
type ValueAnswer = {
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
  concept?: undefined;
};

/**
 * Ответ-текст: задание 19 по истории просит не значение, а два абзаца —
 * смысл понятия и факт, который его конкретизирует.
 */
type ConceptAnswer = {
  concept: {
    definition: ReactNode;
    fact: ReactNode;
  };
};

/**
 * Полное описание задачи. Всё, что меняется от ролика к ролику, живёт
 * здесь; сцены забирают это из контекста и остаются общими.
 */
export type TaskDef = TaskCommon & (ValueAnswer | ConceptAnswer);

/** Задача с ответом-значением: сцена ответа работает только с такими. */
export type ValueTask = TaskCommon & ValueAnswer;

/**
 * Кегль ответа: длинное слово вроде «преследовало» в 132 пункта не влезает
 * по ширине кадра, поэтому размер подбирается по числу знаков.
 */
export const answerFontSize = (task: ValueTask): number =>
  task.answerSize ??
  Math.min(132, Math.floor(1111 / Math.max(task.answer.length, 1)));
