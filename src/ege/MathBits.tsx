import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "./theme";

/** Математическая переменная: курсив, синий акцент. */
export const V: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontStyle: "italic", fontWeight: 600, color: COLORS.blue }}>{children}</span>
);

/** Обыкновенная дробь, набранная в две строки с чертой. */
export const Frac: React.FC<{
  num: React.ReactNode;
  den: React.ReactNode;
  scale?: number;
}> = ({ num, den, scale = 0.86 }) => (
  <span
    style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      verticalAlign: "middle",
      margin: "0 0.22em",
      fontSize: `${scale}em`,
      lineHeight: 1.12,
      position: "relative",
      top: "-0.06em",
    }}
  >
    <span style={{ padding: "0 0.28em" }}>{num}</span>
    <span
      style={{
        width: "100%",
        height: 3,
        borderRadius: 2,
        background: "currentColor",
        margin: "0.1em 0",
        opacity: 0.85,
      }}
    />
    <span style={{ padding: "0 0.28em" }}>{den}</span>
  </span>
);

/**
 * Появление блока: лёгкий подъём + проявление.
 * `at` — кадр (внутри сцены), на котором блок выходит.
 */
export const Reveal: React.FC<{
  at: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  distance?: number;
}> = ({ at, children, style, distance = 26 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame: frame - at,
    fps,
    config: { damping: 200, mass: 0.7 },
    durationInFrames: 22,
  });

  return (
    <div
      style={{
        opacity: interpolate(s, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(s, [0, 1], [distance, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Карточка с формулой — белая подложка со синей рамкой. */
export const FormulaCard: React.FC<{
  children: React.ReactNode;
  accent?: boolean;
  style?: React.CSSProperties;
}> = ({ children, accent = false, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 40px",
      borderRadius: 20,
      background: accent ? "#eaf2ff" : COLORS.card,
      border: `2px solid ${accent ? COLORS.blueSoft + "66" : COLORS.cardBorder}`,
      boxShadow: "0 10px 30px rgba(18,51,110,0.08)",
      fontFamily: FONTS.body,
      color: COLORS.text,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Заголовок сцены решения: номер шага + подпись. */
export const SceneHeading: React.FC<{ step: string; title: string }> = ({ step, title }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 46 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 62,
        height: 62,
        borderRadius: 18,
        background: COLORS.blue,
        color: "#fff",
        fontFamily: FONTS.head,
        fontWeight: 800,
        fontSize: 32,
        boxShadow: "0 8px 22px rgba(29,78,216,0.30)",
      }}
    >
      {step}
    </div>
    <div
      style={{
        fontFamily: FONTS.head,
        fontWeight: 700,
        fontSize: 44,
        color: COLORS.deep,
        letterSpacing: "-0.01em",
      }}
    >
      {title}
    </div>
  </div>
);
