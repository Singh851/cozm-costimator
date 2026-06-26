import { useEffect } from 'react';
import type { CostEstimateResult, Country } from '../types';
import { currencies } from '../data/benefits';

const fmt = (n: number, currency?: string) => {
  const c = currencies.find(cc => cc.code === currency);
  const sym = c?.symbol || '$';
  const abs = Math.abs(n);
  return `${n < 0 ? '-' : ''}${sym}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export function PrintReport({
  result, currency, homeCountry, hostCountry, onClose,
}: {
  result: CostEstimateResult;
  currency: string;
  homeCountry: Country | undefined;
  hostCountry: Country | undefined;
  onClose: () => void;
}) {
  useEffect(() => {
    const timeout = setTimeout(() => {
      window.print();
      onClose();
    }, 300);
    return () => clearTimeout(timeout);
  }, [onClose]);

  const bs = result.balanceSheet;
  const ss = result.splitSourcing;

  return (
    <div className="print-report">
      <div className="print-overlay no-print" onClick={onClose} />

      <div className="print-content">
        {/* Header */}
        <div className="print-header">
          <div className="print-header-left">
            <img src="https://www.thecozm.com/images/logo/theCozmLogo.png" alt="Cozm" className="print-logo" />
            <div>
              <h1 className="print-title">Mobility Cost Estimate</h1>
              <p className="print-subtitle">Confidential</p>
            </div>
          </div>
          <div className="print-header-right">
            <p>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Case Summary */}
        <section className="print-section">
          <h2 className="print-section-title">Assignment Summary</h2>
          <table className="print-table">
            <tbody>
              <tr><td className="print-label">Estimate Name</td><td>{result.input.estimateName || 'Untitled'}</td></tr>
              <tr><td className="print-label">Home</td><td>{homeCountry?.name || result.input.homeCountryCode}</td></tr>
              <tr><td className="print-label">Host</td><td>{hostCountry?.name || result.input.hostCountryCode}</td></tr>
              <tr><td className="print-label">Duration</td><td>{result.input.durationMonths} months (from {result.input.startDate})</td></tr>
              <tr><td className="print-label">Family Status</td><td>{result.input.familyStatus === 'married_children' ? `Married + ${result.input.numChildren} child(ren)` : result.input.familyStatus === 'married' ? 'Married / Partner' : 'Single'}</td></tr>
              <tr><td className="print-label">Currency</td><td>{currency}</td></tr>
            </tbody>
          </table>
        </section>

        {/* Compensation */}
        <section className="print-section">
          <h2 className="print-section-title">Compensation</h2>
          <table className="print-table">
            <tbody>
              <tr><td>Base Salary</td><td className="print-amount">{fmt(result.homeCompensation.baseSalary, currency)}</td></tr>
              <tr><td>Annual Bonus</td><td className="print-amount">{fmt(result.homeCompensation.annualBonus, currency)}</td></tr>
              {result.homeCompensation.equityIncome > 0 && (
                <tr><td>Equity Income</td><td className="print-amount">{fmt(result.homeCompensation.equityIncome, currency)}</td></tr>
              )}
              <tr className="print-total-row"><td>Total Gross Compensation</td><td className="print-amount">{fmt(result.homeCompensation.totalGross, currency)}</td></tr>
            </tbody>
          </table>
        </section>

        {/* Split-Sourcing */}
        {(result.homeCompensation.annualBonus > 0 || result.homeCompensation.equityIncome > 0) && (
          <section className="print-section">
            <h2 className="print-section-title">Split-Sourcing Analysis</h2>
            <table className="print-table">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Total</th>
                  <th>Period Days</th>
                  <th>Overlap Days</th>
                  <th>Host Ratio</th>
                  <th>Host-Taxable</th>
                </tr>
              </thead>
              <tbody>
                {result.homeCompensation.annualBonus > 0 && (
                  <tr>
                    <td>Bonus</td>
                    <td className="print-amount">{fmt(result.homeCompensation.annualBonus, currency)}</td>
                    <td className="print-amount">{ss.bonus.performancePeriodDays}</td>
                    <td className="print-amount">{ss.bonus.overlapDays}</td>
                    <td className="print-amount">{(ss.bonus.hostRatio * 100).toFixed(2)}%</td>
                    <td className="print-amount">{fmt(ss.bonus.hostTaxableAmount, currency)}</td>
                  </tr>
                )}
                {result.homeCompensation.equityIncome > 0 && (
                  <tr>
                    <td>Equity</td>
                    <td className="print-amount">{fmt(result.homeCompensation.equityIncome, currency)}</td>
                    <td className="print-amount">{ss.equity.vestingPeriodDays}</td>
                    <td className="print-amount">{ss.equity.overlapDays}</td>
                    <td className="print-amount">{(ss.equity.hostRatio * 100).toFixed(2)}%</td>
                    <td className="print-amount">{fmt(ss.equity.hostTaxableAmount, currency)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* Tax Calculations */}
        <section className="print-section">
          <h2 className="print-section-title">Tax Comparison</h2>
          <table className="print-table">
            <thead>
              <tr><th></th><th>Home</th><th>Host</th><th>Hypo</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Income</td>
                <td className="print-amount">{fmt(result.homeTax.grossIncome, currency)}</td>
                <td className="print-amount">{fmt(result.hostTax.grossIncome, currency)}</td>
                <td className="print-amount">{fmt(result.hypoTax.grossIncome, currency)}</td>
              </tr>
              <tr>
                <td>Income Tax</td>
                <td className="print-amount">{fmt(result.homeTax.totalIncomeTax, currency)}</td>
                <td className="print-amount">{fmt(result.hostTax.totalIncomeTax, currency)}</td>
                <td className="print-amount">{fmt(result.hypoTax.totalIncomeTax, currency)}</td>
              </tr>
              <tr>
                <td>Effective Rate</td>
                <td className="print-amount">{(result.homeTax.effectiveRate * 100).toFixed(1)}%</td>
                <td className="print-amount">{(result.hostTax.effectiveRate * 100).toFixed(1)}%</td>
                <td className="print-amount">{(result.hypoTax.effectiveRate * 100).toFixed(1)}%</td>
              </tr>
              <tr>
                <td>SS (Employee)</td>
                <td className="print-amount">{fmt(result.homeTax.ssEmployee, currency)}</td>
                <td className="print-amount">{fmt(result.hostTax.ssEmployee, currency)}</td>
                <td className="print-amount">{fmt(result.hypoTax.ssEmployee, currency)}</td>
              </tr>
              <tr>
                <td>SS (Employer)</td>
                <td className="print-amount">{fmt(result.homeTax.ssEmployer, currency)}</td>
                <td className="print-amount">{fmt(result.hostTax.ssEmployer, currency)}</td>
                <td className="print-amount">—</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Balance Sheet */}
        <section className="print-section">
          <h2 className="print-section-title">Employee Balance Sheet</h2>
          <table className="print-table">
            <tbody>
              <tr><td>Total Gross Compensation</td><td className="print-amount">{fmt(bs.homeGross, currency)}</td></tr>
              <tr><td className="pl-4">Base Salary</td><td className="print-amount">{fmt(result.homeCompensation.baseSalary, currency)}</td></tr>
              <tr><td className="pl-4">Annual Bonus</td><td className="print-amount">{fmt(result.homeCompensation.annualBonus, currency)}</td></tr>
              {result.homeCompensation.equityIncome > 0 && (
                <tr><td className="pl-4">Equity Income</td><td className="print-amount">{fmt(result.homeCompensation.equityIncome, currency)}</td></tr>
              )}
              <tr><td>Less: Hypothetical Tax</td><td className="print-amount print-negative">({fmt(bs.hypoTax, currency)})</td></tr>
              <tr><td>Less: Hypothetical SS</td><td className="print-amount print-negative">({fmt(bs.hypoSS, currency)})</td></tr>
              <tr className="print-total-row"><td>Net Home Compensation</td><td className="print-amount">{fmt(bs.netHomeComp, currency)}</td></tr>
              <tr><td>Plus: Host Allowances</td><td className="print-amount">{fmt(bs.hostAllowances, currency)}</td></tr>
              <tr className="print-grand-total"><td>Total Host Package</td><td className="print-amount">{fmt(bs.totalHostPackage, currency)}</td></tr>
            </tbody>
          </table>
        </section>

        {/* Total Cost */}
        <section className="print-section">
          <h2 className="print-section-title">Total Estimated Cost</h2>
          <table className="print-table">
            <tbody>
              {result.costBreakdown.map(item => (
                <tr key={item.category}>
                  <td>{item.category}</td>
                  <td className="print-amount">{fmt(item.amount, currency)}</td>
                  <td className="print-amount print-pct">{item.percentage.toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="print-grand-total">
                <td>TOTAL ESTIMATED ANNUAL COST</td>
                <td className="print-amount">{fmt(result.totalEstimatedCost, currency)}</td>
                <td className="print-amount print-pct">100%</td>
              </tr>
              <tr>
                <td>Monthly</td>
                <td className="print-amount">{fmt(result.monthlyCost, currency)}</td>
                <td></td>
              </tr>
              <tr>
                <td>Duration Total ({result.input.durationMonths} months)</td>
                <td className="print-amount">{fmt(result.totalEstimatedCost * (result.input.durationMonths / 12), currency)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Disclaimer */}
        <div className="print-disclaimer">
          <p>This cost estimate is for illustration purposes only and should not be treated as tax or legal advice.
          Actual costs may vary based on exchange rates, legislative changes, and individual circumstances.
          The Cozm Ltd.</p>
        </div>
      </div>
    </div>
  );
}
