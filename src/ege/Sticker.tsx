import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

/** Шрифт для эмодзи: без него браузер рисует пустые прямоугольники. */
export const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", sans-serif';

/** Эмодзи без чипа — для формул и подписей. */
export const Emoji: React.FC<{ children: string; size?: number }> = ({ children, size }) => (
  <span style={{ fontFamily: EMOJI_FONT, fontSize: size, lineHeight: 1 }}>{children}</span>
);

/**
 * Стикер-иллюстрация внутри условия: эмодзи в белом чипе.
 *
 * Эмодзи рисует системный шрифт Noto Color Emoji — он есть в контейнере
 * рендера. Если собирать ролик там, где его нет, вместо картинок будут
 * пустые прямоугольники.
 */
export const Sticker: React.FC<{
  emoji: string;
  label: string;
  size: number;
  /** Кадр, на котором стикер «прилипает». */
  at: number;
}> = ({ emoji, label, size, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Упругое появление с лёгким поворотом — как будто наклейку пришлёпнули
  const pop = spring({
    frame: frame - at,
    fps,
    config: { damping: 11, mass: 0.6, stiffness: 170 },
    durationInFrames: 30,
  });

  const scale = interpolate(pop, [0, 1], [0.3, 1]);
  const tilt = interpolate(pop, [0, 1], [-16, 0]);
  const opacity = interpolate(pop, [0, 0.35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Место под стикер занято с самого начала, иначе текст прыгал бы в момент
  // появления. Чтобы пустое место не выглядело опечаткой, показываем бледный
  // контур — он читается как ячейка, которую сейчас заполнят.
  const chip = interpolate(pop, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      role="img"
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size * 1.5,
        height: size * 1.5,
        margin: "0 6px",
        borderRadius: size * 0.42,
        background: `rgba(255,255,255,${0.25 + chip * 0.75})`,
        border: `2px ${chip > 0.5 ? "solid" : "dashed"} rgba(29,78,216,${0.08 + chip * 0.08})`,
        boxShadow: `0 6px 16px rgba(18,51,110,${0.14 * chip})`,
        verticalAlign: "middle",
      }}
    >
      <span
        style={{
          fontFamily: EMOJI_FONT,
          fontSize: size * 0.92,
          lineHeight: 1,
          opacity,
          transform: `scale(${scale}) rotate(${tilt}deg)`,
        }}
      >
        {emoji}
      </span>
    </span>
  );
};
