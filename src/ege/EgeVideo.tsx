import { AbsoluteFill, Audio, Sequence, Series, staticFile } from "remotion";
import { Background } from "./Background";
import { Watermark } from "./Watermark";
import { FontGate } from "./FontGate";
import { TaskProvider } from "./TaskContext";
import {
  buildFourSlidesScenes,
  buildProfileMathStepsScenes,
  buildScenes,
  totalFourSlidesFrames,
  totalFrames,
  totalProfileMathStepsFrames,
} from "./timing";
import { paletteFor, paletteVars } from "./theme";
import { isFourSlidesTask, isProfileMathStepsTask, type TaskDef } from "./tasks/types";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { AnswerScene } from "./scenes/AnswerScene";
import { ConceptScene } from "./scenes/ConceptScene";
import { OutroScene } from "./scenes/OutroScene";
import { FourSlidesTitleScene } from "./scenes/four-slides/TitleScene";
import { FourSlidesProblemScene } from "./scenes/four-slides/ProblemScene";
import { FourSlidesAnswerScene } from "./scenes/four-slides/AnswerScene";
import { ProfileMathTitleScene } from "./scenes/profile-math-steps/TitleScene";
import { ProfileMathTaskScene } from "./scenes/profile-math-steps/TaskScene";
import { ProfileMathStepScene } from "./scenes/profile-math-steps/StepScene";
import { ProfileMathOutroScene } from "./scenes/profile-math-steps/OutroScene";
import { ProfileMathWatermark } from "./scenes/profile-math-steps/Watermark";

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
 * независимая композиция сцен (см. FourSlidesVideo ниже): жёстко Title →
 * Problem → Answer → CTA, без пошагового разбора и без общего "explanation
 * во время ProblemScene" — это старое поведение здесь ЗАПРЕЩЕНО контрактом.
 * Старая модель (эта функция, EgeVideo) не меняется вовсе — обе ветки
 * должны продолжать рендериться как раньше.
 */
export const EgeVideo: React.FC<{ task: TaskDef }> = ({ task }) => {
  if (isFourSlidesTask(task)) {
    return <FourSlidesVideo task={task} />;
  }

  if (isProfileMathStepsTask(task)) {
    return <ProfileMathStepsVideo task={task} />;
  }

  const scenes = buildScenes(task);

  return (
    <FontGate>
      <TaskProvider value={task}>
        {/* Палитра предмета — переменными на корне, дальше её видят все сцены */}
        <AbsoluteFill style={paletteVars(paletteFor(task.palette))}>
          <Background />

          {/* Озвучка целиком, с начала ролика — сцены нарезаны под неё
              в buildScenes(), поэтому отдельно двигать её не нужно.
              Родной звук видео отсутствует, так что это единственная
              дорожка. */}
          {task.audioSync ? (
            <Audio src={staticFile(task.audioSync.src)} />
          ) : null}

          <Series>
            <Series.Sequence durationInFrames={scenes.title}>
              <HookScene />
            </Series.Sequence>
            <Series.Sequence durationInFrames={scenes.problem}>
              <ProblemScene />
            </Series.Sequence>
            {task.solutions.map(({ Component }, i) => (
              <Series.Sequence key={i} durationInFrames={scenes.solutions[i]}>
                <Component />
              </Series.Sequence>
            ))}

            {scenes.answer > 0 ? (
              <Series.Sequence durationInFrames={scenes.answer}>
                {/* У задания 19 по истории ответ — не значение, а два абзаца */}
                {task.concept ? <ConceptScene /> : <AnswerScene />}
              </Series.Sequence>
            ) : null}
            <Series.Sequence durationInFrames={scenes.outro}>
              <OutroScene />
            </Series.Sequence>
          </Series>

          <Sequence durationInFrames={totalFrames(task) - scenes.outro}>
            <Watermark />
          </Sequence>
        </AbsoluteFill>
      </TaskProvider>
    </FontGate>
  );
};

/**
 * four-slides-v1: Title → Problem → 5-секундная пауза для размышления
 * (часть Problem-сцены, см. FourSlidesProblemScene) → Answer → CTA.
 * Ничего похожего на "ProblemScene во время explanation" здесь нет и быть
 * не может: Problem заканчивается ровно на audioSync.answerSec, Answer
 * начинается сразу после неё — граница жёсткая, посчитана align.py по
 * реальной (склеенной с настоящей тишиной) озвучке.
 */
const FourSlidesVideo: React.FC<{ task: Extract<TaskDef, { videoStructureVersion: "four-slides-v1" }> }> = ({
  task,
}) => {
  const scenes = buildFourSlidesScenes(task);

  return (
    <FontGate>
      <TaskProvider value={task}>
        <AbsoluteFill style={paletteVars(paletteFor(task.palette))}>
          <Background />
          <Audio src={staticFile(task.audioSync.src)} />

          <Series>
            <Series.Sequence durationInFrames={scenes.title}>
              <FourSlidesTitleScene />
            </Series.Sequence>
            <Series.Sequence durationInFrames={scenes.problem}>
              <FourSlidesProblemScene />
            </Series.Sequence>
            <Series.Sequence durationInFrames={scenes.answer}>
              <FourSlidesAnswerScene />
            </Series.Sequence>
            <Series.Sequence durationInFrames={scenes.outro}>
              <OutroScene />
            </Series.Sequence>
          </Series>

          <Sequence durationInFrames={totalFourSlidesFrames(task) - scenes.outro}>
            <Watermark />
          </Sequence>
        </AbsoluteFill>
      </TaskProvider>
    </FontGate>
  );
};

/**
 * chemistry-steps-v1: Title → Task(condition, включая вставленную
 * реальную паузу + pause_prompt) → Step×N (один логический шаг решения на
 * слайд, ответ — часть последнего шага) → CTA. Все границы — реальные
 * forced-alignment секунды из audioSync.segments (align.py:
 * run_profile_math_steps_v2), переведённые в кадры на task.renderFps (НЕ
 * на общем VIDEO.fps — см. timing.ts: buildProfileMathStepsScenes). Никакого
 * отдельного answer-слайда: separate_answer_slide=false гарантирован ещё на
 * этапе build-dynamic-task.mjs (validateProfileMathStepsTaskData).
 */
const ProfileMathStepsVideo: React.FC<{
  task: Extract<TaskDef, { videoStructureVersion: "chemistry-steps-v1" }>;
}> = ({ task }) => {
  const scenes = buildProfileMathStepsScenes(task);

  return (
    <FontGate>
      <TaskProvider value={task}>
        <AbsoluteFill style={paletteVars(paletteFor(task.palette))}>
          <Background />
          <Audio src={staticFile(task.audioSync.src)} />

          <Series>
            <Series.Sequence durationInFrames={scenes.title}>
              <ProfileMathTitleScene />
            </Series.Sequence>
            <Series.Sequence durationInFrames={scenes.task}>
              <ProfileMathTaskScene />
            </Series.Sequence>
            {task.steps.map((step, i) => (
              <Series.Sequence key={step.id} durationInFrames={scenes.steps[i]}>
                <ProfileMathStepScene step={step} index={i} />
              </Series.Sequence>
            ))}
            <Series.Sequence durationInFrames={scenes.outro}>
              <ProfileMathOutroScene />
            </Series.Sequence>
          </Series>

          <Sequence durationInFrames={totalProfileMathStepsFrames(task) - scenes.outro}>
            <ProfileMathWatermark />
          </Sequence>
        </AbsoluteFill>
      </TaskProvider>
    </FontGate>
  );
};
