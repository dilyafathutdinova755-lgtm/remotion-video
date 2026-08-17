import { SolutionLayout, Line } from "../SolutionLayout";
import { Reveal, V, FormulaCard, Down } from "../MathBits";
import { COLORS } from "../theme";

export const SolutionOne: React.FC = () => (
  <SolutionLayout step="1" title="Находим отношение цен">
    <Reveal at={0}>
      <Line>
        Пусть футболка стоит <V>x</V> рублей, а кепка — <V>y</V> рублей.
      </Line>
    </Reveal>

    <Reveal at={50}>
      <Line>
        Три кепки дешевле двух футболок на 45%, значит 3<V>y</V> — это{" "}
        <span style={{ color: COLORS.blue, fontWeight: 600 }}>55%</span> от 2
        <V>x</V>:
      </Line>
    </Reveal>

    <Reveal
      at={110}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        marginTop: 8,
      }}
    >
      <FormulaCard style={{ fontSize: 52, fontWeight: 600 }}>
        3<V>y</V>
        <span style={{ margin: "0 16px" }}>=</span>
        0,55&nbsp;·&nbsp;2<V>x</V>
        <span style={{ margin: "0 16px" }}>=</span>
        1,1<V>x</V>
      </FormulaCard>

      <Down />

      <FormulaCard accent style={{ fontSize: 52, fontWeight: 600 }}>
        30<V>y</V>
        <span style={{ margin: "0 16px" }}>=</span>
        11<V>x</V>
      </FormulaCard>
    </Reveal>
  </SolutionLayout>
);
