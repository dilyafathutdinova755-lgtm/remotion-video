import { AbsoluteFill } from "remotion";
import { COLORS, PAD, SAFE } from "../../theme";
import { useTask } from "../../TaskContext";
import { isProfileMathStepsTask } from "../../tasks/types";

/** Answer is visible from the first frame of its measured spoken segment. */
export const ChemistryAnswerScene: React.FC = () => {
  const task = useTask();
  if (!isProfileMathStepsTask(task) || !task.separateAnswerSlide) return null;
  return <AbsoluteFill style={{padding: `${SAFE.top}px ${PAD}px ${SAFE.bottom}px`, justifyContent: "center", alignItems: "center", color: COLORS.text}}>
    <div style={{fontSize: 58, fontWeight: 700, marginBottom: 32}}>Ответ</div>
    <div style={{fontSize: 150, fontWeight: 800}}>{task.answer}</div>
  </AbsoluteFill>;
};
