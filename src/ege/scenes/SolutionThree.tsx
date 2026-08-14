import { SolutionLayout, Line } from "../SolutionLayout";
import { Reveal, V, Frac, FormulaCard } from "../MathBits";
import { COLORS, FONTS } from "../theme";

const Arrow: React.FC = () => (
  <span style={{ fontSize: 46, color: COLORS.blueSoft, fontFamily: FONTS.head, margin: "0 26px" }}>
    ⟹
  </span>
);

export const SolutionThree: React.FC = () => (
  <SolutionLayout step="3" title="Решаем систему">
    <Reveal at={0}>
      <Line>
        Подставим <V>y</V> = <Frac num="11" den="30" scale={0.8} />
        <V>x</V> во второе уравнение:
      </Line>
    </Reveal>

    <Reveal at={50} style={{ marginTop: 4 }}>
      <FormulaCard style={{ fontSize: 50, fontWeight: 600 }}>
        3<V>x</V>
        <span style={{ margin: "0 14px" }}>−</span>2&nbsp;·&nbsp;
        <Frac num={<>11<V>x</V></>} den="30" />
        <span style={{ margin: "0 16px" }}>=</span>
        1020
        <Arrow />
        3<V>x</V>
        <span style={{ margin: "0 14px" }}>−</span>
        <Frac num={<>11<V>x</V></>} den="15" />
        <span style={{ margin: "0 16px" }}>=</span>
        1020
      </FormulaCard>
    </Reveal>

    <Reveal at={125}>
      <Line>Приводим подобные слагаемые:</Line>
    </Reveal>

    <Reveal at={165} style={{ marginTop: 4 }}>
      <FormulaCard style={{ fontSize: 50, fontWeight: 600 }}>
        <Frac num={<>34<V>x</V></>} den="15" />
        <span style={{ margin: "0 16px" }}>=</span>
        1020
        <Arrow />
        <V>x</V>
        <span style={{ margin: "0 16px" }}>=</span>
        <span style={{ color: COLORS.blue, fontWeight: 700 }}>450</span>
      </FormulaCard>
    </Reveal>

    <Reveal at={250} style={{ marginTop: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <span style={{ fontSize: 40, color: COLORS.textMuted }}>Тогда</span>
        <FormulaCard accent style={{ fontSize: 50, fontWeight: 600 }}>
          <V>y</V>
          <span style={{ margin: "0 16px" }}>=</span>
          <Frac num="11" den="30" />
          <span style={{ margin: "0 6px" }}>·&nbsp;450</span>
          <span style={{ margin: "0 16px" }}>=</span>
          <span style={{ color: COLORS.blue, fontWeight: 700 }}>165</span>
        </FormulaCard>
      </div>
    </Reveal>
  </SolutionLayout>
);
