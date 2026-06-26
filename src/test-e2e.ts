// End-to-end test of the cost estimate engine
// Run with: npx tsx src/test-e2e.ts

import type { EstimateInput } from './types';
import { getDefaultBenefits } from './data/benefits';
import { computeEstimate } from './engine/costEstimate';
import { countries, getCountry, getCity } from './data/countries';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  FAIL: ${msg}`);
    failed++;
  }
}

function assertRange(value: number, min: number, max: number, msg: string) {
  assert(value >= min && value <= max, `${msg} (${value} in [${min}, ${max}])`);
}

// ── Test 1: Basic GB → US estimate with all three comp components ──
console.log('\n=== Test 1: GB → US with Base + Bonus + Equity ===');
{
  const input: EstimateInput = {
    estimateName: 'Test Case 1',
    startDate: '2026-01-01',
    durationMonths: 24,
    projectionYears: 2,
    homeCountryCode: 'GB',
    homeCityCode: 'LON',
    hostCountryCode: 'US',
    hostCityCode: 'NYC',
    currency: 'USD',
    baseSalary: 120000,
    annualBonus: 25000,
    bonusType: 'fixed',
    bonusPercentage: 15,
    equityIncome: 30000,
    equityType: 'rsu',
    equityVestingSchedule: 'annual',
    familyStatus: 'single',
    numChildren: 0,
    assignmentType: 'longTerm',
    benefits: getDefaultBenefits(),
    hypoTaxPhilosophy: 'taxEqualization',
    ssStrategy: 'home',
  };

  const result = computeEstimate(input);
  assert(result !== null, 'Result is not null');

  if (result) {
    // Compensation
    assert(result.homeCompensation.baseSalary === 120000, 'Base salary = 120000');
    assert(result.homeCompensation.annualBonus === 25000, 'Annual bonus = 25000');
    assert(result.homeCompensation.equityIncome === 30000, 'Equity income = 30000');
    assert(result.homeCompensation.totalGross === 175000, 'Total gross = 175000 (base + bonus + equity)');

    // Tax calculations exist and are positive
    assert(result.homeTax.totalIncomeTax > 0, 'Home tax > 0');
    assert(result.hostTax.totalIncomeTax > 0, 'Host tax > 0');
    assert(result.hypoTax.totalIncomeTax > 0, 'Hypo tax > 0');
    assert(result.homeTax.effectiveRate > 0 && result.homeTax.effectiveRate < 1, 'Home effective rate is valid');
    assert(result.hostTax.effectiveRate > 0 && result.hostTax.effectiveRate < 1, 'Host effective rate is valid');

    // Social security
    assert(result.homeTax.ssEmployee > 0, 'Home SS (EE) > 0');
    assert(result.homeTax.ssEmployer > 0, 'Home SS (ER) > 0');
    assert(result.hostTax.ssEmployee > 0, 'Host SS (EE) > 0');

    // Benefits
    assert(result.benefits.totalAllowances > 0, 'Total allowances > 0');
    assert(result.benefits.housing > 0, 'Housing > 0 (NYC)');
    assert(result.benefits.homeLeave > 0, 'Home leave > 0');
    assert(result.benefits.immigration > 0, 'Immigration > 0');

    // Gross-up
    assert(result.grossUp.totalGrossUp > 0, 'Gross-up > 0');

    // Balance sheet
    assert(result.balanceSheet.homeGross === 175000, 'Balance sheet homeGross = totalGrossComp (base + bonus + equity)');
    assert(result.balanceSheet.hypoTax > 0, 'Balance sheet hypoTax > 0');
    assert(result.balanceSheet.netHomeComp > 0, 'Net home comp > 0');
    assert(result.balanceSheet.netHomeComp < result.balanceSheet.homeGross, 'Net < gross');
    assert(result.balanceSheet.totalHostPackage > result.balanceSheet.netHomeComp, 'Host package > net home comp');

    // Total cost
    assert(result.totalEstimatedCost > 0, 'Total estimated cost > 0');
    assertRange(result.totalEstimatedCost, 200000, 500000, 'Total cost in reasonable range for GB→US');
    assert(result.monthlyCost === result.annualCost / 12, 'Monthly = annual / 12');

    // Cost breakdown
    assert(result.costBreakdown.length > 0, 'Cost breakdown has items');
    const categories = result.costBreakdown.map(c => c.category);
    assert(categories.includes('Base Salary'), 'Breakdown has Base Salary');
    assert(categories.includes('Annual Bonus'), 'Breakdown has Annual Bonus');
    assert(categories.includes('Equity Income'), 'Breakdown has Equity Income');
    assert(categories.includes('Housing'), 'Breakdown has Housing');
    assert(categories.includes('Gross-up'), 'Breakdown has Gross-up');

    // Percentages sum to ~100
    const totalPct = result.costBreakdown.reduce((s, c) => s + c.percentage, 0);
    assertRange(totalPct, 99, 101, 'Breakdown percentages sum to ~100%');

    console.log(`  Total cost: $${result.totalEstimatedCost.toLocaleString()}`);
  }
}

// ── Test 2: Bonus as percentage ──
console.log('\n=== Test 2: Bonus as % of Base ===');
{
  const input: EstimateInput = {
    estimateName: 'Test Pct Bonus',
    startDate: '2026-01-01',
    durationMonths: 12,
    projectionYears: 1,
    homeCountryCode: 'US',
    homeCityCode: 'NYC',
    hostCountryCode: 'GB',
    hostCityCode: 'LON',
    currency: 'GBP',
    baseSalary: 200000,
    annualBonus: 0,
    bonusType: 'percentage',
    bonusPercentage: 20,
    equityIncome: 0,
    equityType: 'rsu',
    equityVestingSchedule: 'annual',
    familyStatus: 'married',
    numChildren: 0,
    assignmentType: 'shortTerm',
    benefits: getDefaultBenefits(),
    hypoTaxPhilosophy: 'taxProtection',
    ssStrategy: 'host',
  };

  const result = computeEstimate(input);
  assert(result !== null, 'Result is not null');

  if (result) {
    assert(result.homeCompensation.annualBonus === 40000, 'Bonus = 20% of 200k = 40000');
    assert(result.homeCompensation.baseSalary === 200000, 'Base = 200000');
    assert(result.homeCompensation.equityIncome === 0, 'Equity = 0 when not set');
    assert(result.homeCompensation.totalGross === 240000, 'Total = 240000');

    // No equity in breakdown
    const categories = result.costBreakdown.map(c => c.category);
    assert(!categories.includes('Equity Income'), 'No equity in breakdown when equity = 0');

    console.log(`  Total cost: £${result.totalEstimatedCost.toLocaleString()}`);
  }
}

// ── Test 3: Zero compensation edge case ──
console.log('\n=== Test 3: Zero Compensation Edge Case ===');
{
  const input: EstimateInput = {
    estimateName: 'Zero Test',
    startDate: '2026-01-01',
    durationMonths: 12,
    projectionYears: 1,
    homeCountryCode: 'GB',
    homeCityCode: 'LON',
    hostCountryCode: 'DE',
    hostCityCode: 'BER',
    currency: 'EUR',
    baseSalary: 0,
    annualBonus: 0,
    bonusType: 'fixed',
    bonusPercentage: 0,
    equityIncome: 0,
    equityType: 'rsu',
    equityVestingSchedule: 'annual',
    familyStatus: 'single',
    numChildren: 0,
    assignmentType: 'longTerm',
    benefits: getDefaultBenefits(),
    hypoTaxPhilosophy: 'taxEqualization',
    ssStrategy: 'home',
  };

  const result = computeEstimate(input);
  assert(result !== null, 'Result is not null even with zero comp');
  if (result) {
    assert(result.homeCompensation.totalGross === 0, 'Total gross = 0');
    assert(result.homeTax.totalIncomeTax === 0, 'Home tax = 0');
    assert(isFinite(result.totalEstimatedCost), 'Total cost is finite');
    assert(!isNaN(result.totalEstimatedCost), 'Total cost is not NaN');
    console.log(`  Total cost: €${result.totalEstimatedCost.toLocaleString()}`);
  }
}

// ── Test 4: Family with children ──
console.log('\n=== Test 4: Family with Children (US → US, child credits) ===');
{
  const benefits = getDefaultBenefits();
  benefits.includeSchooling.enabled = true;
  benefits.includeSchooling.annualAmount = 35000;

  const input: EstimateInput = {
    estimateName: 'Family Test',
    startDate: '2026-01-01',
    durationMonths: 36,
    projectionYears: 3,
    homeCountryCode: 'US',
    homeCityCode: 'NYC',
    hostCountryCode: 'US',
    hostCityCode: 'SFO',
    currency: 'USD',
    baseSalary: 180000,
    annualBonus: 30000,
    bonusType: 'fixed',
    bonusPercentage: 0,
    equityIncome: 50000,
    equityType: 'rsu',
    equityVestingSchedule: 'quarterly',
    familyStatus: 'married_children',
    numChildren: 2,
    assignmentType: 'longTerm',
    benefits,
    hypoTaxPhilosophy: 'taxEqualization',
    ssStrategy: 'home',
  };

  const result = computeEstimate(input);
  assert(result !== null, 'Result is not null');

  if (result) {
    assert(result.homeCompensation.equityIncome === 50000, 'Equity = 50000');
    assert(result.benefits.education === 35000, 'Schooling = 35000 (2 children)');
    assert(result.homeTax.childCredits > 0, 'Child credits applied');
    assert(result.homeTax.childCredits === 4000, 'Child credits = 2 * $2000 = $4000');

    const categories = result.costBreakdown.map(c => c.category);
    assert(categories.includes('Education'), 'Breakdown includes Education');
    assert(categories.includes('Equity Income'), 'Breakdown includes Equity Income');

    console.log(`  Total cost: $${result.totalEstimatedCost.toLocaleString()}`);
    console.log(`  Child credits: $${result.homeTax.childCredits}`);
  }
}

// ── Test 5: All countries have valid data ──
console.log('\n=== Test 5: All Countries Produce Valid Estimates ===');
{
  for (const country of countries) {
    const city = country.cities[0];
    assert(city !== undefined, `${country.name} has at least one city`);

    const c = getCountry(country.code);
    assert(c !== undefined, `getCountry(${country.code}) works`);

    const ci = getCity(country.code, city.code);
    assert(ci !== undefined, `getCity(${country.code}, ${city.code}) works`);

    const input: EstimateInput = {
      estimateName: `Test ${country.name}`,
      startDate: '2026-01-01',
      durationMonths: 12,
      projectionYears: 1,
      homeCountryCode: 'GB',
      homeCityCode: 'LON',
      hostCountryCode: country.code,
      hostCityCode: city.code,
      currency: 'USD',
      baseSalary: 100000,
      annualBonus: 15000,
      bonusType: 'fixed',
      bonusPercentage: 0,
      equityIncome: 20000,
      equityType: 'rsu',
      equityVestingSchedule: 'annual',
      familyStatus: 'single',
      numChildren: 0,
      assignmentType: 'longTerm',
      benefits: getDefaultBenefits(),
      hypoTaxPhilosophy: 'taxEqualization',
      ssStrategy: 'home',
    };

    const result = computeEstimate(input);
    assert(result !== null, `${country.name}: estimate not null`);
    if (result) {
      assert(result.totalEstimatedCost > 0, `${country.name}: total cost > 0`);
      assert(isFinite(result.totalEstimatedCost), `${country.name}: total cost is finite`);
      assert(!isNaN(result.totalEstimatedCost), `${country.name}: total cost is not NaN`);
    }
  }
}

// ── Test 6: Equity types don't break calculation ──
console.log('\n=== Test 6: All Equity Types ===');
{
  for (const eqType of ['rsu', 'options', 'espp', 'phantom'] as const) {
    const input: EstimateInput = {
      estimateName: `Equity ${eqType}`,
      startDate: '2026-01-01',
      durationMonths: 24,
      projectionYears: 2,
      homeCountryCode: 'US',
      homeCityCode: 'NYC',
      hostCountryCode: 'GB',
      hostCityCode: 'LON',
      currency: 'USD',
      baseSalary: 150000,
      annualBonus: 20000,
      bonusType: 'fixed',
      bonusPercentage: 0,
      equityIncome: 40000,
      equityType: eqType,
      equityVestingSchedule: 'annual',
      familyStatus: 'single',
      numChildren: 0,
      assignmentType: 'longTerm',
      benefits: getDefaultBenefits(),
      hypoTaxPhilosophy: 'taxEqualization',
      ssStrategy: 'home',
    };

    const result = computeEstimate(input);
    assert(result !== null, `${eqType}: estimate not null`);
    if (result) {
      assert(result.homeCompensation.equityIncome === 40000, `${eqType}: equity = 40000`);
      assert(result.totalEstimatedCost > 0, `${eqType}: total cost > 0`);
    }
  }
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
