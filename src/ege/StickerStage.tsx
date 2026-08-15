import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { Sticker } from "./Sticker";
import { COLORS, FONTS } from "./theme";
import { isSticker, type StickerGroup, type Token } from "./tasks/types";

/** Группа наклеек с подписью: сами картинки в ряд, подпись под ними. */
const Group: React.FC<{ group: StickerGroup; at: number; size: number }> = ({
  group,
  at,
  size,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Подпись подтягивается следом за последней наклейкой группы
  const captionAt = at + (group.emojis.length - 1) * 5 + 8;
  const s = spring({
    frame: frame - captionAt,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {group.emojis.map((emoji, n) => (
          <Sticker
            key={n}
            emoji={emoji}
            label={group.label}
            size={size}
            // Внутри группы наклейки прилетают друг за другом
            at={at + n * 5}
          />
        ))}
      </div>

      {group.caption ? (
        <span
          style={{
            fontFamily: FONTS.display,
            fontWeight: 300,
            fontSize: 24,
            letterSpacing: "0.04em",
            color: COLORS.textMuted,
            whiteSpace: "nowrap",
            opacity: interpolate(s, [0, 1], [0, 1]),
          }}
        >
          {group.caption}
        </span>
      ) : null}
    </div>
  );
};

/**
 * Полка с иллюстрациями под карточкой задачи.
 *
 * Наклейки всплывают по ходу чтения и остаются на месте, так что к концу
 * условия внизу собирается его картинка целиком. Места размечены заранее:
 * если растить ряд по мере появления, уже выложенные стикеры разъезжались
 * бы вбок на каждом новом.
 */
export const StickerStage: React.FC<{
  tokens: Token[];
  starts: number[];
  size?: number;
}> = ({ tokens, starts, size = 66 }) => {
  const groups = tokens.flatMap((t, i) => (isSticker(t) ? [{ group: t, at: starts[i] }] : []));

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: 22,
      }}
    >
      {groups.map((g, i) => (
        <Group key={i} group={g.group} at={g.at} size={size} />
      ))}
    </div>
  );
};
