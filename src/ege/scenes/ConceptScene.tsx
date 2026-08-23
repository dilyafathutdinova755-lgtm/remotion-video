import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { ReactNode } from "react";
import { Reveal } from "../MathBits";
import { COLORS, FONTS, PAD, SAFE } from "../theme";
import { useTask } from "../TaskContext";

/**
 * Финальная сцена задания 19 по истории. Ответом здесь работает не число, а
 * два блока — смысл понятия и факт, — и оба нужны для полного балла, поэтому
 * они выводятся отдельными подписанными карточками, а не одним абзацем.
 */

const Block: React.FC<{
  label: string;
  accent: string;
  background: string;
  border: string;
  children: ReactNode;
}> = ({ label, accent, background, border, children }) => (
  <div
    style={{
      width: "100%",
      padding: "30px 36px",
      borderRadius: 28,
      background,
      border: `2px solid ${border}`,
      boxShadow: `0 14px 40px ${COLORS.shadow}`,
    }}
  >
    <div
      style={{
        fontFamily: FONTS.display,
        fontWeight: 600,
        fontSize: 28,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: accent,
        marginBottom: 16,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontWeight: 300,
        fontSize: 38,
        lineHeight: 1.34,
        color: COLORS.text,
      }}
    >
      {children}
    </div>
  </div>
);

export const ConceptScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const task = useTask();

  const out = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  if (!task.concept) return null;

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
          display: "flex",
          flexDirection: "column",
          gap: 24,
          width: "100%",
        }}
      >
        <Reveal at={0}>
          <Block
            label="Смысл понятия"
            accent={COLORS.accent}
            background={COLORS.card}
            border={COLORS.cardBorder}
          >
            {task.concept.definition}
          </Block>
        </Reveal>

        <Reveal at={40}>
          <Block
            label="Факт"
            accent={COLORS.ok}
            background={COLORS.okBg}
            border={`${COLORS.okFaint}`}
          >
            {task.concept.fact}
          </Block>
        </Reveal>
      </div>
    </AbsoluteFill>
  );
};
