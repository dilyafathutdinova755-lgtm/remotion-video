import { COLORS } from "../../ege/theme";

/**
 * Стеклянный сосуд — 2,5D (SVG, без WebGL/Three.js: в проекте нет 3D-
 * библиотек, см. отчёт по эксперименту — честная замена "настоящей 3D",
 * которую просил ТЗ при отсутствии инструментов). Объём создают: градиент
 * стекла + блик + поверхность жидкости (эллипс-мениск) + мягкая контактная
 * тень снизу — без этого силуэт читался бы плоским пятном.
 *
 * Процент — ТОЛЬКО подпись и оттенок жидкости (цвет = смысловая подсказка,
 * НЕ масштаб). Высота заливки — фиксированная, не привязана к kg/%, чтобы
 * случайно не выдать визуально, что объёмы равны/неравны массе — именно
 * против этого явно предостерегало ТЗ.
 */
export type VesselTone = "a" | "b" | "result" | "ghost";

const TONE_COLOR: Record<Exclude<VesselTone, "ghost">, { top: string; bottom: string }> = {
  // Раствор A (10%) — прохладный синий, в тон существующей палитре математики.
  a: { top: "#8FB4F5", bottom: "#3D6FE0" },
  // Раствор B (30%) — тёплый контрастный акцент, чтобы жидкости не путались.
  b: { top: "#F5C98F", bottom: "#E0953D" },
  // Итоговая смесь (20%) — визуальное "среднее" двух оттенков.
  result: { top: "#B6A6F0", bottom: "#7C63D6" },
};

export const Vessel: React.FC<{
  /** 0..1 — заполненность силуэта (НЕ масса/%, см. докстринг выше). */
  fill: number;
  tone: VesselTone;
  /** Масштаб и смещение — для "движения камеры" (зум/панорама) снаружи. */
  width?: number;
  height?: number;
  /** Лёгкое покачивание поверхности жидкости — "сцена не статична". */
  wobble?: number;
}> = ({ fill, tone, width = 200, height = 260, wobble = 0 }) => {
  const w = width;
  const h = height;
  const wallInset = w * 0.08;
  const topY = h * 0.08;
  const bottomY = h * 0.92;
  const rimRx = (w - wallInset * 2) / 2;
  const rimRy = rimRx * 0.26;

  const liquidTop = topY + (bottomY - topY) * (1 - Math.max(0, Math.min(1, fill)));
  const isGhost = tone === "ghost";
  const colors = isGhost ? null : TONE_COLOR[tone];

  const glassStroke = "rgba(255,255,255,0.55)";
  const glassFill = "rgba(255,255,255,0.05)";

  return (
    <svg width={w} height={h + h * 0.12} viewBox={`0 0 ${w} ${h + h * 0.12}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`liquid-${tone}`} x1="0" y1="0" x2="0" y2="1">
          {colors ? (
            <>
              <stop offset="0%" stopColor={colors.top} stopOpacity={0.92} />
              <stop offset="100%" stopColor={colors.bottom} stopOpacity={0.96} />
            </>
          ) : null}
        </linearGradient>
        <linearGradient id={`glass-${tone}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.14)" />
        </linearGradient>
        <clipPath id={`clip-${tone}`}>
          <path
            d={`M ${wallInset} ${topY} L ${wallInset * 0.7} ${bottomY} Q ${w / 2} ${bottomY + h * 0.05} ${
              w - wallInset * 0.7
            } ${bottomY} L ${w - wallInset} ${topY} Z`}
          />
        </clipPath>
        <radialGradient id={`shadow-${tone}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(20,33,61,0.28)" />
          <stop offset="100%" stopColor="rgba(20,33,61,0)" />
        </radialGradient>
      </defs>

      {/* Контактная тень под сосудом */}
      <ellipse cx={w / 2} cy={bottomY + h * 0.07} rx={rimRx * 1.05} ry={rimRy * 0.9} fill={`url(#shadow-${tone})`} />

      {/* Жидкость — только если не "призрак" (итоговый сосуд на этапе условия) */}
      {!isGhost ? (
        <g clipPath={`url(#clip-${tone})`}>
          <rect x={0} y={liquidTop} width={w} height={h} fill={`url(#liquid-${tone})`} />
          {/* Мениск — светлый эллипс на поверхности жидкости, даёт ощущение глубины */}
          <ellipse
            cx={w / 2}
            cy={liquidTop + wobble}
            rx={rimRx * 0.94}
            ry={rimRy * 0.82}
            fill="rgba(255,255,255,0.35)"
          />
        </g>
      ) : null}

      {/* Стенки сосуда поверх жидкости — стекло всегда "над" содержимым */}
      <path
        d={`M ${wallInset} ${topY} L ${wallInset * 0.7} ${bottomY} Q ${w / 2} ${bottomY + h * 0.05} ${
          w - wallInset * 0.7
        } ${bottomY} L ${w - wallInset} ${topY}`}
        fill={isGhost ? "rgba(255,255,255,0.03)" : `url(#glass-${tone})`}
        stroke={isGhost ? "rgba(140,150,185,0.55)" : glassStroke}
        strokeWidth={isGhost ? 2.5 : 3}
        strokeDasharray={isGhost ? "7 7" : undefined}
        strokeLinejoin="round"
      />

      {/* Горлышко — эллипс сверху, "заглядываем внутрь" */}
      <ellipse
        cx={w / 2}
        cy={topY}
        rx={rimRx}
        ry={rimRy}
        fill={isGhost ? "rgba(255,255,255,0.03)" : glassFill}
        stroke={isGhost ? "rgba(140,150,185,0.6)" : glassStroke}
        strokeWidth={isGhost ? 2.5 : 2.5}
        strokeDasharray={isGhost ? "6 6" : undefined}
      />

      {/* Блик — узкая вертикальная полоса слева, имитирует мягкий свет */}
      {!isGhost ? (
        <rect
          x={wallInset + (w - wallInset * 2) * 0.12}
          y={topY + h * 0.08}
          width={w * 0.045}
          height={(bottomY - topY) * 0.6}
          rx={w * 0.02}
          fill="rgba(255,255,255,0.4)"
        />
      ) : null}
    </svg>
  );
};

/** Компактная подпись-чип рядом с сосудом ("8 кг", "10%", "x кг"…). */
export const VesselLabel: React.FC<{ children: React.ReactNode; accent?: boolean; opacity: number }> = ({
  children,
  accent = false,
  opacity,
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "8px 20px",
      borderRadius: 999,
      background: accent ? COLORS.accent : "rgba(255,255,255,0.86)",
      color: accent ? "#fff" : COLORS.text,
      border: accent ? "none" : `1.5px solid ${COLORS.cardBorder}`,
      boxShadow: `0 6px 18px ${COLORS.shadow}`,
      fontFamily: "Inter, sans-serif",
      fontWeight: 700,
      fontSize: 26,
      opacity,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);
