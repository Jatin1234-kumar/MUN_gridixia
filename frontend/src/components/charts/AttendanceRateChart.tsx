import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  date: string;
  rate: number;
  target: number;
}

interface AttendanceRateChartProps {
  data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg p-3 border border-white/[0.08] text-xs">
      <p className="text-muted-foreground mb-2 font-mono">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-medium">
          {entry.name}: <span className="tabular-nums">{entry.value}%</span>
        </p>
      ))}
    </div>
  );
};

export function AttendanceRateChart({ data }: AttendanceRateChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="attendanceGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={85} stroke="#22c55e" strokeDasharray="5 3" strokeWidth={1} label={{ value: 'Target', fill: '#22c55e', fontSize: 9, position: 'right' }} />
        <Line
          type="monotone"
          dataKey="rate"
          name="Attendance"
          stroke="url(#attendanceGrad)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#3b82f6', stroke: '#020818', strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="target"
          name="Target"
          stroke="#22c55e"
          strokeWidth={1}
          strokeDasharray="5 3"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
