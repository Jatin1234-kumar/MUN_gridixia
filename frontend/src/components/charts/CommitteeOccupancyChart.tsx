import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface CommitteeData {
  name: string;
  abbr: string;
  delegates: number;
  capacity: number;
}

interface CommitteeOccupancyChartProps {
  data: CommitteeData[];
}

function getOccupancyColor(ratio: number): string {
  if (ratio >= 0.9) return '#ef4444';
  if (ratio >= 0.7) return '#eab308';
  return '#22c55e';
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { abbr: string; name: string; delegates: number; capacity: number } }> }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const ratio = d.capacity > 0 ? Math.round((d.delegates / d.capacity) * 100) : 0;
  return (
    <div className="glass-card rounded-lg p-3 border border-white/[0.08] text-xs">
      <p className="font-medium text-foreground mb-1">{d.abbr}</p>
      <p className="text-muted-foreground">{d.name}</p>
      <p className="mt-1.5 text-foreground">
        <span className="tabular-nums font-semibold">{d.delegates}</span>
        <span className="text-muted-foreground"> / {d.capacity}</span>
        <span className="ml-2 text-muted-foreground">({ratio}%)</span>
      </p>
    </div>
  );
};

export function CommitteeOccupancyChart({ data }: CommitteeOccupancyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="abbr"
          tick={{ fill: '#64748b', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <ReferenceLine y={0} stroke="rgba(255,255,255,0.06)" />
        <Bar dataKey="delegates" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getOccupancyColor(entry.capacity > 0 ? entry.delegates / entry.capacity : 0)}
              fillOpacity={0.8}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
