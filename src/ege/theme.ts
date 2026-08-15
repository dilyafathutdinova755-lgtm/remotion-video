/**
 * Визуальные константы ролика: бело-синяя палитра, шрифты, размеры.
 */

export const COLORS = {
  // Фон: от белого к мягкому голубому
  bgTop: "#ffffff",
  bgBottom: "#dbe9fb",
  blob1: "#bfd8f8",
  blob2: "#e3edfd",

  // Синие акценты
  deep: "#12336e",
  blue: "#1d4ed8",
  blueSoft: "#3b82f6",
  blueLine: "#93b8e8",

  // Текст
  text: "#152741",
  textMuted: "#5b7395",

  card: "rgba(255,255,255,0.72)",
  cardBorder: "rgba(29,78,216,0.16)",

  ok: "#0f7b52",
  okBg: "#dbf3e7",

  // Иконка приложения
  logoFrom: "#2b7bff",
  logoTo: "#0a52dc",
} as const;

export const FONTS = {
  /** Montserrat — жирные заголовки. */
  head: '"Montserrat", "DejaVu Sans", sans-serif',
  /** Inter — основной текст и формулы. */
  body: '"Inter", "DejaVu Sans", sans-serif',
  /** Oswald — узкие вытянутые надписи: плашки, подписи, «ОТВЕТ». */
  display: '"Oswald", "Montserrat", "DejaVu Sans", sans-serif',
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
 * Безопасная зона: интерфейс Reels/Shorts перекрывает верх (шапка) и низ
 * (подпись, кнопки). Контент сцен центрируется внутри этой полосы, а не
 * по всему кадру, иначе его срезает.
 */
export const SAFE = {
  top: 330,
  bottom: 420,
} as const;
