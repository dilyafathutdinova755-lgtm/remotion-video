import type { ArtName } from "./tasks/types";

/**
 * Векторные иллюстрации к условиям задач.
 *
 * Нарисованы в палитре ролика (синий + янтарный акцент) на скруглённой
 * подложке — той же формы, что иконка приложения, чтобы картинки читались
 * как часть оформления, а не как чужие наклейки.
 *
 * Все — 120×120, масштабируются размером контейнера.
 */

const BG = "#e8f1fd";
const BLUE = "#1d4ed8";
const DEEP = "#12336e";
const PALE = "#c9dcf7";
const PALER = "#dbe9fb";
const AMBER = "#f5a524";
const AMBER_LIGHT = "#ffc65c";

/** Подложка-сквиркл под каждой иллюстрацией. */
const Plate = () => <rect width={120} height={120} rx={30} fill={BG} />;

/** Фигурка рабочего: каска, голова, торс со светоотражающей полосой. */
const WorkerFigure: React.FC<{ x?: number; y?: number; scale?: number }> = ({
  x = 0,
  y = 0,
  scale = 1,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {/* торс */}
    <path d="M22 112 v-14 c0-20 17-31 38-31 s38 11 38 31 v14 z" fill={BLUE} />
    {/* светоотражающая полоса */}
    <path d="M53 69 h14 v43 h-14 z" fill="#ffffff" opacity="0.9" />
    {/* голова */}
    <circle cx={60} cy={50} r={19} fill={DEEP} />
    {/* каска */}
    <path d="M41 46 a19 19 0 0 1 38 0 z" fill={AMBER} />
    <rect x={32} y={43} width={56} height={9} rx={4.5} fill={AMBER} />
    <rect x={56} y={27} width={8} height={19} rx={4} fill={AMBER_LIGHT} />
  </g>
);

const Worker = () => <WorkerFigure />;

/** Двое рядом — момент, когда рабочие взялись за заказ вместе. */
const Duo = () => (
  <>
    <WorkerFigure x={-2} y={26} scale={0.62} />
    <WorkerFigure x={48} y={26} scale={0.62} />
  </>
);

/** Заказ: планшет со списком, две позиции сделаны, одна ещё нет. */
const Order = () => (
  <>
    <rect x={28} y={24} width={64} height={80} rx={12} fill="#ffffff" />
    <rect x={46} y={15} width={28} height={17} rx={8} fill={BLUE} />
    <rect x={40} y={48} width={13} height={13} rx={4} fill={BLUE} />
    <rect x={59} y={51} width={24} height={7} rx={3.5} fill={PALE} />
    <rect x={40} y={68} width={13} height={13} rx={4} fill={BLUE} />
    <rect x={59} y={71} width={24} height={7} rx={3.5} fill={PALE} />
    <rect x={40} y={88} width={13} height={13} rx={4} fill={PALE} />
    <rect x={59} y={91} width={24} height={7} rx={3.5} fill={PALER} />
  </>
);

/** Вопрос задачи. */
const Question = () => (
  <>
    <text
      x={60}
      y={90}
      textAnchor="middle"
      fill={BLUE}
      fontFamily='"Montserrat", sans-serif'
      fontWeight={800}
      fontSize={78}
    >
      ?
    </text>
  </>
);

const ART: Record<ArtName, React.FC> = {
  worker: Worker,
  duo: Duo,
  order: Order,
  question: Question,
};

export const Art: React.FC<{
  name: ArtName;
  size: number;
  /** Подложка нужна на крупной иллюстрации; внутри карточки она лишняя. */
  plate?: boolean;
}> = ({ name, size, plate = true }) => {
  const Shape = ART[name];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {plate ? <Plate /> : null}
      <Shape />
    </svg>
  );
};
