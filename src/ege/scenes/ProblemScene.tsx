import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../theme";
import { ProblemText, ProblemCard, Pill } from "../ProblemText";
import { useTask } from "../TaskContext";
import { READ_DELAY, problemReadingFrames } from "../timing";

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();

  const enter = spring({
    frame: frame - 4,
    fps,
    config: { damping: 200 },
    durationInFrames: 26,
  });
  const out = interpolate(
    frame,
    [durationInFrames - 16, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const progress = interpolate(
    frame,
    [READ_DELAY, READ_DELAY + problemReadingFrames(task)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
        opacity: out,
      }}
    >
      <div
        style={{
          width: "100%",
          opacity: interpolate(enter, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        }}
      >
        <Pill>{task.pillLabel ?? "Задача"}</Pill>

        <ProblemCard padding={44}>
          {task.instruction ? (
            <div
              style={{
                fontFamily: FONTS.body,
                fontWeight: 300,
                fontSize: task.problemSize * 0.62,
                lineHeight: 1.3,
                color: COLORS.textMuted,
                marginBottom: 26,
              }}
            >
              {task.instruction}
            </div>
          ) : null}
          <ProblemText tokens={task.tokens} size={task.problemSize} />

          {/* Индикатор чтения */}
          <div
            style={{
              marginTop: 38,
              height: 8,
              borderRadius: 999,
              background: "#e2ebf8",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${COLORS.blueSoft}, ${COLORS.blue})`,
              }}
            />
          </div>
        </ProblemCard>
      </div>
    </AbsoluteFill>
  );
};
