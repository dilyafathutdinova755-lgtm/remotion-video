import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, FONTS } from "./theme";
import { PROBLEM_WORDS, WORD_STARTS, WORD_FRAMES } from "./timing";

/**
 * Одно слово условия. Подсвечивается только то слово, которое читают
 * прямо сейчас: прочитанные слова заливку не сохраняют.
 */
const Word: React.FC<{ word: string; index: number; readStart: number }> = ({
  word,
  index,
  readStart,
}) => {
  const frame = useCurrentFrame();

  const start = readStart + WORD_STARTS[index];
  const end = start + WORD_FRAMES[index];

  // Заливка догоняет слово и уходит вместе с ним — без следа
  const active = interpolate(frame, [start - 3, start + 2, end - 2, end + 4], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        padding: "2px 10px",
        transform: `scale(${1 + active * 0.05})`,
        transformOrigin: "center bottom",
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          background: COLORS.activeBg,
          opacity: active,
          boxShadow: `0 6px 18px rgba(29,78,216,${0.16 * active})`,
        }}
      />
      <span style={{ position: "relative", color: active > 0.4 ? COLORS.deep : COLORS.text }}>
        {word}
      </span>
    </span>
  );
};

/**
 * Текст задачи. С `readStart` слова подсвечиваются по ходу чтения,
 * без него — просто статичный текст (нужен на сцене с таймером).
 */
export const ProblemText: React.FC<{
  size: number;
  readStart?: number;
}> = ({ size, readStart }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      rowGap: size * 0.3,
      columnGap: 2,
      fontFamily: FONTS.body,
      fontWeight: 400,
      fontSize: size,
      lineHeight: 1.34,
      color: COLORS.text,
    }}
  >
    {PROBLEM_WORDS.map((w, i) =>
      readStart === undefined ? (
        <span key={`${w}-${i}`} style={{ padding: "2px 10px" }}>
          {w}
        </span>
      ) : (
        <Word key={`${w}-${i}`} word={w} index={i} readStart={readStart} />
      ),
    )}
  </div>
);

/** Белая карточка, в которой живёт условие. */
export const ProblemCard: React.FC<{
  children: React.ReactNode;
  padding?: number;
}> = ({ children, padding = 46 }) => (
  <div
    style={{
      padding,
      borderRadius: 34,
      background: COLORS.card,
      border: `2px solid ${COLORS.cardBorder}`,
      boxShadow: "0 22px 60px rgba(18,51,110,0.10)",
    }}
  >
    {children}
  </div>
);

/** Плашка-заголовок над карточкой. */
export const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      marginBottom: 28,
      padding: "10px 28px",
      borderRadius: 999,
      background: COLORS.blue,
      color: "#fff",
      fontFamily: FONTS.display,
      fontWeight: 400,
      fontSize: 32,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      boxShadow: "0 8px 24px rgba(29,78,216,0.26)",
    }}
  >
    {children}
  </div>
);
