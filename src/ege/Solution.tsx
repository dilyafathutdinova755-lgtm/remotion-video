import type { ReactNode } from "react";
import { SolutionLayout, Line } from "./SolutionLayout";
import { Reveal, FormulaCard, Down } from "./MathBits";

/**
 * Сцены решения задаются данными, а не вёрсткой: на десяток роликов
 * приходится два десятка сцен, и писать каждую руками — только плодить
 * расхождения в отступах и таймингах.
 */
export type SolutionItem =
  | { kind: "line"; content: ReactNode }
  | { kind: "card"; content: ReactNode; accent: boolean; size: number }
  | { kind: "arrow" };

export const line = (content: ReactNode): SolutionItem => ({
  kind: "line",
  content,
});

export const card = (
  content: ReactNode,
  opts: { accent?: boolean; size?: number } = {},
): SolutionItem => ({
  kind: "card",
  content,
  accent: opts.accent ?? false,
  size: opts.size ?? 46,
});

export const arrow = (): SolutionItem => ({ kind: "arrow" });

export type SolutionSpec = {
  step: string;
  title: string;
  seconds: number;
  items: SolutionItem[];
};

/**
 * Хвост в конце сцены: последний пункт должен повисеть, а не мелькнуть.
 * В кадрах при 30 fps — Reveal пересчитает их под текущую частоту сам.
 */
const TAIL = 80;

export const makeSolution = (spec: SolutionSpec): React.FC => {
  // Стрелка не отдельный пункт: она выезжает вместе со следующей карточкой
  const anchors = spec.items.map((it) => it.kind !== "arrow");
  const count = anchors.filter(Boolean).length;

  // Reveal ждёт задержку в кадрах при 30 fps и пересчитывает её сам,
  // поэтому и шаг между пунктами считаем в тех же единицах
  const frames = Math.round(spec.seconds * 30);
  const gap = Math.min(
    Math.max(Math.round((frames - TAIL) / Math.max(count - 1, 1)), 30),
    56,
  );

  // Кадр появления каждого пункта
  let anchorIndex = -1;
  const at = spec.items.map((it, i) => {
    if (it.kind !== "arrow") {
      anchorIndex += 1;
      return anchorIndex * gap;
    }
    // стрелке отдаём время следующего пункта
    const nextIsAnchor = spec.items[i + 1] !== undefined;
    return nextIsAnchor ? (anchorIndex + 1) * gap : anchorIndex * gap;
  });

  const Scene: React.FC = () => (
    <SolutionLayout step={spec.step} title={spec.title}>
      {spec.items.map((it, i) => {
        if (it.kind === "line") {
          return (
            <Reveal key={i} at={at[i]}>
              <Line>{it.content}</Line>
            </Reveal>
          );
        }
        if (it.kind === "arrow") {
          return (
            <Reveal
              key={i}
              at={at[i]}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Down />
            </Reveal>
          );
        }
        return (
          <Reveal
            key={i}
            at={at[i]}
            style={{ display: "flex", justifyContent: "center" }}
          >
            <FormulaCard
              accent={it.accent}
              style={{ fontSize: it.size, fontWeight: 600 }}
            >
              {it.content}
            </FormulaCard>
          </Reveal>
        );
      })}
    </SolutionLayout>
  );

  return Scene;
};
