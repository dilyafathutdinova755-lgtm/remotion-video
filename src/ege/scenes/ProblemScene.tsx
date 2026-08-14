import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS, FONTS } from "../theme";
import { PROBLEM_WORDS, WORD_STARTS, WORD_FRAMES, READ_DELAY, READING_FRAMES } from "../timing";

/**
 * Одно слово условия. Подсветка идёт «за глазами» читателя: слово
 * загорается более насыщенным оттенком, а прочитанное остаётся
 * залитым нежным голубым.
 */
const Word: React.FC<{ word: string; index: number }> = ({ word, index }) => {
  const frame = useCurrentFrame();

  const start = READ_DELAY + WORD_STARTS[index];
  const end = start + WORD_FRAMES[index];

  const active = interpolate(frame, [start - 4, start + 2, end - 2, end + 7], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const read = interpolate(frame, [end - 3, end + 7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        padding: "2px 10px",
        transform: `scale(${1 + active * 0.045})`,
        transformOrigin: "center bottom",
      }}
    >
      {/* Слой «прочитано» */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          background: COLORS.readBg,
          opacity: read * 0.95,
        }}
      />
      {/* Слой «читаю сейчас» */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 12,
          background: COLORS.activeBg,
          opacity: active,
          boxShadow: `0 6px 18px rgba(29,78,216,${0.16 * active})`,
        }}
      />
      <span
        style={{
          position: "relative",
          color: active > 0.4 ? COLORS.deep : COLORS.text,
        }}
      >
        {word}
      </span>
    </span>
  );
};

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame: frame - 4, fps, config: { damping: 200 }, durationInFrames: 26 });
  const out = interpolate(frame, [durationInFrames - 16, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const progress = interpolate(frame, [READ_DELAY, READ_DELAY + READING_FRAMES], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 150px",
        opacity: out,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1560,
          opacity: interpolate(enter, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(enter, [0, 1], [30, 0])}px)`,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 34,
            padding: "10px 26px",
            borderRadius: 999,
            background: COLORS.blue,
            color: "#fff",
            fontFamily: FONTS.head,
            fontWeight: 700,
            fontSize: 28,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            boxShadow: "0 8px 24px rgba(29,78,216,0.26)",
          }}
        >
          Задача
        </div>

        <div
          style={{
            padding: "54px 58px",
            borderRadius: 32,
            background: COLORS.card,
            border: `2px solid ${COLORS.cardBorder}`,
            boxShadow: "0 22px 60px rgba(18,51,110,0.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              rowGap: 18,
              columnGap: 6,
              fontFamily: FONTS.body,
              fontWeight: 500,
              fontSize: 56,
              lineHeight: 1.42,
              color: COLORS.text,
            }}
          >
            {PROBLEM_WORDS.map((w, i) => (
              <Word key={`${w}-${i}`} word={w} index={i} />
            ))}
          </div>

          {/* Индикатор чтения */}
          <div
            style={{
              marginTop: 44,
              height: 8,
              borderRadius: 999,
              background: "#e2ebf8",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                borderRadius: 999,
                background: `linear-gradient(90deg, ${COLORS.blueSoft}, ${COLORS.blue})`,
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
