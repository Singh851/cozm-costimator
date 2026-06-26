import type { TaxResult, Country } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { currencies } from '../data/benefits';

const fmt = (n: number, currency?: string) => {
  const c = currencies.find(cc => cc.code === currency);
  const sym = c?.symbol || '$';
  return `${sym}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export function TaxBreakdown({ title, subtitle, tax, country, currency }: {
  title: string;
  subtitle?: string;
  tax: TaxResult;
  country: Country;
  currency: string;
}) {
  const bracketData = tax.brackets.map(b => ({
    name: b.bracket.max === Infinity
      ? `${fmt(b.bracket.min, currency)}+`
      : `${fmt(b.bracket.min, currency)} - ${fmt(b.bracket.max, currency)}`,
    rate: b.bracket.rate * 100,
    tax: b.taxInBracket,
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          <p className="text-xs text-slate-400 mt-1">{country.name} — YA2026 (income year 2025)</p>
        </div>
        <div className="p-6 space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            <Metric label="Gross Income" value={fmt(tax.grossIncome, currency)} />
            <Metric label="Deductions" value={fmt(tax.deductions, currency)} />
            <Metric label="Taxable Income" value={fmt(tax.taxableIncome, currency)} />
            <Metric label="Effective Rate" value={`${(tax.effectiveRate * 100).toFixed(1)}%`} highlight />
          </div>

          {/* Bracket table */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Federal / National Brackets</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-xs font-semibold text-slate-500">Bracket</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500">Rate</th>
                  <th className="text-right py-2 text-xs font-semibold text-slate-500">Tax</th>
                </tr>
              </thead>
              <tbody>
                {tax.brackets.map((b, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 text-slate-600">
                      {b.bracket.max === Infinity
                        ? `Over ${fmt(b.bracket.min, currency)}`
                        : `${fmt(b.bracket.min, currency)} — ${fmt(b.bracket.max, currency)}`}
                    </td>
                    <td className="py-2 text-right text-slate-600">{(b.bracket.rate * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right font-medium text-slate-800">{fmt(b.taxInBracket, currency)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200">
                  <td className="py-2 font-semibold text-slate-800">Federal/National Tax</td>
                  <td></td>
                  <td className="py-2 text-right font-bold text-slate-800">{fmt(tax.federalTax, currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Additional taxes */}
          <div className="space-y-2">
            {tax.stateTax > 0 && (
              <Row label="State/Provincial Tax" value={fmt(tax.stateTax, currency)} />
            )}
            {tax.localTax > 0 && (
              <Row label="Local/Municipal Tax" value={fmt(tax.localTax, currency)} />
            )}
            {tax.childCredits > 0 && (
              <Row label="Child Tax Credits" value={`(${fmt(tax.childCredits, currency)})`} green />
            )}
            <div className="border-t border-slate-200 pt-2">
              <Row label="Total Income Tax" value={fmt(tax.totalIncomeTax, currency)} bold />
            </div>
            <Row label="Social Security (EE)" value={fmt(tax.ssEmployee, currency)} />
            <Row label="Social Security (ER)" value={fmt(tax.ssEmployer, currency)} />
          </div>

          {/* Bracket chart */}
          {bracketData.length > 1 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Tax by Bracket</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bracketData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tickFormatter={v => fmt(v, currency)} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value, name) =>
                      name === 'tax' ? fmt(Number(value), currency) : `${Number(value).toFixed(1)}%`
                    }
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="tax" name="Tax Amount" radius={[4, 4, 0, 0]}>
                    {bracketData.map((_, i) => (
                      <Cell key={i} fill={i === bracketData.length - 1 ? '#EF4444' : '#40AEBC'} opacity={0.6 + (i * 0.4 / bracketData.length)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 ${highlight ? 'bg-[#40AEBC]/10 border border-[#40AEBC]/20' : 'bg-slate-50'}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${highlight ? 'text-[#40AEBC]' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, bold, green }: { label: string; value: string; bold?: boolean; green?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-bold text-slate-800' : green ? 'text-emerald-600 font-medium' : 'font-medium text-slate-700'}`}>{value}</span>
    </div>
  );
}
