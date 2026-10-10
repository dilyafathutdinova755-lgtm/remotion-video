import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, Easing } from "remotion";
import { COLORS, FONTS, PAD, SAFE } from "../../ege/theme";
import { AppLogo } from "../../ege/AppLogo";
import { SceneHeading } from "../../ege/MathBits";
import { Line } from "../../ege/SolutionLayout";
import { Vessel, VesselLabel } from "./Vessel";
import { CONDITION_END_SEC, CONDITION_START_SEC, beat, secToFrame } from "./timing";

const fAt = (fps: number, frames30: number): number => Math.round((frames30 * fps) / 30);

const CONDITION_TEXT =
  "К 8 кг десятипроцентного раствора соли добавили тридцатипроцентный раствор той же соли. Сколько килограммов тридцатипроцентного раствора нужно добавить, чтобы получить двадцатипроцентный раствор?";

/** Плавное пружинное появление: 0 до frame "at", далее 0→1. */
const useReveal = (frame: number, fps: number, atSec: number, durFrames30 = 18) => {
  const atFrame = secToFrame(fps, atSec);
  return spring({
    frame: frame - atFrame,
    fps,
    config: { damping: 16, mass: 0.8, stiffness: 120 },
    durationInFrames: fAt(fps, durFrames30),
  });
};

/**
 * Единая непрерывная сцена: intro (условие уже видно) → чтение условия
 * (сосуды/подписи появляются по смыслу речи) → пауза (2с тишины,
 * "Ставь на паузу") → три шага решения (камера приближается к сосудам,
 * формулы собираются по смыслу речи). Один React-компонент, а не серия
 * раздельных Series.Sequence — потому что по ТЗ это ДОЛЖНО быть одно
 * непрерывное пространство с движением камеры, а не монтажная склейка.
 *
 * Все моменты появления — секунды из timing.ts (измеренные по реальному
 * черновому аудио, не оценка на глаз) переведённые в кадры текущего fps
 * композиции (useVideoConfig().fps, НЕ общий VIDEO.fps — см. отчёт по
 * предыдущей задаче profile-math-steps-v2 про ту же ловушку).
 */
