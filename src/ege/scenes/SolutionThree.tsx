import { SolutionLayout, Line } from "../SolutionLayout";
import { Reveal, V, Frac, FormulaCard } from "../MathBits";
import { COLORS, FONTS } from "../theme";

/** Стрелка перехода между формулами — в вертикали смотрит вниз. */
const Down: React.FC = () => (
  <span
    style={{
      fontSize: 40,
      color: COLORS.blueSoft,
      fontFamily: FONTS.head,
      lineHeight: 1,
      textAlign: "center",
    }}
  >
    ⇩
  </span>
);

export const SolutionThree: React.FC = () => (
  <SolutionLayout step="3" title="Решаем систему">
    <Reveal at={0}>
      <Line>
        Подставим <V>y</V> = <Frac num="11" den="30" scale={0.78} />
        <V>x</V> во второе уравнение:
      </Line>
    </Reveal>

    <Reveal
      at={45}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
    >
      <FormulaCard style={{ fontSize: 48, fontWeight: 600 }}>
        3<V>x</V>
        <span style={{ margin: "0 14px" }}>−</span>2&nbsp;·&nbsp;
        <Frac
          num={
            <>
              11<V>x</V>
            </>
          }
          den="30"
        />
        <span style={{ margin: "0 16px" }}>=</span>
        1020
      </FormulaCard>
      <Down />
      <FormulaCard style={{ fontSize: 48, fontWeight: 600 }}>
        3<V>x</V>
        <span style={{ margin: "0 14px" }}>−</span>
        <Frac
          num={
            <>
              11<V>x</V>
            </>
          }
          den="15"
        />
        <span style={{ margin: "0 16px" }}>=</span>
        1020
      </FormulaCard>
    </Reveal>

    <Reveal at={165} style={{ marginTop: 10 }}>
      <Line>Приводим подобные слагаемые:</Line>
    </Reveal>

    <Reveal
      at={205}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
    >
      <FormulaCard style={{ fontSize: 48, fontWeight: 600 }}>
        <Frac
          num={
            <>
              34<V>x</V>
            </>
          }
          den="15"
        />
        <span style={{ margin: "0 16px" }}>=</span>
        1020
      </FormulaCard>
      <Down />
      <FormulaCard accent style={{ fontSize: 48, fontWeight: 600 }}>
        <V>x</V>
        <span style={{ margin: "0 16px" }}>=</span>
        <span style={{ color: COLORS.blue, fontWeight: 700 }}>450</span>
        <span style={{ margin: "0 28px", color: COLORS.blueLine }}>|</span>
        <V>y</V>
        <span style={{ margin: "0 16px" }}>=</span>
        <span style={{ color: COLORS.blue, fontWeight: 700 }}>165</span>
      </FormulaCard>
    </Reveal>

    {/* Сноска, а не отдельный шаг — поэтому без маркера */}
    <Reveal at={300} style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
      <span style={{ fontSize: 34, color: COLORS.textMuted, fontWeight: 300 }}>
        ведь <V>y</V> = <Frac num="11" den="30" scale={0.76} /> · 450 = 165
      </span>
    </Reveal>
  </SolutionLayout>
);
