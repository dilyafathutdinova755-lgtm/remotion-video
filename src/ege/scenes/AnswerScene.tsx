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

  // Ответ появляется с упругим «хлопком»
  const pop = spring({
    frame: frame - 24,
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 130 },
    durationInFrames: 40,
  });

  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
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
          <Reveal at={0}>
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
            <Reveal at={64}>
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
            <Reveal at={64}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 30,
                }}
              >
                <span
                  style={{
                    fontFamily: FONTS.display,
                    fontWeight: 400,
                    fontSize: 25,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    color: COLORS.textMuted,
                  }}
                >
                  Так — неверно
                </span>
                <span
                  style={{
                    fontFamily: FONTS.body,
                    fontWeight: 300,
                    fontSize: 33,
                    lineHeight: 1.3,
                    maxWidth: 760,
                    color: COLORS.textMuted,
                    textDecoration: "line-through",
                    textDecorationThickness: 2,
                  }}
                >
                  {task.wrongNote}
                </span>
              </div>
            </Reveal>
          ) : null}

          {/* Волосок вместо рамки: отделяет ответ от разбора, не запирая их */}
          <Reveal at={92}>
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

          <Reveal at={104}>
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
