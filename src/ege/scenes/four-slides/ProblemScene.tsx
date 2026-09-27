import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../../theme";
import { ProblemCard, Pill } from "../../ProblemText";
import { useTask } from "../../TaskContext";
import { f30 } from "../../timing";
import { isFourSlidesTask } from "../../tasks/types";
import { highlightCapsTokens } from "./highlight";

/** Кегль условия — короткие словосочетания №6/№7 набираются крупнее длинных. */
const problemSizeFor = (
  lines: string[],
): number => {
  const longest = Math.max(
    0,
    ...lines.map((l) => l.length),
  );

  if (longest <= 24) return 52;
  if (longest <= 34) return 46;
  if (longest <= 45) return 40;

  return 36;
};

/**
 * СЛАЙД 2 — PROBLEM (video_structure_version="four-slides-v1").
 *
 * Правила:
 *
 * - instruction находится СНАРУЖИ белой карточки;
 * - condition_text находится ТОЛЬКО внутри белой карточки;
 * - строки появляются постепенно;
 * - explanation здесь никогда не показываем;
 * - внизу белой карточки идёт динамическая полоса оставшегося времени;
 * - pausePrompt появляется только в последние task.pauseSeconds секунд.
 *
 * Никаких фиксированных таймкодов нет.
 *
 * Длительность сцены приходит из реального audioSync.
 * Поэтому и progressive reveal, и progress bar, и момент появления
 * pausePrompt автоматически адаптируются к каждому конкретному ролику.
 */
export const FourSlidesProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {
    fps,
    durationInFrames,
  } = useVideoConfig();

  const task = useTask();

  if (!isFourSlidesTask(task)) {
    return null;
  }

  const enter = spring({
    frame: frame - f30(4),
    fps,
    config: {
      damping: 200,
    },
    durationInFrames: f30(15),
  });

  const lines =
    task.conditionLines;

  const problemDurationSeconds =
    durationInFrames / fps;

  // Последние pauseSeconds секунд —
  // отдельное окно на размышление.
  const revealWindowSeconds =
    Math.max(
      0,
      problemDurationSeconds -
        task.pauseSeconds,
    );

  const perLineSeconds =
    lines.length > 0
      ? revealWindowSeconds /
        lines.length
      : 0;

  const pauseWindowStartFrame =
    Math.round(
      revealWindowSeconds * fps,
    );

  // ------------------------------------------------------
  // ДИНАМИЧЕСКАЯ ПОЛОСА ВРЕМЕНИ
  //
  // Никаких "18 секунд".
  // Берём реальную длительность текущего Task-слайда.
  //
  // В начале полоска полная.
  // К концу сцены она уменьшается до нуля.
  // ------------------------------------------------------

  const progressEndFrame =
    Math.max(
      durationInFrames - 1,
      1,
    );

  const remainingProgress =
    interpolate(
      frame,
      [
        0,
        progressEndFrame,
      ],
      [
        1,
        0,
      ],
      {
        extrapolateLeft:
          "clamp",
        extrapolateRight:
          "clamp",
      },
    );

  const size =
    problemSizeFor(lines);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "flex-start",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
      }}
    >
      <div
        style={{
          width: "100%",
          opacity: interpolate(
            enter,
            [0, 1],
            [0, 1],
          ),
          transform: `translateY(${interpolate(
            enter,
            [0, 1],
            [30, 0],
          )}px)`,
        }}
      >
        <Pill>
          {task.pillLabel ??
            "Задание"}
        </Pill>

        {/* instruction:
            всегда снаружи карточки */}
        <div
          style={{
            fontFamily:
              FONTS.body,
            fontWeight: 300,
            fontSize:
              size * 0.62,
            lineHeight: 1.3,
            color:
              COLORS.textMuted,
            opacity: 0.82,
            marginBottom: 22,
          }}
        >
          {task.instruction}
        </div>

        <ProblemCard
          padding={44}
        >
          {/* condition_text:
              только внутри карточки */}
          <div
            style={{
              display: "flex",
              flexDirection:
                "column",
              gap:
                size * 0.34,
            }}
          >
            {lines.map(
              (
                line,
                i,
              ) => {
                const at =
                  i *
                  perLineSeconds *
                  fps;

                const appear =
                  interpolate(
                    frame,
                    [
                      at,
                      at +
                        f30(
                          10,
                        ),
                    ],
                    [
                      0,
                      1,
                    ],
                    {
                      extrapolateLeft:
                        "clamp",
                      extrapolateRight:
                        "clamp",
                    },
                  );

                return (
                  <div
                    key={i}
                    style={{
                      fontFamily:
                        FONTS.body,
                      fontWeight:
                        300,
                      fontSize:
                        size,
                      lineHeight:
                        1.2,
                      color:
                        COLORS.text,
                      opacity:
                        appear,
                      transform: `translateX(${
                        (1 -
                          appear) *
                        16
                      }px)`,
                    }}
                  >
                    {highlightCapsTokens(
                      line,
                    ).map(
                      (
                        part,
                        j,
                      ) =>
                        part.caps ? (
                          <span
                            key={
                              j
                            }
                            style={{
                              color:
                                COLORS.accent,
                              fontWeight:
                                600,
                            }}
                          >
                            {
                              part.text
                            }
                          </span>
                        ) : (
                          <span
                            key={
                              j
                            }
                          >
                            {
                              part.text
                            }
                          </span>
                        ),
                    )}
                  </div>
                );
              },
            )}
          </div>

          {/* --------------------------------------------
              ПОЛОСКА ОСТАВШЕГОСЯ ВРЕМЕНИ

              Находится внизу белой карточки.
              Длительность полностью динамическая.
              -------------------------------------------- */}

          <div
            style={{
              marginTop: 34,
              width: "100%",
              height: 9,
              borderRadius: 999,
              overflow: "hidden",
              background:
                COLORS.accentFaint,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 999,
                background:
                  COLORS.accent,
                transform: `scaleX(${remainingProgress})`,
                transformOrigin:
                  "left center",
              }}
            />
          </div>
        </ProblemCard>

        {/* pausePrompt:
            появляется только в последние
            task.pauseSeconds секунд */}

        {task.pausePrompt ? (
          <div
            style={{
              marginTop: 34,
              textAlign:
                "center",
              width: "100%",
              opacity:
                interpolate(
                  frame,
                  [
                    pauseWindowStartFrame,
                    pauseWindowStartFrame +
                      f30(10),
                  ],
                  [
                    0,
                    1,
                  ],
                  {
                    extrapolateLeft:
                      "clamp",
                    extrapolateRight:
                      "clamp",
                  },
                ),
            }}
          >
            <div
              style={{
                display:
                  "inline-flex",
                alignItems:
                  "center",
                gap: 14,
                padding:
                  "16px 34px",
                borderRadius:
                  999,
                background:
                  COLORS.accentBg,
                border:
                  `2px solid ${COLORS.accentFaint}`,
                fontFamily:
                  FONTS.body,
                fontWeight:
                  700,
                fontSize: 36,
                color:
                  COLORS.accent,
                letterSpacing:
                  "0.01em",
              }}
            >
              {
                task.pausePrompt
              }
            </div>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
