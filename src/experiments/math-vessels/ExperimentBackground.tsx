import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
} from "remotion";
import { beat } from "./timing";

/**
 * Локальный, fps-осознанный дубликат ege/Background.tsx — НЕ правим общий
 * компонент (его использует весь контент-завод), здесь нужна логика,
 * привязанная к конкретному таймингу этого эксперимента (секунды из
 * timing.ts), поэтому копия живёт только здесь (см. конвенцию проекта про
 * компоненты с internal frame-математикой).
 *
 * Отличия от продакшен-фона: фон "живой" — крупнее и быстрее дрейфующие
 * пятна, цвет плавно перетекает из holodного (условие) в тёплый (решение)
 * ровно в то же окно, что и переход сосудов, плюс едва заметные крупные
 * математические символы на заднем плане (п. "f" фидбека).
 */
const CONDITION_BG = {
  top: "#EAF1FD",
  mid: "#f4f8fe",
  bottom: "#DCE7FB",
  blobA: "rgba(130,172,245,0.40)",
  blobB: "rgba(180,206,250,0.55)",
  line: "#A8BEEA",
};

const STEPS_BG = {
  top: "#FDEEE0",
  mid: "#FFF6ED",
  bottom: "#FBDFC4",
  blobA: "rgba(245,181,120,0.40)",
  blobB: "rgba(250,205,160,0.55)",
  line: "#E6B98C",
};

const SYMBOLS = ["10%", "30%", "x", "20%", "+", "="];

export const ExperimentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const sec = frame / fps;
  const t = frame / durationInFrames;

  const stepsStartSec = beat("d1").startSec;
  // Та же переходная зона, что у сосудов/карточки — фон переключается
  // синхронно с планом, а не отдельным, несвязанным событием.
  const mix = interpolate(sec, [stepsStartSec - 0.6, stepsStartSec + 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const top = interpolateColors(mix, [0, 1], [CONDITION_BG.top, STEPS_BG.top]);
  const mid = interpolateColors(mix, [0, 1], [CONDITION_BG.mid, STEPS_BG.mid]);
  const bottom = interpolateColors(mix, [0, 1], [CONDITION_BG.bottom, STEPS_BG.bottom]);
  const blobA = interpolateColors(mix, [0, 1], [CONDITION_BG.blobA, STEPS_BG.blobA]);
  const blobB = interpolateColors(mix, [0, 1], [CONDITION_BG.blobB, STEPS_BG.blobB]);
  const line = interpolateColors(mix, [0, 1], [CONDITION_BG.line, STEPS_BG.line]);

  // Крупный, заметно более живой дрейф пятен (было ±8/±9% за весь ролик —
  // теперь пятна гуляют заметно шире и ещё с собственным медленным "дыханием").
  const drift = interpolate(t, [0, 1], [0, 1]);
  const breathe = Math.sin(sec / 3.2) * 6;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${top} 0%, ${mid} 45%, ${bottom} 100%)` }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1100px 1100px at ${14 + drift * 22 + breathe}% ${8 + drift * 14}%, ${blobA} 0%, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(1000px 1000px at ${90 - drift * 24 - breathe}% ${92 - drift * 16}%, ${blobB} 0%, transparent 58%)`,
        }}
      />

      {/* Тонкая сетка «в клетку» */}
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${line}22 1px, transparent 1px), linear-gradient(90deg, ${line}22 1px, transparent 1px)`,
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 70% 50% at 50% 50%, black 10%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 50% at 50% 50%, black 10%, transparent 80%)",
          opacity: 0.5,
        }}
      />

      {/* Едва заметные плавающие символы расчёта — атмосфера, не отвлекают. */}
      {SYMBOLS.map((sym, i) => {
        const speed = 7 + i * 1.3;
        const x = 10 + ((i * 37 + sec * speed) % 90);
        const y = 12 + ((i * 53 + sec * (speed * 0.6)) % 78);
        return (
          <div
            key={sym}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              fontFamily: '"Inter", sans-serif',
              fontWeight: 800,
              fontSize: 120 + (i % 3) * 40,
              color: line,
              opacity: 0.07,
              transform: `rotate(${(i % 2 === 0 ? 1 : -1) * 8}deg)`,
              pointerEvents: "none",
            }}
          >
            {sym}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
