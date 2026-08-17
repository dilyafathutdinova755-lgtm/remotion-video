import type { ArtName, Cue, Token } from "./types";

/**
 * Мелкие помощники для описания задач.
 *
 * Условие приходится хранить пословно (из длины слов считается время на
 * прочтение), но выписывать каждое слово руками — верный способ насажать
 * опечаток. Поэтому текст пишется строкой, а разбивает его `w`.
 */

/** Текст условия → массив слов. */
export const w = (text: string): Token[] => text.trim().split(/\s+/);

/** Подсказка-картинка. */
export const art = (names: ArtName[], label: string): Cue => ({ art: names, label });

/** Подсказка-число: величины вроде «8 литров» картинкой не изобразить. */
export const num = (number: string, unit: string, label?: string): Cue => ({
  number,
  unit,
  label: label ?? `${number} ${unit}`,
});

/** Знак вопроса в конце условия. */
export const question = (): Cue => art(["question"], "вопрос");
