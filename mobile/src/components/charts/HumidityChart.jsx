import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CartesianChart, Bar } from "victory-native";
import { CHART_COLORS } from "../../constants";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, typography } from "../../utils/theme";
import { useFonts } from "../../utils/chartFont";

function HumidityChartComponent({ data }) {
  const { theme } = useTheme();
  const font = useFonts(11);

  const series = useMemo(() => {
    const sampled = (data ?? []).filter((_, i) => i % 3 === 0);
    return sampled.map((d, i) => ({
      x: i,
      time: d.time,
      umidInt: d.umidInt,
      umidExt: d.umidExt,
    }));
  }, [data]);

  if (!series.length) {
    return <Text style={[styles.empty, { color: theme.textMuted }]}>Sem dados.</Text>;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.legend}>
        <LegendItem color={CHART_COLORS.umidInt} label="Interna" theme={theme} />
        <LegendItem color={CHART_COLORS.umidExt} label="Externa" theme={theme} />
      </View>
      <View style={styles.chart}>
        <CartesianChart
          data={series}
          xKey="x"
          yKeys={["umidInt", "umidExt"]}
          domain={{ y: [0, 100] }}
          domainPadding={{ left: 12, right: 12, top: 12 }}
          axisOptions={{
            font,
            tickCount: { x: 4, y: 5 },
            labelColor: theme.textMuted,
            lineColor: theme.grid,
            formatXLabel: (i) => series[Math.round(i)]?.time ?? "",
            formatYLabel: (v) => `${Math.round(v)}%`,
          }}
        >
          {({ points, chartBounds }) => (
            <>
              <Bar
                points={points.umidInt}
                chartBounds={chartBounds}
                color={CHART_COLORS.umidInt}
                roundedCorners={{ topLeft: 3, topRight: 3 }}
                barWidth={6}
                animate={{ type: "timing", duration: 200 }}
              />
              <Bar
                points={points.umidExt}
                chartBounds={chartBounds}
                color={`${CHART_COLORS.umidExt}99`}
                roundedCorners={{ topLeft: 3, topRight: 3 }}
                barWidth={6}
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
  chart: { height: 200 },
  legend: { flexDirection: "row", gap: spacing.md },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 10, height: 10, borderRadius: 2 },
  legendText: { ...typography.caption },
  empty: { textAlign: "center", padding: spacing.lg },
});

export const HumidityChart = memo(HumidityChartComponent);
