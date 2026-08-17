import { SolutionLayout, Line } from "../SolutionLayout";
import { Reveal, FormulaCard, Down } from "../MathBits";
import { COLORS } from "../theme";

export const SolutionOne: React.FC = () => (
  <SolutionLayout step="1" title="Считаем в частях">
    <Reveal at={0}>
      <Line>
        Один рабочий делает весь заказ за 8 часов. Примем заказ за{" "}
        <span style={{ color: COLORS.blue, fontWeight: 600 }}>8 частей</span>.
      </Line>
    </Reveal>

    <Reveal at={55}>
      <Line>Тогда за час каждый рабочий успевает ровно одну часть:</Line>
    </Reveal>

    <Reveal
      at={115}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        marginTop: 8,
      }}
    >
      <FormulaCard style={{ fontSize: 46, fontWeight: 600 }}>
        1 рабочий<span style={{ margin: "0 22px" }}>—</span>1 часть в час
      </FormulaCard>

      <Down />

      <FormulaCard accent style={{ fontSize: 46, fontWeight: 600 }}>
        2 рабочих<span style={{ margin: "0 22px" }}>—</span>2 части в час
      </FormulaCard>
    </Reveal>
  </SolutionLayout>
);
