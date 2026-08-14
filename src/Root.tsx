import "./index.css";
import { Composition } from "remotion";
import { EgeVideo } from "./ege/EgeVideo";
import { TOTAL_FRAMES } from "./ege/timing";
import { VIDEO } from "./ege/theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      // npx remotion render Task10
      id="Task10"
      component={EgeVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
