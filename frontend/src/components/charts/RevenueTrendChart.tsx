import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  month: string;
  revenue: number;
  projected?: number;
}

interface RevenueTrendChartProps {
  data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { month: string } }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg p-3 border border-white/[0.08] text-xs">
      <p className="text-muted-foreground mb-2 font-mono">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.name === 'Actual' ? '#c9a20d' : '#88c19f' }} className="font-medium">
          {entry.name}: <span className="tabular-nums">₹{entry.value.toLocaleString('en-IN')}</span>
        </p>
      ))}
    </div>
  );
};

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c9a20d" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#c9a20d" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#88c19f" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#88c19f" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Actual"
          stroke="#c9a20d"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#c9a20d', stroke: '#020818', strokeWidth: 2 }}
        />
        {data.some((d) => d.projected != null) && (
          <Area
            type="monotone"
            dataKey="projected"
            name="Projected"
            stroke="#88c19f"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            fill="url(#projectedGrad)"
            dot={false}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
