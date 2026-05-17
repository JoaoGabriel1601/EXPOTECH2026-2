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
import { AI_CARD_COLOR, CHART_COLORS } from "../../constants";

const axisStyle = {
  fontSize: 11,
  fill: "var(--text-muted)",
  fontWeight: 500,
};

function ChartAIComparisonComponent({ data }) {
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
          domain={[14, 30]}
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
          type="stepAfter"
          dataKey="tempAlvoIA"
          name="IA"
          stroke={AI_CARD_COLOR}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
          connectNulls={false}
        />
        <Line
          type="stepAfter"
          dataKey="tempAlvoRegra"
          name="Regra fixa"
          stroke={CHART_COLORS.tempAlvo}
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="6 3"
          isAnimationActive={false}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export const ChartAIComparison = memo(ChartAIComparisonComponent);
