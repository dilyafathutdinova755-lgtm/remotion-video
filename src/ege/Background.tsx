import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { COLORS } from "./theme";

/**
 * Бело-синий фон, общий для всего ролика: он не перерисовывается между
 * сценами, поэтому переходы выглядят непрерывными.
 */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Очень медленный дрейф пятен, чтобы кадр не выглядел статичным
  const t = frame / durationInFrames;
  const drift = interpolate(t, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${COLORS.bgTop} 0%, #f4f8fe 45%, ${COLORS.bgBottom} 100%)`,
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 900px at ${16 + drift * 8}% ${10 + drift * 4}%, ${COLORS.blob1}88 0%, transparent 62%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(820px 820px at ${88 - drift * 9}% ${90 - drift * 5}%, ${COLORS.blob2}cc 0%, transparent 60%)`,
        }}
      />

      {/* Тонкая сетка «в клетку», как в тетради — очень слабая */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${COLORS.blueLine}22 1px, transparent 1px), linear-gradient(90deg, ${COLORS.blueLine}22 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 70% 50% at 50% 50%, black 10%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 50% at 50% 50%, black 10%, transparent 80%)",
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};
