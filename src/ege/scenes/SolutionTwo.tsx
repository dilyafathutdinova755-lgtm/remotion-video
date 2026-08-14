import { SolutionLayout, Line, Brace } from "../SolutionLayout";
import { Reveal, V, Frac, FormulaCard } from "../MathBits";
import { COLORS, FONTS } from "../theme";

export const SolutionTwo: React.FC = () => (
  <SolutionLayout step="2" title="Второе уравнение">
    <Reveal at={0}>
      <Line>
        Из равенства <V>y</V> = <Frac num="11" den="30" scale={0.78} />
        <V>x</V> видно, что футболка дороже кепки, а значит, три футболки дороже двух кепок —
        разность положительна.
      </Line>
    </Reveal>

    <Reveal at={60}>
      <Line>
        По второму условию разница между тремя футболками и двумя кепками равна 1020 рублей:
      </Line>
    </Reveal>

    <Reveal at={110} style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
      <FormulaCard style={{ fontSize: 52, fontWeight: 600 }}>
        3<V>x</V>
        <span style={{ margin: "0 14px" }}>−</span>2<V>y</V>
        <span style={{ margin: "0 16px" }}>=</span>
        1020
      </FormulaCard>
    </Reveal>

    <Reveal at={175} style={{ marginTop: 30 }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <span
          style={{
            fontFamily: FONTS.display,
            fontWeight: 300,
            fontSize: 40,
            color: COLORS.textMuted,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Получаем систему
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            padding: "26px 56px 26px 32px",
            borderRadius: 24,
            background: "#eaf2ff",
            border: `2px solid ${COLORS.blueSoft}55`,
            boxShadow: "0 12px 34px rgba(18,51,110,0.08)",
          }}
        >
          <Brace height={158} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 22,
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
