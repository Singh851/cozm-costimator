import type { CostEstimateResult } from '../types';
import { currencies } from '../data/benefits';

const fmt = (n: number, currency?: string) => {
  const c = currencies.find(cc => cc.code === currency);
  const sym = c?.symbol || '$';
  const abs = Math.abs(n);
  return `${n < 0 ? '-' : ''}${sym}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export function BalanceSheet({ result, currency }: { result: CostEstimateResult; currency: string }) {
  const bs = result.balanceSheet;
  const ss = result.splitSourcing;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-4xl mx-auto">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">Employee Balance Sheet</h3>
        <p className="text-sm text-slate-400 mt-0.5">Shows the employee's net position under the selected tax philosophy</p>
      </div>
      <div className="p-6">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 text-slate-600">Total Gross Compensation</td>
              <td className="py-2.5 text-right font-medium text-slate-800">{fmt(bs.homeGross, currency)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 text-slate-600 pl-4">Base Salary</td>
              <td className="py-2.5 text-right text-slate-600">{fmt(result.homeCompensation.baseSalary, currency)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2.5 text-slate-600 pl-4">Annual Bonus</td>
              <td className="py-2.5 text-right text-amber-600">{fmt(result.homeCompensation.annualBonus, currency)}</td>
            </tr>
            {result.homeCompensation.equityIncome > 0 && (
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-600 pl-4">Equity Income</td>
                <td className="py-2.5 text-right text-purple-600">{fmt(result.homeCompensation.equityIncome, currency)}</td>
              </tr>
            )}

            {/* Host-Apportioned Detail */}
            {(ss.bonus.hostRatio < 1 || ss.equity.hostRatio < 1) && (
              <>
                <tr className="border-b border-slate-100 bg-emerald-50/50">
                  <td className="py-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider" colSpan={2}>
                    Host-Apportioned (Split-Sourced)
                  </td>
                </tr>
                {result.homeCompensation.annualBonus > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-2 text-slate-500 pl-4 text-xs">
                      Bonus Host-Taxable ({(ss.bonus.hostRatio * 100).toFixed(1)}% &mdash; {ss.bonus.overlapDays}/{ss.bonus.performancePeriodDays} days)
                    </td>
                    <td className="py-2 text-right text-amber-600 text-xs font-medium">{fmt(ss.bonus.hostTaxableAmount, currency)}</td>
                  </tr>
                )}
                {result.homeCompensation.equityIncome > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-2 text-slate-500 pl-4 text-xs">
                      Equity Host-Taxable ({(ss.equity.hostRatio * 100).toFixed(1)}% &mdash; {ss.equity.overlapDays}/{ss.equity.vestingPeriodDays} days)
                    </td>
                    <td className="py-2 text-right text-purple-600 text-xs font-medium">{fmt(ss.equity.hostTaxableAmount, currency)}</td>
                  </tr>
                )}
              </>
            )}

            <tr className="border-b border-slate-200 bg-slate-50">
              <td className="py-2.5 text-slate-600 font-medium">Less: Hypothetical Tax</td>
              <td className="py-2.5 text-right font-medium text-red-600">({fmt(bs.hypoTax, currency)})</td>
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              <td className="py-2.5 text-slate-600 font-medium">Less: Hypothetical Social Security</td>
              <td className="py-2.5 text-right font-medium text-red-600">({fmt(bs.hypoSS, currency)})</td>
            </tr>
            <tr className="border-b border-slate-300 bg-[#40AEBC]/5">
              <td className="py-3 font-semibold text-slate-800">Net Home Compensation (Stay-at-Home)</td>
              <td className="py-3 text-right font-bold text-[#40AEBC]">{fmt(bs.netHomeComp, currency)}</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="py-2.5 text-slate-600 font-medium">Plus: Host Assignment Allowances</td>
              <td className="py-2.5 text-right font-medium text-emerald-600">{fmt(bs.hostAllowances, currency)}</td>
            </tr>
            <tr className="bg-[#40AEBC]/10">
              <td className="py-3 font-bold text-slate-800">Total Host Package Value</td>
              <td className="py-3 text-right font-bold text-[#40AEBC] text-lg">{fmt(bs.totalHostPackage, currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
