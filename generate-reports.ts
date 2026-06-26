// Generate static HTML PDF reports for both test cases
// Run with: npx tsx generate-reports.ts

import type { EstimateInput } from './src/types';
import { getDefaultBenefits, currencies } from './src/data/benefits';
import { computeEstimate } from './src/engine/costEstimate';
import { countries } from './src/data/countries';
import * as fs from 'fs';

const fmt = (n: number, currency: string) => {
  const c = currencies.find(cc => cc.code === currency);
  const sym = c?.symbol || '$';
  const abs = Math.abs(n);
  return `${n < 0 ? '-' : ''}${sym}${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

function generateReport(input: EstimateInput, caseLabel: string): string {
  const result = computeEstimate(input);
  if (!result) throw new Error('Failed to compute estimate');

  const homeCountry = countries.find(c => c.code === input.homeCountryCode);
  const hostCountry = countries.find(c => c.code === input.hostCountryCode);
  const bs = result.balanceSheet;
  const ss = result.splitSourcing;
  const cur = input.currency;
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const familyLabel = input.familyStatus === 'married_children'
    ? `Married + ${input.numChildren} child(ren)`
    : input.familyStatus === 'married' ? 'Married / Partner' : 'Single';

  const recurringItems = result.costBreakdown.filter(item => !item.oneOff);
  const oneOffItems = result.costBreakdown.filter(item => item.oneOff);

  const recurringRows = recurringItems.map(item =>
    `<tr><td>${item.category}</td><td class="amt">${fmt(item.amount, cur)}</td><td class="amt pct">${item.percentage.toFixed(1)}%</td></tr>`
  ).join('\n');

  const oneOffRows = oneOffItems.map(item =>
    `<tr><td>${item.category} <span style="font-size:9px;color:#94a3b8">(one-off, annualised)</span></td><td class="amt">${fmt(item.amount, cur)}</td><td class="amt pct">${item.percentage.toFixed(1)}%</td></tr>`
  ).join('\n');

  const filingStatus = input.familyStatus !== 'single' ? 'Married Filing Jointly' : 'Single';
  const taxYear = '2025/26';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cozm Mobility Cost Estimate - ${caseLabel}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; font-size: 12px; color: #1e293b; line-height: 1.5; background: #f8fafc; }
  .page { max-width: 800px; margin: 2rem auto; background: white; padding: 2.5rem; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
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
  @media print {
    body { background: white; }
    .page { margin: 0; padding: 1.5cm; border-radius: 0; box-shadow: none; max-width: none; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-left">
      <img src="https://www.thecozm.com/images/logo/theCozmLogo.png" alt="Cozm" />
      <div>
        <h1>Mobility Cost Estimate</h1>
        <p>Confidential &mdash; ${caseLabel}</p>
      </div>
    </div>
    <div class="header-right">
      <p>${today}</p>
      <p>Ref: ${input.estimateName}</p>
    </div>
  </div>

  <!-- Total Cost Banner -->
  <div class="highlight-box">
    <p class="sub">TOTAL ESTIMATED ANNUAL COST</p>
    <p class="big">${fmt(result.totalEstimatedCost, cur)}</p>
    <div class="highlight-grid">
      <div><p>Monthly</p><p>${fmt(result.monthlyCost, cur)}</p></div>
      <div><p>Employer Cost</p><p>${fmt(result.employerCost, cur)}</p></div>
      <div><p>Duration Total (${input.durationMonths}mo)</p><p>${fmt(result.totalEstimatedCost * (input.durationMonths / 12), cur)}</p></div>
    </div>
  </div>

  <!-- Assignment Summary -->
  <div class="section">
    <h2 class="section-title">Assignment Summary</h2>
    <table>
      <tr><td class="label">Estimate Name</td><td>${input.estimateName}</td></tr>
      <tr><td class="label">Home Country</td><td>${homeCountry?.name} (${input.homeCityCode})</td></tr>
      <tr><td class="label">Host Country</td><td>${hostCountry?.name} (${input.hostCityCode})</td></tr>
      <tr><td class="label">Duration</td><td>${input.durationMonths} months from ${input.startDate}</td></tr>
      <tr><td class="label">Assignment End</td><td>${ss.assignmentEnd}</td></tr>
      <tr><td class="label">Family Status</td><td>${familyLabel}</td></tr>
      <tr><td class="label">Currency</td><td>${cur}</td></tr>
    </table>
  </div>

  <!-- Compensation -->
  <div class="section">
    <h2 class="section-title">Compensation</h2>
    <table>
      <tr><td>Base Salary</td><td class="amt">${fmt(result.homeCompensation.baseSalary, cur)}</td></tr>
      <tr><td>Annual Bonus</td><td class="amt">${fmt(result.homeCompensation.annualBonus, cur)}</td></tr>
      ${result.homeCompensation.equityIncome > 0 ? `<tr><td>Equity Income (${input.equityType.toUpperCase()})</td><td class="amt">${fmt(result.homeCompensation.equityIncome, cur)}</td></tr>` : ''}
      <tr class="total-row"><td>Total Gross Compensation</td><td class="amt">${fmt(result.homeCompensation.totalGross, cur)}</td></tr>
    </table>
  </div>

  <!-- Split-Sourcing Analysis -->
  <div class="section">
    <h2 class="section-title">Split-Sourcing Analysis</h2>
    <table>
      <thead>
        <tr><th>Component</th><th>Total Amount</th><th>Period Days</th><th>Host Overlap</th><th>Host Ratio</th><th>Host-Taxable</th></tr>
      </thead>
      <tbody>
        ${result.homeCompensation.annualBonus > 0 ? `
        <tr>
          <td>Bonus<br><span style="font-size:10px;color:#94a3b8">${input.bonusPerformancePeriodStart || 'N/A'} to ${input.bonusPerformancePeriodEnd || 'N/A'}</span></td>
          <td class="amt">${fmt(result.homeCompensation.annualBonus, cur)}</td>
          <td class="amt">${ss.bonus.performancePeriodDays}</td>
          <td class="amt">${ss.bonus.overlapDays}</td>
          <td class="amt">${(ss.bonus.hostRatio * 100).toFixed(2)}%</td>
          <td class="amt" style="font-weight:600">${fmt(ss.bonus.hostTaxableAmount, cur)}</td>
        </tr>` : ''}
        ${result.homeCompensation.equityIncome > 0 ? `
        <tr>
          <td>Equity (${input.equityType.toUpperCase()})<br><span style="font-size:10px;color:#94a3b8">${input.equityVestingStart || 'N/A'} to ${input.equityVestingEnd || 'N/A'}</span></td>
          <td class="amt">${fmt(result.homeCompensation.equityIncome, cur)}</td>
          <td class="amt">${ss.equity.vestingPeriodDays}</td>
          <td class="amt">${ss.equity.overlapDays}</td>
          <td class="amt">${(ss.equity.hostRatio * 100).toFixed(2)}%</td>
          <td class="amt" style="font-weight:600">${fmt(ss.equity.hostTaxableAmount, cur)}</td>
        </tr>` : ''}
      </tbody>
    </table>
    <p style="font-size:10px;color:#94a3b8;margin-top:8px">Bonus sourced on calendar-year workday basis per IRC &sect;861 / HMRC practice. Equity split-sourced by day-count during vesting period per ITEPA 2003 Part 7 / IRC &sect;861.</p>
  </div>

  <!-- Tax Comparison -->
  <div class="section">
    <h2 class="section-title">Tax Comparison</h2>
    <table>
      <thead><tr><th></th><th>Home (${homeCountry?.name})</th><th>Host (${hostCountry?.name})</th><th>Hypothetical</th></tr></thead>
      <tbody>
        <tr><td>Gross Income</td><td class="amt">${fmt(result.homeTax.grossIncome, cur)}</td><td class="amt">${fmt(result.hostTax.grossIncome, cur)}</td><td class="amt">${fmt(result.hypoTax.grossIncome, cur)}</td></tr>
        <tr><td>Deductions</td><td class="amt">${fmt(result.homeTax.deductions, cur)}</td><td class="amt">${fmt(result.hostTax.deductions, cur)}</td><td class="amt">${fmt(result.hypoTax.deductions, cur)}</td></tr>
        <tr><td>Taxable Income</td><td class="amt">${fmt(result.homeTax.taxableIncome, cur)}</td><td class="amt">${fmt(result.hostTax.taxableIncome, cur)}</td><td class="amt">${fmt(result.hypoTax.taxableIncome, cur)}</td></tr>
        <tr><td>Federal / National Tax</td><td class="amt">${fmt(result.homeTax.federalTax, cur)}</td><td class="amt">${fmt(result.hostTax.federalTax, cur)}</td><td class="amt">${fmt(result.hypoTax.federalTax, cur)}</td></tr>
        <tr><td>State / Regional Tax</td><td class="amt">${fmt(result.homeTax.stateTax, cur)}</td><td class="amt">${fmt(result.hostTax.stateTax, cur)}</td><td class="amt">${fmt(result.hypoTax.stateTax, cur)}</td></tr>
        <tr><td>Local Tax</td><td class="amt">${fmt(result.homeTax.localTax, cur)}</td><td class="amt">${fmt(result.hostTax.localTax, cur)}</td><td class="amt">${fmt(result.hypoTax.localTax, cur)}</td></tr>
        <tr><td>Child Credits</td><td class="amt">${fmt(result.homeTax.childCredits, cur)}</td><td class="amt">${fmt(result.hostTax.childCredits, cur)}</td><td class="amt">${fmt(result.hypoTax.childCredits, cur)}</td></tr>
        <tr class="total-row"><td>Total Income Tax</td><td class="amt">${fmt(result.homeTax.totalIncomeTax, cur)}</td><td class="amt">${fmt(result.hostTax.totalIncomeTax, cur)}</td><td class="amt">${fmt(result.hypoTax.totalIncomeTax, cur)}</td></tr>
        <tr><td>Effective Rate</td><td class="amt">${(result.homeTax.effectiveRate * 100).toFixed(1)}%</td><td class="amt">${(result.hostTax.effectiveRate * 100).toFixed(1)}%</td><td class="amt">${(result.hypoTax.effectiveRate * 100).toFixed(1)}%</td></tr>
        <tr style="height:8px"><td colspan="4"></td></tr>
        <tr><td>SS Employee</td><td class="amt">${fmt(result.homeTax.ssEmployee, cur)}</td><td class="amt">${fmt(result.hostTax.ssEmployee, cur)}</td><td class="amt">${fmt(result.hypoTax.ssEmployee, cur)}</td></tr>
        <tr><td>SS Employer</td><td class="amt">${fmt(result.homeTax.ssEmployer, cur)}</td><td class="amt">${fmt(result.hostTax.ssEmployer, cur)}</td><td class="amt">&mdash;</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Employee Balance Sheet -->
  <div class="section">
    <h2 class="section-title">Employee Balance Sheet</h2>
    <table>
      <tr><td>Total Gross Compensation</td><td class="amt" style="font-weight:600">${fmt(bs.homeGross, cur)}</td></tr>
      <tr><td class="indent">Base Salary</td><td class="amt">${fmt(result.homeCompensation.baseSalary, cur)}</td></tr>
      <tr><td class="indent">Annual Bonus</td><td class="amt">${fmt(result.homeCompensation.annualBonus, cur)}</td></tr>
      ${result.homeCompensation.equityIncome > 0 ? `<tr><td class="indent">Equity Income</td><td class="amt">${fmt(result.homeCompensation.equityIncome, cur)}</td></tr>` : ''}
      <tr><td>Less: Hypothetical Tax</td><td class="amt neg">(${fmt(bs.hypoTax, cur)})</td></tr>
      <tr><td>Less: Hypothetical Social Security</td><td class="amt neg">(${fmt(bs.hypoSS, cur)})</td></tr>
      <tr class="total-row" style="background:#f0fafb"><td style="font-weight:700">Net Home Compensation</td><td class="amt" style="font-weight:700;color:#40AEBC">${fmt(bs.netHomeComp, cur)}</td></tr>
      <tr><td>Plus: Host Allowances</td><td class="amt" style="color:#059669">${fmt(bs.hostAllowances, cur)}</td></tr>
      <tr class="grand-total"><td>Total Host Package Value</td><td class="amt">${fmt(bs.totalHostPackage, cur)}</td></tr>
    </table>
  </div>

  <!-- Total Cost Breakdown -->
  <div class="section">
    <h2 class="section-title">Total Estimated Cost Breakdown</h2>
    <table>
      <thead><tr><th>Category</th><th>Annual Amount</th><th>% of Total</th></tr></thead>
      <tbody>
        <tr><td colspan="3" style="font-size:10px;font-weight:600;color:#40AEBC;padding-top:6px">RECURRING ANNUAL</td></tr>
        ${recurringRows}
        ${oneOffRows.length > 0 ? `<tr><td colspan="3" style="font-size:10px;font-weight:600;color:#94a3b8;padding-top:6px">ONE-OFF (ANNUALISED OVER ${input.durationMonths} MONTHS)</td></tr>${oneOffRows}` : ''}
        <tr class="grand-total"><td>TOTAL ESTIMATED ANNUAL COST</td><td class="amt">${fmt(result.totalEstimatedCost, cur)}</td><td class="amt pct">100%</td></tr>
        <tr><td>Monthly Cost</td><td class="amt">${fmt(result.monthlyCost, cur)}</td><td></td></tr>
        <tr><td>Duration Total (${input.durationMonths} months)</td><td class="amt" style="font-weight:600">${fmt(result.totalEstimatedCost * (input.durationMonths / 12), cur)}</td><td></td></tr>
      </tbody>
    </table>
  </div>

  <!-- Assumptions -->
  <div class="section">
    <h2 class="section-title">Assumptions & Methodology</h2>
    <table>
      <tbody>
        <tr><td class="label">Tax Year</td><td>${taxYear}</td></tr>
        <tr><td class="label">Filing Status</td><td>${filingStatus}</td></tr>
        <tr><td class="label">Tax Equalisation</td><td>${input.hypoTaxPhilosophy === 'taxEqualization' ? 'Yes - employee bears no more/less tax than if they stayed at home' : input.hypoTaxPhilosophy === 'taxProtection' ? 'Tax Protection - employee bears no more than home tax' : 'Stay-at-Home basis'}</td></tr>
        <tr><td class="label">Social Security</td><td>${input.ssStrategy === 'home' ? 'Home country only (A1/Certificate of Coverage assumed)' : input.ssStrategy === 'host' ? 'Host country only' : 'Dual liability (both countries)'}</td></tr>
        <tr><td class="label">Bonus Sourcing</td><td>Calendar-year workday allocation per IRC &sect;861 / HMRC practice</td></tr>
        <tr><td class="label">Equity Sourcing</td><td>Day-count during vesting period per ITEPA 2003 Part 7 / IRC &sect;861</td></tr>
        <tr><td class="label">Exchange Rate</td><td>Tax brackets applied in local currency via FX conversion (reporting: ${cur})</td></tr>
        <tr><td class="label">One-off Costs</td><td>Immigration and relocation costs are one-off; shown annualised in breakdown</td></tr>
        <tr><td class="label">Tax Data Sources</td><td>IRS Rev. Proc. 2024-40 (US 2025); HMRC 2025/26 rates; EStG &sect;32a (DE 2024)</td></tr>
      </tbody>
    </table>
  </div>

  <div class="disclaimer">
    <p><strong>IMPORTANT:</strong> This cost estimate is for illustration purposes only and does not constitute tax, legal, or financial advice.
    Actual costs will vary based on exchange rates, legislative changes, individual circumstances, payroll timing, and treaty positions.
    All figures should be verified by a qualified tax adviser before use in any business case or client communication.</p>
    <p style="margin-top:6px">Prepared by: The Cozm Ltd | Date: ${today} | Status: Draft - For Review</p>
    <p style="margin-top:4px;font-weight:600;color:#40AEBC">The Cozm Ltd &mdash; www.thecozm.com</p>
  </div>

</div>
</body>
</html>`;
}

