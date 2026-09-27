/**
 * Алгоритмическое выделение ALL-CAPS кириллических лексических форм внутри
 * строки condition_text (задание №7 по русскому и подобные) — ТОЛЬКО
 * визуальное форматирование, исходная строка не меняется, только
 * размечается на части для покраски. Держите в синхроне с
 * scripts/dynamic-task/four-slides.mjs (highlightCapsTokens) — та же
 * регулярка, используется в regression-тестах (node-раннер не может
 * импортировать .ts напрямую, поэтому логика продублирована в двух малых,
 * стабильных местах, а не шарится через сборку).
 */
export type HighlightPart = { text: string; caps: boolean };

const CAPS_TOKEN_RE = /([А-ЯЁ]+(?:-[А-ЯЁ]+)*)/g;

export const highlightCapsTokens = (line: string): HighlightPart[] =>
  String(line)
    .split(CAPS_TOKEN_RE)
    .filter((part) => part !== "")
    .map((part) => {
      const isWholeCapsRun = /^[А-ЯЁ]+(?:-[А-ЯЁ]+)*$/.test(part);
      const letterCount = part.replace(/-/g, "").length;
      return { text: part, caps: isWholeCapsRun && letterCount >= 2 };
    });
