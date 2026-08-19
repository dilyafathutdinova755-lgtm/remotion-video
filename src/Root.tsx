import "./index.css";
import { Composition } from "remotion";
import { EgeVideo } from "./ege/EgeVideo";
import { totalFrames } from "./ege/timing";
import { VIDEO } from "./ege/theme";
import type { TaskDef } from "./ege/tasks/types";

import { task10 } from "./ege/tasks/task10";
import { task11 } from "./ege/tasks/task11";
import { pipes660 } from "./ege/tasks/pipes660";
import { details380 } from "./ege/tasks/details380";
import { ship200 } from "./ege/tasks/ship200";
import { twoCars } from "./ege/tasks/twoCars";
import { motorcycle420 } from "./ege/tasks/motorcycle420";
import { pipes180 } from "./ege/tasks/pipes180";
import { acid } from "./ege/tasks/acid";
import { cyclist70 } from "./ege/tasks/cyclist70";
import { avgSpeed } from "./ege/tasks/avgSpeed";
import { alloys } from "./ege/tasks/alloys";
import { LEXICAL_TASKS } from "./ege/tasks/lexical";
import { INFORMATICS_TASKS } from "./ege/tasks/informatics";
import { HISTORY_TASKS } from "./ege/tasks/history";

/**
 * Композиции задаются описанием задачи из src/ege/tasks. Чтобы добавить
 * новый ролик, достаточно нового TaskDef и строчки здесь.
 */
const TASKS: TaskDef[] = [
  task10,
  task11,
  pipes660,
  details380,
  ship200,
  twoCars,
  motorcycle420,
  pipes180,
  acid,
  cyclist70,
  avgSpeed,
  alloys,
  ...LEXICAL_TASKS,
  ...INFORMATICS_TASKS,
  ...HISTORY_TASKS,
];

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
