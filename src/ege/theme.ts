/**
 * Визуальные константы ролика.
 *
 * Палитра задана ТЗ. Главное отличие от прежней версии — карточка стала
 * сплошной белой, а фон заметно плотнее: раньше полупрозрачная карточка
 * почти сливалась с фоном и не добирала контраста по WCAG AA.
 */

export const COLORS = {
  // Фон: сверху светлее, снизу плотнее
  bgTop: "#EAF1FD",
  bgBottom: "#DCE7FB",
  blob1: "#cfe0fa",
  blob2: "#e6eefc",

  // Акценты
  deep: "#0B2E8A",
  blue: "#1652F0",
  blueSoft: "#4F7FF5",
  blueLine: "#A8BEEA",

  // Текст
  text: "#14213D",
  textMuted: "#6B7A99",

  // Карточка: сплошная белая, чтобы отделяться от фона
  card: "#FFFFFF",
  cardBorder: "rgba(11,46,138,0.10)",

  ok: "#1E9E57",
  okBg: "#E4F7EC",
  success: "#2ECC71",

  // Иконка приложения
  logoFrom: "#3B7BFF",
  logoTo: "#0B2E8A",
} as const;

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
