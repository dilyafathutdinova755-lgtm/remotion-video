import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS, PAD } from "../theme";
import { AppLogo } from "../AppLogo";

/** Финальный экран: иконка приложения и призыв скачать. */
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = spring({
    frame: frame - 2,
    fps,
    config: { damping: 13, mass: 0.8, stiffness: 120 },
    durationInFrames: 40,
  });
  const at = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 200 }, durationInFrames: 28 });

  const name = at(22);
  const cta = at(38);
  const link = at(54);

  const lift = (s: number, d = 26) => ({
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [d, 0])}px)`,
  });

  // Мягкая пульсация иконки после появления
  const pulse = 1 + Math.sin(Math.max(frame - 40, 0) / 14) * 0.012;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `0 ${PAD}px`,
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
            transform: `scale(${interpolate(logo, [0, 1], [0.68, 1]) * pulse})`,
          }}
        >
          <AppLogo size={320} />
        </div>

        <div
          style={{
            ...lift(name, 22),
            fontFamily: FONTS.display,
            fontWeight: 500,
            fontSize: 72,
            color: COLORS.deep,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginTop: 52,
          }}
        >
          ЕГЭ тренажёр
        </div>

        <div
          style={{
            ...lift(cta, 26),
            fontFamily: FONTS.head,
            fontWeight: 800,
            fontSize: 78,
            color: COLORS.blue,
            letterSpacing: "-0.015em",
            marginTop: 40,
          }}
        >
          Скачивай бесплатно
        </div>

        <div
          style={{
            ...lift(link, 22),
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 34,
            padding: "22px 44px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.8)",
            border: `2px solid ${COLORS.cardBorder}`,
            boxShadow: "0 14px 40px rgba(18,51,110,0.10)",
            fontFamily: FONTS.body,
            fontWeight: 300,
            fontSize: 42,
            color: COLORS.text,
          }}
        >
          <span style={{ fontSize: 38 }}>↑</span>
          Ссылка в шапке профиля
        </div>
      </div>
    </AbsoluteFill>
  );
};
