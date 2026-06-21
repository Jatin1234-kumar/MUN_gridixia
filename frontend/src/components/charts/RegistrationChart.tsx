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
  delegates: number;
  chairs: number;
}

interface RegistrationChartProps {
  data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg p-3 border border-white/[0.08] text-xs">
      <p className="text-muted-foreground mb-2 font-mono">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name}: <span className="tabular-nums">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export function RegistrationChart({ data }: RegistrationChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="delegates" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c9a20d" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#c9a20d" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="chairs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="delegates" stroke="#c9a20d" strokeWidth={2} fill="url(#delegates)" />
        <Area type="monotone" dataKey="chairs" stroke="#3b82f6" strokeWidth={2} fill="url(#chairs)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
