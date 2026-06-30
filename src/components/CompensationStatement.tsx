import type { CostEstimateResult, Country, EstimateInput } from '../types';
import { currencies, assignmentTypes, familyStatuses } from '../data/benefits';

const fmt = (n: number, currency?: string) => {
  const c = currencies.find(cc => cc.code === currency);
  const sym = c?.symbol || '$';
  const abs = Math.abs(n);
  return `${n < 0 ? '-' : ''}${sym}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

const fmtMonthly = (annual: number, currency?: string) => fmt(Math.round(annual / 12), currency);

export function CompensationStatement({
  result, currency, input, homeCountry, hostCountry,
}: {
  result: CostEstimateResult;
  currency: string;
  input: EstimateInput;
  homeCountry: Country | undefined;
  hostCountry: Country | undefined;
}) {
  const bs = result.balanceSheet;
  const philosophyLabel = input.hypoTaxPhilosophy === 'taxEqualization'
    ? 'Tax Equalisation' : input.hypoTaxPhilosophy === 'taxProtection'
    ? 'Tax Protection' : 'Stay-at-Home';
  const assignmentLabel = assignmentTypes.find(a => a.value === input.assignmentType)?.label || input.assignmentType;
  const familyLabel = familyStatuses.find(f => f.value === input.familyStatus)?.label || input.familyStatus;
  const homeCity = homeCountry?.cities.find(c => c.code === input.homeCityCode);
  const hostCity = hostCountry?.cities.find(c => c.code === input.hostCityCode);

  const endDate = (() => {
    const d = new Date(input.startDate);
    d.setMonth(d.getMonth() + input.durationMonths);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  })();
  const startFormatted = new Date(input.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Collect enabled benefits for the allowance breakdown
  const allowanceLines: { label: string; annual: number }[] = [];
  if (result.benefits.housing > 0) allowanceLines.push({ label: 'Housing Allowance', annual: result.benefits.housing });
  if (result.benefits.cola > 0) allowanceLines.push({ label: 'Cost of Living Allowance (COLA)', annual: result.benefits.cola });
  if (result.benefits.education > 0) allowanceLines.push({ label: 'Education / Schooling', annual: result.benefits.education });
  if (result.benefits.homeLeave > 0) allowanceLines.push({ label: 'Home Leave', annual: result.benefits.homeLeave });
  if (result.benefits.transportation > 0) allowanceLines.push({ label: 'Transportation', annual: result.benefits.transportation });
  if (result.benefits.utilities > 0) allowanceLines.push({ label: 'Utilities', annual: result.benefits.utilities });
  // Custom benefits
  for (const item of input.otherBenefits || []) {
    if (item.amount > 0) allowanceLines.push({ label: item.name || 'Other Benefit', annual: item.amount });
  }

  // One-off lines
  const oneOffLines: { label: string; amount: number }[] = [];
  if (result.benefits.immigration > 0) oneOffLines.push({ label: 'Immigration / Visa Fees', amount: result.benefits.immigration });
  if (result.benefits.relocation > 0) oneOffLines.push({ label: 'Relocation Assistance', amount: result.benefits.relocation });
  if (result.benefits.taxPreparation > 0) oneOffLines.push({ label: 'Tax Preparation Services', amount: result.benefits.taxPreparation });

  const handlePrint = () => {
    const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const incentiveLabel = input.incentivePlanName?.trim() || 'Annual Bonus';

    const allowanceRowsHtml = allowanceLines.map(a =>
      `<tr><td class="indent">${a.label}</td><td class="amt">${fmt(a.annual, currency)}</td><td class="amt muted">${fmtMonthly(a.annual, currency)}</td></tr>`
    ).join('');

    const oneOffRowsHtml = oneOffLines.map(o =>
      `<tr><td class="indent">${o.label}</td><td class="amt">${fmt(o.amount, currency)}</td><td class="amt muted">—</td></tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Compensation Statement - ${input.estimateName || 'Employee'}</title>
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
  td { padding: 4px 8px; border-bottom: 1px solid #f1f5f9; }
  .label { font-weight: 600; color: #475569; width: 200px; }
  .amt { text-align: right; font-variant-numeric: tabular-nums; }
  .muted { color: #94a3b8; font-size: 11px; }
  .neg { color: #dc2626; }
  .indent { padding-left: 24px; }
  .total-row { border-top: 1px solid #cbd5e1; font-weight: 600; }
  .total-row td { padding-top: 6px; }
  .grand-total { border-top: 2px solid #40AEBC; font-weight: 700; font-size: 13px; color: #40AEBC; }
  .grand-total td { padding-top: 8px; }
  .emp-note { background: #f0fafb; border: 1px solid #40AEBC33; border-radius: 6px; padding: 12px; margin: 1rem 0; font-size: 11px; color: #475569; line-height: 1.6; }
  .emp-note strong { color: #40AEBC; }
  .disclaimer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  .highlight-box { background: linear-gradient(135deg, #40AEBC, #2D8A96); color: white; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem; }
  .highlight-box .big { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .highlight-box .sub { font-size: 11px; opacity: 0.7; }
  .highlight-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); }
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
      <div><h1>Compensation Statement</h1><p>Confidential — Employee Copy</p></div>
    </div>
    <div class="header-right"><p>${today}</p><p>Ref: ${input.estimateName || 'Untitled'}</p></div>
  </div>

  <div class="highlight-box">
    <p class="sub">YOUR TOTAL HOST PACKAGE VALUE (ANNUAL)</p>
    <p class="big">${fmt(bs.totalHostPackage, currency)}</p>
    <div class="highlight-grid">
      <div><p>Monthly Package Value</p><p>${fmtMonthly(bs.totalHostPackage, currency)}</p></div>
      <div><p>Net Home Compensation</p><p>${fmt(bs.netHomeComp, currency)}</p></div>
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">Assignment Details</h2>
    <table>
      <tr><td class="label">Home Location</td><td>${homeCountry?.name || input.homeCountryCode} (${homeCity?.name || input.homeCityCode})</td></tr>
      <tr><td class="label">Host Location</td><td>${hostCountry?.name || input.hostCountryCode} (${hostCity?.name || input.hostCityCode})</td></tr>
      <tr><td class="label">Assignment Type</td><td>${assignmentLabel}</td></tr>
      <tr><td class="label">Start Date</td><td>${startFormatted}</td></tr>
      <tr><td class="label">End Date</td><td>${endDate}</td></tr>
      <tr><td class="label">Duration</td><td>${input.durationMonths} months</td></tr>
      <tr><td class="label">Family Status</td><td>${familyLabel}${input.numChildren > 0 ? ` + ${input.numChildren} child(ren)` : ''}</td></tr>
      <tr><td class="label">Tax Philosophy</td><td>${philosophyLabel}</td></tr>
      <tr><td class="label">Currency</td><td>${currency}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Compensation</h2>
    <table>
      <tr style="font-size:10px;color:#64748b"><td></td><td class="amt" style="font-weight:600">Annual</td><td class="amt" style="font-weight:600">Monthly</td></tr>
      <tr><td>Base Salary</td><td class="amt">${fmt(result.homeCompensation.baseSalary, currency)}</td><td class="amt muted">${fmtMonthly(result.homeCompensation.baseSalary, currency)}</td></tr>
      <tr><td>${incentiveLabel}</td><td class="amt">${fmt(result.homeCompensation.annualBonus, currency)}</td><td class="amt muted">${fmtMonthly(result.homeCompensation.annualBonus, currency)}</td></tr>
      ${result.homeCompensation.equityIncome > 0 ? `<tr><td>Equity Income</td><td class="amt">${fmt(result.homeCompensation.equityIncome, currency)}</td><td class="amt muted">${fmtMonthly(result.homeCompensation.equityIncome, currency)}</td></tr>` : ''}
      ${(input.otherCompensation || []).filter(i => i.amount > 0).map(i => `<tr><td>${i.name || 'Other'}</td><td class="amt">${fmt(i.amount, currency)}</td><td class="amt muted">${fmtMonthly(i.amount, currency)}</td></tr>`).join('')}
      <tr class="total-row"><td>Total Gross Compensation</td><td class="amt">${fmt(result.homeCompensation.totalGross, currency)}</td><td class="amt muted">${fmtMonthly(result.homeCompensation.totalGross, currency)}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Hypothetical Deductions</h2>
    <div class="emp-note">
      <strong>What is this?</strong> Under ${philosophyLabel}, your tax and social security position is maintained as if you had stayed in your home country.
      ${input.hypoTaxPhilosophy === 'taxEqualization' ? 'You will not pay more <em>or less</em> tax than you would have at home. Your employer bears any additional host country tax cost.' : ''}
      ${input.hypoTaxPhilosophy === 'taxProtection' ? 'You are guaranteed not to pay more tax than at home. If the host tax is lower, you keep the benefit.' : ''}
    </div>
    <table>
      <tr><td>Hypothetical Income Tax</td><td class="amt neg">(${fmt(bs.hypoTax, currency)})</td><td class="amt muted neg">(${fmtMonthly(bs.hypoTax, currency)})</td></tr>
      <tr><td>Hypothetical Social Security</td><td class="amt neg">(${fmt(bs.hypoSS, currency)})</td><td class="amt muted neg">(${fmtMonthly(bs.hypoSS, currency)})</td></tr>
      <tr class="total-row"><td>Total Hypothetical Deductions</td><td class="amt neg">(${fmt(bs.hypoTax + bs.hypoSS, currency)})</td><td class="amt muted neg">(${fmtMonthly(bs.hypoTax + bs.hypoSS, currency)})</td></tr>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Net Home Compensation</h2>
    <table>
      <tr style="background:#f0fafb"><td style="font-weight:700">Net Compensation (Stay-at-Home Equivalent)</td><td class="amt" style="font-weight:700;color:#40AEBC">${fmt(bs.netHomeComp, currency)}</td><td class="amt muted" style="color:#40AEBC">${fmtMonthly(bs.netHomeComp, currency)}</td></tr>
    </table>
  </div>

  <div class="section">
    <h2 class="section-title">Assignment Allowances & Benefits</h2>
    <table>
      <tr style="font-size:10px;color:#64748b"><td></td><td class="amt" style="font-weight:600">Annual</td><td class="amt" style="font-weight:600">Monthly</td></tr>
      ${allowanceRowsHtml}
      <tr class="total-row"><td>Total Recurring Allowances</td><td class="amt">${fmt(result.benefits.assignmentAllowances, currency)}</td><td class="amt muted">${fmtMonthly(result.benefits.assignmentAllowances, currency)}</td></tr>
    </table>
    ${oneOffRowsHtml ? `
    <table style="margin-top:8px">
      <tr><td colspan="3" style="font-size:10px;font-weight:600;color:#94a3b8;padding-top:6px">ONE-OFF PROVISIONS</td></tr>
      ${oneOffRowsHtml}
    </table>` : ''}
  </div>

  <div class="section">
    <h2 class="section-title">Total Host Package</h2>
    <table>
      <tr><td>Net Home Compensation</td><td class="amt">${fmt(bs.netHomeComp, currency)}</td></tr>
      <tr><td>Assignment Allowances</td><td class="amt" style="color:#059669">${fmt(bs.hostAllowances, currency)}</td></tr>
      <tr class="grand-total"><td>Total Host Package Value</td><td class="amt">${fmt(bs.totalHostPackage, currency)}</td></tr>
    </table>
  </div>

  <div class="emp-note">
    <strong>Important Notes</strong><br/>
    &bull; All amounts shown are annual estimates in ${currency} and may be subject to change based on actual costs and exchange rate movements.<br/>
    &bull; Your employer manages all actual tax filings and payments in the host country. The hypothetical deductions above are retained from your gross pay to maintain tax neutrality.<br/>
    &bull; Assignment allowances are provided to cover incremental costs of living abroad and are subject to company policy terms.<br/>
    ${oneOffLines.length > 0 ? '&bull; One-off provisions (immigration, relocation, tax preparation) are provided once during the assignment and are not recurring.<br/>' : ''}
    &bull; This statement is for information only and does not constitute a contractual document or tax advice.
  </div>

  <div class="disclaimer">
    <p>Prepared by: The Cozm Ltd | Date: ${today} | Status: Draft - For Employee Review</p>
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
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Employee Hero */}
      <div className="bg-gradient-to-br from-[#40AEBC] to-[#2D8A96] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Your Total Host Package (Annual)</p>
            <p className="text-4xl font-bold mt-1">{fmt(bs.totalHostPackage, currency)}</p>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 text-sm font-medium bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"
          >
            Export Statement
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-xs text-white/60">Monthly Package</p>
            <p className="text-lg font-semibold">{fmtMonthly(bs.totalHostPackage, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Net Home Comp</p>
            <p className="text-lg font-semibold">{fmt(bs.netHomeComp, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Assignment Allowances</p>
            <p className="text-lg font-semibold">{fmt(bs.hostAllowances, currency)}</p>
          </div>
        </div>
      </div>

      {/* Assignment Details */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Assignment Details</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <Detail label="Home Location" value={`${homeCountry?.name || input.homeCountryCode} (${homeCity?.name || input.homeCityCode})`} />
            <Detail label="Host Location" value={`${hostCountry?.name || input.hostCountryCode} (${hostCity?.name || input.hostCityCode})`} />
            <Detail label="Assignment Type" value={assignmentLabel} />
            <Detail label="Duration" value={`${input.durationMonths} months`} />
            <Detail label="Start Date" value={startFormatted} />
            <Detail label="End Date" value={endDate} />
            <Detail label="Family Status" value={`${familyLabel}${input.numChildren > 0 ? ` + ${input.numChildren} child(ren)` : ''}`} />
            <Detail label="Tax Philosophy" value={philosophyLabel} />
          </div>
        </div>
      </div>

      {/* Compensation */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Your Compensation</h3>
          <p className="text-sm text-slate-400 mt-0.5">Gross annual and monthly amounts</p>
        </div>
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase tracking-wider">
                <th className="text-left py-1 font-semibold">Component</th>
                <th className="text-right py-1 font-semibold">Annual</th>
                <th className="text-right py-1 font-semibold">Monthly</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Base Salary" annual={result.homeCompensation.baseSalary} currency={currency} />
              <Row label={input.incentivePlanName?.trim() || 'Annual Bonus'} annual={result.homeCompensation.annualBonus} currency={currency} accent="amber" />
              {result.homeCompensation.equityIncome > 0 && (
                <Row label="Equity Income" annual={result.homeCompensation.equityIncome} currency={currency} accent="purple" />
              )}
              {(input.otherCompensation || []).filter(i => i.amount > 0).map((item, i) => (
                <Row key={i} label={item.name || 'Other Compensation'} annual={item.amount} currency={currency} />
              ))}
              <tr className="border-t border-slate-200">
                <td className="py-2.5 font-semibold text-slate-800">Total Gross Compensation</td>
                <td className="py-2.5 text-right font-bold text-slate-800">{fmt(result.homeCompensation.totalGross, currency)}</td>
                <td className="py-2.5 text-right font-medium text-slate-500">{fmtMonthly(result.homeCompensation.totalGross, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hypothetical Deductions */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Hypothetical Deductions</h3>
          <p className="text-sm text-slate-400 mt-0.5">{philosophyLabel} — as if you remained in your home country</p>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
            {input.hypoTaxPhilosophy === 'taxEqualization' && (
              <p>Under <strong>Tax Equalisation</strong>, you pay no more <em>and no less</em> tax than you would at home. Your employer absorbs any difference between actual host taxes and this hypothetical amount.</p>
            )}
            {input.hypoTaxPhilosophy === 'taxProtection' && (
              <p>Under <strong>Tax Protection</strong>, you are guaranteed not to pay more tax than at home. If host taxes are lower, you keep the benefit.</p>
            )}
            {input.hypoTaxPhilosophy === 'stayAtHome' && (
              <p>Under <strong>Stay-at-Home</strong> compensation, your net pay is maintained at the same level as if you had not gone on assignment.</p>
            )}
          </div>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-600">Hypothetical Income Tax</td>
                <td className="py-2.5 text-right font-medium text-red-600">({fmt(bs.hypoTax, currency)})</td>
                <td className="py-2.5 text-right text-red-400 text-xs">({fmtMonthly(bs.hypoTax, currency)})</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-600">Hypothetical Social Security</td>
                <td className="py-2.5 text-right font-medium text-red-600">({fmt(bs.hypoSS, currency)})</td>
                <td className="py-2.5 text-right text-red-400 text-xs">({fmtMonthly(bs.hypoSS, currency)})</td>
              </tr>
              <tr className="border-t border-slate-200">
                <td className="py-2.5 font-semibold text-slate-800">Total Deductions</td>
                <td className="py-2.5 text-right font-bold text-red-600">({fmt(bs.hypoTax + bs.hypoSS, currency)})</td>
                <td className="py-2.5 text-right text-red-400 text-xs font-medium">({fmtMonthly(bs.hypoTax + bs.hypoSS, currency)})</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Home Compensation */}
      <div className="bg-[#40AEBC]/5 border border-[#40AEBC]/20 rounded-xl p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Net Home Compensation</p>
            <p className="text-xs text-slate-400 mt-0.5">Your stay-at-home equivalent after hypothetical deductions</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#40AEBC]">{fmt(bs.netHomeComp, currency)}</p>
            <p className="text-sm text-slate-500">{fmtMonthly(bs.netHomeComp, currency)} /month</p>
          </div>
        </div>
      </div>

      {/* Assignment Allowances */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Assignment Allowances & Benefits</h3>
          <p className="text-sm text-slate-400 mt-0.5">Additional benefits provided during your assignment</p>
        </div>
        <div className="p-6">
          {allowanceLines.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider">
                  <th className="text-left py-1 font-semibold">Benefit</th>
                  <th className="text-right py-1 font-semibold">Annual</th>
                  <th className="text-right py-1 font-semibold">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {allowanceLines.map((a, i) => (
                  <Row key={i} label={a.label} annual={a.annual} currency={currency} accent="emerald" />
                ))}
                <tr className="border-t border-slate-200">
                  <td className="py-2.5 font-semibold text-slate-800">Total Recurring Allowances</td>
                  <td className="py-2.5 text-right font-bold text-emerald-600">{fmt(result.benefits.assignmentAllowances, currency)}</td>
                  <td className="py-2.5 text-right font-medium text-slate-500">{fmtMonthly(result.benefits.assignmentAllowances, currency)}</td>
                </tr>
              </tbody>
            </table>
          )}

          {oneOffLines.length > 0 && (
            <div className={allowanceLines.length > 0 ? 'mt-4 pt-4 border-t border-slate-100' : ''}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">One-off Provisions</p>
              <table className="w-full text-sm">
                <tbody>
                  {oneOffLines.map((o, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 text-slate-600">{o.label}</td>
                      <td className="py-2 text-right font-medium text-slate-700">{fmt(o.amount, currency)}</td>
                      <td className="py-2 text-right text-slate-400 text-xs">one-off</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Grand Total */}
      <div className="bg-white rounded-xl border-2 border-[#40AEBC] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Total Host Package Summary</h3>
        </div>
        <div className="p-6">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-600">Gross Compensation</td>
                <td className="py-2.5 text-right font-medium text-slate-700">{fmt(bs.homeGross, currency)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-600">Less: Hypothetical Deductions</td>
                <td className="py-2.5 text-right font-medium text-red-600">({fmt(bs.hypoTax + bs.hypoSS, currency)})</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-600 font-medium">= Net Home Compensation</td>
                <td className="py-2.5 text-right font-semibold text-[#40AEBC]">{fmt(bs.netHomeComp, currency)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2.5 text-slate-600">Plus: Assignment Allowances</td>
                <td className="py-2.5 text-right font-medium text-emerald-600">{fmt(bs.hostAllowances, currency)}</td>
              </tr>
              <tr className="bg-[#40AEBC]/5">
                <td className="py-3 font-bold text-slate-800 text-base">Total Host Package Value</td>
                <td className="py-3 text-right font-bold text-[#40AEBC] text-xl">{fmt(bs.totalHostPackage, currency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-sm text-slate-600 space-y-2">
        <h4 className="font-semibold text-slate-800">Important Notes</h4>
        <ul className="list-disc list-inside space-y-1 text-xs text-slate-500">
          <li>All amounts are annual estimates in {currency} and may change based on actual costs and exchange rates.</li>
          <li>Your employer manages all host country tax filings and payments. Hypothetical deductions maintain your tax neutrality.</li>
          <li>Assignment allowances cover incremental costs of living abroad, subject to company policy.</li>
          {oneOffLines.length > 0 && <li>One-off provisions are provided once and are not recurring.</li>}
          <li>This statement is for information only and does not constitute tax or legal advice.</li>
        </ul>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-1">
      <span className="text-slate-500 text-xs">{label}</span>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  );
}

function Row({ label, annual, currency, accent }: { label: string; annual: number; currency: string; accent?: string }) {
  const color = accent === 'amber' ? 'text-amber-600' : accent === 'purple' ? 'text-purple-600' : accent === 'emerald' ? 'text-emerald-600' : '';
  return (
    <tr className="border-b border-slate-100">
      <td className={`py-2 text-slate-600 ${color}`}>{label}</td>
      <td className={`py-2 text-right font-medium text-slate-700 ${color}`}>{fmt(annual, currency)}</td>
      <td className="py-2 text-right text-slate-400 text-xs">{fmtMonthly(annual, currency)}</td>
    </tr>
  );
}
