import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../theme";
import { AppLogo } from "../AppLogo";

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const at = (delay: number, duration = 28) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: duration });

  const logo = spring({
    frame: frame - 4,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 120 },
    durationInFrames: 40,
  });
  const app = at(20);
  const line = at(34, 34);
  const title = at(40);
  const sub = at(56);

  const out = interpolate(frame, [durationInFrames - 14, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lift = (s: number, d = 28) => ({
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [d, 0])}px)`,
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
        opacity: out,
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            opacity: interpolate(logo, [0, 0.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(logo, [0, 1], [0.7, 1])})`,
          }}
        >
          <AppLogo size={286} />
        </div>

        <div style={{ ...lift(app, 22), marginTop: 46 }}>
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 40,
              color: COLORS.textMuted,
              letterSpacing: "0.01em",
            }}
          >
            Решаем задачу из приложения
          </div>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 500,
              fontSize: 66,
              color: COLORS.blue,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
              marginTop: 8,
            }}
          >
            ЕГЭ тренажёр
          </div>
        </div>

        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.blueSoft})`,
            margin: "52px 0",
            width: interpolate(line, [0, 1], [0, 300]),
            opacity: 0.9,
          }}
        />

        <div
          style={{
            ...lift(title, 34),
            fontFamily: FONTS.head,
            fontWeight: 800,
            fontSize: 86,
            lineHeight: 1.12,
            color: COLORS.deep,
            letterSpacing: "-0.02em",
          }}
        >
          Решение задачи{" "}
          <span
            style={{
              color: COLORS.blue,
              background: "#e6efff",
              borderRadius: 20,
              padding: "0 20px",
              display: "inline-block",
            }}
          >
            10
          </span>
        </div>

        <div
          style={{
            ...lift(sub, 22),
            fontFamily: FONTS.body,
            fontWeight: 300,
            fontSize: 42,
            color: COLORS.textMuted,
            marginTop: 26,
          }}
        >
          в ЕГЭ по профильной математике
        </div>
      </div>
    </AbsoluteFill>
  );
};
