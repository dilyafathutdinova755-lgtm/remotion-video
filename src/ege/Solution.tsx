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
  /**
   * Явные кадры появления пунктов (в кадрах при 30 fps, как и весь модуль
   * timing.ts) — заменяют автоматический равномерный шаг. Берётся из
   * реальной озвучки через `beatsToItemAt` ниже. Длина массива должна
   * совпадать с `items`.
   */
  itemAt?: number[];
};

/**
 * Хвост в конце сцены: последний пункт должен повисеть, а не мелькнуть.
 * В кадрах при 30 fps — Reveal пересчитает их под текущую частоту сам.
 */
const TAIL = 80;

/** Небольшой шаг между пунктами внутри одной реплики озвучки (30fps-кадры). */
const BEAT_STAGGER = 16;

/**
 * Раскладывает пункты шага по кадрам, когда шаг озвучен несколькими
 * репликами подряд (например, решение — отдельно от ответа). `beatSeconds`
 * — секунды начала второй, третьей… реплики от начала шага (первая всегда
 * с нуля); `itemCounts` — сколько пунктов относится к каждой реплике,
 * по порядку, в сумме равно `items.length`. Стрелка внутри реплики так же
 * получает время следующего за ней пункта — как и в автоматическом режиме.
 */
export const beatsToItemAt = (
  items: SolutionItem[],
  itemCounts: number[],
  beatSeconds: number[],
): number[] => {
  const beatStart30 = [0, ...beatSeconds.map((s) => Math.round(s * 30))];
  const at: number[] = new Array(items.length);
  let idx = 0;
  itemCounts.forEach((count, b) => {
    const local = items.slice(idx, idx + count);
    let anchorIndex = -1;
    local.forEach((it, i) => {
      if (it.kind !== "arrow") {
        anchorIndex += 1;
        at[idx + i] = beatStart30[b] + anchorIndex * BEAT_STAGGER;
      } else {
        const nextIsAnchor = local[i + 1] !== undefined;
        at[idx + i] =
          beatStart30[b] +
          (nextIsAnchor ? anchorIndex + 1 : anchorIndex) * BEAT_STAGGER;
      }
    });
    idx += count;
  });
  return at;
};

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

  // Кадр появления каждого пункта — если пришёл готовый тайминг из
  // озвучки (itemAt), используем его; иначе считаем сами, равномерно
  let anchorIndex = -1;
  const at =
    spec.itemAt ??
    spec.items.map((it, i) => {
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
