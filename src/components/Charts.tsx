import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { currencies } from '../data/benefits';

const COLORS = [
  '#40AEBC', '#2D8A96', '#F59E0B', '#8B5CF6', '#EF4444',
  '#10B981', '#3B82F6', '#EC4899', '#6366F1', '#14B8A6',
  '#F97316', '#84CC16', '#06B6D4', '#A855F7',
];

const fmt = (n: number, currency?: string) => {
  const c = currencies.find(cc => cc.code === currency);
  const sym = c?.symbol || '$';
  return `${sym}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export function CostCharts({ breakdown, currency }: {
  breakdown: { category: string; amount: number; percentage: number }[];
  currency: string;
}) {
  const top = breakdown.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">By Category</h4>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={top}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="amount"
              nameKey="category"
            >
              {top.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => fmt(Number(value), currency)}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px' }}
              formatter={(value) => <span className="text-slate-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Amount Comparison</h4>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={top} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" tickFormatter={v => fmt(v, currency)} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value) => fmt(Number(value), currency)}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {top.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
