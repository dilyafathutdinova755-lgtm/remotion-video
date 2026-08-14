import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../theme";

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const rise = spring({ frame: frame - 6, fps, config: { damping: 200 }, durationInFrames: 30 });
  const sub = spring({ frame: frame - 22, fps, config: { damping: 200 }, durationInFrames: 28 });
  const line = spring({ frame: frame - 16, fps, config: { damping: 200 }, durationInFrames: 34 });

  // Мягкий уход в конце сцены
  const out = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: out,
        padding: "0 160px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 1480 }}>
        <div
          style={{
            fontFamily: FONTS.head,
            fontWeight: 800,
            fontSize: 108,
            lineHeight: 1.08,
            color: COLORS.deep,
            letterSpacing: "-0.02em",
            opacity: interpolate(rise, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(rise, [0, 1], [40, 0])}px)`,
          }}
        >
          Решение задачи{" "}
          <span
            style={{
              color: COLORS.blue,
              background: "#e6efff",
              borderRadius: 22,
              padding: "0 22px",
              display: "inline-block",
            }}
          >
            10
          </span>
        </div>

        <div
          style={{
            height: 7,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.blueSoft})`,
            margin: "38px auto 34px",
            width: interpolate(line, [0, 1], [0, 420]),
            opacity: 0.9,
          }}
        />

        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 52,
            color: COLORS.textMuted,
            letterSpacing: "-0.005em",
            opacity: interpolate(sub, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(sub, [0, 1], [24, 0])}px)`,
          }}
        >
          в ЕГЭ по профильной математике
        </div>
      </div>
    </AbsoluteFill>
  );
};
