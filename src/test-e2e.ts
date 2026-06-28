// End-to-end test of the cost estimate engine
// Run with: npx tsx src/test-e2e.ts

import type { EstimateInput } from './types';
import { getDefaultBenefits } from './data/benefits';
import { computeEstimate } from './engine/costEstimate';
import { countries, getCountry, getCity } from './data/countries';
import { calculateTax, calculateBracketSS } from './engine/tax';

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
    assert(result.benefits.assignmentAllowances > 0, 'Assignment allowances > 0');
    assert(result.benefits.assignmentAllowances <= result.benefits.totalAllowances, 'Assignment allowances <= total (excl one-offs)');
    assert(result.benefits.housing > 0, 'Housing > 0 (NYC)');
    assert(result.benefits.homeLeave > 0, 'Home leave > 0');
    assert(result.benefits.immigration > 0, 'Immigration > 0');

    // Host tax on comp split
    assert(result.hostTaxOnComp > 0, 'Host tax on comp > 0');

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

    // Verify defaultFxToUSD exists and is positive
    assert(country.defaultFxToUSD > 0, `${country.name} has positive defaultFxToUSD (${country.defaultFxToUSD})`);

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

// ── Test 7: Case 1 — US → UK (London) Split-Sourcing ──
console.log('\n=== Test 7: US → UK Split-Sourcing (Case 1) ===');
{
  const benefits = getDefaultBenefits();
  const input: EstimateInput = {
    estimateName: 'Case 1: US → UK',
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
    benefits,
    hypoTaxPhilosophy: 'taxEqualization',
    ssStrategy: 'home',
    bonusPerformancePeriodStart: '2026-01-01',
    bonusPerformancePeriodEnd: '2026-12-31',
    equityVestingStart: '2024-04-06',
    equityVestingEnd: '2027-04-05',
  };

  const result = computeEstimate(input);
  assert(result !== null, 'Case 1: Result is not null');

  if (result) {
    const ss = result.splitSourcing;

    // Bonus: 365/365 = 100%
    assert(ss.bonus.performancePeriodDays === 365, `Case 1: Bonus period = 365 days (got ${ss.bonus.performancePeriodDays})`);
    assert(ss.bonus.overlapDays === 365, `Case 1: Bonus overlap = 365 days (got ${ss.bonus.overlapDays})`);
    assertRange(ss.bonus.hostRatio, 0.99, 1.01, 'Case 1: Bonus host ratio = 100%');
    assert(ss.bonus.hostTaxableAmount === 8000, `Case 1: Bonus host-taxable = $8,000 (got ${ss.bonus.hostTaxableAmount})`);

    // Equity: 460/1095 = 42.01%
    assert(ss.equity.vestingPeriodDays === 1095, `Case 1: Equity vesting days = 1095 (got ${ss.equity.vestingPeriodDays})`);
    assert(ss.equity.overlapDays === 460, `Case 1: Equity overlap = 460 days (got ${ss.equity.overlapDays})`);
    assertRange(ss.equity.hostRatio, 0.4195, 0.4210, 'Case 1: Equity host ratio ≈ 42.01%');
    assertRange(ss.equity.hostTaxableAmount, 8399, 8405, `Case 1: Equity host-taxable ≈ $8,402 (got ${ss.equity.hostTaxableAmount})`);

    // Tax calculations should use split-sourced amounts
    assert(result.hostTax.grossIncome > 0, 'Case 1: Host tax calculated');
    assert(result.totalEstimatedCost > 0, 'Case 1: Total cost > 0');

    console.log(`  Bonus host ratio: ${(ss.bonus.hostRatio * 100).toFixed(2)}%`);
    console.log(`  Equity host ratio: ${(ss.equity.hostRatio * 100).toFixed(2)}%`);
    console.log(`  Equity host-taxable: $${ss.equity.hostTaxableAmount}`);
    console.log(`  Total cost: $${result.totalEstimatedCost.toLocaleString()}`);
  }
}

