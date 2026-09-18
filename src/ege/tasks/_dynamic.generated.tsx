// Стаб: реальное содержимое подставляет build-dynamic-task.mjs в CI
// (render-on-demand.yml) перед рендером и никогда не коммитит обратно.
// В репозитории этот файл всегда пустой — локальный `npx remotion render`
// без флага композиции просто не увидит здесь ни одной задачи.
import type { TaskDef } from "./types";

export const DYNAMIC_TASKS: TaskDef[] = [];
