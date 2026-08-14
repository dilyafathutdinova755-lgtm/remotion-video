import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Reveal, V, FormulaCard } from "../MathBits";
import { COLORS, FONTS } from "../theme";

export const AnswerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ответ появляется с упругим «хлопком»
  const pop = spring({
    frame: frame - 50,
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 130 },
    durationInFrames: 40,
  });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 140px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 44 }}>
        <Reveal at={0}>
          <div
            style={{
              fontFamily: FONTS.body,
              fontSize: 44,
              color: COLORS.textMuted,
              textAlign: "center",
            }}
          >
            Футболка дороже кепки на
          </div>
        </Reveal>

        <Reveal at={14}>
          <FormulaCard style={{ fontSize: 56, fontWeight: 600 }}>
            <V>x</V>
            <span style={{ margin: "0 14px" }}>−</span>
            <V>y</V>
            <span style={{ margin: "0 18px" }}>=</span>
            450
            <span style={{ margin: "0 14px" }}>−</span>
            165
            <span style={{ margin: "0 18px" }}>=</span>
            <span style={{ color: COLORS.blue, fontWeight: 700 }}>285</span>
          </FormulaCard>
        </Reveal>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 30,
            padding: "30px 72px",
            borderRadius: 28,
            background: COLORS.blue,
            boxShadow: "0 22px 60px rgba(29,78,216,0.32)",
            opacity: interpolate(pop, [0, 0.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(pop, [0, 1], [0.72, 1])})`,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.head,
              fontWeight: 700,
              fontSize: 44,
              color: "#bcd4ff",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            Ответ
          </span>
          <span
            style={{
              fontFamily: FONTS.head,
              fontWeight: 800,
              fontSize: 108,
              color: "#fff",
              lineHeight: 1,
            }}
          >
            285
          </span>
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 500,
              fontSize: 44,
              color: "#dbe7ff",
            }}
          >
            рублей
          </span>
        </div>

        <Reveal at={110}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "16px 34px",
              borderRadius: 999,
              background: COLORS.okBg,
              border: `2px solid ${COLORS.ok}33`,
              fontFamily: FONTS.body,
              fontSize: 34,
              color: COLORS.ok,
              fontWeight: 500,
            }}
          >
            <span style={{ fontSize: 30 }}>✓</span>
            Проверка: 3&nbsp;·&nbsp;165 = 495, это ровно 55% от 2&nbsp;·&nbsp;450 = 900
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
