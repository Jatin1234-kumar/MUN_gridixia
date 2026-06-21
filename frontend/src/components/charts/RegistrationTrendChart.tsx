import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DataPoint {
  week: string;
  registrations: number;
  cancellations: number;
  cumulative: number;
}

interface RegistrationTrendChartProps {
  data: DataPoint[];
}

interface LegendEntry {
  value: string;
  color: string;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg p-3 border border-white/[0.08] text-xs">
      <p className="text-muted-foreground mb-2 font-mono">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name}: <span className="tabular-nums">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

const CustomLegend = ({ payload }: { payload?: LegendEntry[] }) => (
  <div className="flex flex-wrap gap-4 mt-2">
    {payload?.map((entry) => (
      <div key={entry.value} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
        {entry.value}
      </div>
    ))}
  </div>
);

export function RegistrationTrendChart({ data }: RegistrationTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="regBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a20d" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#c9a20d" stopOpacity={0.4} />
          </linearGradient>
          <linearGradient id="cancelBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.7} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <Bar yAxisId="left" dataKey="registrations" name="Registrations" fill="url(#regBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar yAxisId="left" dataKey="cancellations" name="Cancellations" fill="url(#cancelBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Line yAxisId="right" type="monotone" dataKey="cumulative" name="Cumulative" stroke="#3b82f6" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
