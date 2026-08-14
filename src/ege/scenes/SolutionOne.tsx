import { SolutionLayout, Line } from "../SolutionLayout";
import { Reveal, V, Frac, FormulaCard } from "../MathBits";
import { COLORS, FONTS } from "../theme";

export const SolutionOne: React.FC = () => (
  <SolutionLayout step="1" title="Вводим обозначения">
    <Reveal at={0}>
      <Line>
        Пусть цена футболки — <V>x</V> рублей, а цена кепки — <V>y</V> рублей.
      </Line>
    </Reveal>

    <Reveal at={55}>
      <Line>
        Три кепки стоят 3<V>y</V> рублей, две футболки — 2<V>x</V> рублей. Первые дешевле вторых на
        45%.
      </Line>
    </Reveal>

    <Reveal at={120}>
      <Line>
        Значит, стоимость трёх кепок составляет{" "}
        <span style={{ color: COLORS.blue, fontWeight: 600 }}>55%</span> от стоимости двух футболок:
      </Line>
    </Reveal>

    <Reveal
      at={185}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, marginTop: 16 }}
    >
      <FormulaCard style={{ fontSize: 52, fontWeight: 600 }}>
        3<V>y</V>
        <span style={{ margin: "0 16px" }}>=</span>
        0,55&nbsp;·&nbsp;2<V>x</V>
      </FormulaCard>

      <span style={{ fontSize: 44, color: COLORS.blueSoft, fontFamily: FONTS.head, lineHeight: 1 }}>
        ⇩
      </span>

      <FormulaCard accent style={{ fontSize: 52, fontWeight: 600 }}>
        <V>y</V>
        <span style={{ margin: "0 16px" }}>=</span>
        <Frac num="11" den="30" />
        <V>x</V>
      </FormulaCard>
    </Reveal>
  </SolutionLayout>
);