export const MathVesselsMain: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sec = frame / fps;

  const stepsStartSec = beat("d1").startSec;
  const isStepsPhase = sec >= stepsStartSec;

  // --- Появления по смыслу речи (условие) ---------------------------------
  const vessel1In = useReveal(frame, fps, beat("c1").startSec);
  const vessel2In = useReveal(frame, fps, beat("c2").startSec);
  const unknownHighlight = useReveal(frame, fps, beat("c3").startSec, 14);
  const vessel3GhostIn = useReveal(frame, fps, beat("c4").startSec);

  // --- Полоска прогресса чтения условия (НЕ вступление) -------------------
  const progress = interpolate(
    sec,
    [CONDITION_START_SEC, CONDITION_END_SEC],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const progressVisible = interpolate(sec, [CONDITION_START_SEC - 0.3, CONDITION_START_SEC], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Пауза ---------------------------------------------------------------
  const pauseB = beat("pause");
  const pausePromptOpacity = interpolate(
    sec,
    [pauseB.startSec, pauseB.startSec + 0.3],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  ) * interpolate(sec, [pauseB.endSec, stepsStartSec], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // --- Карточка условия: сжимается/уходит, когда начинается решение -------
  const cardCollapse = interpolate(sec, [stepsStartSec - 0.6, stepsStartSec], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cardOpacity = 1 - cardCollapse;
  const cardScale = interpolate(cardCollapse, [0, 1], [1, 0.92]);
  // Текст условия должен ПОЛНОСТЬЮ покидать экран (не просто гаснуть на
  // месте) — к схлопыванию высоты добавлен уход вверх, чтобы на этапе
  // решения в кадре оставалась только иллюстрация с сосудами.
  const cardExitY = interpolate(cardCollapse, [0, 1], [0, -70]);

  // --- "Камера": лёгкий зум к активному сосуду во время чтения условия ----
  // ВАЖНО: раньше тут была ветка if(!isStepsPhase)/else с ДВУМЯ разными
  // формулами camScale, переключаемыми булевым флагом — на границе
  // stepsStartSec значение прыгало мгновенно (это и была часть "обрывистого"
  // перехода из фидбека). Теперь обе фазы считаются одной непрерывной
  // интерполяцией: conditionZoom/conditionX гаснут сами по себе задолго до
  // stepsStartSec (окна c1/c2 давно позади), а vesselTransition плавно
  // подмешивает к ним stepsZoom — переключения по кадру больше нет.
  const focusVessel1 = interpolate(
    sec,
    [beat("c1").startSec, beat("c1").endSec, beat("c2").startSec],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const focusVessel2 = interpolate(
    sec,
    [beat("c2").startSec, beat("c2").endSec, beat("c3").startSec + 0.4],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const conditionZoom = 1 + focusVessel1 * 0.06 + focusVessel2 * 0.03;
  const conditionX = focusVessel1 * -26 + focusVessel2 * 18;

  // Единое плавное окно условие→решение — используется И для камеры, И для
  // масштаба/расстояния сосудов ниже, так фон/камера/сосуды переходят
  // синхронно, а не рассинхронизированными отдельными "скачками".
  const vesselTransition = interpolate(sec, [stepsStartSec - 0.6, stepsStartSec + 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const stepsZoom = interpolate(vesselTransition, [0, 1], [1, 1.1]);

  const camScale = conditionZoom * (1 - vesselTransition) + stepsZoom * vesselTransition;
  const camX = conditionX * (1 - vesselTransition);

  // Лёгкое дыхание поверхности жидкости — сцена не статична даже в покое.
  const wobble = Math.sin(frame / fps / 1.7) * 1.6;

  // --- Формулы по шагам (появляются по смыслу речи) ------------------------
  const d1In = useReveal(frame, fps, beat("d1").startSec);
  const d2In = useReveal(frame, fps, beat("d2").startSec);
  const d3In = useReveal(frame, fps, beat("d3").startSec);
  const d4In = useReveal(frame, fps, beat("d4").startSec);
  const d5In = useReveal(frame, fps, beat("d5").startSec);
  const d6In = useReveal(frame, fps, beat("d6").startSec);
  const d7In = useReveal(frame, fps, beat("d7").startSec);
  const d8In = useReveal(frame, fps, beat("d8").startSec);

  // Было: isStepsPhase ? 0.62 : 1 — мгновенный скачок масштаба/зазора на
  // границе фаз (ровно баг "неаккуратный переход обрывистый" из фидбека).
  // Теперь — та же непрерывная vesselTransition, что и у камеры/фона выше:
  // сосуды уменьшаются ПЛАВНО в том же окне, где меняется фон и наезжает
  // камера, а не дискретным прыжком за один кадр. Базовая ширина сосуда
  // увеличена (228 → 272 px) — крупнее по просьбе фидбека.
  // --- Быстрый "оборот вокруг своей оси" логотипа в начале (по референсу:
  // объект крутится вокруг вертикальной оси с лёгким блюром в движении,
  // затем чётко "приземляется" лицом к зрителю ровно на 0°/360° — без рывка
  // на стыке). Логотип при этом виден с кадра 0 (п. "видна с первого
  // кадра" из прежнего ТЗ не нарушается — он просто уже вращается).
  const LOGO_SPIN_SEC = 1.5;
  const spinProgress = interpolate(sec, [0, LOGO_SPIN_SEC], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const spinAngle = spinProgress * 3 * 360; // 3 полных оборота → заканчивается на том же "лице"
  const spinBlur = (1 - spinProgress) * 5;
  const spinLift = (1 - spinProgress) * 10;

  const vesselScale = interpolate(vesselTransition, [0, 1], [1, 0.72]);
  const vesselGap = interpolate(vesselTransition, [0, 1], [50, 18]);
  const vesselsMarginTop = interpolate(vesselTransition, [0, 1], [46, 18]);
  const vesselWidth = 272;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-start",
        alignItems: "center",
        padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`,
      }}
    >
      {/* Компактный бренд сверху — на ~25% крупнее прежнего угла-плашки
          (54 → 68px), не перекрывает карточку (отдельной строкой сверху). */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 22,
          // Видна с первого кадра (ТЗ п.2) — без fade-in из невидимости,
          // просто уже в процессе быстрого вращения (см. spinAngle выше).
        }}
      >
        <div style={{ perspective: 700 }}>
          <div
            style={{
              transform: `rotateY(${spinAngle}deg) translateY(${-spinLift}px)`,
              transformStyle: "preserve-3d",
              filter: `blur(${spinBlur}px) drop-shadow(0 ${10 + spinLift}px ${18 + spinLift * 1.6}px rgba(11,46,138,0.30))`,
            }}
          >
            <AppLogo size={68} compact examType="ege" />
          </div>
        </div>
        <span
          style={{
            fontFamily: FONTS.display,
            fontWeight: 500,
            fontSize: 30,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: COLORS.deep,
          }}
        >
          ЕГЭ тренажёр
        </span>
      </div>

      {/* Карточка условия — текст полностью настоящий текст, не картинка.
          maxHeight (не только opacity) схлопывается вместе с ней, иначе
          invisible-но-занимающий-место блок оставляет пустой разрыв перед
          сосудами на этапе решения. */}
      <div
        style={{
          width: "100%",
          maxHeight: interpolate(cardCollapse, [0, 1], [460, 0]),
          overflow: "hidden",
          opacity: cardOpacity,
          transform: `scale(${cardScale}) translateY(${cardExitY}px)`,
          transformOrigin: "top center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            background: COLORS.card,
            borderRadius: 34,
            border: `2px solid ${COLORS.cardBorder}`,
            boxShadow: `0 22px 60px ${COLORS.shadow}`,
            padding: "36px 38px 22px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: FONTS.body,
              fontWeight: 300,
              fontSize: 33,
              lineHeight: 1.32,
              color: COLORS.text,
            }}
          >
            {CONDITION_TEXT}
          </div>

          {/* Полоска прогресса — часть нижней грани карточки, привязана
              ТОЛЬКО к чтению условия (c1..c4), не к intro. */}
          <div
            style={{
              marginTop: 22,
              marginLeft: -38,
              marginRight: -38,
              height: 8,
              background: COLORS.accentFaint,
              opacity: progressVisible,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: COLORS.accent,
                transform: `scaleX(${progress})`,
                transformOrigin: "left center",
              }}
            />
          </div>
        </div>
      </div>

      {/* Сцена с сосудами — "камера" двигает/масштабирует эту обёртку. */}
      <div
        style={{
          marginTop: vesselsMarginTop,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: vesselGap,
          transform: `scale(${camScale * vesselScale}) translateX(${camX}px)`,
          transition: "none",
        }}
      >
        {/* Сосуд 1 — 10% */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            opacity: interpolate(vessel1In, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(vessel1In, [0, 1], [24, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <VesselLabel opacity={interpolate(vessel1In, [0, 1], [0, 1])}>8 кг</VesselLabel>
            <VesselLabel opacity={interpolate(vessel1In, [0, 1], [0, 1])}>10%</VesselLabel>
          </div>
          <div style={{ filter: "drop-shadow(0 30px 36px rgba(20,33,61,0.30))" }}>
            <Vessel fill={0.58} tone="a" width={vesselWidth} wobble={wobble} />
          </div>
          {isStepsPhase ? (
            <div
              style={{
                opacity: interpolate(d1In, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(d1In, [0, 1], [14, 0])}px)`,
                fontFamily: FONTS.body,
                fontWeight: 600,
                fontSize: 22,
                color: COLORS.deep,
                textAlign: "center",
                maxWidth: 190,
              }}
            >
              0,1 · 8 = 0,8 кг соли
            </div>
          ) : null}
        </div>

        {/* Сосуд 2 — 30% (неизвестное x) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            opacity: interpolate(vessel2In, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(vessel2In, [0, 1], [24, 0])}px)`,
          }}
        >
          <div style={{ display: "flex", gap: 10 }}>
            <VesselLabel
              accent={unknownHighlight > 0.05}
              opacity={interpolate(vessel2In, [0, 1], [0, 1])}
            >
              x кг
            </VesselLabel>
            <VesselLabel opacity={interpolate(vessel2In, [0, 1], [0, 1])}>30%</VesselLabel>
          </div>
          <div style={{ filter: "drop-shadow(0 30px 36px rgba(20,33,61,0.30))" }}>
            <Vessel fill={0.5} tone="b" width={vesselWidth} wobble={-wobble} />
          </div>
          {isStepsPhase ? (
            <div
              style={{
                opacity: interpolate(d2In, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(d2In, [0, 1], [14, 0])}px)`,
                fontFamily: FONTS.body,
                fontWeight: 600,
                fontSize: 22,
                color: COLORS.deep,
                textAlign: "center",
                maxWidth: 190,
              }}
            >
              0,3x кг соли
            </div>
          ) : null}
        </div>

        {/* Сосуд 3 — итоговый (20%): призрак на этапе условия, заполняется
            на этапе решения. Уровень заливки НЕ привязан к расчёту —
            фиксированный, намеренно не выдаёт массу геометрией. */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            opacity: interpolate(vessel3GhostIn, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(vessel3GhostIn, [0, 1], [24, 0])}px)`,
          }}
        >
          <VesselLabel opacity={interpolate(vessel3GhostIn, [0, 1], [0, 1])}>20%</VesselLabel>
          <div style={{ filter: "drop-shadow(0 30px 36px rgba(20,33,61,0.30))" }}>
            <Vessel
              fill={isStepsPhase ? 0.6 : 0}
              tone={isStepsPhase ? "result" : "ghost"}
              width={vesselWidth}
              wobble={wobble * 0.6}
            />
          </div>
          {isStepsPhase ? (
            <div
              style={{
                opacity: interpolate(d3In, [0, 1], [0, 1]),
                transform: `translateY(${interpolate(d3In, [0, 1], [14, 0])}px)`,
                fontFamily: FONTS.body,
                fontWeight: 600,
                fontSize: 20,
                color: COLORS.deep,
                textAlign: "center",
                maxWidth: 190,
              }}
            >
              8 + x кг раствора
            </div>
          ) : null}
        </div>
      </div>

      {/* "Ставь на паузу" — чисто визуально, не озвучивается. */}
      <div
        style={{
          marginTop: 30,
          opacity: pausePromptOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "16px 34px",
            borderRadius: 999,
            background: COLORS.accentBg,
            border: `2px solid ${COLORS.accentFaint}`,
            fontFamily: FONTS.body,
            fontWeight: 700,
            fontSize: 34,
            color: COLORS.accent,
          }}
        >
          Ставь на паузу
        </div>
      </div>

      {/* Решение — шаг 2 (продолжение) и шаг 3, тем же языком SceneHeading/Line,
          что у уже проверенного profile-math-steps-v2. */}
      {isStepsPhase ? (
        <div style={{ width: "100%", marginTop: 34 }}>
          <div
            style={{
              opacity: interpolate(d4In, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(d4In, [0, 1], [18, 0])}px)`,
              textAlign: "center",
              fontFamily: FONTS.body,
              fontWeight: 600,
              fontSize: 24,
              color: COLORS.deep,
              marginBottom: 6,
            }}
          >
            20% соли
          </div>
          <div
            style={{
              opacity: interpolate(d5In, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(d5In, [0, 1], [18, 0])}px)`,
              textAlign: "center",
              fontFamily: FONTS.body,
              fontWeight: 700,
              fontSize: 30,
              color: COLORS.text,
              marginBottom: 24,
            }}
          >
            0,8 + 0,3x = 0,2(8 + x)
          </div>

          <SceneHeading step="3" title="Находим неизвестное" />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, color: COLORS.text }}>
            {d6In > 0.02 ? (
              <div style={{ opacity: interpolate(d6In, [0, 1], [0, 1]) }}>
                <Line size={34}>0,8 + 0,3x = 1,6 + 0,2x</Line>
              </div>
            ) : null}
            {d7In > 0.02 ? (
              <div style={{ opacity: interpolate(d7In, [0, 1], [0, 1]) }}>
                <Line size={34}>0,1x = 0,8</Line>
              </div>
            ) : null}
            {d8In > 0.02 ? (
              <div
                style={{
                  opacity: interpolate(d8In, [0, 1], [0, 1]),
                  transform: `scale(${interpolate(d8In, [0, 1], [0.9, 1])})`,
                  marginTop: 4,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    padding: "14px 30px",
                    borderRadius: 20,
                    background: COLORS.accentBg,
                    border: `2px solid ${COLORS.accentFaint}`,
                    fontFamily: FONTS.head,
                    fontWeight: 800,
                    fontSize: 42,
                    color: COLORS.deep,
                  }}
                >
                  x = 8 кг
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
