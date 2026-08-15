import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Art } from "./Art";
import { COLORS, FONTS } from "./theme";
import { isCue, isNumberCue, type Cue as CueData, type Token } from "./tasks/types";

/** Сколько кадров подсказка держится, если следующая ещё нескоро. */
const HOLD = 78;
/** Зазор между уходом одной подсказки и появлением следующей. */
const GAP = 8;
/** Последняя висит подольше — после неё текста уже нет. */
const LAST_HOLD = 110;

/** Высота зоны под подсказки. Фиксирована, чтобы вёрстка не дёргалась. */
const ZONE_HEIGHT = 250;
const ART_SIZE = 190;

/** Крупное число вместо картинки — для часов и прочих величин. */
const NumberPlate: React.FC<{ value: string; unit: string }> = ({ value, unit }) => (
  <div
    style={{
      display: "flex",
      alignItems: "baseline",
      gap: 14,
      padding: "0 46px",
      height: ART_SIZE,
      borderRadius: 48,
      background: "#e8f1fd",
      justifyContent: "center",
    }}
  >
    <span
      style={{
        fontFamily: FONTS.head,
        fontWeight: 800,
        fontSize: 118,
        lineHeight: 1.5,
        color: COLORS.blue,
      }}
    >
      {value}
    </span>
    <span
      style={{
        fontFamily: FONTS.display,
        fontWeight: 300,
        fontSize: 48,
        color: COLORS.textMuted,
      }}
    >
      {unit}
    </span>
  </div>
);

const Cue: React.FC<{ cue: CueData; from: number; to: number }> = ({ cue, from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leave = interpolate(frame, [to - 14, to], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Вне своего окна не рисуем вовсе
  if (frame < from - 2 || frame > to + 2) return null;

  const items = isNumberCue(cue) ? [null] : cue.art;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
      }}
    >
      {items.map((art, n) => {
        // Внутри группы картинки влетают друг за другом
        const s = spring({
          frame: frame - from - n * 5,
          fps,
          config: { damping: 13, mass: 0.7, stiffness: 140 },
          durationInFrames: 26,
        });

        return (
          <div
            key={n}
            role="img"
            aria-label={cue.label}
            style={{
              filter: "drop-shadow(0 16px 30px rgba(18,51,110,0.16))",
              opacity:
                interpolate(s, [0, 0.4], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }) * leave,
              transform: [
                `scale(${interpolate(s, [0, 1], [0.6, 1]) * interpolate(leave, [0, 1], [0.9, 1])})`,
                `rotate(${interpolate(s, [0, 1], [n % 2 ? 9 : -9, 0])}deg)`,
                `translateY(${interpolate(leave, [0, 1], [-22, 0])}px)`,
              ].join(" "),
            }}
          >
            {art === null ? (
              <NumberPlate value={(cue as { number: string }).number} unit={(cue as { unit: string }).unit} />
            ) : (
              <Art name={art} size={ART_SIZE} />
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Подсказки-иллюстрации в нижней части кадра.
 *
 * Каждая всплывает ровно на своём куске условия и уходит до того, как
 * появится следующая, — на экране всегда не больше одной. Момент появления
 * берётся из позиции подсказки в массиве токенов.
 */
export const StickerCues: React.FC<{
  tokens: Token[];
  starts: number[];
}> = ({ tokens, starts }) => {
  const cues = tokens.flatMap((t, i) => (isCue(t) ? [{ cue: t, at: starts[i] }] : []));

  return (
    <div style={{ position: "relative", height: ZONE_HEIGHT }}>
      {cues.map((c, i) => {
        const next = cues[i + 1];
        const to = next ? Math.min(c.at + HOLD, next.at - GAP) : c.at + LAST_HOLD;
        return <Cue key={i} cue={c.cue} from={c.at} to={to} />;
      })}
    </div>
  );
};
