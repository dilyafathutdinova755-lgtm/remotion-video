import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../theme";
import { useTask } from "../TaskContext";

/**
 * Первые секунды ролика по ТЗ: не заставка с логотипом, а вопрос крупным
 * текстом. Логотип никуда не делся — он остался плашкой в углу и на
 * финальном экране.
 */
/**
 * Короткая подпись предмета на плашке. Полное `subject` («в ЕГЭ по
 * профильной математике») в плашку не влезает, поэтому берём одно слово.
 */
const examLabel = (subject?: string): string => {
  if (!subject) return "профиль";
  if (subject.includes("русск")) return "русский";
  if (subject.includes("информатик")) return "информатика";
  if (subject.includes("истори")) return "история";
  if (subject.includes("базов")) return "база";
  if (subject.includes("биолог")) return "биология";
  return "профиль";
};

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();

  const at = (delay: number) =>
    spring({
      frame: frame - delay,
      fps,
      config: { damping: 200 },
      durationInFrames: 15,
    });

  const hook = spring({
    frame: frame - 2,
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 140 },
    durationInFrames: 20,
  });
  const sub = at(20);

  const out = interpolate(
    frame,
    [durationInFrames - 7, durationInFrames],
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
        textAlign: "center",
        opacity: out,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 34,
        }}
      >
        <div
          style={{
            fontFamily: FONTS.head,
            fontWeight: 800,
            fontSize: 96,
            lineHeight: 1.06,
            letterSpacing: "-0.025em",
            color: COLORS.text,
            opacity: interpolate(hook, [0, 0.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(hook, [0, 1], [0.82, 1])})`,
          }}
        >
          {task.hook ?? "Решишь за 10 секунд?"}
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            padding: "16px 36px",
            borderRadius: 999,
            background: COLORS.accent,
            boxShadow: `0 14px 34px ${COLORS.accentGlow}`,
            fontFamily: FONTS.body,
            fontWeight: 700,
            fontSize: 40,
            color: "#fff",
            letterSpacing: "0.02em",
            opacity: interpolate(sub, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(sub, [0, 1], [22, 0])}px)`,
          }}
        >
          ЕГЭ · {examLabel(task.subject)}
          <span style={{ opacity: 0.6 }}>·</span>
          задание {task.number}
        </div>
      </div>
    </AbsoluteFill>
  );
};
