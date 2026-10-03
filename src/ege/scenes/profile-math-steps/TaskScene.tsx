import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../../theme";
import { ProblemCard, Pill } from "../../ProblemText";
import { useTask } from "../../TaskContext";
import { isProfileMathStepsTask } from "../../tasks/types";
import { fAt } from "./shared";

/** Кегль условия — длинные тексты набираем мельче, чтобы влезали. */
const problemSizeFor = (text: string): number => {
  const len = text.length;
  if (len <= 90) return 44;
  if (len <= 160) return 40;
  if (len <= 240) return 36;
  return 32;
};

/**
 * СЛАЙД 2 — TASK/CONDITION (video_structure_version="profile-math-steps-v2").
 *
 * Фикс №1: эта сцена — ЕДИНСТВЕННОЕ место, где начинает звучать условие
 * (audioSync "task"-сегмент = ровно длительность этой сцены, реальная
 * forced-alignment граница из align.py, не доля длины текста).
 *
 * Фикс №2: после прочтения условия идёт task.pauseSeconds секунд РЕАЛЬНОЙ
 * тишины (физически вставленной в аудио align.py) — pause_prompt появляется
 * ТОЛЬКО в эти финальные секунды (вычисляется из фактической durationInFrames
 * этой сцены, не захардкожено), сама плашка не озвучивается никак — это
 * чисто визуальный элемент.
 *
 * instruction — вне карточки; condition_text — внутри, неизменный экранный
 * текст, одним блоком (не построчный reveal — в отличие от four-slides-v1,
 * здесь это обычный параграф, а не список словосочетаний).
 */
export const ProfileMathTaskScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();
  if (!isProfileMathStepsTask(task)) return null;

  const enter = spring({
    frame: frame - fAt(fps, 4),
    fps,
    config: { damping: 200 },
    durationInFrames: fAt(fps, 15),
  });

  const sceneDurationSeconds = durationInFrames / fps;
  const pauseWindowStartFrame = Math.round(
    Math.max(0, sceneDurationSeconds - task.pauseSeconds) * fps,
  );

  const size = problemSizeFor(task.conditionText);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
      }}
    >
      <div
        style={{
          width: "100%",
          opacity: interpolate(enter, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        }}
      >
        <Pill>{task.pillLabel ?? "Задание"}</Pill>

        {/* instruction — всегда снаружи карточки. */}
        <div
          style={{
            fontFamily: FONTS.body,
            fontWeight: 300,
            fontSize: size * 0.62,
            lineHeight: 1.3,
            color: COLORS.textMuted,
            opacity: 0.82,
            marginBottom: 22,
          }}
        >
          {task.instruction}
        </div>

        <ProblemCard padding={44}>
          {/* condition_text — только внутри карточки, неизменный, одним блоком. */}
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: size,
              lineHeight: 1.3,
              color: COLORS.text,
            }}
          >
            {task.conditionText}
          </div>
        </ProblemCard>

        {/* pause_prompt — ТОЛЬКО в финальные task.pauseSeconds секунд, не
            озвучивается (в аудио там уже реальная тишина). */}
        {task.pausePrompt ? (
          <div
            style={{
              marginTop: 34,
              textAlign: "center",
              width: "100%",
              opacity: interpolate(
                frame,
                [pauseWindowStartFrame, pauseWindowStartFrame + fAt(fps, 10)],
                [0, 1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              ),
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 34px",
                borderRadius: 999,
                background: COLORS.accentBg,
                border: `2px solid ${COLORS.accentFaint}`,
                fontFamily: FONTS.body,
                fontWeight: 700,
                fontSize: 36,
                color: COLORS.accent,
                letterSpacing: "0.01em",
              }}
            >
              {task.pausePrompt}
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
