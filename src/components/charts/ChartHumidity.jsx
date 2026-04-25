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

const axisStyle = {
  fontSize: 11,
  fill: "var(--text-muted)",
  fontWeight: 500,
};

function ChartHumidityComponent({ data }) {
  const sampled = useMemo(
    () => data.filter((_, i) => i % 3 === 0),
    [data]
  );
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={sampled} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
        <XAxis
          dataKey="time"
          tick={axisStyle}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={56}
          tickMargin={10}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={axisStyle}
          tickFormatter={(value) => `${value}%`}
          axisLine={false}
          tickLine={false}
          width={44}
          padding={{ top: 4, bottom: 4 }}
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
