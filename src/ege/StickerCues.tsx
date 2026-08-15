import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { EMOJI_FONT } from "./Emoji";
import { isSticker, type StickerGroup, type Token } from "./tasks/types";

/** Сколько кадров смайлик держится, если следующий ещё нескоро. */
const HOLD = 78;
/** Зазор между уходом одного смайлика и появлением следующего. */
const GAP = 8;
/** Последний висит подольше — после него текста уже нет. */
const LAST_HOLD = 110;

/** Высота зоны под карточкой. Фиксирована, чтобы вёрстка не дёргалась. */
const ZONE_HEIGHT = 260;

const Cue: React.FC<{
  group: StickerGroup;
  from: number;
  to: number;
  size: number;
}> = ({ group, from, to, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leave = interpolate(frame, [to - 14, to], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Вне своего окна не рисуем вовсе
  if (frame < from - 2 || frame > to + 2) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: size * 0.24,
      }}
    >
      {group.emojis.map((emoji, n) => {
        // Внутри группы смайлики влетают друг за другом
        const s = spring({
          frame: frame - from - n * 5,
          fps,
          config: { damping: 13, mass: 0.7, stiffness: 140 },
          durationInFrames: 26,
        });

        return (
          <span
            key={n}
            role="img"
            aria-label={group.label}
            style={{
              fontFamily: EMOJI_FONT,
              fontSize: size,
              lineHeight: 1,
              filter: "drop-shadow(0 14px 26px rgba(18,51,110,0.22))",
              opacity: interpolate(s, [0, 0.4], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }) * leave,
              transform: [
                `scale(${interpolate(s, [0, 1], [0.55, 1]) * interpolate(leave, [0, 1], [0.88, 1])})`,
                `rotate(${interpolate(s, [0, 1], [n % 2 ? 12 : -12, 0])}deg)`,
                `translateY(${interpolate(leave, [0, 1], [-26, 0])}px)`,
              ].join(" "),
            }}
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
};

/**
 * Смайлики-иллюстрации в нижней части кадра.
 *
 * Каждая группа всплывает ровно на своём куске условия и уходит до того,
 * как появится следующая, — на экране всегда не больше одной. Момент
 * появления берётся из позиции группы в массиве токенов.
 */
export const StickerCues: React.FC<{
  tokens: Token[];
  starts: number[];
  size?: number;
}> = ({ tokens, starts, size = 150 }) => {
  const groups = tokens.flatMap((t, i) => (isSticker(t) ? [{ group: t, at: starts[i] }] : []));

  return (
    <div style={{ position: "relative", height: ZONE_HEIGHT }}>
      {groups.map((g, i) => {
        const next = groups[i + 1];
        const to = next
          ? Math.min(g.at + HOLD, next.at - GAP)
          : g.at + LAST_HOLD;

        return <Cue key={i} group={g.group} from={g.at} to={to} size={size} />;
      })}
    </div>
  );
};
