import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS } from "./theme";

/**
 * Плашка «ЕГЭ тренажёр» в правом верхнем углу. Появляется в начале
 * и остаётся на экране весь ролик.
 */
export const Watermark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 25 });
  const opacity = interpolate(enter, [0, 1], [0, 1]);
  const shift = interpolate(enter, [0, 1], [26, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 46,
        right: 56,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 24px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.78)",
        border: `1.5px solid ${COLORS.cardBorder}`,
        boxShadow: "0 6px 22px rgba(18,51,110,0.10)",
        opacity,
        transform: `translateX(${shift}px)`,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: COLORS.blue,
          boxShadow: `0 0 0 5px ${COLORS.blue}22`,
        }}
      />
      <span
        style={{
          fontFamily: FONTS.head,
          fontWeight: 700,
          fontSize: 27,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: COLORS.deep,
        }}
      >
        ЕГЭ тренажёр
      </span>
    </div>
  );
};
