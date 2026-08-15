import { SolutionLayout, Line } from "../SolutionLayout";
import { Reveal, V, FormulaCard, Down } from "../MathBits";
import { COLORS } from "../theme";

export const SolutionTwo: React.FC = () => (
  <SolutionLayout step="2" title="Вводим коэффициент">
    <Reveal at={0}>
      <Line>
        Из 30<V>y</V> = 11<V>x</V> следует <V>x</V> : <V>y</V> = 30 : 11, поэтому <V>x</V> = 30
        <V>t</V>, <V>y</V> = 11<V>t</V>.
      </Line>
    </Reveal>

    <Reveal at={60}>
      <Line>
        Разница между тремя футболками и двумя кепками — 1020 рублей:
      </Line>
    </Reveal>

    <Reveal
      at={110}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 8 }}
    >
      <FormulaCard style={{ fontSize: 50, fontWeight: 600 }}>
        3<V>x</V>
        <span style={{ margin: "0 12px" }}>−</span>2<V>y</V>
        <span style={{ margin: "0 14px" }}>=</span>
        90<V>t</V>
        <span style={{ margin: "0 12px" }}>−</span>22<V>t</V>
        <span style={{ margin: "0 14px" }}>=</span>
        68<V>t</V>
      </FormulaCard>

      <Down />

      <FormulaCard accent style={{ fontSize: 52, fontWeight: 600 }}>
        68<V>t</V>
        <span style={{ margin: "0 16px" }}>=</span>
        1020
        <span style={{ margin: "0 26px", color: COLORS.blueLine }}>|</span>
        <V>t</V>
        <span style={{ margin: "0 16px" }}>=</span>
        <span style={{ color: COLORS.blue, fontWeight: 700 }}>15</span>
      </FormulaCard>
    </Reveal>

    <Reveal at={250} style={{ marginTop: 8 }}>
      <Line>
        Осталось найти разницу: <V>x</V> − <V>y</V> = 30<V>t</V> − 11<V>t</V> = 19<V>t</V>.
      </Line>
    </Reveal>
  </SolutionLayout>
);
