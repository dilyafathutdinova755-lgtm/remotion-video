import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS, FONTS, PAD } from "../../theme";
import { AppLogo } from "../../AppLogo";
import { useTask } from "../../TaskContext";
import { isProfileMathStepsTask } from "../../tasks/types";
import { fAt } from "./shared";

/**
 * Плашка «ЕГЭ тренажёр» в правом верхнем углу — визуально идентична общему
 * Watermark.tsx, локальная fps-осознанная копия по той же причине, что и
 * остальные сцены этого контракта (см. shared.ts).
 */
export const ProfileMathWatermark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();
  if (!isProfileMathStepsTask(task)) return null;

  const enter = spring({
    frame: frame - fAt(fps, 8),
    fps,
    config: { damping: 200 },
    durationInFrames: fAt(fps, 25),
  });
  const leave = interpolate(
    frame,
    [durationInFrames - fAt(fps, 18), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const opacity = interpolate(enter, [0, 1], [0, 1]) * leave;
  const shift = interpolate(enter, [0, 1], [26, 0]);

  return (
    <div
      style={{
        position: "absolute",
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
      <AppLogo size={54} compact examType={task.examType} />
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
        {task.examType === "oge" ? "ОГЭ тренажёр" : "ЕГЭ тренажёр"}
      </span>
    </div>
  );
};
