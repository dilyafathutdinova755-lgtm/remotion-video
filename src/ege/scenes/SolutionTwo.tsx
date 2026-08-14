import { SolutionLayout, Line, Brace } from "../SolutionLayout";
import { Reveal, V, Frac, FormulaCard } from "../MathBits";
import { COLORS } from "../theme";

export const SolutionTwo: React.FC = () => (
  <SolutionLayout step="2" title="Второе уравнение и система">
    <Reveal at={0}>
      <Line>
        Из равенства <V>y</V> = <Frac num="11" den="30" scale={0.8} />
        <V>x</V> видно, что футболка дороже кепки, а значит, три футболки дороже двух кепок —
        разность положительна.
      </Line>
    </Reveal>

    <Reveal at={60}>
      <Line>
        По второму условию разница между тремя футболками и двумя кепками равна 1020 рублей:
      </Line>
    </Reveal>

    <Reveal at={110} style={{ marginTop: 6 }}>
      <FormulaCard style={{ fontSize: 52, fontWeight: 600 }}>
        3<V>x</V>
        <span style={{ margin: "0 14px" }}>−</span>2<V>y</V>
        <span style={{ margin: "0 16px" }}>=</span>
        1020
      </FormulaCard>
    </Reveal>

    <Reveal at={175} style={{ marginTop: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        <span style={{ fontSize: 40, color: COLORS.textMuted }}>Получаем систему:</span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 22,
            padding: "22px 44px 22px 30px",
            borderRadius: 22,
            background: "#eaf2ff",
            border: `2px solid ${COLORS.blueSoft}55`,
            boxShadow: "0 10px 30px rgba(18,51,110,0.08)",
          }}
        >
          <Brace height={150} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 20,
              fontSize: 48,
              fontWeight: 600,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <V>y</V>
              <span style={{ margin: "0 14px" }}>=</span>
              <Frac num="11" den="30" />
              <V>x</V>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              3<V>x</V>
              <span style={{ margin: "0 12px" }}>−</span>2<V>y</V>
              <span style={{ margin: "0 14px" }}>=</span>
              1020
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  </SolutionLayout>
);
