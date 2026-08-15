import { SolutionLayout, Line } from "../SolutionLayout";
import { Reveal, FormulaCard, Down } from "../MathBits";
import { COLORS } from "../theme";

export const SolutionTwo: React.FC = () => (
  <SolutionLayout step="2" title="Считаем часы">
    <Reveal at={0}>
      <Line>За первые 4 часа рабочий в одиночку сделал 4 части. Осталось:</Line>
    </Reveal>

    <Reveal at={50} style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
      <FormulaCard style={{ fontSize: 48, fontWeight: 600 }}>
        8
        <span style={{ margin: "0 14px" }}>−</span>4
        <span style={{ margin: "0 16px" }}>=</span>
        4 части
      </FormulaCard>
    </Reveal>

    <Reveal at={120}>
      <Line>Остаток они доделывают вдвоём, по 2 части в час:</Line>
    </Reveal>

    <Reveal
      at={175}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 4 }}
    >
      <FormulaCard style={{ fontSize: 48, fontWeight: 600 }}>
        4
        <span style={{ margin: "0 14px" }}>:</span>2
        <span style={{ margin: "0 16px" }}>=</span>
        2 часа
      </FormulaCard>

      <Down />

      <FormulaCard accent style={{ fontSize: 48, fontWeight: 600 }}>
        4
        <span style={{ margin: "0 14px" }}>+</span>2
        <span style={{ margin: "0 16px" }}>=</span>
        <span style={{ color: COLORS.blue, fontWeight: 700 }}>6 часов</span>
      </FormulaCard>
    </Reveal>
  </SolutionLayout>
);
