import { AbsoluteFill, Sequence, Series } from "remotion";
import { Background } from "./Background";
import { Watermark } from "./Watermark";
import { FontGate } from "./FontGate";
import { TaskProvider } from "./TaskContext";
import { buildScenes, totalFrames } from "./timing";
import type { TaskDef } from "./tasks/types";
import { HookScene } from "./scenes/HookScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { AnswerScene } from "./scenes/AnswerScene";
import { ConceptScene } from "./scenes/ConceptScene";
import { OutroScene } from "./scenes/OutroScene";

/**
 * Ролик-разбор задачи, вертикальный 9:16.
 *
 * Все сцены, кроме решения, общие для любых задач и берут данные из
 * TaskProvider. Сцены решения приходят из описания задачи — математика
 * у каждой своя, обобщать её смысла нет.
 *
 * Фон живёт вне Series, поэтому не мигает на стыках сцен. Плашка в углу
 * висит до финального экрана, где её заменяет большая иконка приложения.
 */
export const EgeVideo: React.FC<{ task: TaskDef }> = ({ task }) => {
  const scenes = buildScenes(task);

  return (
    <FontGate>
      <TaskProvider value={task}>
        <AbsoluteFill>
          <Background />

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

            <Series.Sequence durationInFrames={scenes.answer}>
              {/* У задания 19 по истории ответ — не значение, а два абзаца */}
              {task.concept ? <ConceptScene /> : <AnswerScene />}
            </Series.Sequence>
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
