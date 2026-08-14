import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../theme";
import { sec } from "../timing";

const LEAD_IN = sec(1); // появление круга
const COUNT = sec(5); // сами 5 секунд

export const TimerScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 });
  const out = interpolate(frame, [durationInFrames - 16, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
  const digitScale = frame < LEAD_IN ? 1 : interpolate(pop, [0, 1], [1.22, 1]);

  const R = 188;
  const C = 2 * Math.PI * R;
  const ringProgress = remaining / COUNT;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: out,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: interpolate(enter, [0, 1], [0, 1]),
          transform: `scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.head,
            fontWeight: 700,
            fontSize: 54,
            color: COLORS.deep,
            marginBottom: 54,
            letterSpacing: "-0.01em",
          }}
        >
          Попробуйте решить сами
        </div>

        <div style={{ position: "relative", width: 440, height: 440 }}>
          <svg width={440} height={440} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={220} cy={220} r={R} fill="rgba(255,255,255,0.7)" stroke="#dbe6f6" strokeWidth={20} />
            <circle
              cx={220}
              cy={220}
              r={R}
              fill="none"
              stroke={COLORS.blue}
              strokeWidth={20}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - ringProgress)}
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
                  fontFamily: FONTS.head,
                  fontWeight: 800,
                  fontSize: 76,
                  color: COLORS.blue,
                }}
              >
                Время!
              </span>
            ) : (
              <span
                style={{
                  fontFamily: FONTS.head,
                  fontWeight: 800,
                  fontSize: 200,
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
            fontFamily: FONTS.body,
            fontWeight: 500,
            fontSize: 38,
            color: COLORS.textMuted,
            marginTop: 52,
          }}
        >
          5 секунд на размышление
        </div>
      </div>
    </AbsoluteFill>
  );
};