// ── Test 8: Case 2 — DE → US (NYC) Split-Sourcing ──
console.log('\n=== Test 8: DE → US Split-Sourcing (Case 2) ===');
{
  const benefits = getDefaultBenefits();
  const input: EstimateInput = {
    estimateName: 'Case 2: DE → US',
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
    benefits,
    hypoTaxPhilosophy: 'taxEqualization',
    ssStrategy: 'home',
    bonusPerformancePeriodStart: '2026-01-01',
    bonusPerformancePeriodEnd: '2026-12-31',
    equityVestingStart: '2024-04-06',
    equityVestingEnd: '2027-04-05',
  };

  const result = computeEstimate(input);
  assert(result !== null, 'Case 2: Result is not null');

  if (result) {
    const ss = result.splitSourcing;

    // Bonus: 365/365 = 100%
    assert(ss.bonus.performancePeriodDays === 365, `Case 2: Bonus period = 365 days (got ${ss.bonus.performancePeriodDays})`);
    assert(ss.bonus.overlapDays === 365, `Case 2: Bonus overlap = 365 days (got ${ss.bonus.overlapDays})`);
    assertRange(ss.bonus.hostRatio, 0.99, 1.01, 'Case 2: Bonus host ratio = 100%');
    assert(ss.bonus.hostTaxableAmount === 10000, `Case 2: Bonus host-taxable = €10,000 (got ${ss.bonus.hostTaxableAmount})`);

    // Equity: 460/1095 = 42.01%
    assert(ss.equity.vestingPeriodDays === 1095, `Case 2: Equity vesting days = 1095 (got ${ss.equity.vestingPeriodDays})`);
    assert(ss.equity.overlapDays === 460, `Case 2: Equity overlap = 460 days (got ${ss.equity.overlapDays})`);
    assertRange(ss.equity.hostRatio, 0.4195, 0.4210, 'Case 2: Equity host ratio ≈ 42.01%');
    assertRange(ss.equity.hostTaxableAmount, 6298, 6305, `Case 2: Equity host-taxable ≈ €6,301 (got ${ss.equity.hostTaxableAmount})`);

    // Tax calculations should use split-sourced amounts
    assert(result.hostTax.grossIncome > 0, 'Case 2: Host tax calculated');
    assert(result.totalEstimatedCost > 0, 'Case 2: Total cost > 0');

    console.log(`  Bonus host ratio: ${(ss.bonus.hostRatio * 100).toFixed(2)}%`);
    console.log(`  Equity host ratio: ${(ss.equity.hostRatio * 100).toFixed(2)}%`);
    console.log(`  Equity host-taxable: €${ss.equity.hostTaxableAmount}`);
    console.log(`  Total cost: €${result.totalEstimatedCost.toLocaleString()}`);
  }
}

// ── Test 9: UK NIC bracket-based calculation ──
console.log('\n=== Test 9: UK NIC Bracket-Based Calculation (G5) ===');
{
  const uk = getCountry('GB')!;
  assert(uk.ssBrackets !== undefined, 'UK has ssBrackets defined');

  // Test at £132,000 income
  const income = 132000;

  // Employee NIC: 8% on £12,570–£50,270 + 2% above £50,270
  const eeNIC = calculateBracketSS(income, uk.ssBrackets!.employee);
  const expectedEE = (50270 - 12570) * 0.08 + (132000 - 50270) * 0.02; // 3016 + 1634.60 = 4650.60
  assertRange(eeNIC, 4649, 4652, `UK EE NIC on £132k ≈ £4,651 (got ${eeNIC.toFixed(2)})`);

  // Employer NIC: 13.8% above £9,100
  const erNIC = calculateBracketSS(income, uk.ssBrackets!.employer);
  const expectedER = (132000 - 9100) * 0.138; // 16960.20
  assertRange(erNIC, 16959, 16962, `UK ER NIC on £132k ≈ £16,960 (got ${erNIC.toFixed(2)})`);

  // Verify via full tax calculation
  const taxResult = calculateTax(income, uk, 0, 0, 0, false);
  assertRange(taxResult.ssEmployee, 4649, 4652, `Full tax calc: UK EE NIC ≈ £4,651 (got ${taxResult.ssEmployee.toFixed(2)})`);
  assertRange(taxResult.ssEmployer, 16959, 16962, `Full tax calc: UK ER NIC ≈ £16,960 (got ${taxResult.ssEmployer.toFixed(2)})`);

  console.log(`  EE NIC: £${eeNIC.toFixed(2)} (expected ≈ £${expectedEE.toFixed(2)})`);
  console.log(`  ER NIC: £${erNIC.toFixed(2)} (expected ≈ £${expectedER.toFixed(2)})`);
}

