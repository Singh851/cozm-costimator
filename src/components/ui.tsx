import type React from 'react';
import { currencies } from '../data/benefits';

export const fmt = (n: number, currency?: string) => {
  const c = currencies.find(cc => cc.code === currency);
  const sym = c?.symbol || '$';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  return `${n < 0 ? '-' : ''}${sym}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export function CurrencyInput({ value, onChange, currency, compact, placeholder }: { value: number; onChange: (v: number) => void; currency: string; compact?: boolean; placeholder?: string }) {
  return (
    <div className={`flex items-center gap-1 ${compact ? 'w-40' : ''}`}>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(+e.target.value)}
        className={`input-field flex-1 ${compact ? 'text-xs py-1' : ''}`}
        min={0}
        placeholder={placeholder}
      />
      <span className={`text-slate-400 shrink-0 ${compact ? 'text-[10px]' : 'text-xs'}`}>{currency}</span>
    </div>
  );
}

export function SummaryRow({ label, value, currency, bold, muted, accent }: {
  label: string; value: number; currency: string; bold?: boolean; muted?: boolean; accent?: string;
}) {
  const colorClass = accent === 'amber' ? 'text-amber-600' : accent === 'purple' ? 'text-purple-600' : '';
  return (
    <div className={`flex justify-between items-center py-1 ${muted ? 'opacity-50' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'} ${colorClass}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold text-slate-800' : 'text-slate-700'} ${colorClass}`}>
        {value < 0 ? `(${fmt(Math.abs(value), currency)})` : fmt(value, currency)}
      </span>
    </div>
  );
}

export function SubtotalRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-t border-dashed border-slate-200 mt-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(value, currency)}</span>
    </div>
  );
}

export function SectionHeader({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1">
      <h4 className="text-xs font-semibold text-[#40AEBC] uppercase tracking-wider">{label}</h4>
    </div>
  );
}

export function TaxSummaryCard({ title, rate, tax, ss, currency, color }: {
  title: string; rate: number; tax: number; ss: number; currency: string; color: string;
}) {
  const borderColor = color === 'blue' ? 'border-blue-200' : color === 'emerald' ? 'border-emerald-200' : 'border-amber-200';
  const bgColor = color === 'blue' ? 'bg-blue-50' : color === 'emerald' ? 'bg-emerald-50' : 'bg-amber-50';
  const textColor = color === 'blue' ? 'text-blue-700' : color === 'emerald' ? 'text-emerald-700' : 'text-amber-700';
  return (
    <div className={`rounded-lg p-3 border ${borderColor} ${bgColor}`}>
      <p className={`text-xs font-semibold ${textColor} uppercase tracking-wider`}>{title}</p>
      <p className={`text-2xl font-bold ${textColor} mt-1`}>{(rate * 100).toFixed(1)}%</p>
      <p className="text-xs text-slate-500 mt-1">Effective Rate</p>
      <div className="mt-2 pt-2 border-t border-slate-200/50 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Income Tax</span>
          <span className="text-slate-700 font-medium">{fmt(tax, currency)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Social Security</span>
          <span className="text-slate-700 font-medium">{fmt(ss, currency)}</span>
        </div>
      </div>
    </div>
  );
}

export function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-center">
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function InsightCard({ title, status, description }: { title: string; status: 'positive' | 'warning' | 'info' | 'neutral'; description: string }) {
  const styles = {
    positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', title: 'text-emerald-800' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', title: 'text-amber-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', title: 'text-blue-800' },
    neutral: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500', title: 'text-slate-800' },
  }[status];
  const icons = { positive: '\u2713', warning: '\u26a0', info: '\u2139', neutral: '\u2022' };

  return (
    <div className={`rounded-lg p-4 border ${styles.border} ${styles.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`text-lg ${styles.icon}`}>{icons[status]}</span>
        <div>
          <h4 className={`text-sm font-semibold ${styles.title}`}>{title}</h4>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
