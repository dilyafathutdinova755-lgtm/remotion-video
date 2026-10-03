import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../../theme";
import { useTask } from "../../TaskContext";
import { isProfileMathStepsTask } from "../../tasks/types";
import { fAt } from "./shared";

/**
 * СЛАЙД 1 — TITLE (video_structure_version="profile-math-steps-v2").
 *
 * Визуально — тот же язык, что у HookVisual (крупный хук-вопрос + плашка
 * «ЕГЭ · предмет · задание N»), НЕ продублирован импортом (см. shared.ts —
 * HookVisual завязан на f30()/VIDEO.fps=60, здесь композиция на 120fps).
 *
 * Фикс №1: условие НЕ звучит на этом слайде — длительность сцены равна
 * ровно длине intro-сегмента (buildProfileMathStepsScenes), озвучка
 * condition_text начинается уже на следующей, Task-сцене.
 */
const hookLines = (hook?: string | string[]): string[] =>
  Array.isArray(hook) ? hook : [hook ?? "Решишь за 10 секунд?"];

const hookFontSize = (lines: string[]): number => {
  const longest = Math.max(...lines.map((l) => l.length));
  if (longest <= 16) return 96;
  if (longest <= 19) return 86;
  if (longest <= 23) return 76;
  return 66;
};

const examLabel = (subject?: string): string => {
  if (!subject) return "профиль";
  if (subject.includes("русск")) return "русский";
  if (subject.includes("информатик")) return "информатика";
  if (subject.includes("истори")) return "история";
  if (subject.includes("базов")) return "база";
  if (subject.includes("биолог")) return "биология";
  if (subject.includes("хими")) return "химия";
  return "профиль";
};

export const ProfileMathTitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const task = useTask();
  if (!isProfileMathStepsTask(task)) return null;

  const at = (delay30: number) =>
    spring({
      frame: frame - fAt(fps, delay30),
      fps,
      config: { damping: 200 },
      durationInFrames: fAt(fps, 15),
    });

  const enter = spring({
    frame: frame - fAt(fps, 2),
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 140 },
    durationInFrames: fAt(fps, 20),
  });
  const sub = at(20);
  const lines = hookLines(task.hook);

  const out = interpolate(
    frame,
    [durationInFrames - fAt(fps, 7), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 34 }}>
        <div
          style={{
            fontFamily: FONTS.head,
            fontWeight: 800,
            fontSize: hookFontSize(lines),
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: COLORS.text,
            opacity: interpolate(enter, [0, 0.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(enter, [0, 1], [0.82, 1])})`,
          }}
        >
          {lines.map((text, i) => (
            <div key={i}>{text}</div>
          ))}
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
          {task.examType === "oge" ? "ОГЭ" : "ЕГЭ"} · {examLabel(task.subject)}
          <span style={{ opacity: 0.6 }}>·</span>
          задание {task.number}
        </div>
      </div>
    </AbsoluteFill>
  );
};
