import "./index.css";
import { Composition } from "remotion";
import { EgeVideo } from "./ege/EgeVideo";
import { totalFrames } from "./ege/timing";
import { VIDEO } from "./ege/theme";
import { task10 } from "./ege/tasks/task10";
import { task11 } from "./ege/tasks/task11";
import type { TaskDef } from "./ege/tasks/types";

/**
 * Композиции задаются описанием задачи из src/ege/tasks. Чтобы добавить
 * новый ролик, достаточно нового TaskDef и строчки здесь.
 */
const TASKS: TaskDef[] = [task10, task11];

export const RemotionRoot: React.FC = () => (
  <>
    {TASKS.map((task) => (
      <Composition
        // npx remotion render <id>
        key={task.id}
        id={task.id}
        component={() => <EgeVideo task={task} />}
        durationInFrames={totalFrames(task)}
        fps={VIDEO.fps}
        width={VIDEO.width}
        height={VIDEO.height}
      />
    ))}
  </>
);
