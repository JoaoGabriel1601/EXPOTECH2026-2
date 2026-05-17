import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CartesianChart, Line } from "victory-native";
import { AI_CARD_COLOR, CHART_COLORS } from "../../constants";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, typography } from "../../utils/theme";
import { useFonts } from "../../utils/chartFont";

function AIComparisonChartComponent({ data }) {
  const { theme } = useTheme();
  const font = useFonts(11);

  const series = useMemo(
    () =>
      (data ?? []).map((d, i) => ({
        x: i,
        time: d.time,
        tempAlvoIA:
          d.tempAlvoIA !== undefined
            ? d.tempAlvoIA
            : d.tempAlvo > 0
              ? d.tempAlvo
              : null,
        tempAlvoRegra:
          d.tempAlvoRegra !== undefined
            ? d.tempAlvoRegra
            : d.tempAlvo > 0
              ? d.tempAlvo
              : null,
      })),
    [data]
  );

  if (!series.length) {
    return (
      <Text style={[styles.empty, { color: theme.textMuted }]}>Sem dados.</Text>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.legend}>
        <LegendItem color={AI_CARD_COLOR} label="IA" theme={theme} />
        <LegendItem
          color={CHART_COLORS.tempAlvo}
          label="Regra fixa"
          theme={theme}
        />
      </View>
      <View style={styles.chart}>
        <CartesianChart
          data={series}
          xKey="x"
          yKeys={["tempAlvoIA", "tempAlvoRegra"]}
          domainPadding={{ left: 8, right: 8, top: 12, bottom: 12 }}
          domain={{ y: [14, 30] }}
          axisOptions={{
            font,
            tickCount: { x: 5, y: 5 },
            labelColor: theme.textMuted,
            lineColor: theme.grid,
            formatXLabel: (i) => series[Math.round(i)]?.time ?? "",
            formatYLabel: (v) => `${Math.round(v)}°`,
          }}
        >
          {({ points }) => (
            <>
              <Line
                points={points.tempAlvoRegra}
                color={CHART_COLORS.tempAlvo}
                strokeWidth={1.5}
                animate={{ type: "timing", duration: 200 }}
              />
              <Line
                points={points.tempAlvoIA}
                color={AI_CARD_COLOR}
                strokeWidth={2.5}
                animate={{ type: "timing", duration: 200 }}
              />
            </>
          )}
        </CartesianChart>
      </View>
    </View>
  );
}

function LegendItem({ color, label, theme }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: theme.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  chart: { height: 220 },
  legend: { flexDirection: "row", gap: spacing.md, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { ...typography.caption },
  empty: { textAlign: "center", padding: spacing.lg },
});

export const AIComparisonChart = memo(AIComparisonChartComponent);
