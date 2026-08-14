import { AbsoluteFill, Sequence, Series } from "remotion";
import { Background } from "./Background";
import { Watermark } from "./Watermark";
import { FontGate } from "./FontGate";
import { SCENES, TOTAL_FRAMES } from "./timing";
import { TitleScene } from "./scenes/TitleScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { TimerScene } from "./scenes/TimerScene";
import { SolutionOne } from "./scenes/SolutionOne";
import { SolutionTwo } from "./scenes/SolutionTwo";
import { SolutionThree } from "./scenes/SolutionThree";
import { AnswerScene } from "./scenes/AnswerScene";
import { OutroScene } from "./scenes/OutroScene";

/**
 * Ролик «Задача 10, профильная математика», вертикальный 9:16.
 *
 * Фон живёт вне Series, поэтому не мигает на стыках сцен — меняется
 * только содержимое. Плашка в углу висит до финального экрана, где её
 * заменяет большая иконка приложения.
 */
export const EgeVideo: React.FC = () => (
  <FontGate>
    <AbsoluteFill>
      <Background />

      <Series>
        <Series.Sequence durationInFrames={SCENES.title}>
          <TitleScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.problem}>
          <ProblemScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.timer}>
          <TimerScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.solution1}>
          <SolutionOne />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.solution2}>
          <SolutionTwo />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.solution3}>
          <SolutionThree />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.answer}>
          <AnswerScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENES.outro}>
          <OutroScene />
        </Series.Sequence>
      </Series>

      <Sequence durationInFrames={TOTAL_FRAMES - SCENES.outro}>
        <Watermark />
      </Sequence>
    </AbsoluteFill>
  </FontGate>
);
