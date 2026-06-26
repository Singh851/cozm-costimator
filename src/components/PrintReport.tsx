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
  const handlePrint = () => {
    const bs = result.balanceSheet;
    const ss = result.splitSourcing;
    const cur = currency;
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const familyLabel = result.input.familyStatus === 'married_children'
      ? `Married + ${result.input.numChildren} child(ren)`
      : result.input.familyStatus === 'married' ? 'Married / Partner' : 'Single';
    const filingStatus = result.input.familyStatus !== 'single' ? 'Married Filing Jointly' : 'Single';

    const recurringItems = result.costBreakdown.filter(item => !item.oneOff);
    const oneOffItems = result.costBreakdown.filter(item => item.oneOff);

    const recurringRows = recurringItems.map(item =>
      `<tr><td>${item.category}</td><td class="amt">${fmt(item.amount, cur)}</td><td class="amt pct">${item.percentage.toFixed(1)}%</td></tr>`
    ).join('');

    const oneOffRows = oneOffItems.map(item =>
      `<tr><td>${item.category} <span style="font-size:9px;color:#94a3b8">(one-off)</span></td><td class="amt">${fmt(item.amount, cur)}</td><td class="amt pct">${item.percentage.toFixed(1)}%</td></tr>`
    ).join('');

    // Year-by-year breakdown (flat, no inflation) — detailed line items
    const years = Math.ceil(result.input.durationMonths / 12);
    const employerSSCost = result.input.ssStrategy === 'home' ? result.homeTax.ssEmployer
      : result.input.ssStrategy === 'host' ? result.hostTax.ssEmployer
      : result.homeTax.ssEmployer + result.hostTax.ssEmployer;
    const recurringAnnual = result.homeCompensation.totalGross
      + result.benefits.totalAllowances
      - result.benefits.immigration - result.benefits.relocation
      + result.grossUp.totalGrossUp + employerSSCost;
    const oneOffTotal = result.benefits.immigration + result.benefits.relocation;

    let yearRows = '';
    let durationTotal = 0;
    for (let i = 0; i < years; i++) {
      const yearTotal = recurringAnnual + (i === 0 ? oneOffTotal : 0);
      durationTotal += yearTotal;
      yearRows += `<tr style="background:#f0fafb"><td colspan="2" style="font-weight:600;padding-top:8px">Year ${i + 1}</td></tr>`;
      yearRows += `<tr><td class="indent">Base Salary</td><td class="amt">${fmt(result.homeCompensation.baseSalary, cur)}</td></tr>`;
      if (result.homeCompensation.annualBonus > 0) yearRows += `<tr><td class="indent">Annual Bonus</td><td class="amt">${fmt(result.homeCompensation.annualBonus, cur)}</td></tr>`;
      if (result.homeCompensation.equityIncome > 0) yearRows += `<tr><td class="indent">Equity Income</td><td class="amt">${fmt(result.homeCompensation.equityIncome, cur)}</td></tr>`;
      if (result.benefits.housing > 0) yearRows += `<tr><td class="indent">Housing</td><td class="amt">${fmt(result.benefits.housing, cur)}</td></tr>`;
      if (result.benefits.cola > 0) yearRows += `<tr><td class="indent">COLA</td><td class="amt">${fmt(result.benefits.cola, cur)}</td></tr>`;
      if (result.benefits.education > 0) yearRows += `<tr><td class="indent">Education</td><td class="amt">${fmt(result.benefits.education, cur)}</td></tr>`;
      if (result.benefits.homeLeave > 0) yearRows += `<tr><td class="indent">Home Leave</td><td class="amt">${fmt(result.benefits.homeLeave, cur)}</td></tr>`;
      if (result.benefits.transportation > 0) yearRows += `<tr><td class="indent">Transportation</td><td class="amt">${fmt(result.benefits.transportation, cur)}</td></tr>`;
      if (result.benefits.utilities > 0) yearRows += `<tr><td class="indent">Utilities</td><td class="amt">${fmt(result.benefits.utilities, cur)}</td></tr>`;
      if (result.benefits.taxPreparation > 0) yearRows += `<tr><td class="indent">Tax Preparation</td><td class="amt">${fmt(result.benefits.taxPreparation, cur)}</td></tr>`;
      if (i === 0 && result.benefits.immigration > 0) yearRows += `<tr><td class="indent">Immigration (one-off)</td><td class="amt">${fmt(result.benefits.immigration, cur)}</td></tr>`;
      if (i === 0 && result.benefits.relocation > 0) yearRows += `<tr><td class="indent">Relocation (one-off)</td><td class="amt">${fmt(result.benefits.relocation, cur)}</td></tr>`;
      yearRows += `<tr><td class="indent">Gross-up</td><td class="amt">${fmt(result.grossUp.totalGrossUp, cur)}</td></tr>`;
      yearRows += `<tr><td class="indent">Employer SS</td><td class="amt">${fmt(employerSSCost, cur)}</td></tr>`;
      yearRows += `<tr class="total-row"><td style="font-weight:600">Year ${i + 1} Total</td><td class="amt" style="font-weight:600">${fmt(yearTotal, cur)}</td></tr>`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Cozm Cost Estimate - ${result.input.estimateName || 'Report'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; font-size: 12px; color: #1e293b; line-height: 1.5; background: white; }
  .page { max-width: 800px; margin: 0 auto; padding: 2rem; }
  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; margin-bottom: 1.5rem; border-bottom: 2px solid #40AEBC; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .header-left img { height: 36px; }
  .header-left h1 { font-size: 18px; font-weight: 700; }
  .header-left p { font-size: 11px; color: #94a3b8; }
  .header-right { text-align: right; font-size: 11px; color: #64748b; }
  .section { margin-bottom: 1.25rem; }
  .section-title { font-size: 13px; font-weight: 700; color: #40AEBC; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; padding: 4px 8px; border-bottom: 1px solid #e2e8f0; }
  th:not(:first-child) { text-align: right; }
  td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
  .label { font-weight: 600; color: #475569; width: 200px; }
  .amt { text-align: right; font-variant-numeric: tabular-nums; }
  .neg { color: #dc2626; }
  .pct { color: #94a3b8; font-size: 11px; width: 60px; }
  .total-row { border-top: 1px solid #cbd5e1; font-weight: 600; }
  .total-row td { padding-top: 6px; }
  .grand-total { border-top: 2px solid #40AEBC; font-weight: 700; font-size: 13px; color: #40AEBC; }
  .grand-total td { padding-top: 8px; }
  .indent { padding-left: 24px; }
  .disclaimer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .highlight-box { background: linear-gradient(135deg, #40AEBC, #2D8A96); color: white; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem; }
  .highlight-box .big { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .highlight-box .sub { font-size: 11px; opacity: 0.7; }
  .highlight-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); }
  .highlight-grid div p:first-child { font-size: 10px; opacity: 0.6; }
  .highlight-grid div p:last-child { font-size: 16px; font-weight: 600; }
  @media print { .page { padding: 1.5cm; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-left">
      <img src="https://www.thecozm.com/images/logo/theCozmLogo.png" alt="Cozm" />
      <div><h1>Mobility Cost Estimate</h1><p>Confidential</p></div>
    </div>
    <div class="header-right"><p>${today}</p><p>Ref: ${result.input.estimateName || 'Untitled'}</p></div>
  </div>

  <div class="highlight-box">
    <p class="sub">TOTAL ESTIMATED ANNUAL COST</p>
    <p class="big">${fmt(result.totalEstimatedCost, cur)}</p>
    <div class="highlight-grid">
      <div><p>Monthly</p><p>${fmt(result.monthlyCost, cur)}</p></div>
      <div><p>Employer Cost</p><p>${fmt(result.employerCost, cur)}</p></div>
      <div><p>Duration Total (${result.input.durationMonths}mo)</p><p>${fmt(durationTotal, cur)}</p></div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Assignment Summary</h2>
    <table>
      <tr><td class="label">Estimate Name</td><td>${result.input.estimateName || 'Untitled'}</td></tr>
      <tr><td class="label">Home</td><td>${homeCountry?.name || result.input.homeCountryCode} (${result.input.homeCityCode})</td></tr>
      <tr><td class="label">Host</td><td>${hostCountry?.name || result.input.hostCountryCode} (${result.input.hostCityCode})</td></tr>
      <tr><td class="label">Duration</td><td>${result.input.durationMonths} months from ${result.input.startDate}</td></tr>
      <tr><td class="label">Assignment End</td><td>${ss.assignmentEnd}</td></tr>
      <tr><td class="label">Family Status</td><td>${familyLabel}</td></tr>
      <tr><td class="label">Currency</td><td>${cur}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Compensation</h2>
    <table>
      <tr><td>Base Salary</td><td class="amt">${fmt(result.homeCompensation.baseSalary, cur)}</td></tr>
      <tr><td>Annual Bonus</td><td class="amt">${fmt(result.homeCompensation.annualBonus, cur)}</td></tr>
      ${result.homeCompensation.equityIncome > 0 ? `<tr><td>Equity Income</td><td class="amt">${fmt(result.homeCompensation.equityIncome, cur)}</td></tr>` : ''}
      <tr class="total-row"><td>Total Gross Compensation</td><td class="amt">${fmt(result.homeCompensation.totalGross, cur)}</td></tr>
    </table>
  </div>

  ${(result.homeCompensation.annualBonus > 0 || result.homeCompensation.equityIncome > 0) ? `
  <div class="section">
    <h2 class="section-title">Split-Sourcing Analysis</h2>
    <table>
      <thead><tr><th>Component</th><th>Total</th><th>Period Days</th><th>Overlap</th><th>Host Ratio</th><th>Host-Taxable</th></tr></thead>
      <tbody>
        ${result.homeCompensation.annualBonus > 0 ? `<tr><td>Bonus</td><td class="amt">${fmt(result.homeCompensation.annualBonus, cur)}</td><td class="amt">${ss.bonus.performancePeriodDays}</td><td class="amt">${ss.bonus.overlapDays}</td><td class="amt">${(ss.bonus.hostRatio * 100).toFixed(2)}%</td><td class="amt" style="font-weight:600">${fmt(ss.bonus.hostTaxableAmount, cur)}</td></tr>` : ''}
        ${result.homeCompensation.equityIncome > 0 ? `<tr><td>Equity</td><td class="amt">${fmt(result.homeCompensation.equityIncome, cur)}</td><td class="amt">${ss.equity.vestingPeriodDays}</td><td class="amt">${ss.equity.overlapDays}</td><td class="amt">${(ss.equity.hostRatio * 100).toFixed(2)}%</td><td class="amt" style="font-weight:600">${fmt(ss.equity.hostTaxableAmount, cur)}</td></tr>` : ''}
      </tbody>
    </table>
  </div>` : ''}

  <div class="section">
    <h2 class="section-title">Tax Comparison</h2>
    <table>
      <thead><tr><th></th><th>Home (${homeCountry?.name})</th><th>Host (${hostCountry?.name})</th><th>Hypothetical</th></tr></thead>
      <tbody>
        <tr><td>Gross Income</td><td class="amt">${fmt(result.homeTax.grossIncome, cur)}</td><td class="amt">${fmt(result.hostTax.grossIncome, cur)}</td><td class="amt">${fmt(result.hypoTax.grossIncome, cur)}</td></tr>
        <tr><td>Income Tax</td><td class="amt">${fmt(result.homeTax.totalIncomeTax, cur)}</td><td class="amt">${fmt(result.hostTax.totalIncomeTax, cur)}</td><td class="amt">${fmt(result.hypoTax.totalIncomeTax, cur)}</td></tr>
        <tr><td>Effective Rate</td><td class="amt">${(result.homeTax.effectiveRate * 100).toFixed(1)}%</td><td class="amt">${(result.hostTax.effectiveRate * 100).toFixed(1)}%</td><td class="amt">${(result.hypoTax.effectiveRate * 100).toFixed(1)}%</td></tr>
        <tr><td>SS (Employee)</td><td class="amt">${fmt(result.homeTax.ssEmployee, cur)}</td><td class="amt">${fmt(result.hostTax.ssEmployee, cur)}</td><td class="amt">${fmt(result.hypoTax.ssEmployee, cur)}</td></tr>
        <tr><td>SS (Employer)</td><td class="amt">${fmt(result.homeTax.ssEmployer, cur)}</td><td class="amt">${fmt(result.hostTax.ssEmployer, cur)}</td><td class="amt">&mdash;</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Employee Balance Sheet</h2>
    <table>
      <tr><td>Total Gross Compensation</td><td class="amt" style="font-weight:600">${fmt(bs.homeGross, cur)}</td></tr>
      <tr><td class="indent">Base Salary</td><td class="amt">${fmt(result.homeCompensation.baseSalary, cur)}</td></tr>
      <tr><td class="indent">Annual Bonus</td><td class="amt">${fmt(result.homeCompensation.annualBonus, cur)}</td></tr>
      ${result.homeCompensation.equityIncome > 0 ? `<tr><td class="indent">Equity Income</td><td class="amt">${fmt(result.homeCompensation.equityIncome, cur)}</td></tr>` : ''}
      <tr><td>Less: Hypothetical Tax</td><td class="amt neg">(${fmt(bs.hypoTax, cur)})</td></tr>
      <tr><td>Less: Hypothetical SS</td><td class="amt neg">(${fmt(bs.hypoSS, cur)})</td></tr>
      <tr class="total-row" style="background:#f0fafb"><td style="font-weight:700">Net Home Compensation</td><td class="amt" style="font-weight:700;color:#40AEBC">${fmt(bs.netHomeComp, cur)}</td></tr>
      <tr><td>Plus: Host Allowances</td><td class="amt" style="color:#059669">${fmt(bs.hostAllowances, cur)}</td></tr>
      <tr class="grand-total"><td>Total Host Package</td><td class="amt">${fmt(bs.totalHostPackage, cur)}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Cost Breakdown</h2>
    <table>
      <thead><tr><th>Category</th><th>Annual Amount</th><th>% of Total</th></tr></thead>
      <tbody>
        <tr><td colspan="3" style="font-size:10px;font-weight:600;color:#40AEBC;padding-top:6px">RECURRING ANNUAL</td></tr>
        ${recurringRows}
        ${oneOffRows ? `<tr><td colspan="3" style="font-size:10px;font-weight:600;color:#94a3b8;padding-top:6px">ONE-OFF (ANNUALISED)</td></tr>${oneOffRows}` : ''}
        <tr class="grand-total"><td>TOTAL ESTIMATED ANNUAL COST</td><td class="amt">${fmt(result.totalEstimatedCost, cur)}</td><td class="amt pct">100%</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Annual Cost Projection (Detailed)</h2>
    <table>
      <thead><tr><th>Line Item</th><th>Amount</th></tr></thead>
      <tbody>
        ${yearRows}
        <tr class="grand-total"><td>Assignment Total (${result.input.durationMonths} months)</td><td class="amt">${fmt(durationTotal, cur)}</td></tr>
      </tbody>
    </table>
  </div>

  ${result.oneOffAnalysis ? `
  <div class="section">
    <h2 class="section-title">One-off Payment Analysis</h2>
    <table>
      <tr><td class="label">Payment Amount</td><td class="amt">${fmt(result.oneOffAnalysis.payment, cur)}</td></tr>
      <tr><td class="label">Marginal Tax Rate</td><td class="amt">${(result.oneOffAnalysis.marginalRate * 100).toFixed(1)}%</td></tr>
      <tr><td class="label">Marginal Tax</td><td class="amt">${fmt(result.oneOffAnalysis.marginalTax, cur)}</td></tr>
      <tr><td class="label">Marginal Employer SS</td><td class="amt">${fmt(result.oneOffAnalysis.marginalSS, cur)}</td></tr>
      <tr class="total-row"><td class="label">Total Employer Cost of One-off</td><td class="amt" style="font-weight:700;color:#40AEBC">${fmt(result.oneOffAnalysis.totalCost, cur)}</td></tr>
    </table>
  </div>` : ''}

  <div class="section">
    <h2 class="section-title">Assumptions & Methodology</h2>
    <table>
      <tr><td class="label">Tax Year</td><td>2025/26</td></tr>
      <tr><td class="label">Filing Status</td><td>${filingStatus}</td></tr>
      <tr><td class="label">Tax Philosophy</td><td>${result.input.hypoTaxPhilosophy === 'taxEqualization' ? 'Tax Equalisation' : result.input.hypoTaxPhilosophy === 'taxProtection' ? 'Tax Protection' : 'Stay-at-Home'}</td></tr>
      <tr><td class="label">Social Security</td><td>${result.input.ssStrategy === 'home' ? 'Home country only (A1/CoC assumed)' : result.input.ssStrategy === 'host' ? 'Host country only' : 'Dual liability'}</td></tr>
      <tr><td class="label">Exchange Rate</td><td>Tax brackets applied in local currency via FX conversion (reporting: ${cur})</td></tr>
      <tr><td class="label">Tax Data</td><td>IRS Rev. Proc. 2024-40 (US 2025); HMRC 2025/26; EStG &sect;32a (DE 2024)</td></tr>
    </table>
  </div>

  <div class="disclaimer">
    <p><strong>IMPORTANT:</strong> This cost estimate is for illustration purposes only and does not constitute tax, legal, or financial advice. All figures should be verified by a qualified tax adviser before use.</p>
    <p style="margin-top:6px">Prepared by: The Cozm Ltd | Date: ${today} | Status: Draft - For Review</p>
    <p style="margin-top:4px;font-weight:600;color:#40AEBC">The Cozm Ltd &mdash; www.thecozm.com</p>
  </div>
</div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center no-print">
      <div className="bg-white rounded-xl p-6 max-w-md text-center space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Generate PDF Report</h3>
        <p className="text-sm text-slate-600">This will open the report in a new tab. Use Cmd+P (or Ctrl+P) to save as PDF.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handlePrint} className="px-4 py-2 text-sm text-white bg-[#40AEBC] rounded-lg hover:bg-[#2D8A96]">Open Report</button>
        </div>
      </div>
    </div>
  );
}
