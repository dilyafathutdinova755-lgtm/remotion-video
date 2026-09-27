import {
  AbsoluteFill,
  Audio,
  Sequence,
  Series,
  staticFile,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "./Background";
import { Watermark } from "./Watermark";
import { FontGate } from "./FontGate";
import { TaskProvider } from "./TaskContext";
import {
  buildFourSlidesScenes,
  buildScenes,
  totalFourSlidesFrames,
  totalFrames,
} from "./timing";
import { paletteFor, paletteVars } from "./theme";
import {
  isFourSlidesTask,
  type TaskDef,
} from "./tasks/types";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { AnswerScene } from "./scenes/AnswerScene";
import { ConceptScene } from "./scenes/ConceptScene";
import { OutroScene } from "./scenes/OutroScene";
import { FourSlidesTitleScene } from "./scenes/four-slides/TitleScene";
import { FourSlidesProblemScene } from "./scenes/four-slides/ProblemScene";
import { FourSlidesAnswerScene } from "./scenes/four-slides/AnswerScene";

/**
 * Ролик-разбор задачи, вертикальный 9:16.
 *
 * Все сцены, кроме решения, общие для любых задач и берут данные из
 * TaskProvider. Сцены решения приходят из описания задачи — математика
 * у каждой своя, обобщать её смысла нет.
 *
 * Фон живёт вне Series, поэтому не мигает на стыках сцен. Плашка в углу
 * висит до финального экрана, где её заменяет большая иконка приложения.
 *
 * video_structure_version="four-slides-v1" — отдельная, полностью
 * независимая композиция сцен (см. FourSlidesVideo ниже): Title →
 * Problem → Answer → CTA, без пошагового разбора и без общего
 * "explanation во время ProblemScene".
 *
 * Старая модель (эта функция, EgeVideo) не меняется —
 * обе ветки должны продолжать рендериться независимо.
 */
export const EgeVideo: React.FC<{
  task: TaskDef;
}> = ({ task }) => {
  if (isFourSlidesTask(task)) {
    return (
      <FourSlidesVideo
        task={task}
      />
    );
  }

  const scenes =
    buildScenes(task);

  return (
    <FontGate>
      <TaskProvider
        value={task}
      >
        {/* Палитра предмета — переменными на корне */}
        <AbsoluteFill
          style={paletteVars(
            paletteFor(
              task.palette,
            ),
          )}
        >
          <Background />

          {/* Озвучка целиком, с начала ролика */}
          {task.audioSync ? (
            <Audio
              src={staticFile(
                task.audioSync
                  .src,
              )}
            />
          ) : null}

          <Series>
            <Series.Sequence
              durationInFrames={
                scenes.title
              }
            >
              <HookScene />
            </Series.Sequence>

            <Series.Sequence
              durationInFrames={
                scenes.problem
              }
            >
              <ProblemScene />
            </Series.Sequence>

            {task.solutions.map(
              (
                {
                  Component,
                },
                i,
              ) => (
                <Series.Sequence
                  key={i}
                  durationInFrames={
                    scenes
                      .solutions[
                      i
                    ]
                  }
                >
                  <Component />
                </Series.Sequence>
              ),
            )}

            {scenes.answer >
            0 ? (
              <Series.Sequence
                durationInFrames={
                  scenes.answer
                }
              >
                {/* У задания 19 по истории ответ — не значение, а два абзаца */}
                {task.concept ? (
                  <ConceptScene />
                ) : (
                  <AnswerScene />
                )}
              </Series.Sequence>
            ) : null}

            <Series.Sequence
              durationInFrames={
                scenes.outro
              }
            >
              <OutroScene />
            </Series.Sequence>
          </Series>

          <Sequence
            durationInFrames={
              totalFrames(
                task,
              ) -
              scenes.outro
            }
          >
            <Watermark />
          </Sequence>
        </AbsoluteFill>
      </TaskProvider>
    </FontGate>
  );
};

/**
 * Единая визуальная плавность для four-slides-v1.
 *
 * ВАЖНО:
 * - длительность сцен не меняется;
 * - сцены не перекрываются;
 * - audioSync не двигается;
 * - границы Title / Problem / Answer / CTA остаются теми же;
 * - добавляется только одинаковый fade на визуальном слое.
 *
 * Фон находится вне Series, поэтому во время fade
 * сцена мягко растворяется в том же самом фоне,
 * без чёрного кадра и без резкой склейки.
 */
const FourSlidesSceneFade: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  fadeIn?: boolean;
  fadeOut?: boolean;
}> = ({
  children,
  durationInFrames,
  fadeIn = true,
  fadeOut = true,
}) => {
  const frame =
    useCurrentFrame();

  const { fps } =
    useVideoConfig();

  /*
   * Одинаковая длительность перехода
   * независимо от FPS.
   *
   * ~0.22 секунды достаточно,
   * чтобы переход был заметно плавным,
   * но не выглядел медленным.
   */
  const preferredFadeFrames =
    Math.max(
      1,
      Math.round(
        fps * 0.22,
      ),
    );

  /*
   * Защита от слишком короткой сцены:
   * fade не должен занимать большую
   * часть её длительности.
   */
  const maxFadeFrames =
    Math.max(
      1,
      Math.floor(
        (durationInFrames -
          1) /
          3,
      ),
    );

  const fadeFrames =
    Math.min(
      preferredFadeFrames,
      maxFadeFrames,
    );

  /*
   * Теоретическая защита для
   * сверхкоротких сцен.
   */
  if (
    durationInFrames <= 2
  ) {
    return (
      <AbsoluteFill>
        {children}
      </AbsoluteFill>
    );
  }

  const fadeInOpacity =
    fadeIn
      ? interpolate(
          frame,
          [
            0,
            fadeFrames,
          ],
          [0, 1],
          {
            extrapolateLeft:
              "clamp",
            extrapolateRight:
              "clamp",
          },
        )
      : 1;

  const fadeOutStart =
    Math.max(
      0,
      durationInFrames -
        1 -
        fadeFrames,
    );

  const fadeOutOpacity =
    fadeOut
      ? interpolate(
          frame,
          [
            fadeOutStart,
            durationInFrames -
              1,
          ],
          [1, 0],
          {
            extrapolateLeft:
              "clamp",
            extrapolateRight:
              "clamp",
          },
        )
      : 1;

  const opacity =
    Math.min(
      fadeInOpacity,
      fadeOutOpacity,
    );

  return (
    <AbsoluteFill
      style={{
        opacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/**
 * four-slides-v1:
 *
 * Title → Problem → Answer → CTA.
 *
 * Пауза для размышления является частью Problem-сцены
 * и берётся из task.pauseSeconds.
 *
 * Тайминг всех границ остаётся строго привязанным
 * к audioSync, рассчитанному align.py.
 *
 * Визуально каждый переход между сценами получает
 * один и тот же мягкий fade:
 *
 * Title → Problem
 * Problem → Answer
 * Answer → CTA
 *
 * Это НЕ изменяет длину видео и НЕ сдвигает аудио.
 */
const FourSlidesVideo: React.FC<{
  task: Extract<
    TaskDef,
    {
      videoStructureVersion: "four-slides-v1";
    }
  >;
}> = ({ task }) => {
  const scenes =
    buildFourSlidesScenes(
      task,
    );

  return (
    <FontGate>
      <TaskProvider
        value={task}
      >
        <AbsoluteFill
          style={paletteVars(
            paletteFor(
              task.palette,
            ),
          )}
        >
          <Background />

          <Audio
            src={staticFile(
              task.audioSync
                .src,
            )}
          />

          <Series>
            {/* 1. TITLE / HOOK */}
            <Series.Sequence
              durationInFrames={
                scenes.title
              }
            >
              <FourSlidesSceneFade
                durationInFrames={
                  scenes.title
                }
                fadeIn={
                  false
                }
                fadeOut
              >
                <FourSlidesTitleScene />
              </FourSlidesSceneFade>
            </Series.Sequence>

            {/* 2. TASK */}
            <Series.Sequence
              durationInFrames={
                scenes.problem
              }
            >
              <FourSlidesSceneFade
                durationInFrames={
                  scenes.problem
                }
                fadeIn
                fadeOut
              >
                <FourSlidesProblemScene />
              </FourSlidesSceneFade>
            </Series.Sequence>

            {/* 3. ANSWER */}
            <Series.Sequence
              durationInFrames={
                scenes.answer
              }
            >
              <FourSlidesSceneFade
                durationInFrames={
                  scenes.answer
                }
                fadeIn
                fadeOut
              >
                <FourSlidesAnswerScene />
              </FourSlidesSceneFade>
            </Series.Sequence>

            {/* 4. CTA */}
            <Series.Sequence
              durationInFrames={
                scenes.outro
              }
            >
              <FourSlidesSceneFade
                durationInFrames={
                  scenes.outro
                }
                fadeIn
                fadeOut={
                  false
                }
              >
                <OutroScene />
              </FourSlidesSceneFade>
            </Series.Sequence>
          </Series>

          <Sequence
            durationInFrames={
              totalFourSlidesFrames(
                task,
              ) -
              scenes.outro
            }
          >
            <Watermark />
          </Sequence>
        </AbsoluteFill>
      </TaskProvider>
    </FontGate>
  );
};