// ── Case 1: US → UK ──
const case1: EstimateInput = {
  estimateName: 'Case 1: US → UK (London)',
  startDate: '2026-01-01',
  durationMonths: 36,
  projectionYears: 3,
  homeCountryCode: 'US',
  homeCityCode: 'NYC',
  hostCountryCode: 'GB',
  hostCityCode: 'LON',
  currency: 'USD',
  baseSalary: 85000,
  annualBonus: 8000,
  bonusType: 'fixed',
  bonusPercentage: 0,
  equityIncome: 20000,
  equityType: 'rsu',
  equityVestingSchedule: 'annual',
  familyStatus: 'married_children',
  numChildren: 2,
  assignmentType: 'longTerm',
  benefits: getDefaultBenefits(),
  hypoTaxPhilosophy: 'taxEqualization',
  ssStrategy: 'home',
  bonusPerformancePeriodStart: '2026-01-01',
  bonusPerformancePeriodEnd: '2026-12-31',
  equityVestingStart: '2024-04-06',
  equityVestingEnd: '2027-04-05',
};

// ── Case 2: DE → US ──
const case2: EstimateInput = {
  estimateName: 'Case 2: DE → US (NYC)',
  startDate: '2026-01-01',
  durationMonths: 36,
  projectionYears: 3,
  homeCountryCode: 'DE',
  homeCityCode: 'BER',
  hostCountryCode: 'US',
  hostCityCode: 'NYC',
  currency: 'EUR',
  baseSalary: 75000,
  annualBonus: 10000,
  bonusType: 'fixed',
  bonusPercentage: 0,
  equityIncome: 15000,
  equityType: 'rsu',
  equityVestingSchedule: 'annual',
  familyStatus: 'married_children',
  numChildren: 1,
  assignmentType: 'longTerm',
  benefits: getDefaultBenefits(),
  hypoTaxPhilosophy: 'taxEqualization',
  ssStrategy: 'home',
  bonusPerformancePeriodStart: '2026-01-01',
  bonusPerformancePeriodEnd: '2026-12-31',
  equityVestingStart: '2024-04-06',
  equityVestingEnd: '2027-04-05',
};

const html1 = generateReport(case1, 'Case 1: US \u2192 UK');
const html2 = generateReport(case2, 'Case 2: DE \u2192 US');

fs.writeFileSync('report-case1-us-to-uk.html', html1);
fs.writeFileSync('report-case2-de-to-us.html', html2);

console.log('Reports generated:');
console.log('  report-case1-us-to-uk.html');
console.log('  report-case2-de-to-us.html');
console.log('Open in browser and print to PDF (Cmd+P).');
