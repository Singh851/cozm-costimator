import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
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
  const chartHeight = Math.max(320, top.length * 36);

  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cost Breakdown by Category</h4>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={top} layout="vertical" margin={{ left: 10, right: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" tickFormatter={v => fmt(v, currency)} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value) => fmt(Number(value), currency)}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
            {top.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
            <LabelList dataKey="amount" position="right" formatter={(v: unknown) => fmt(Number(v), currency)} style={{ fontSize: 10, fill: '#475569' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