// ── Test 10: FX conversion — UK tax on USD income ──
console.log('\n=== Test 10: FX Conversion — GB→US, $175k income (G4) ===');
{
  const input: EstimateInput = {
    estimateName: 'FX Test',
    startDate: '2026-01-01',
    durationMonths: 24,
    projectionYears: 2,
    homeCountryCode: 'GB',
    homeCityCode: 'LON',
    hostCountryCode: 'US',
    hostCityCode: 'NYC',
    currency: 'USD',
    baseSalary: 175000,
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
  assert(result !== null, 'FX test: Result is not null');

  if (result) {
    // Home is GB, currency is USD, FX = 1.27
    // $175k / 1.27 = £137,795 → apply UK brackets in GBP → convert back
    const localIncome = 175000 / 1.27;
    console.log(`  Local GBP income: £${localIncome.toFixed(0)}`);

    // Hypo tax should be based on £137,795 through UK brackets, then converted to USD
    assert(result.hypoTax.totalIncomeTax > 0, 'FX: Hypo tax > 0');

    // The hypo tax in USD should be roughly: UK tax on £137,795 * 1.27
    // UK tax on ~£137,795: PA tapering kicks in at £100k, so PA reduced significantly
    // This is a complex calc, just verify it's in a reasonable range for USD
    assertRange(result.hypoTax.totalIncomeTax, 30000, 80000, 'FX: Hypo tax in reasonable USD range');

    // Host tax should be US tax on $175k (no FX needed since host = US and currency = USD)
    assert(result.hostTax.totalIncomeTax > 0, 'FX: Host tax > 0');

    console.log(`  Hypo tax (USD): $${result.hypoTax.totalIncomeTax.toFixed(0)}`);
    console.log(`  Host tax (USD): $${result.hostTax.totalIncomeTax.toFixed(0)}`);
    console.log(`  Home EE SS (USD): $${result.homeTax.ssEmployee.toFixed(0)}`);
    console.log(`  Home ER SS (USD): $${result.homeTax.ssEmployer.toFixed(0)}`);
  }
}

// ── Test 11: One-off payment marginal tax ──
console.log('\n=== Test 11: One-off Payment Marginal Tax (G9) ===');
{
  const input: EstimateInput = {
    estimateName: 'One-off Test',
    startDate: '2026-01-01',
    durationMonths: 24,
    projectionYears: 2,
    homeCountryCode: 'GB',
    homeCityCode: 'LON',
    hostCountryCode: 'US',
    hostCityCode: 'NYC',
    currency: 'USD',
    baseSalary: 175000,
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
    oneOffPayment: 50000,
  };

  const result = computeEstimate(input);
  assert(result !== null, 'One-off: Result is not null');

  if (result) {
    assert(result.oneOffAnalysis !== undefined, 'One-off: analysis present');
    if (result.oneOffAnalysis) {
      assert(result.oneOffAnalysis.payment === 50000, 'One-off: payment = 50000');
      assert(result.oneOffAnalysis.hypoTax > 0, 'One-off: hypo tax > 0');
      assert(result.oneOffAnalysis.hypoSS >= 0, 'One-off: hypo SS >= 0');
      assert(result.oneOffAnalysis.netToEmployee > 0, 'One-off: net to employee > 0');
      assert(result.oneOffAnalysis.netToEmployee < 50000, 'One-off: net < payment (after hypo deduction)');
      assert(result.oneOffAnalysis.hostTaxGrossUp > 0, 'One-off: host tax gross-up > 0');
      assert(result.oneOffAnalysis.marginalRate > 0 && result.oneOffAnalysis.marginalRate < 1, 'One-off: marginal rate valid');
      assert(result.oneOffAnalysis.totalCost > 0, 'One-off: total cost > 0');

      console.log(`  Payment: $${result.oneOffAnalysis.payment}`);
      console.log(`  Hypo tax: $${result.oneOffAnalysis.hypoTax.toFixed(0)}`);
      console.log(`  Hypo EE SS: $${result.oneOffAnalysis.hypoSS.toFixed(0)}`);
      console.log(`  Net to employee: $${result.oneOffAnalysis.netToEmployee.toFixed(0)}`);
      console.log(`  Host tax gross-up: $${result.oneOffAnalysis.hostTaxGrossUp.toFixed(0)}`);
      console.log(`  Employer SS: $${result.oneOffAnalysis.employerSS.toFixed(0)}`);
      console.log(`  Marginal rate: ${(result.oneOffAnalysis.marginalRate * 100).toFixed(1)}%`);
      console.log(`  Total cost: $${result.oneOffAnalysis.totalCost.toFixed(0)}`);
    }
  }
}

// ── Test 12: No one-off when payment is 0 ──
console.log('\n=== Test 12: No One-off Analysis When Payment = 0 ===');
{
  const input: EstimateInput = {
    estimateName: 'No One-off',
    startDate: '2026-01-01',
    durationMonths: 12,
    projectionYears: 1,
    homeCountryCode: 'US',
    homeCityCode: 'NYC',
    hostCountryCode: 'GB',
    hostCityCode: 'LON',
    currency: 'USD',
    baseSalary: 100000,
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
    oneOffPayment: 0,
  };

  const result = computeEstimate(input);
  assert(result !== null, 'No one-off: Result is not null');
  if (result) {
    assert(result.oneOffAnalysis === undefined, 'No one-off: analysis is undefined when payment = 0');
  }
}

// ── Test 13: Same-currency FX = no conversion effect ──
console.log('\n=== Test 13: Same Currency = No FX Effect ===');
{
  // US → US with USD currency should have homeFx = 1.0 and hostFx = 1.0
  const input: EstimateInput = {
    estimateName: 'Same Currency',
    startDate: '2026-01-01',
    durationMonths: 12,
    projectionYears: 1,
    homeCountryCode: 'US',
    homeCityCode: 'NYC',
    hostCountryCode: 'US',
    hostCityCode: 'SFO',
    currency: 'USD',
    baseSalary: 150000,
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
  assert(result !== null, 'Same currency: Result is not null');
  if (result) {
    // Tax should be computed directly on $150k — no FX conversion
    // US federal tax on $150k single: standard deduction $15k, taxable = $135k
    assert(result.homeTax.grossIncome === 150000, `Same currency: grossIncome = 150000 (got ${result.homeTax.grossIncome})`);
    assert(result.homeTax.taxableIncome === 135000, `Same currency: taxableIncome = 135000 (got ${result.homeTax.taxableIncome})`);
    console.log(`  Home tax: $${result.homeTax.totalIncomeTax.toFixed(0)}`);
  }
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);
