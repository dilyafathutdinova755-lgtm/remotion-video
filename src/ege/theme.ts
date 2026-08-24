/**
 * Визуальные константы ролика.
 *
 * Палитра задана ТЗ. Главное отличие от прежней версии — карточка стала
 * сплошной белой, а фон заметно плотнее: раньше полупрозрачная карточка
 * почти сливалась с фоном и не добирала контраста по WCAG AA.
 *
 * Цвета живут в CSS-переменных: палитру выбирает сама задача (биология
 * зелёная, русский-7 розовый, остальные синие), а компонентам знать об этом
 * незачем. Переменные выставляются один раз на корне ролика в EgeVideo.
 */

/** Состав палитры одинаков у всех предметов, отличаются только значения. */
export type Palette = {
  /** Фон: сверху светлее, снизу плотнее */
  bgTop: string;
  bgMid: string;
  bgBottom: string;
  /** Пятна на фоне — уже с прозрачностью, их подмешивать нельзя */
  blobA: string;
  blobB: string;

  /** Акценты */
  deep: string;
  accent: string;
  accentSoft: string;
  /** Полупрозрачный акцент для рамок */
  accentFaint: string;
  accentLine: string;
  /** Заливка карточки-акцента и подложка индикатора чтения */
  accentBg: string;
  track: string;
  /** Цветное свечение под плашками и карточкой ответа */
  accentGlow: string;
  /** Текст поверх заливки акцентом: подпись и единицы */
  onAccentMuted: string;
  onAccentSoft: string;

  /** Текст */
  text: string;
  textMuted: string;

  /** Карточка: сплошная белая, чтобы отделяться от фона */
  card: string;
  cardBorder: string;
  /** Нейтральная тень карточек */
  shadow: string;

  /** Плашка проверки под ответом */
  ok: string;
  okBg: string;
  okFaint: string;
};

const BLUE: Palette = {
  bgTop: "#EAF1FD",
  bgMid: "#f4f8fe",
  bgBottom: "#DCE7FB",
  blobA: "rgba(207,224,250,0.53)",
  blobB: "rgba(230,238,252,0.80)",

  deep: "#0B2E8A",
  accent: "#1652F0",
  accentSoft: "#4F7FF5",
  accentFaint: "rgba(79,127,245,0.40)",
  accentLine: "#A8BEEA",
  accentBg: "#eaf2ff",
  track: "#e2ebf8",
  accentGlow: "rgba(29,78,216,0.30)",
  onAccentMuted: "#bcd4ff",
  onAccentSoft: "#dbe7ff",

  text: "#14213D",
  textMuted: "#6B7A99",

  card: "#FFFFFF",
  cardBorder: "rgba(11,46,138,0.10)",
  shadow: "rgba(18,51,110,0.10)",

  ok: "#1E9E57",
  okBg: "#E4F7EC",
  okFaint: "rgba(30,158,87,0.20)",
};

/**
 * Биология. Зелёный акцент светлее синего, поэтому взят потемнее, чем
 * напрашивается: на белой карточке он работает основным цветом текста
 * формул и должен добирать контраст.
 */
const GREEN: Palette = {
  bgTop: "#EAF7EF",
  bgMid: "#f3fbf6",
  bgBottom: "#DAEFE3",
  blobA: "rgba(205,232,216,0.53)",
  blobB: "rgba(230,244,236,0.80)",

  deep: "#0A5233",
  accent: "#0E8B50",
  accentSoft: "#38B078",
  accentFaint: "rgba(56,176,120,0.40)",
  accentLine: "#A5D8BC",
  accentBg: "#e6f6ed",
  track: "#dfeee6",
  accentGlow: "rgba(14,139,80,0.28)",
  onAccentMuted: "#bde9d0",
  onAccentSoft: "#dcf3e6",

  text: "#12301F",
  textMuted: "#5F7A6A",

  card: "#FFFFFF",
  cardBorder: "rgba(10,82,51,0.10)",
  shadow: "rgba(16,74,48,0.10)",

  ok: "#186B45",
  okBg: "#DFF2E7",
  okFaint: "rgba(24,107,69,0.20)",
};

/**
 * Русский, задание 7. Розовый — самый светлый из трёх, поэтому акцент взят
 * приглушённо-малиновым: пастельная роза на белом не читается.
 */
const PINK: Palette = {
  bgTop: "#FDEFF3",
  bgMid: "#fdf6f8",
  bgBottom: "#F8E2EA",
  blobA: "rgba(247,215,226,0.53)",
  blobB: "rgba(252,236,241,0.80)",

  deep: "#7A2144",
  accent: "#B03A63",
  accentSoft: "#D07C99",
  accentFaint: "rgba(208,124,153,0.40)",
  accentLine: "#E7BCCB",
  accentBg: "#fbeef2",
  track: "#f2dde4",
  accentGlow: "rgba(176,58,99,0.22)",
  onAccentMuted: "#f3cfdb",
  onAccentSoft: "#fae5ec",

  text: "#3A1F2A",
  textMuted: "#8A6B76",

  card: "#FFFFFF",
  cardBorder: "rgba(122,33,68,0.10)",
  shadow: "rgba(104,40,64,0.10)",

  ok: "#9A2F57",
  okBg: "#FBEAF0",
  okFaint: "rgba(154,47,87,0.18)",
};

/** Иконка приложения — бренд, от предмета не зависит. */
export const LOGO = {
  from: "#3B7BFF",
  mid: "#0d5ff2",
  to: "#0B2E8A",
} as const;

export type PaletteName = "blue" | "green" | "pink";

const PALETTES: Record<PaletteName, Palette> = {
  blue: BLUE,
  green: GREEN,
  pink: PINK,
};

export const paletteFor = (name: PaletteName = "blue"): Palette =>
  PALETTES[name];

/** Значения палитры как CSS-переменные на корне ролика. */
export const paletteVars = (palette: Palette): React.CSSProperties =>
  Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [`--c-${key}`, value]),
  ) as React.CSSProperties;

/**
 * Цвета для компонентов. Значения подставляются в момент отрисовки, поэтому
 * подмешивать к ним прозрачность строкой (`COLORS.accent + "66"`) нельзя —
 * для этого в палитре есть готовые accentFaint и okFaint.
 */
export const COLORS = Object.fromEntries(
  Object.keys(BLUE).map((key) => [key, `var(--c-${key})`]),
) as Record<keyof Palette, string>;

/**
 * Шрифт по ТЗ — Inter, Bold/SemiBold. Montserrat остался только внутри
 * иконки приложения: логотип менять нельзя.
 */
export const FONTS = {
  head: '"Inter", "DejaVu Sans", sans-serif',
  body: '"Inter", "DejaVu Sans", sans-serif',
  display: '"Inter", "DejaVu Sans", sans-serif',
  logo: '"Montserrat", "DejaVu Sans", sans-serif',
} as const;

/** Вертикальный формат 9:16 под Shorts / Reels / TikTok. */
export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/** Боковые поля, за которые контент не заходит. */
export const PAD = 68;

/**
 * Безопасная зона по ТЗ: сверху 250 px, снизу 320 px. Контент сцен
 * центрируется внутри этой полосы, а не по всему кадру.
 */
export const SAFE = {
  top: 260,
  bottom: 330,
} as const;

/**
 * Верх для сцен, где текст стоит прямо на фоне и прижат к верхней кромке.
 * Одной безопасной зоны мало: на 232 px висит собственная плашка с логотипом,
 * и подпись над ответом уезжала прямо под неё.
 */
export const SAFE_BELOW_BADGE = 400;
