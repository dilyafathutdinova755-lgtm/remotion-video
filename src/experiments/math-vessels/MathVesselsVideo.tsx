import { AbsoluteFill, Audio, Series, staticFile } from "remotion";
import { Background } from "../../ege/Background";
import { paletteFor, paletteVars } from "../../ege/theme";
import { MathVesselsMain } from "./MathVesselsMain";
import { CtaScene } from "./CtaScene";
import { TOTAL_SEC, beat, secToFrame } from "./timing";

export const MATH_VESSELS_FPS = 120;
export const MATH_VESSELS_DURATION_FRAMES = secToFrame(MATH_VESSELS_FPS, TOTAL_SEC);

/**
 * Экспериментальный прототип (вне контент-завода, отдельная ветка/каталог —
 * см. отчёт). Без титульного слайда: условие+сосуды видны с первого кадра,
 * вступительная фраза звучит поверх уже видимого задания. Аудио — ОДИН
 * файл (public/audio/experiment-math-vessels.mp3), собранный из локального
 * чернового синтеза (espeak-ng, офлайн, бесплатно) — РЕАЛЬНЫЙ тайминг, не
 * оценка (см. timing.ts).
 */
export const MathVesselsVideo: React.FC = () => {
  const mainFrames = secToFrame(MATH_VESSELS_FPS, beat("cta").startSec);
  const ctaFrames = MATH_VESSELS_DURATION_FRAMES - mainFrames;

  return (
    <AbsoluteFill style={paletteVars(paletteFor("blue"))}>
      <Background />
      <Audio src={staticFile("audio/experiment-math-vessels.mp3")} />

      <Series>
        <Series.Sequence durationInFrames={mainFrames}>
          <MathVesselsMain />
        </Series.Sequence>
        <Series.Sequence durationInFrames={ctaFrames}>
          <CtaScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
