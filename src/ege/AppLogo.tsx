import { FONTS, LOGO } from "./theme";

/**
 * Иконка приложения «ЕГЭ тренажёр»: синий сквиркл с сеткой,
 * «ЕГЭ» крупно и «ТРЕНАЖЁР» под ним.
 *
 * Собрана вектором, чтобы оставаться чёткой на любом размере.
 * Если появится оригинальный PNG — положите его в public/ и замените
 * содержимое на <Img src={staticFile("logo.png")} />.
 */
export const AppLogo: React.FC<{
  size: number;
  /** В маленьком размере подпись «ТРЕНАЖЁР» нечитаема — тогда оставляем только «ЕГЭ». */
  compact?: boolean;
  style?: React.CSSProperties;
}> = ({ size, compact = false, style }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.235,
      background: `linear-gradient(158deg, ${LOGO.from} 0%, ${LOGO.mid} 52%, ${LOGO.to} 100%)`,
      boxShadow: `0 ${size * 0.055}px ${size * 0.15}px rgba(11,82,220,0.32)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      flexShrink: 0,
      ...style,
    }}
  >
    {/* Сетка «в клетку», как на иконке */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.16) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,0.16) 1.5px, transparent 1.5px)",
        backgroundSize: `${size * 0.132}px ${size * 0.132}px`,
      }}
    />
    {/* Блик сверху */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(120% 70% at 30% -10%, rgba(255,255,255,0.22) 0%, transparent 60%)",
      }}
    />

    <span
      style={{
        position: "relative",
        fontFamily: FONTS.logo,
        fontWeight: 800,
        fontSize: size * (compact ? 0.38 : 0.285),
        lineHeight: 1,
        color: "#fff",
        letterSpacing: "0.005em",
      }}
    >
      ЕГЭ
    </span>
    {!compact && (
      <span
        style={{
          position: "relative",
          fontFamily: FONTS.logo,
          fontWeight: 700,
          fontSize: size * 0.112,
          lineHeight: 1,
          color: "#fff",
          letterSpacing: "0.015em",
          marginTop: size * 0.05,
        }}
      >
        ТРЕНАЖЁР
      </span>
    )}
  </div>
);
