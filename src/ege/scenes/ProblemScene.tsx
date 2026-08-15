import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, PAD, SAFE } from "../theme";
import { ProblemText, ProblemCard, Pill } from "../ProblemText";
import { StickerCues } from "../StickerCues";
import { useTask } from "../TaskContext";
import { READ_DELAY, buildReading } from "../timing";

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();

  const enter = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 26 });
  const out = interpolate(frame, [durationInFrames - 16, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const reading = buildReading(task.tokens);
  const progress = interpolate(frame, [READ_DELAY, READ_DELAY + reading.total], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
        <Pill>Задача</Pill>

        <ProblemCard padding={44}>
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

        {/* Смайлики всплывают в нижней части кадра, каждый на своём куске текста */}
        <div style={{ marginTop: 40 }}>
          <StickerCues tokens={task.tokens} starts={reading.starts} />
        </div>
      </div>
    </AbsoluteFill>
  );
};
