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
import { f30 } from "../../timing";
import { isFourSlidesTask } from "../../tasks/types";
import { highlightCapsTokens } from "./highlight";

/** Кегль условия — короткие словосочетания №6/№7 набираются крупнее длинных. */
const problemSizeFor = (lines: string[]): number => {
  const longest = Math.max(0, ...lines.map((l) => l.length));
  if (longest <= 24) return 52;
  if (longest <= 34) return 46;
  if (longest <= 45) return 40;
  return 36;
};

/**
 * СЛАЙД 2 — PROBLEM (video_structure_version="four-slides-v1").
 *
 * Жёсткие правила контракта (см. отчёт по four-slides-v1):
 *   - instruction ВСЕГДА отдельным приглушённым блоком СНАРУЖИ белой
 *     карточки — никогда не внутри неё;
 *   - condition_text (уже разбитый на строки) — ТОЛЬКО внутри карточки;
 *   - строки появляются постепенно, а не все сразу;
 *   - pause_prompt виден ТОЛЬКО в последние task.pauseSeconds секунд сцены
 *     (окно вычисляется из реальной длительности сцены — durationInFrames
 *     этого Series.Sequence, — а не захардкожено);
 *   - explanation здесь НИКОГДА не показывается (в four-slides-v1 его тут
 *     вообще нет — оно живёт только в FourSlidesAnswerScene).
 *
 * Тайминг появления строк: перед вычислением reveal-окна из реальной
 * длительности сцены вычитается task.pauseSeconds — то, что остаётся,
 * делится поровну между строками. Это работает одинаково для обоих
 * режимов: при readTaskAloud=false реальная длительность сцены равна ровно
 * revealSeconds+pauseSeconds (см. align.py), поэтому окно оказывается точно
 * revealSeconds; при readTaskAloud=true сцена длится «время чтения
 * task_voiceover_text» + pauseSeconds, и строки распределяются по времени
 * чтения — секунда в секунду по реальной озвучке, без выдумывания процента.
 */
export const FourSlidesProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();
  if (!isFourSlidesTask(task)) return null;

  const enter = spring({
    frame: frame - f30(4),
    fps,
    config: { damping: 200 },
    durationInFrames: f30(15),
  });

  const lines = task.conditionLines;
  const problemDurationSeconds = durationInFrames / fps;
  const revealWindowSeconds = Math.max(0, problemDurationSeconds - task.pauseSeconds);
  const perLineSeconds = lines.length > 0 ? revealWindowSeconds / lines.length : 0;
  const pauseWindowStartFrame = Math.round(revealWindowSeconds * fps);

  const size = problemSizeFor(lines);

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

        {/* instruction — ВСЕГДА снаружи карточки, приглушённым блоком.
            Контракт four-slides-v1 запрещает ей попадать внутрь. */}
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
          {/* condition_text — ТОЛЬКО внутри карточки, ничего больше. Строки
              появляются одна за другой (progressive reveal), а не все
              разом; уже показанные остаются полностью видимыми до конца
              сцены. */}
          <div style={{ display: "flex", flexDirection: "column", gap: size * 0.34 }}>
            {lines.map((line, i) => {
              const at = i * perLineSeconds * fps;
              const appear = interpolate(frame, [at, at + f30(10)], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={i}
                  style={{
                    fontFamily: FONTS.body,
                    fontWeight: 300,
                    fontSize: size,
                    lineHeight: 1.2,
                    color: COLORS.text,
                    opacity: appear,
                    transform: `translateX(${(1 - appear) * 16}px)`,
                  }}
                >
                  {highlightCapsTokens(line).map((part, j) =>
                    part.caps ? (
                      <span key={j} style={{ color: COLORS.accent, fontWeight: 600 }}>
                        {part.text}
                      </span>
                    ) : (
                      <span key={j}>{part.text}</span>
                    ),
                  )}
                </div>
              );
            })}
          </div>
        </ProblemCard>

        {/* pause_prompt — ТОЛЬКО визуальная подсказка на финальные
            pauseSeconds секунды: не озвучивается (аудио здесь уже реальная
            тишина, см. align.py), не перекрывает ни instruction, ни
            condition_text — стоит отдельным блоком ниже карточки. */}
        {task.pausePrompt ? (
          <div
            style={{
              marginTop: 34,
              textAlign: "center",
              width: "100%",
              opacity: interpolate(
                frame,
                [pauseWindowStartFrame, pauseWindowStartFrame + f30(10)],
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
