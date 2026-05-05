import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CartesianChart, Area, Line } from "victory-native";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import { CHART_COLORS } from "../../constants";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../utils/theme";
import { useFonts } from "../../utils/chartFont";

function OccupancyChartComponent({ data }) {
  const { theme } = useTheme();
  const font = useFonts(11);

  const series = useMemo(
    () =>
      (data ?? []).map((d, i) => ({
        x: i,
        time: d.time,
        pessoas: d.pessoas,
      })),
    [data]
  );

  if (!series.length) {
    return <Text style={[styles.empty, { color: theme.textMuted }]}>Sem dados.</Text>;
  }

  return (
    <View style={styles.chart}>
      <CartesianChart
        data={series}
        xKey="x"
        yKeys={["pessoas"]}
        domainPadding={{ left: 8, right: 8, top: 12, bottom: 12 }}
        axisOptions={{
          font,
          tickCount: { x: 5, y: 4 },
          labelColor: theme.textMuted,
          lineColor: theme.grid,
          formatXLabel: (i) => series[Math.round(i)]?.time ?? "",
          formatYLabel: (v) => `${Math.round(v)}`,
        }}
      >
        {({ points, chartBounds }) => (
          <>
            <Area
              points={points.pessoas}
              y0={chartBounds.bottom}
              animate={{ type: "timing", duration: 200 }}
              curveType="natural"
            >
              <LinearGradient
                start={vec(0, chartBounds.top)}
                end={vec(0, chartBounds.bottom)}
                colors={[`${CHART_COLORS.pessoas}88`, `${CHART_COLORS.pessoas}05`]}
              />
            </Area>
            <Line
              points={points.pessoas}
              color={CHART_COLORS.pessoas}
              strokeWidth={2}
              animate={{ type: "timing", duration: 200 }}
              curveType="natural"
            />
          </>
        )}
      </CartesianChart>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { height: 200 },
  empty: { textAlign: "center", padding: spacing.lg },
});

export const OccupancyChart = memo(OccupancyChartComponent);
