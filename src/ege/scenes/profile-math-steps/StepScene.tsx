import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, PAD, SAFE } from "../../theme";
import { SceneHeading } from "../../MathBits";
import { Line } from "../../SolutionLayout";
import { useTask } from "../../TaskContext";
import { isProfileMathStepsTask, type ProfileMathStep } from "../../tasks/types";
import { fAt } from "./shared";

/**
 * Хвост в конце сцены — последняя строка должна повисеть, а не мелькнуть
 * (тот же приём и те же "авторские 30fps" числа, что в Solution.tsx:
 * makeSolution, см. TAIL/BEAT_STAGGER там).
 */
const TAIL = 80;

/**
 * СЛАЙД — ОДИН ШАГ РЕШЕНИЯ (video_structure_version="chemistry-steps-v1").
 *
 * Фикс №11: решение показывается последовательно, по шагам — один логический
 * шаг на отдельном слайде (а не единый слайд «ответ+всё решение»). Строки
 * каждого шага (task.steps[i].lines — неизменный экранный текст) появляются
 * равномерно внутри РЕАЛЬНОЙ длительности этого слайда (из audioSync —
 * forced-alignment граница, не оценка по словам). Ответ уже находится в
 * lines последнего шага — отдельного answer-слайда здесь нет и быть не
 * должно при separate_answer_slide=true: тогда ответ вынесен в AnswerScene.
 *
 * Визуально — тот же SceneHeading/Line, что у старой makeSolution()
 * (src/ege/Solution.tsx) — тот же "кружок с номером шага + заголовок +
 * список строк с точкой-маркером". Переиспользованы ОБЕ эти presentational-
 * компоненты как есть (в них нет f30/VIDEO.fps — см. MathBits.tsx/
 * SolutionLayout.tsx), только появление строк здесь считается от реального
 * fps композиции (fAt), а не от общего VIDEO.fps.
 */
const StepLayout: React.FC<{ step: string; title: string; children: React.ReactNode }> = ({
  step,
  title,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const out = interpolate(frame, [durationInFrames - fAt(fps, 8), durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
        justifyContent: "center",
        opacity: out,
      }}
    >
      <SceneHeading step={step} title={title} />
      <div style={{ display: "flex", flexDirection: "column", gap: 18, color: COLORS.text }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

const RevealLine: React.FC<{ atFrame: number; children: React.ReactNode }> = ({
  atFrame,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame, [atFrame, atFrame + fAt(fps, 14)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity: progress,
        transform: `translateY(${(1 - progress) * 26}px)`,
      }}
    >
      {children}
    </div>
  );
};

export const ProfileMathStepScene: React.FC<{ step: ProfileMathStep; index: number }> = ({
  step,
  index,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();
  if (!isProfileMathStepsTask(task)) return null;

  const count = step.lines.length;
  const tailFrames = fAt(fps, TAIL);
  const gap = Math.min(
    Math.max(
      Math.round((durationInFrames - tailFrames) / Math.max(count - 1, 1)),
      fAt(fps, 30),
    ),
    fAt(fps, 56),
  );

  return (
    <StepLayout step={String(index + 1)} title={step.title}>
      {step.lines.map((line, i) => (
        <RevealLine key={i} atFrame={i * gap}>
          <Line>{line}</Line>
        </RevealLine>
      ))}
    </StepLayout>
  );
};
