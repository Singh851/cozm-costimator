import type { Country } from '../types';

export function TaxReference({
  homeCountry,
  hostCountry,
}: {
  homeCountry: Country | undefined;
  hostCountry: Country | undefined;
  currency: string;
}) {
  if (!homeCountry || !hostCountry) return null;

  const columns = [
    { label: 'Home', country: homeCountry },
    { label: 'Host', country: hostCountry },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Tax Reference Guide</h3>
          <p className="text-xs text-slate-400 mt-0.5">PwC Worldwide Tax Summaries 2024/25</p>
        </div>
        <a
          href="https://docs.google.com/spreadsheets/d/1oL4X1sXxctt8_-8WyVx2qOnUAMRE_D0ZK-bGNoqChD8/edit"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#40AEBC] hover:underline"
        >
          Full Database →
        </a>
      </div>
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Rate</th>
              {columns.map(col => (
                <th key={col.label} className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">
                  {col.label} ({col.country.name})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <RateRow label="Corporate Tax (CIT)" values={columns.map(c => c.country.taxRef?.corporateTaxRate)} />
            <RateRow label="VAT / GST" values={columns.map(c => c.country.taxRef?.vatRate)} nullLabel="N/A" />
            <RateRow label="Capital Gains Tax" values={columns.map(c => c.country.taxRef?.capitalGainsTaxRate)} />
            <tr className="border-b border-slate-100">
              <td colSpan={3} className="pt-3 pb-1 text-xs font-semibold text-[#40AEBC] uppercase tracking-wider">Withholding Tax (Non-Treaty)</td>
            </tr>
            <RateRow label="WHT — Dividends" values={columns.map(c => c.country.taxRef?.whtDividends)} />
            <RateRow label="WHT — Interest" values={columns.map(c => c.country.taxRef?.whtInterest)} />
            <RateRow label="WHT — Royalties" values={columns.map(c => c.country.taxRef?.whtRoyalties)} />
            <tr className="border-b border-slate-100">
              <td colSpan={3} className="pt-3 pb-1 text-xs font-semibold text-[#40AEBC] uppercase tracking-wider">Social Security</td>
            </tr>
            <RateRow label="SS — Employer" values={columns.map(c => c.country.ssEmployerRate * 100)} />
            <RateRow label="SS — Employee" values={columns.map(c => c.country.ssEmployeeRate * 100)} />
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">SS Cap</td>
              {columns.map((col, i) => (
                <td key={i} className="py-2 text-right text-slate-700 tabular-nums">
                  {col.country.ssCap > 0
                    ? `${col.country.currency[1]}${col.country.ssCap.toLocaleString()}`
                    : 'No cap'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-slate-100">
              <td colSpan={3} className="pt-3 pb-1 text-xs font-semibold text-[#40AEBC] uppercase tracking-wider">PIT Bands</td>
            </tr>
          </tbody>
        </table>

        {/* PIT brackets side by side */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          {columns.map(col => (
            <div key={col.label}>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{col.country.name}</p>
              <div className="space-y-0.5">
                {col.country.personalAllowance > 0 && (
                  <BracketRow
                    label={`0 – ${col.country.currency[1]}${col.country.personalAllowance.toLocaleString()}`}
                    rate="0%"
                    accent
                  />
                )}
                {col.country.federalBrackets.map((b, i) => (
                  <BracketRow
                    key={i}
                    label={`${col.country.currency[1]}${b.min.toLocaleString()} – ${b.max === Infinity ? '∞' : col.country.currency[1] + b.max.toLocaleString()}`}
                    rate={`${(b.rate * 100).toFixed(b.rate * 100 % 1 === 0 ? 0 : 1)}%`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Dividend brackets if available */}
        {(homeCountry.taxRef?.dividendTaxBrackets || hostCountry.taxRef?.dividendTaxBrackets) && (
          <>
            <p className="text-xs font-semibold text-[#40AEBC] uppercase tracking-wider mt-4 mb-2">Dividend Tax Bands</p>
            <div className="grid grid-cols-2 gap-4">
              {columns.map(col => (
                <div key={col.label}>
                  <p className="text-xs font-semibold text-slate-500 uppercase mb-1">{col.country.name}</p>
                  <div className="space-y-0.5">
                    {col.country.taxRef?.dividendTaxBrackets?.map((b, i) => (
                      <BracketRow
                        key={i}
                        label={`${col.country.currency[1]}${b.min.toLocaleString()} – ${b.max === Infinity ? '∞' : col.country.currency[1] + b.max.toLocaleString()}`}
                        rate={`${(b.rate * 100).toFixed(b.rate * 100 % 1 === 0 ? 0 : 2)}%`}
                      />
                    )) || <p className="text-xs text-slate-400">Flat WHT rate applies</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RateRow({ label, values, nullLabel }: { label: string; values: (number | null | undefined)[]; nullLabel?: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 text-slate-600">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="py-2 text-right text-slate-700 font-medium tabular-nums">
          {v == null ? (nullLabel || '—') : `${v}%`}
        </td>
      ))}
    </tr>
  );
}

function BracketRow({ label, rate, accent }: { label: string; rate: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-xs py-0.5 px-2 rounded ${accent ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
      <span className="truncate">{label}</span>
      <span className="font-semibold ml-2 shrink-0">{rate}</span>
    </div>
  );
}
