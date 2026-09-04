import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../theme";
import { ProblemText, ProblemCard, Pill, OptionList } from "../ProblemText";
import { useTask } from "../TaskContext";
import { READ_DELAY, problemReadingFrames, f30 } from "../timing";

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();

  const enter = spring({
    frame: frame - f30(4),
    fps,
    config: { damping: 200 },
    durationInFrames: f30(15),
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

  // Картинка догоняет текст, а не встречает его
  const illustration = spring({
    frame: frame - f30(18),
    fps,
    config: { damping: 200 },
    durationInFrames: f30(20),
  });

  // Список картинок делит сцену поровну и перетекает одна в другую
  const icons = task.illustration
    ? [task.illustration].flat()
    : ([] as string[]);
  const slot = icons.length > 0 ? durationInFrames / icons.length : 0;
  const fade = f30(10);
  const slotOpacity = (i: number) => {
    if (icons.length === 1) return 1;
    const start = i * slot;
    const end = start + slot;
    const first = i === 0;
    const last = i === icons.length - 1;
    return interpolate(
      frame,
      [
        first ? -1 : start - fade,
        first ? 0 : start + fade,
        last ? durationInFrames : end - fade,
        last ? durationInFrames + 1 : end + fade,
      ],
      [first ? 1 : 0, 1, 1, last ? 1 : 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  };

  // По реальной озвучке сцена не даёт «трёх секунд подумать» отдельно —
  // вся её длительность и есть время на прочтение, так что полоска идёт
  // от начала до самого конца сцены, а не до оценки по словам.
  const progress = interpolate(
    frame,
    task.audioSync
      ? [READ_DELAY, durationInFrames]
      : [READ_DELAY, READ_DELAY + problemReadingFrames(task)],
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
          {task.options ? (
            <OptionList
              options={task.options}
              size={task.problemSize}
              highlight={task.optionsHighlight ?? true}
            />
          ) : (
            <ProblemText tokens={task.tokens} size={task.problemSize} />
          )}

          {/* Индикатор чтения */}
          <div
            style={{
              marginTop: 38,
              height: 8,
              borderRadius: 999,
              background: COLORS.track,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${COLORS.accentSoft}, ${COLORS.accent})`,
              }}
            />
          </div>
        </ProblemCard>

        {/* У понятий (история-19) нет ни разбора, ни отдельного таймера —
            вместо него прямая подсказка остановить видео и вспомнить ответ
            самому, прежде чем откроется смысл понятия. */}
        {task.concept ? (
          <div
            style={{
              marginTop: 30,
              textAlign: "center",
              fontFamily: FONTS.body,
              fontWeight: 700,
              fontSize: 36,
              color: COLORS.accent,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            Ставь на паузу
          </div>
        ) : null}

        {icons.length > 0 ? (
          <div
            style={{
              position: "relative",
              height: 240,
              marginTop: 46,
              opacity: interpolate(illustration, [0, 1], [0, 1]),
              transform: `scale(${interpolate(illustration, [0, 1], [0.9, 1])})`,
            }}
          >
            {icons.map((name, i) => (
              <div
                key={name}
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  justifyContent: "center",
                  opacity: slotOpacity(i),
                }}
              >
                <Img
                  src={staticFile(`illustrations/${name}.png`)}
                  style={{
                    height: "100%",
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
