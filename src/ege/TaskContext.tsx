import { createContext, useContext } from "react";
import type { TaskDef } from "./tasks/types";

const TaskContext = createContext<TaskDef | null>(null);

export const TaskProvider = TaskContext.Provider;

/** Описание задачи для текущего ролика. */
export const useTask = (): TaskDef => {
  const task = useContext(TaskContext);
  if (!task) throw new Error("useTask вызван вне <TaskProvider>");
  return task;
};
