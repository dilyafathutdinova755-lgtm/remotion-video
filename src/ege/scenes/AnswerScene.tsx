import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Reveal, FormulaCard } from "../MathBits";
import { COLORS, FONTS, PAD, SAFE } from "../theme";
import { useTask } from "../TaskContext";
import { answerFontSize } from "../tasks/types";

export const AnswerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();

  // Ответ появляется с упругим «хлопком»
  const pop = spring({
    frame: frame - 50,
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

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
        opacity: out,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
          width: "100%",
        }}
      >
        <Reveal at={0}>
          <div
            style={{
              fontFamily: FONTS.display,
              fontWeight: 300,
              fontSize: 40,
              color: COLORS.textMuted,
              textAlign: "center",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {task.answerLead}
          </div>
        </Reveal>

        <Reveal at={14}>
          <FormulaCard style={{ fontSize: 50, fontWeight: 600 }}>
            {task.answerFormula}
          </FormulaCard>
        </Reveal>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "38px 78px",
            borderRadius: 32,
            background: COLORS.blue,
            boxShadow: "0 24px 64px rgba(29,78,216,0.34)",
            opacity: interpolate(pop, [0, 0.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(pop, [0, 1], [0.72, 1])})`,
          }}
        >
          <span
            style={{
              fontFamily: FONTS.display,
              fontWeight: 300,
              fontSize: 38,
              color: "#bcd4ff",
              letterSpacing: "0.26em",
              textTransform: "uppercase",
            }}
          >
            Ответ
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 26 }}>
            <span
              style={{
                fontFamily: FONTS.head,
                fontWeight: 800,
                fontSize: answerFontSize(task),
                color: "#fff",
                lineHeight: 1.1,
              }}
            >
              {task.answer}
            </span>
            {task.unit ? (
              <span
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 300,
                  fontSize: 44,
                  color: "#dbe7ff",
                }}
              >
                {task.unit}
              </span>
            ) : null}
          </div>
        </div>

        <Reveal at={110}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "16px 32px",
              borderRadius: 999,
              background: COLORS.okBg,
              border: `2px solid ${COLORS.ok}33`,
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 32,
              color: COLORS.ok,
              textAlign: "center",
            }}
          >
            <span style={{ flexShrink: 0 }}>✓</span>
            {/* Один flex-элемент: иначе зачин отрывается в свою колонку */}
            <div style={{ textAlign: "left", lineHeight: 1.4 }}>
              {task.check}
            </div>
          </div>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
