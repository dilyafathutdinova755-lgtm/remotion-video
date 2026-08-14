import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Reveal, V, FormulaCard } from "../MathBits";
import { COLORS, FONTS, PAD } from "../theme";

export const AnswerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Ответ появляется с упругим «хлопком»
  const pop = spring({
    frame: frame - 50,
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 130 },
    durationInFrames: 40,
  });

  const out = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${PAD}px`,
        opacity: out,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          width: "100%",
        }}
      >
        <Reveal at={0}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 300,
              fontSize: 40,
              color: COLORS.textMuted,
              textAlign: "center",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Футболка дороже кепки на
          </div>
        </Reveal>

        <Reveal at={14}>
          <FormulaCard style={{ fontSize: 50, fontWeight: 600 }}>
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
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "38px 78px",
            borderRadius: 32,
            background: COLORS.blue,
            boxShadow: "0 24px 64px rgba(29,78,216,0.34)",
            opacity: interpolate(pop, [0, 0.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(pop, [0, 1], [0.72, 1])})`,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 300,
              fontSize: 38,
              color: "#bcd4ff",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
            }}
          >
            Ответ
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 26 }}>
            <span
              style={{
                fontFamily: FONTS.head,
                fontWeight: 800,
                fontSize: 132,
                color: "#fff",
                lineHeight: 1.1,
              }}
            >
              285
            </span>
            <span
              style={{
                fontFamily: FONTS.body,
                fontWeight: 300,
                fontSize: 44,
                color: "#dbe7ff",
              }}
            >
              рублей
            </span>
          </div>
        </div>

        <Reveal at={110}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 32px",
              borderRadius: 999,
              background: COLORS.okBg,
              border: `2px solid ${COLORS.ok}33`,
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 32,
              color: COLORS.ok,
              textAlign: "center",
            }}
          >
            <span>✓</span>
            3&nbsp;·&nbsp;165 = 495 — ровно 55% от 2&nbsp;·&nbsp;450 = 900
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
