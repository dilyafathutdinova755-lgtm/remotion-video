import { f30 } from "./timing";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS, PAD } from "./theme";
import { AppLogo } from "./AppLogo";

/**
 * Плашка «ЕГЭ тренажёр» в правом верхнем углу. Появляется в начале
 * и остаётся на экране весь ролик.
 */
export const Watermark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({
    frame: frame - f30(8),
    fps,
    config: { damping: 200 },
    durationInFrames: f30(25),
  });
  // Уходит перед финальным экраном, чтобы не дублировать большую иконку
  const leave = interpolate(
    frame,
    [durationInFrames - f30(18), durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const opacity = interpolate(enter, [0, 1], [0, 1]) * leave;
  const shift = interpolate(enter, [0, 1], [26, 0]);

  return (
    <div
      style={{
        position: "absolute",
        // Ниже шапки Reels/Shorts — иначе интерфейс перекрывает надпись
        top: 232,
        right: PAD,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "10px 22px 10px 12px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.82)",
        border: `1.5px solid ${COLORS.cardBorder}`,
        boxShadow: `0 6px 22px ${COLORS.shadow}`,
        opacity,
        transform: `translateX(${shift}px)`,
      }}
    >
      <AppLogo size={54} compact />
      <span
        style={{
          fontFamily: FONTS.display,
          fontWeight: 500,
          fontSize: 30,
          letterSpacing: "0.13em",
          textTransform: "uppercase",
          color: COLORS.deep,
        }}
      >
        ЕГЭ тренажёр
      </span>
    </div>
  );
};
