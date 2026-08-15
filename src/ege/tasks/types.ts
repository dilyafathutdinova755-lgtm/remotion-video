import type { ReactNode } from "react";

/**
 * Иллюстрация к куску условия. В тексте не рисуется — всплывает на полке
 * под карточкой, когда чтение доходит до этого места.
 *
 * Эмодзи несколько, чтобы количество отражало условие: «двое рабочих» —
 * это две наклейки, а не одна.
 */
export type StickerGroup = { emojis: string[]; label: string };

/** Кусок условия: слово или привязка иллюстрации к этому месту текста. */
export type Token = string | StickerGroup;

export const isSticker = (t: Token): t is StickerGroup => typeof t !== "string";

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
