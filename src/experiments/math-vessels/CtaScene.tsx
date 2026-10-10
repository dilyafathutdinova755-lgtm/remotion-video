import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../../ege/theme";
import { AppLogo } from "../../ege/AppLogo";

const fAt = (fps: number, frames30: number): number => Math.round((frames30 * fps) / 30);

/**
 * Финальный экран — существующая визуальная композиция приложения
 * (логотип + "Скачивай бесплатно" + ссылка в шапке профиля), без
 * TaskContext (у этого эксперимента нет TaskDef — отдельный одноразовый
 * прототип, см. отчёт). Озвучка ("Ссылка на ЕГЭ Тренажёр в шапке
 * профиля.") намеренно НЕ продублирована текстом на экране — это
 * отдельная фраза, see ТЗ п.8.
 */
export const CtaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logo = spring({
    frame: frame - fAt(fps, 2),
    fps,
    config: { damping: 13, mass: 0.8, stiffness: 120 },
    durationInFrames: fAt(fps, 26),
  });
  const at = (delay30: number) =>
    spring({
      frame: frame - fAt(fps, delay30),
      fps,
      config: { damping: 200 },
      durationInFrames: fAt(fps, 15),
    });

  const cta = at(14);
  const link = at(26);

  const lift = (s: number, d = 26) => ({
    opacity: interpolate(s, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(s, [0, 1], [d, 0])}px)`,
  });

  const pulse = 1 + Math.sin(Math.max(frame - fAt(fps, 40), 0) / fAt(fps, 14)) * 0.012;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={{
            opacity: interpolate(logo, [0, 0.4], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(logo, [0, 1], [0.68, 1]) * pulse})`,
          }}
        >
          <AppLogo size={230} examType="ege" />
        </div>

        <div
          style={{
            ...lift(cta, 26),
            fontFamily: FONTS.head,
            fontWeight: 800,
            fontSize: 68,
            color: COLORS.accent,
            letterSpacing: "-0.015em",
            marginTop: 40,
          }}
        >
          Скачивай бесплатно
        </div>

        <div
          style={{
            ...lift(link, 22),
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 26,
            padding: "22px 44px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.8)",
            border: `2px solid ${COLORS.cardBorder}`,
            boxShadow: `0 14px 40px ${COLORS.shadow}`,
            fontFamily: FONTS.body,
            fontWeight: 300,
            fontSize: 42,
            color: COLORS.text,
          }}
        >
          <span style={{ fontSize: 34 }}>↑</span>
          Ссылка в шапке профиля
        </div>

        <div
          style={{
            ...lift(link, 18),
            marginTop: 22,
            fontFamily: FONTS.body,
            fontWeight: 600,
            fontSize: 34,
            color: COLORS.textMuted,
          }}
        >
          Сохрани, чтобы не потерять
        </div>
      </div>
    </AbsoluteFill>
  );
};
