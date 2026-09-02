import { f30 } from "../timing";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Reveal } from "../MathBits";
import { FlowLines } from "../FlowLines";
import { COLORS, FONTS, PAD, SAFE, SAFE_BELOW_BADGE } from "../theme";
import { useTask } from "../TaskContext";
import { answerFontSize } from "../tasks/types";

/**
 * Финальная сцена: ответ и разбор.
 *
 * Ни ответ, ни пояснение не заперты в карточку — они стоят прямо на фоне,
 * ответ сверху, пояснение под ним. Контент прижат к верхней безопасной зоне,
 * чтобы шапка Reels не наехала на ответ, и ей же ограничен сверху.
 */
export const AnswerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();

  // Без озвучки тайминг — фиксированный, на глаз. С озвучкой — секунды
  // реальных реплик: «Неверно сказано «…»» звучит первой и открывает сцену
  // (это и есть начало сцены, отдельного поля не нужно), поэтому зачёркнутый
  // неверный вариант можно показывать сразу; «Правильно — …» и объяснение
  // идут позже и ждут своих секунд, чтобы ответ не появился раньше, чем его
  // произнесли (см. PLAYBOOK.md §11a — та же ошибка, что нашли в истории).
  const a = task.audioSync;
  const hasAudioAnswer = a?.answerSec !== undefined && a?.correctAtSec !== undefined;
  const correctAt = hasAudioAnswer
    ? Math.round((a!.correctAtSec! - a!.answerSec!) * 30)
    : 24;
  const wrongAt = hasAudioAnswer ? 0 : 64;
  const checkAt =
    a?.answerSec !== undefined && a?.checkAtSec !== undefined
      ? Math.round((a.checkAtSec - a.answerSec) * 30)
      : 104;
  // Волосок перед объяснением держит небольшой отступ от него, как и раньше
  const dividerAt = hasAudioAnswer ? Math.max(correctAt + 12, checkAt - 12) : 92;

  // Ответ появляется с упругим «хлопком»
  const pop = spring({
    frame: frame - f30(correctAt),
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 130 },
    durationInFrames: f30(40),
  });

  const out = interpolate(
    frame,
    [durationInFrames - f30(8), durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  // Задания с ответом-текстом рисует ConceptScene, сюда они не доходят
  if (task.concept) return null;

  return (
    <AbsoluteFill style={{ opacity: out }}>
      <FlowLines />

      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          padding: `${SAFE_BELOW_BADGE}px ${PAD}px ${SAFE.bottom}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            textAlign: "center",
          }}
        >
          {task.answerLead ? (
            <Reveal at={correctAt}>
              <div
                style={{
                  fontFamily: FONTS.display,
                  fontWeight: 400,
                  fontSize: 34,
                  color: COLORS.textMuted,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                {task.answerLead}
              </div>
            </Reveal>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 24,
              marginTop: 22,
              opacity: interpolate(pop, [0, 0.5], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              transform: `scale(${interpolate(pop, [0, 1], [0.86, 1])})`,
            }}
          >
            <span
              style={{
                fontFamily: FONTS.head,
                fontWeight: 800,
                fontSize: answerFontSize(task),
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                color: COLORS.deep,
              }}
            >
              {task.answer}
            </span>
            {task.unit ? (
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 300,
                  fontSize: 42,
                  color: COLORS.accentSoft,
                }}
              >
                {task.unit}
              </span>
            ) : null}
          </div>

          {task.answerFormula ? (
            <Reveal at={correctAt}>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 400,
                  fontSize: 36,
                  color: COLORS.accent,
                  marginTop: 14,
                }}
              >
                {task.answerFormula}
              </div>
            </Reveal>
          ) : null}

          {task.wrongNote ? (
            <Reveal at={wrongAt}>
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 300,
                  fontSize: 33,
                  lineHeight: 1.3,
                  maxWidth: 760,
                  marginTop: 24,
                  color: COLORS.textMuted,
                  textDecoration: "line-through",
                  textDecorationThickness: 2,
                }}
              >
                {task.wrongNote}
              </div>
            </Reveal>
          ) : null}

          {/* Волосок вместо рамки: отделяет ответ от разбора, не запирая их */}
          <Reveal at={dividerAt}>
            <div
              style={{
                width: 180,
                height: 3,
                borderRadius: 999,
                background: COLORS.accentLine,
                margin: "54px 0 40px",
              }}
            />
          </Reveal>

          <Reveal at={checkAt}>
            <div
              style={{
                fontFamily: FONTS.body,
                fontWeight: 300,
                fontSize: 38,
                lineHeight: 1.42,
                color: COLORS.text,
                maxWidth: 880,
              }}
            >
              {task.check}
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
