import { memo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CustomTooltip } from "../CustomTooltip";
import { CHART_COLORS } from "../../constants";

const axisStyle = {
  fontSize: 11,
  fill: "var(--text-muted)",
  fontWeight: 500,
};

function ChartOccupancyComponent({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 16 }}>
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
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={36}
          padding={{ top: 4, bottom: 8 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <defs>
          <linearGradient id="gradPessoas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.pessoas} stopOpacity={0.35} />
            <stop offset="95%" stopColor={CHART_COLORS.pessoas} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <Area
          type="stepAfter"
          dataKey="pessoas"
          name="Pessoas"
          stroke={CHART_COLORS.pessoas}
          strokeWidth={2}
          fill="url(#gradPessoas)"
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const ChartOccupancy = memo(ChartOccupancyComponent);
