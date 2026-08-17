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

/** Труба с каплей — задачи про наполнение резервуара. */
const Pipe = () => (
  <>
    <rect x={22} y={44} width={76} height={28} rx={8} fill={BLUE} />
    <rect x={16} y={36} width={12} height={44} rx={5} fill={DEEP} />
    <rect x={92} y={36} width={12} height={44} rx={5} fill={DEEP} />
    <rect x={34} y={52} width={52} height={6} rx={3} fill="#ffffff" opacity="0.35" />
    <path d="M60 80 c9 11 13 15 13 20 a13 13 0 0 1 -26 0 c0-5 4-9 13-20 z" fill="#3b82f6" />
  </>
);

/** Шестерёнка — задачи про выработку деталей. */
const Gear = () => (
  <>
    {Array.from({ length: 8 }).map((_, i) => (
      <rect
        key={i}
        x={54}
        y={10}
        width={12}
        height={20}
        rx={4}
        fill={BLUE}
        transform={`rotate(${i * 45} 60 60)`}
      />
    ))}
    <circle cx={60} cy={60} r={32} fill={BLUE} />
    <circle cx={60} cy={60} r={15} fill={BG} />
  </>
);

/** Теплоход. */
const Ship = () => (
  <>
    <rect x={58} y={26} width={8} height={22} rx={4} fill={AMBER} />
    <rect x={44} y={46} width={32} height={26} rx={5} fill={DEEP} />
    <path d="M18 72 h84 l-14 24 h-56 z" fill={BLUE} />
    <rect x={20} y={102} width={34} height={8} rx={4} fill={PALE} />
    <rect x={62} y={102} width={34} height={8} rx={4} fill={PALE} />
  </>
);

/** Автомобиль сбоку. */
const Car = () => (
  <>
    <path d="M36 60 l11-17 h26 l13 17 z" fill={DEEP} />
    <rect x={16} y={58} width={88} height={24} rx={10} fill={BLUE} />
    <circle cx={38} cy={86} r={12} fill={DEEP} />
    <circle cx={38} cy={86} r={4.5} fill={BG} />
    <circle cx={84} cy={86} r={12} fill={DEEP} />
    <circle cx={84} cy={86} r={4.5} fill={BG} />
    <rect x={96} y={64} width={9} height={7} rx={3} fill={AMBER} />
  </>
);

/** Мотоцикл. */
const Moto = () => (
  <>
    <circle cx={30} cy={80} r={18} fill="none" stroke={DEEP} strokeWidth={8} />
    <circle cx={90} cy={80} r={18} fill="none" stroke={DEEP} strokeWidth={8} />
    <path
      d="M30 80 L52 56 h20 l18 24"
      fill="none"
      stroke={BLUE}
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x={44} y={46} width={26} height={10} rx={5} fill={AMBER} />
  </>
);

/** Колба — задачи про растворы и сплавы. */
const Flask = () => (
  <>
    <rect x={47} y={18} width={26} height={9} rx={4.5} fill={DEEP} />
    <path
      d="M53 27 v17 L29 88 c-3 6 1 12 7 12 h48 c6 0 10-6 7-12 L67 44 V27 z"
      fill="#ffffff"
    />
    <path d="M39 70 L29 88 c-3 6 1 12 7 12 h48 c6 0 10-6 7-12 L81 70 z" fill={BLUE} />
    <circle cx={52} cy={84} r={4} fill="#ffffff" opacity="0.5" />
    <circle cx={70} cy={90} r={3} fill="#ffffff" opacity="0.4" />
  </>
);

/** Велосипед. */
const Bike = () => (
  <>
    <circle cx={30} cy={80} r={19} fill="none" stroke={DEEP} strokeWidth={6} />
    <circle cx={90} cy={80} r={19} fill="none" stroke={DEEP} strokeWidth={6} />
    <path
      d="M30 80 L54 80 L66 50 M54 80 L72 50 L90 80 M66 50 h14"
      fill="none"
      stroke={BLUE}
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x={48} y={44} width={20} height={8} rx={4} fill={AMBER} />
  </>
);

/** Спидометр — задачи про среднюю скорость. */
const Speed = () => (
  <>
    <path
      d="M26 84 a34 34 0 0 1 68 0"
      fill="none"
      stroke={PALE}
      strokeWidth={11}
      strokeLinecap="round"
    />
    <path
      d="M26 84 a34 34 0 0 1 46 -30"
      fill="none"
      stroke={BLUE}
      strokeWidth={11}
      strokeLinecap="round"
    />
    <path d="M60 84 L82 58" stroke={DEEP} strokeWidth={7} strokeLinecap="round" />
    <circle cx={60} cy={84} r={8} fill={DEEP} />
  </>
);

const ART: Record<ArtName, React.FC> = {
  worker: Worker,
  duo: Duo,
  order: Order,
  question: Question,
  pipe: Pipe,
  gear: Gear,
  ship: Ship,
  car: Car,
  moto: Moto,
  flask: Flask,
  bike: Bike,
  speed: Speed,
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
