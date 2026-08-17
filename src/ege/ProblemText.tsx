import { COLORS, FONTS } from "./theme";
import type { Token } from "./tasks/types";

/**
 * Текст задачи. Слова разложены отдельными span-ами: так строки ровно
 * переносятся по ширине карточки.
 *
 */
export const ProblemText: React.FC<{
  tokens: Token[];
  size: number;
}> = ({ tokens, size }) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      rowGap: size * 0.16,
      columnGap: 2,
      fontFamily: FONTS.body,
      fontWeight: 400,
      fontSize: size,
      lineHeight: 1.2,
      color: COLORS.text,
    }}
  >
    {tokens.map((t, i) => (
      <span key={`w-${i}`} style={{ padding: "2px 10px" }}>
        {t}
      </span>
    ))}
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
