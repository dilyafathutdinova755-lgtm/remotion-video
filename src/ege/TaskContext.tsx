import { createContext, useContext } from "react";
import {
  isFourSlidesTask,
  isProfileMathStepsTask,
  type FourSlidesTaskDef,
  type ProfileMathStepsTaskDef,
  type TaskDef,
} from "./tasks/types";

const TaskContext = createContext<TaskDef | null>(null);

export const TaskProvider = TaskContext.Provider;

/** Описание задачи для текущего ролика. */
export const useTask = (): TaskDef => {
  const task = useContext(TaskContext);
  if (!task) throw new Error("useTask вызван вне <TaskProvider>");
  return task;
};

/** Только для old-модели (video_structure_version не задан): старые сцены
 * (HookScene/ProblemScene/AnswerScene/ConceptScene) никогда не монтируются
 * для four-slides-v1/biology-steps-v1 задачи (см. EgeVideo.tsx —
 * ветвление происходит раньше), поэтому throw здесь на практике недостижим
 * и служит только явной типовой границей вместо приведения типов в каждой
 * сцене. */
export const useOldTask = (): Exclude<TaskDef, FourSlidesTaskDef | ProfileMathStepsTaskDef> => {
  const task = useTask();
  if (isFourSlidesTask(task) || isProfileMathStepsTask(task)) {
    throw new Error(
      `useOldTask() вызван для задачи video_structure_version=${JSON.stringify(
        "videoStructureVersion" in task ? task.videoStructureVersion : undefined,
      )} — старые сцены не должны монтироваться для этого контракта.`,
    );
  }
  return task;
};
