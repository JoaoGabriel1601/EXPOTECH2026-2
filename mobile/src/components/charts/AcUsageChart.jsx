import { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { CartesianChart, Area, Line } from "victory-native";
import { LinearGradient, vec } from "@shopify/react-native-skia";
import { CARD_COLORS_EFFICIENCY } from "../../constants";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../utils/theme";
import { useFonts } from "../../utils/chartFont";

const ROLLING_WINDOW_MS = 30 * 60 * 1000;

function buildUsageData(data) {
  return data.map((cur, i) => {
    const windowStart = cur.timestamp - ROLLING_WINDOW_MS;
    let onTime = 0;
    let totalTime = 0;

    for (let j = i; j > 0; j--) {
      const a = data[j - 1];
      const b = data[j];
      if (typeof a.timestamp !== "number" || typeof b.timestamp !== "number")
        break;
      if (b.timestamp <= windowStart) break;
      const segStart = Math.max(a.timestamp, windowStart);
      const segEnd = b.timestamp;
      const segDur = Math.max(0, segEnd - segStart);
      totalTime += segDur;
      if (a.tempAlvo > 0) onTime += segDur;
    }

    const pct =
      totalTime > 0
        ? (onTime / totalTime) * 100
        : cur.tempAlvo > 0
          ? 100
          : 0;
    return { ...cur, acUsagePct: Math.round(pct) };
  });
}

function AcUsageChartComponent({ data }) {
  const { theme } = useTheme();
  const font = useFonts(11);

  const series = useMemo(() => {
    const built = buildUsageData(data ?? []);
    return built.map((d, i) => ({
      x: i,
      time: d.time,
      acUsagePct: d.acUsagePct,
    }));
  }, [data]);

  if (!series.length) {
    return <Text style={[styles.empty, { color: theme.textMuted }]}>Sem dados.</Text>;
  }

  return (
    <View style={styles.chart}>
      <CartesianChart
        data={series}
        xKey="x"
        yKeys={["acUsagePct"]}
        domain={{ y: [0, 100] }}
        domainPadding={{ left: 8, right: 8, top: 12 }}
        axisOptions={{
          font,
          tickCount: { x: 5, y: 5 },
          labelColor: theme.textMuted,
          lineColor: theme.grid,
          formatXLabel: (i) => series[Math.round(i)]?.time ?? "",
          formatYLabel: (v) => `${Math.round(v)}%`,
        }}
      >
        {({ points, chartBounds }) => (
          <>
            <Area
              points={points.acUsagePct}
              y0={chartBounds.bottom}
              animate={{ type: "timing", duration: 200 }}
              curveType="natural"
            >
              <LinearGradient
                start={vec(0, chartBounds.top)}
                end={vec(0, chartBounds.bottom)}
                colors={[
                  `${CARD_COLORS_EFFICIENCY}99`,
                  `${CARD_COLORS_EFFICIENCY}05`,
                ]}
              />
            </Area>
            <Line
              points={points.acUsagePct}
              color={CARD_COLORS_EFFICIENCY}
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

export const AcUsageChart = memo(AcUsageChartComponent);
