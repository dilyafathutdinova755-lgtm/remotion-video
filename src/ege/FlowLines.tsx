import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLORS } from "./theme";

/**
 * Плавные линии на фоне финальной сцены.
 *
 * Задача — оживить пустой кадр, а не привлечь внимание: линии идут очень
 * бледно, широкими дугами по краям и почти не задевают полосу, где стоит
 * текст. Медленный дрейф делает кадр живым, не отвлекая от чтения.
 */
export const FlowLines: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 300], [0, 1], {
    extrapolateRight: "clamp",
  });

  const shift = drift * 26;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg
        width="1080"
        height="1920"
        viewBox="0 0 1080 1920"
        fill="none"
        style={{ position: "absolute", inset: 0 }}
      >
        {/* Мягкое пятно за ответом — только чтобы верх кадра не был пустым */}
        <defs>
          <radialGradient id="flow-glow" cx="50%" cy="50%" r="50%">
            <stop
              offset="0%"
              stopColor={COLORS.accentLine}
              stopOpacity="0.30"
            />
            <stop offset="100%" stopColor={COLORS.accentLine} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse
          cx={620 + shift}
          cy={430}
          rx={620}
          ry={360}
          fill="url(#flow-glow)"
        />

        <g
          stroke={COLORS.accentLine}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        >
          <path
            d={`M -60 ${300 + shift} C 240 ${170 + shift}, 500 ${470 + shift}, 1140 ${250 + shift}`}
            opacity="0.34"
          />
          <path
            d={`M -60 ${1180 - shift} C 300 ${1020 - shift}, 640 ${1400 - shift}, 1140 ${1150 - shift}`}
            opacity="0.30"
          />
          <path
            d={`M -60 ${1330 - shift * 0.6} C 320 ${1180 - shift * 0.6}, 660 ${1560 - shift * 0.6}, 1140 ${1300 - shift * 0.6}`}
            opacity="0.20"
          />
          <path
            d={`M -60 ${1720 + shift * 0.4} C 340 ${1600 + shift * 0.4}, 700 ${1880 + shift * 0.4}, 1140 ${1660 + shift * 0.4}`}
            opacity="0.16"
          />
        </g>
      </svg>
    </AbsoluteFill>
  );
};
