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

  // Подсветка слов при «чтении»
  readBg: "#dce9fb",
  activeBg: "#a9cbfa",

  card: "rgba(255,255,255,0.72)",
  cardBorder: "rgba(29,78,216,0.16)",

  ok: "#0f7b52",
  okBg: "#dbf3e7",
} as const;

export const FONTS = {
  head: '"Montserrat", "DejaVu Sans", sans-serif',
  body: '"Inter", "DejaVu Sans", sans-serif',
} as const;

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;
