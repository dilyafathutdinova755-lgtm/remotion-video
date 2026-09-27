import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { FlowLines } from "../../FlowLines";
import {
  COLORS,
  FONTS,
  PAD,
  SAFE,
  SAFE_BELOW_BADGE,
} from "../../theme";
import { useTask } from "../../TaskContext";
import { f30 } from "../../timing";
import { isFourSlidesTask } from "../../tasks/types";

/** Крупный ответ — короткое слово/форма набирается крупнее длинного. */
const answerFontSizeFor = (answer: string): number =>
  Math.min(
    128,
    Math.floor(
      1000 / Math.max(answer.length, 1),
    ),
  );

/**
 * СЛАЙД 3 — ANSWER (video_structure_version="four-slides-v1").
 *
 * РУССКИЙ №6:
 *   ПРАВИЛЬНО → answer → explanation.
 *   Исходное предложение НЕ перечёркиваем.
 *
 * РУССКИЙ №7:
 *   ПРАВИЛЬНО → answer → исходный ошибочный контекст,
 *   зачёркнутый целиком → explanation.
 *
 * Вход сцены сделан в том же стиле, что и вход ProblemScene:
 * мягкое появление + лёгкое движение снизу вверх.
 *
 * Выход сцены остаётся прежним,
 * чтобы переход Answer → CTA не изменился.
 */
export const FourSlidesAnswerScene: React.FC = () => {
  const frame = useCurrentFrame();

  const {
    fps,
    durationInFrames,
  } = useVideoConfig();

  const task = useTask();

  if (!isFourSlidesTask(task)) {
    return null;
  }

  // ------------------------------------------------------
  // ПЛАВНЫЙ ВХОД ВСЕЙ ANSWER-СЦЕНЫ
  //
  // Копируем ту же механику, которая уже используется
  // у FourSlidesProblemScene:
  //
  // - небольшая задержка;
  // - мягкое появление;
  // - движение снизу вверх на 30px.
  //
  // Поэтому переход Problem → Answer теперь выглядит
  // в том же стиле, что и остальные переходы.
  // ------------------------------------------------------

  const enter = spring({
    frame: frame - f30(4),
    fps,
    config: {
      damping: 200,
    },
    durationInFrames: f30(15),
  });

  const enterOpacity =
    interpolate(
      enter,
      [0, 1],
      [0, 1],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  const enterTranslateY =
    interpolate(
      enter,
      [0, 1],
      [30, 0],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );

  // ------------------------------------------------------
  // Определяем предмет и номер задания.
  // Поддерживаем несколько возможных имён поля,
  // чтобы сцена не зависела от одного способа сборки TaskDef.
  // ------------------------------------------------------

  const taskMeta =
    task as unknown as Record<
      string,
      unknown
    >;

  const subject = String(
    taskMeta.subject ??
      taskMeta.subjectName ??
      taskMeta.subject_name ??
      "",
  ).toLowerCase();

  const pillNumberMatch = String(
    taskMeta.pillLabel ?? "",
  ).match(/\d+/);

  const taskNumber = Number(
    taskMeta.taskNumber ??
      taskMeta.task_number ??
      taskMeta.number ??
      pillNumberMatch?.[0] ??
      0,
  );

  const isRussian =
    subject.includes("русск");

  // Зачёркнутый incorrectContext разрешён ТОЛЬКО
  // для русского задания №7.
  const showIncorrectContext =
    isRussian &&
    taskNumber === 7 &&
    Boolean(task.incorrectContext);

  // ------------------------------------------------------
  // ВНУТРЕННЯЯ АНИМАЦИЯ ОТВЕТА
  // ------------------------------------------------------

  const pop = spring({
    frame: frame - f30(10),
    fps,
    config: {
      damping: 13,
      mass: 0.7,
      stiffness: 130,
    },
    durationInFrames: f30(40),
  });

  const fade = (delay: number) =>
    interpolate(
      frame,
      [
        delay,
        delay + f30(14),
      ],
      [0, 1],
      {
        extrapolateLeft:
          "clamp",
        extrapolateRight:
          "clamp",
      },
    );

  // ------------------------------------------------------
  // ПЛАВНЫЙ ВЫХОД
  //
  // Оставляем как было.
  // Именно он уже даёт нормальный переход Answer → CTA.
  // ------------------------------------------------------

  const out =
    interpolate(
      frame,
      [
        durationInFrames -
          f30(8),
        durationInFrames,
      ],
      [1, 0],
      {
        extrapolateLeft:
          "clamp",
        extrapolateRight:
          "clamp",
      },
    );

  // В начале работает enterOpacity,
  // в конце работает out.
  const sceneOpacity =
    Math.min(
      enterOpacity,
      out,
    );

  return (
    <AbsoluteFill
      style={{
        opacity: sceneOpacity,
      }}
    >
      <FlowLines />

      <AbsoluteFill
        style={{
          justifyContent:
            "flex-start",
          alignItems: "center",
          padding: `${SAFE_BELOW_BADGE}px ${PAD}px ${SAFE.bottom}px`,
          transform: `translateY(${enterTranslateY}px)`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection:
              "column",
            alignItems:
              "center",
            width: "100%",
            textAlign:
              "center",
          }}
        >
          <div
            style={{
              fontFamily:
                FONTS.display,
              fontWeight: 400,
              fontSize: 34,
              color:
                COLORS.textMuted,
              letterSpacing:
                "0.22em",
              textTransform:
                "uppercase",
              opacity:
                fade(0),
            }}
          >
            ПРАВИЛЬНО
          </div>

          <div
            style={{
              marginTop: 22,
              fontFamily:
                FONTS.head,
              fontWeight: 800,
              fontSize:
                answerFontSizeFor(
                  task.answer,
                ),
              lineHeight: 1.05,
              letterSpacing:
                "-0.03em",
              color:
                COLORS.deep,
              opacity:
                interpolate(
                  pop,
                  [0, 0.5],
                  [0, 1],
                  {
                    extrapolateLeft:
                      "clamp",
                    extrapolateRight:
                      "clamp",
                  },
                ),
              transform: `scale(${interpolate(
                pop,
                [0, 1],
                [0.86, 1],
              )})`,
            }}
          >
            {task.answer}
          </div>

          {showIncorrectContext ? (
            <div
              style={{
                marginTop: 24,
                fontFamily:
                  FONTS.body,
                fontWeight: 300,
                fontSize: 33,
                color:
                  COLORS.textMuted,
                textDecoration:
                  "line-through",
                textDecorationThickness:
                  2,
                opacity:
                  fade(
                    f30(16),
                  ),
              }}
            >
              {
                task.incorrectContext
              }
            </div>
          ) : null}

          <div
            style={{
              width: 180,
              height: 3,
              borderRadius: 999,
              background:
                COLORS.accentLine,
              margin:
                showIncorrectContext
                  ? "54px 0 40px"
                  : "44px 0 40px",
              opacity:
                fade(
                  f30(30),
                ),
            }}
          />

          <div
            style={{
              fontFamily:
                FONTS.body,
              fontWeight: 300,
              fontSize: 38,
              lineHeight: 1.42,
              color:
                COLORS.text,
              maxWidth: 880,
              opacity:
                fade(
                  f30(36),
                ),
            }}
          >
            {task.explanation}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
