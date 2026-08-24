import { useCurrentFrame, interpolate } from "remotion";
import { COLORS, FONTS } from "./theme";
import { READ_DELAY, OPTION_STEP } from "./timing";
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
      boxShadow: `0 22px 60px ${COLORS.shadow}`,
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
      background: COLORS.accent,
      color: "#fff",
      fontFamily: FONTS.display,
      fontWeight: 400,
      fontSize: 32,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      boxShadow: `0 8px 24px ${COLORS.accentGlow}`,
    }}
  >
    {children}
  </div>
);

/**
 * Пять словосочетаний задания 7: выделенное слово набрано капсом прямо в
 * строке, поэтому его достаточно найти регуляркой и подсветить. Строки
 * проявляются одна за другой — читать их вслух не надо, надо разглядеть.
 */
export const OptionList: React.FC<{ options: string[]; size: number }> = ({
  options,
  size,
}) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.34 }}>
      {options.map((option, i) => {
        const at = READ_DELAY + i * OPTION_STEP;
        const appear = interpolate(frame, [at, at + 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={option}
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: size,
              lineHeight: 1.2,
              color: COLORS.text,
              opacity: appear,
              transform: `translateX(${(1 - appear) * 16}px)`,
            }}
          >
            {option.split(/([А-ЯЁA-Z]{2,})/).map((part, j) =>
              /^[А-ЯЁA-Z]{2,}$/.test(part) ? (
                <span key={j} style={{ color: COLORS.accent, fontWeight: 600 }}>
                  {part}
                </span>
              ) : (
                part
              ),
            )}
          </div>
        );
      })}
    </div>
  );
};
