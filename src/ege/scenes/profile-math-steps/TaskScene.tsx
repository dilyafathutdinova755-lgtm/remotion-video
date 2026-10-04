import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../../theme";
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
 * СЛАЙД 2 — TASK/CONDITION (video_structure_version="chemistry-steps-v1").
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

  const taskSegment = task.audioSync.segments.find((segment) => segment.kind === "task");
  const sceneDurationSeconds = taskSegment
    ? (Math.round(taskSegment.endSec * fps) - Math.round(taskSegment.startSec * fps)) / fps
    : durationInFrames / fps;
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
        {task.instruction ? (
          <div style={{
            fontFamily: FONTS.body,
            fontWeight: 400,
            fontSize: problemSizeFor(task.instruction),
            lineHeight: 1.3,
            color: COLORS.text,
            marginBottom: 30,
            whiteSpace: "pre-line",
          }}>
            {task.instruction}
          </div>
        ) : null}
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            padding: 44,
            borderRadius: 34,
            background: COLORS.card,
            border: `2px solid ${COLORS.cardBorder}`,
            boxShadow: `0 22px 60px ${COLORS.shadow}`,
          }}
        >
          {/* condition_text — только внутри карточки, неизменный, одним блоком. */}
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: size,
              lineHeight: 1.3,
              whiteSpace: "pre-line",
              color: COLORS.text,
            }}
          >
            {task.conditionText.replace(/\s+(?=[1-9]\))/g, "\n")}
          </div>
        {/* Полоса является нижним краем карточки; тайминг — до task/pause. */}
        <div role="progressbar" aria-label="Чтение условия"
          aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(1, frame / Math.max(1, pauseWindowStartFrame)) * 100)}
          style={{position: "absolute", bottom: 0, left: 0, right: 0, height: 7,
            overflow: "hidden", background: COLORS.accentFaint}}>
          <div style={{height: "100%", width: "100%", background: COLORS.accent,
            transformOrigin: "left", transform: `scaleX(${Math.min(1, frame / Math.max(1, pauseWindowStartFrame))})`}} />
        </div>

        </div>

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
