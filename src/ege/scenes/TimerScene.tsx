import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../theme";
import { ProblemText, ProblemCard, Pill } from "../ProblemText";
import { useTask } from "../TaskContext";
import { sec } from "../timing";

const LEAD_IN = sec(1); // круг успевает появиться
const COUNT = sec(5); // сами 5 секунд

export const TimerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 15,
  });
  const cta = spring({
    frame: frame - 18,
    fps,
    config: { damping: 200 },
    durationInFrames: 15,
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

  const elapsed = Math.min(Math.max(frame - LEAD_IN, 0), COUNT);
  const remaining = COUNT - elapsed;
  const finished = frame >= LEAD_IN + COUNT;

  // Цифра 5 → 1 и её «толчок» в момент смены
  const secIndex = Math.min(Math.floor(elapsed / fps), 4);
  const digit = Math.max(5 - secIndex, 1);
  const inSecond = elapsed - secIndex * fps;
  const pop = spring({
    frame: inSecond,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 180 },
    durationInFrames: fps,
  });
  const digitScale = frame < LEAD_IN ? 1 : interpolate(pop, [0, 1], [1.2, 1]);

  const R = 124;
  const C = 2 * Math.PI * R;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
        opacity: out,
      }}
    >
      {/* Щелчки совпадают со сменой цифры: 5, 4, 3, 2, 1 */}
      <Sequence from={LEAD_IN}>
        <Audio src={staticFile("ticks.wav")} volume={0.45} />
      </Sequence>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: interpolate(enter, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
        }}
      >
        {/* Условие остаётся перед глазами, пока идёт отсчёт */}
        <div style={{ width: "100%" }}>
          <Pill>Подумайте сами</Pill>
          <ProblemCard padding={40}>
            {task.instruction ? (
              <div
                style={{
                  fontFamily: FONTS.body,
                  fontWeight: 300,
                  fontSize: task.timerSize * 0.66,
                  lineHeight: 1.3,
                  color: COLORS.textMuted,
                  marginBottom: 20,
                }}
              >
                {task.instruction}
              </div>
            ) : null}
            <ProblemText tokens={task.tokens} size={task.timerSize} />
          </ProblemCard>
        </div>

        <div
          style={{
            position: "relative",
            width: 292,
            height: 292,
            marginTop: 42,
          }}
        >
          <svg width={292} height={292} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={146}
              cy={146}
              r={R}
              fill="rgba(255,255,255,0.75)"
              stroke="#dbe6f6"
              strokeWidth={16}
            />
            <circle
              cx={146}
              cy={146}
              r={R}
              fill="none"
              stroke={COLORS.blue}
              strokeWidth={16}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - remaining / COUNT)}
            />
          </svg>

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {finished ? (
              <span
                style={{
                  fontFamily: FONTS.display,
                  fontWeight: 500,
                  fontSize: 62,
                  color: COLORS.blue,
                  letterSpacing: "0.04em",
                }}
              >
                Время!
              </span>
            ) : (
              <span
                style={{
                  fontFamily: FONTS.head,
                  fontWeight: 800,
                  fontSize: 140,
                  color: COLORS.deep,
                  transform: `scale(${digitScale})`,
                  lineHeight: 1,
                }}
              >
                {digit}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "26px 40px",
            borderRadius: 26,
            background: "#eaf2ff",
            border: `2px solid ${COLORS.blueSoft}55`,
            boxShadow: "0 12px 34px rgba(18,51,110,0.10)",
            opacity: interpolate(cta, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(cta, [0, 1], [22, 0])}px)`,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 999,
              background: COLORS.blue,
              flexShrink: 0,
            }}
          >
            {/* Значок паузы */}
            <span style={{ display: "flex", gap: 7 }}>
              <span
                style={{
                  width: 7,
                  height: 24,
                  borderRadius: 2,
                  background: "#fff",
                }}
              />
              <span
                style={{
                  width: 7,
                  height: 24,
                  borderRadius: 2,
                  background: "#fff",
                }}
              />
            </span>
          </span>
          <span
            style={{
              fontFamily: FONTS.body,
              fontWeight: 500,
              fontSize: 38,
              lineHeight: 1.3,
              color: COLORS.deep,
            }}
          >
            Ставь на паузу и пиши свой ответ
            <br />в комментарии
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
