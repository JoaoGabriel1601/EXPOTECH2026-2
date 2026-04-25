import { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CustomTooltip } from "../CustomTooltip";
import { CHART_COLORS } from "../../constants";

const axisStyle = { fontSize: 10, fill: "var(--text-faint)" };

function ChartHumidityComponent({ data }) {
  const sampled = useMemo(
    () => data.filter((_, i) => i % 3 === 0),
    [data]
  );
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={sampled} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
        <XAxis
          dataKey="time"
          tick={axisStyle}
          interval={Math.max(1, Math.floor(sampled.length / 8))}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--label)", paddingTop: 8 }} />
        <Bar
          dataKey="umidInt"
          name="Umid. interna"
          fill={CHART_COLORS.umidInt}
          radius={[3, 3, 0, 0]}
          barSize={8}
          isAnimationActive={false}
        />
        <Bar
          dataKey="umidExt"
          name="Umid. externa"
          fill={CHART_COLORS.umidExt}
          radius={[3, 3, 0, 0]}
          barSize={8}
          opacity={0.5}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export const ChartHumidity = memo(ChartHumidityComponent);
