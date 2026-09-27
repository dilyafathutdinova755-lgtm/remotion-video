import { useTask } from "../../TaskContext";
import { isFourSlidesTask } from "../../tasks/types";
import { HookVisual } from "../HookVisual";

/**
 * СЛАЙД 1 — TITLE (video_structure_version="four-slides-v1").
 *
 * Живёт ровно во время intro_text (см. timing.ts: buildFourSlidesScenes —
 * длительность этой сцены и есть audioSync.introSec) — но ТОЛЬКО как
 * озвучка/тайминг. Визуально это тот же старый Hook-слайд (HookVisual):
 * крупный хук-вопрос + плашка «ЕГЭ/ОГЭ · предмет · задание N», а не
 * intro_text крупным текстом по центру — так его правили по итогам
 * визуального ревью тестовых кадров (см. отчёт по этой правке).
 */
export const FourSlidesTitleScene: React.FC = () => {
  const task = useTask();
  if (!isFourSlidesTask(task)) return null;

  return (
    <HookVisual hook={task.hook} examType={task.examType} subject={task.subject} number={task.number} />
  );
};
