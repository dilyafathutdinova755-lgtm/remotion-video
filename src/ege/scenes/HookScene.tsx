import { useOldTask } from "../TaskContext";
import { HookVisual } from "./HookVisual";

/**
 * Первые секунды ролика по ТЗ: не заставка с логотипом, а вопрос крупным
 * текстом. Логотип никуда не делся — он остался плашкой в углу и на
 * финальном экране. Сам визуал теперь в HookVisual — его же переиспользует
 * FourSlidesTitleScene (video_structure_version="four-slides-v1").
 */
export const HookScene: React.FC = () => {
  const task = useOldTask();
  return (
    <HookVisual hook={task.hook} examType={task.examType} subject={task.subject} number={task.number} />
  );
};
