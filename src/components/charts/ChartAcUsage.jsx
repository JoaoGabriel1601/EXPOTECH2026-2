import { memo, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CARD_COLORS_EFFICIENCY } from "../../constants";

const axisStyle = {
  fontSize: 11,
  fill: "var(--text-muted)",
  fontWeight: 500,
};

const ROLLING_WINDOW_MS = 30 * 60 * 1000;

function buildUsageData(data) {
  return data.map((cur, i) => {
    const windowStart = cur.timestamp - ROLLING_WINDOW_MS;
    let onTime = 0;
    let totalTime = 0;

    for (let j = i; j > 0; j--) {
      const a = data[j - 1];
      const b = data[j];
      if (
        typeof a.timestamp !== "number" ||
        typeof b.timestamp !== "number"
      )
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

function AcTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="tooltip" role="tooltip">
      <div className="tooltip__label">{label}</div>
      <div className="tooltip__row">
        <span
          className="tooltip__swatch"
          style={{ background: payload[0].color }}
        />
        <span className="tooltip__name">Uso A/C:</span>
        <span className="tooltip__value">{value}%</span>
      </div>
    </div>
  );
}

function ChartAcUsageComponent({ data }) {
  const acData = useMemo(() => buildUsageData(data), [data]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart
        data={acData}
        margin={{ top: 8, right: 16, left: 8, bottom: 16 }}
      >
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
          domain={[0, 100]}
          tick={axisStyle}
          tickFormatter={(v) => `${v}%`}
          axisLine={false}
          tickLine={false}
          width={48}
          padding={{ top: 4, bottom: 4 }}
        />
        <Tooltip content={<AcTooltip />} />
        <defs>
          <linearGradient id="gradAc" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={CARD_COLORS_EFFICIENCY}
              stopOpacity={0.45}
            />
            <stop
              offset="95%"
              stopColor={CARD_COLORS_EFFICIENCY}
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="acUsagePct"
          name="Uso A/C"
          stroke={CARD_COLORS_EFFICIENCY}
          strokeWidth={2}
          fill="url(#gradAc)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export const ChartAcUsage = memo(ChartAcUsageComponent);
