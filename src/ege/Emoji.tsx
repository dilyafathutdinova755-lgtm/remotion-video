/** Шрифт для эмодзи: без него браузер рисует пустые прямоугольники. */
export const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", sans-serif';

/** Эмодзи в потоке текста — для формул и подписей. */
export const Emoji: React.FC<{ children: string; size?: number }> = ({ children, size }) => (
  <span style={{ fontFamily: EMOJI_FONT, fontSize: size, lineHeight: 1 }}>{children}</span>
);
