import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { ReactNode } from "react";
import { Reveal } from "../MathBits";
import { FlowLines } from "../FlowLines";
import { COLORS, FONTS, PAD, SAFE, SAFE_BELOW_BADGE } from "../theme";
import { useTask } from "../TaskContext";

/**
 * Финальная сцена задания 19 по истории. Ответом здесь работает не число, а
 * два блока — смысл понятия и факт, — и оба нужны для полного балла, поэтому
 * они подписаны по отдельности.
 *
 * Вёрстка та же, что у сцены ответа: без рамок, прижато к верхней безопасной
 * зоне, блоки разделены волоском.
 */

const Block: React.FC<{ label: string; children: ReactNode }> = ({
  label,
  children,
}) => (
  <div style={{ width: "100%" }}>
    <div
      style={{
        fontFamily: FONTS.display,
        fontWeight: 400,
        fontSize: 30,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: COLORS.textMuted,
        marginBottom: 18,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: FONTS.body,
        fontWeight: 300,
        fontSize: 40,
        lineHeight: 1.36,
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
    <AbsoluteFill style={{ opacity: out }}>
      <FlowLines />

      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "flex-start",
          padding: `${SAFE_BELOW_BADGE}px ${PAD}px ${SAFE.bottom}px`,
        }}
      >
        <div style={{ width: "100%" }}>
          <Reveal at={0}>
            <Block label="Смысл понятия">{task.concept.definition}</Block>
          </Reveal>

          <Reveal at={40}>
            <div
              style={{
                width: 180,
                height: 3,
                borderRadius: 999,
                background: COLORS.accentLine,
                margin: "46px 0",
              }}
            />
          </Reveal>

          <Reveal at={52}>
            <Block label="Факт">{task.concept.fact}</Block>
          </Reveal>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
