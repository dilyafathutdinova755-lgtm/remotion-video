import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { COLORS, PAD, SAFE } from "./theme";
import { SceneHeading } from "./MathBits";

/** Общая рамка для сцен решения: заголовок сверху, контент под ним. */
export const SolutionLayout: React.FC<{
  step: string;
  title: string;
  children: React.ReactNode;
}> = ({ step, title, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

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
        // Центрируем внутри безопасной зоны, а не по всему кадру
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
        justifyContent: "center",
        opacity: out,
      }}
    >
      <SceneHeading step={step} title={title} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          color: COLORS.text,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

/** Фигурная скобка системы уравнений — рисуется вектором, чтобы не зависеть от шрифта. */
export const Brace: React.FC<{ height: number; color?: string }> = ({
  height,
  color = COLORS.accent,
}) => {
  const w = 28;
  const h = height;
  const d = [
    `M ${w} 2`,
    `C ${w * 0.45} 2, ${w * 0.5} 2, ${w * 0.5} ${h * 0.14}`,
    `L ${w * 0.5} ${h * 0.4}`,
    `C ${w * 0.5} ${h * 0.47}, ${w * 0.34} ${h * 0.5}, 2 ${h * 0.5}`,
    `C ${w * 0.34} ${h * 0.5}, ${w * 0.5} ${h * 0.53}, ${w * 0.5} ${h * 0.6}`,
    `L ${w * 0.5} ${h * 0.86}`,
    `C ${w * 0.5} ${h - 2}, ${w * 0.45} ${h - 2}, ${w} ${h - 2}`,
  ].join(" ");

  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </svg>
  );
};

/** Строка рассуждения с маркером-точкой. */
export const Line: React.FC<{ children: React.ReactNode; size?: number }> = ({
  children,
  size = 40,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      gap: 16,
      fontSize: size,
      lineHeight: 1.28,
      fontWeight: 400,
    }}
  >
    <span
      style={{
        width: 11,
        height: 11,
        borderRadius: 999,
        background: COLORS.accentSoft,
        flexShrink: 0,
        transform: "translateY(-4px)",
      }}
    />
    <span>{children}</span>
  </div>
);
