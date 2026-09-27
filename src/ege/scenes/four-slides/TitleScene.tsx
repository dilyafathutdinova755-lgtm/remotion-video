import { f30 } from "../../timing";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../../theme";
import { useTask } from "../../TaskContext";
import { isFourSlidesTask } from "../../tasks/types";

/**
 * СЛАЙД 1 — TITLE (video_structure_version="four-slides-v1").
 *
 * Отдельный титульный слайд, живёт ровно во время intro_text (см.
 * timing.ts: buildFourSlidesScenes — длительность этой сцены и есть
 * audioSync.introSec). Показывает intro_text целиком, как есть — тот же
 * визуальный язык, что и у старого HookScene (шрифт/вес/цвет), но без
 * ручной разбивки на строки: intro_text — обычное предложение, а не
 * заранее подготовленный список строк.
 */
export const FourSlidesTitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();
  if (!isFourSlidesTask(task)) return null;

  const enter = spring({
    frame: frame - f30(2),
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 140 },
    durationInFrames: f30(20),
  });

  const out = interpolate(
    frame,
    [durationInFrames - f30(7), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
        textAlign: "center",
        opacity: out,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.head,
          fontWeight: 800,
          fontSize: 72,
          lineHeight: 1.18,
          letterSpacing: "-0.02em",
          color: COLORS.text,
          maxWidth: 900,
          opacity: interpolate(enter, [0, 0.4], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: `scale(${interpolate(enter, [0, 1], [0.86, 1])})`,
        }}
      >
        {task.introText}
      </div>
    </AbsoluteFill>
  );
};
