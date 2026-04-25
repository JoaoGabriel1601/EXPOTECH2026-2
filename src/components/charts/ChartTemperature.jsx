import { memo } from "react";
import {
  LineChart,
  Line,
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

function ChartTemperatureComponent({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
        <XAxis
          dataKey="time"
          tick={axisStyle}
          interval="preserveStartEnd"
          minTickGap={40}
          tickMargin={8}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[14, 38]}
          tick={axisStyle}
          tickFormatter={(value) => `${value}°C`}
          axisLine={false}
          tickLine={false}
          width={48}
          padding={{ top: 4, bottom: 8 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--label)", paddingTop: 8 }} />
        <Line
          type="monotone"
          dataKey="tempInt"
          name="Temp. interna"
          stroke={CHART_COLORS.tempInt}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey="tempExt"
          name="Temp. externa"
          stroke={CHART_COLORS.tempExt}
          strokeWidth={2}
          dot={false}
          strokeDasharray="6 3"
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
        <Line
          type="stepAfter"
          dataKey="tempAlvo"
          name="Temp. alvo"
          stroke={CHART_COLORS.tempAlvo}
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="4 2"
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export const ChartTemperature = memo(ChartTemperatureComponent);
