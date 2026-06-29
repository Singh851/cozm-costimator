import type { EstimateInput, CostEstimateResult, TaxResult } from '../types';
import { getCountry, getCity, getState, getFxToUSD } from '../data/countries';
import { calculateTax, calculateHypoTax, calculateGrossUp, calculateBracketSS } from './tax';
import { computeSplitSourcing } from './splitSourcing';

function convertTaxResult(result: TaxResult, fxRate: number): TaxResult {
  if (fxRate === 1) return result;
  return {
    grossIncome: result.grossIncome * fxRate,
    federalTax: result.federalTax * fxRate,
    stateTax: result.stateTax * fxRate,
    localTax: result.localTax * fxRate,
    totalIncomeTax: result.totalIncomeTax * fxRate,
    effectiveRate: result.effectiveRate,
    ssEmployee: result.ssEmployee * fxRate,
    ssEmployer: result.ssEmployer * fxRate,
    deductions: result.deductions * fxRate,
    taxableIncome: result.taxableIncome * fxRate,
    childCredits: result.childCredits * fxRate,
    brackets: result.brackets.map(b => ({
      bracket: {
        min: b.bracket.min * fxRate,
        max: b.bracket.max === Infinity ? Infinity : b.bracket.max * fxRate,
        rate: b.bracket.rate,
      },
      taxInBracket: b.taxInBracket * fxRate,
    })),
  };
}

/** Compute employer SS on a given local-currency income, with FX conversion back */
function computeEmployerSS(
  localIncome: number,
  country: Parameters<typeof calculateTax>[1],
  fxRate: number,
): number {
  let ss: number;
  if (country.ssBrackets) {
    ss = calculateBracketSS(localIncome, country.ssBrackets.employer);
  } else {
    const capped = country.ssCap > 0 ? Math.min(localIncome, country.ssCap) : localIncome;
    ss = capped * country.ssEmployerRate;
  }
  if (country.medicareEmployerRate != null) {
    ss += localIncome * country.medicareEmployerRate;
  }
  return ss * fxRate;
}

export function computeEstimate(input: EstimateInput): CostEstimateResult | null {
  const homeCountry = getCountry(input.homeCountryCode);
  const hostCountry = getCountry(input.hostCountryCode);
  const homeCity = getCity(input.homeCountryCode, input.homeCityCode);
  const hostCity = getCity(input.hostCountryCode, input.hostCityCode);

  if (!homeCountry || !hostCountry || !homeCity || !hostCity) return null;

  const homeState = getState(input.homeCountryCode, input.homeCityCode);
  const hostState = getState(input.hostCountryCode, input.hostCityCode);

  // --- FX Rates ---
  const reportingFxToUSD = getFxToUSD(input.currency);
  const defaultHomeFx = homeCountry.defaultFxToUSD / reportingFxToUSD;
  const defaultHostFx = hostCountry.defaultFxToUSD / reportingFxToUSD;
  const homeFx = input.homeExchangeRate ?? defaultHomeFx;
  const hostFx = input.hostExchangeRate ?? defaultHostFx;

  // --- Compensation ---
  const baseSalary = input.baseSalary || 0;
  const annualBonus = input.bonusType === 'percentage'
    ? baseSalary * (input.bonusPercentage / 100)
    : (input.annualBonus || 0);
  const equityIncome = input.equityIncome || 0;

  // Other Compensation items (fully taxable, added to gross comp)
  const otherCompTotal = (input.otherCompensation || []).reduce((sum, item) => sum + (item.amount || 0), 0);

  const totalCashComp = baseSalary + annualBonus;
  const totalGrossComp = totalCashComp + equityIncome + otherCompTotal;

  // --- Benefits ---
  const benefits = input.benefits;
  // || 1: intentional — if married_children but numChildren not yet set, default to 1 for schooling calc
  const numChildren = input.familyStatus === 'married_children' ? (input.numChildren || 1) : 0;
  const isMarried = input.familyStatus !== 'single';

  // City defaults are in host local currency — multiply by hostFx to convert to reporting currency.
  // User-entered overrides (annualAmount) are already in reporting currency.
  const housingAnnual = benefits.includeHousing?.enabled ? (benefits.includeHousing.annualAmount || hostCity.housingMonthly * 12 * hostFx) : 0;
  const colaPercentage = hostCity.colaIndex > 100 ? (hostCity.colaIndex - 100) / 100 : 0;
  const colaAnnual = benefits.includeCola?.enabled ? (benefits.includeCola.annualAmount || baseSalary * colaPercentage) : 0;
  const schoolingAnnual = benefits.includeSchooling?.enabled
    ? (benefits.includeSchooling.annualAmount || hostCity.schoolingAnnual * numChildren * hostFx) : 0;
  const homeLeaveAnnual = benefits.includeHomeLeave?.enabled
    ? (benefits.includeHomeLeave.annualAmount || 5000) : 0;
  const transportAnnual = benefits.includeTransportation?.enabled
    ? (benefits.includeTransportation.annualAmount || hostCity.transportMonthly * 12 * hostFx) : 0;
  const utilitiesAnnual = benefits.includeUtilities?.enabled
    ? (benefits.includeUtilities.annualAmount || hostCity.utilitiesMonthly * 12 * hostFx) : 0;
  const immigrationAnnual = benefits.includeImmigration?.enabled
    ? (benefits.includeImmigration.annualAmount || 3500) : 0;
  const relocationAnnual = benefits.includeRelocation?.enabled
    ? (benefits.includeRelocation.annualAmount || 15000) : 0;
  const taxPrepAnnual = benefits.includeTaxPreparation?.enabled
    ? (benefits.includeTaxPreparation.annualAmount || 5000) : 0;

  // Other Benefits items (grossed up, added to allowances)
  const otherBenefitsTotal = (input.otherBenefits || []).reduce((sum, item) => sum + (item.amount || 0), 0);

  // Ongoing assignment allowances (excl one-offs)
  const assignmentAllowances = housingAnnual + colaAnnual + schoolingAnnual + homeLeaveAnnual
    + transportAnnual + utilitiesAnnual + otherBenefitsTotal;
  // Total including one-offs
  const totalAllowances = assignmentAllowances + immigrationAnnual + relocationAnnual + taxPrepAnnual;

  // --- Split-Sourcing ---
  const splitSourcing = computeSplitSourcing(input);
  const bonusHostTaxable = splitSourcing.bonus.hostTaxableAmount;
  const equityHostTaxable = splitSourcing.equity.hostTaxableAmount;

  // Host role percentage for split-role/partial assignments (default 100%)
  const hostRolePct = (input.hostRolePercentage ?? 100) / 100;

  // --- Tax Calculations (with FX conversion) ---
  const homeStateTaxRate = homeState?.stateTaxRate || 0;
  const homeLocalTaxRate = homeState?.localTaxRate || 0;
  const hostStateTaxRate = hostState?.stateTaxRate || 0;
  const hostLocalTaxRate = hostState?.localTaxRate || 0;

  // Home country tax on total compensation (worldwide) — for income tax only
  const homeLocalIncome = totalGrossComp / homeFx;
  const homeTaxLocal = calculateTax(homeLocalIncome, homeCountry, homeStateTaxRate, homeLocalTaxRate, numChildren, isMarried);
  const homeTax = convertTaxResult(homeTaxLocal, homeFx);

  // Host country tax on full package (comp + split-sourced bonus/equity + allowances)
  // Apply host role percentage for split-role assignments
  const hostCompIncome = (baseSalary * hostRolePct) + bonusHostTaxable + equityHostTaxable;
  const hostTaxableIncome = hostCompIncome + totalAllowances;
  const hostLocalIncome = hostTaxableIncome / hostFx;
  const hostTaxLocal = calculateTax(hostLocalIncome, hostCountry, hostStateTaxRate, hostLocalTaxRate, numChildren, isMarried);

  // Host tax on comp only (for breakdown split)
  const hostCompLocalIncome = hostCompIncome / hostFx;
  const hostTaxOnCompLocal = calculateTax(hostCompLocalIncome, hostCountry, hostStateTaxRate, hostLocalTaxRate, numChildren, isMarried);
  const hostTaxOnCompValue = hostTaxOnCompLocal.totalIncomeTax * hostFx;

  // Marginal rate from local-currency result (before FX conversion)
  const hostBrackets = (isMarried && hostCountry.marriedBrackets) ? hostCountry.marriedBrackets : hostCountry.federalBrackets;
  const topFederalRate = hostBrackets.length > 0
    ? hostBrackets.find(b => hostTaxLocal.taxableIncome <= b.max)?.rate || hostBrackets[hostBrackets.length - 1].rate
    : 0;
  const hostMarginalRate = topFederalRate + (hostStateTaxRate || 0) + (hostLocalTaxRate || 0);
  const effectiveMarginalRate = Math.min(hostMarginalRate, 0.6);

  const hostTax = convertTaxResult(hostTaxLocal, hostFx);

  // Hypothetical tax — depends on philosophy:
  //   taxEqualization: what employee would pay at home on the same gross (standard)
  //   taxProtection:   lesser of home tax and host tax on comp (employee pays no more than the lower)
  //   stayAtHome:      actual home tax (same as equalisation for base case)
  // Equity carve-out: when enabled, equity is excluded from the hypo tax base
  const hypoGrossComp = input.equityCarveOut ? (totalGrossComp - equityIncome) : totalGrossComp;
  const hypoLocalIncome = hypoGrossComp / homeFx;
  const hypoTaxLocal = calculateHypoTax(hypoLocalIncome, homeCountry, homeStateTaxRate, homeLocalTaxRate, input.hypoTaxPhilosophy, numChildren, isMarried);
  let hypoTax = convertTaxResult(hypoTaxLocal, homeFx);

  if (input.hypoTaxPhilosophy === 'taxProtection') {
    // Tax protection: hypo = min(home tax on comp, host tax on comp)
    // Employee is "protected" — they never pay more than the lesser of the two
    const hostTaxOnCompForHypo = hostTaxOnCompLocal.totalIncomeTax * hostFx;
    if (hostTaxOnCompForHypo < hypoTax.totalIncomeTax) {
      // Host tax is lower — use host tax as hypo (employer saves)
      hypoTax = {
        ...hypoTax,
        totalIncomeTax: hostTaxOnCompForHypo,
        effectiveRate: totalGrossComp > 0 ? hostTaxOnCompForHypo / totalGrossComp : 0,
      };
    }
    // If home tax is lower, hypoTax stays as home tax (standard calculation)
  }

  // --- Gross-up ---
  const grossUpResult = calculateGrossUp(totalAllowances, effectiveMarginalRate);

  // --- Social Security ---
  // Employer SS on total package (comp + allowances) — not just comp
  const totalPackageLocal = (totalGrossComp + totalAllowances) / homeFx;
  const homeSS_ER = computeEmployerSS(totalPackageLocal, homeCountry, homeFx);
  const hostSS_ER = hostTax.ssEmployer;

  // Hypo SS (what employee would have paid at home)
  const hypoSS = hypoTax.ssEmployee;

  // --- Employee Balance Sheet ---
  const netHomeComp = totalGrossComp - hypoTax.totalIncomeTax - hypoSS;
  // Balance sheet shows ongoing assignment allowances only (not one-offs like relo/immigration/tax prep)
  const totalHostPackage = netHomeComp + assignmentAllowances;

  // --- Total Employer Cost ---
  const employerSSCost = input.ssStrategy === 'home' ? homeSS_ER
    : input.ssStrategy === 'host' ? hostSS_ER
    : homeSS_ER + hostSS_ER;

  // Tax equalisation model: employer bears host tax on comp (net of hypo credit) + gross-up on allowances + ER SS
  const totalEstimatedCost = totalGrossComp + totalAllowances
    + hostTaxOnCompValue - hypoTax.totalIncomeTax
    + grossUpResult.taxOnAllowances + employerSSCost;

  const annualCost = totalEstimatedCost;
  const monthlyCost = annualCost / 12;

  // --- Cost Breakdown ---
  // Build incentive plan label from user-provided name or fall back to "Annual Bonus"
  const incentiveLabel = input.incentivePlanName?.trim() || 'Annual Bonus';

  const costItems: { category: string; amount: number; oneOff?: boolean }[] = [
    { category: 'Base Salary', amount: baseSalary },
    { category: incentiveLabel, amount: annualBonus },
    { category: 'Equity Income', amount: equityIncome },
    // Other Compensation custom items
    ...(input.otherCompensation || []).filter(i => i.amount > 0).map(i => ({ category: i.name || 'Other Comp', amount: i.amount })),
    { category: 'Housing', amount: housingAnnual },
    { category: 'COLA', amount: colaAnnual },
    { category: 'Education', amount: schoolingAnnual },
    { category: 'Home Leave', amount: homeLeaveAnnual },
    { category: 'Transportation', amount: transportAnnual },
    { category: 'Utilities', amount: utilitiesAnnual },
    // Other Benefits custom items
    ...(input.otherBenefits || []).filter(i => i.amount > 0).map(i => ({ category: i.name || 'Other Benefit', amount: i.amount })),
    { category: 'Immigration', amount: immigrationAnnual, oneOff: true },
    { category: 'Relocation', amount: relocationAnnual, oneOff: true },
    { category: 'Tax Preparation', amount: taxPrepAnnual, oneOff: true },
    { category: 'Host Tax on Comp', amount: hostTaxOnCompValue },
    { category: 'Hypo Tax Credit', amount: -hypoTax.totalIncomeTax },
    { category: 'Gross-up on Allowances', amount: grossUpResult.taxOnAllowances },
    { category: 'Employer SS', amount: employerSSCost },
  ].filter(item => item.amount !== 0);

  const costBreakdown = costItems.map(item => ({
    ...item,
    percentage: totalEstimatedCost > 0 ? (item.amount / totalEstimatedCost) * 100 : 0,
  }));

  // --- One-off Payment Analysis ---
  let oneOffAnalysis: CostEstimateResult['oneOffAnalysis'];
  const oneOffPayment = input.oneOffPayment || 0;
  if (oneOffPayment > 0) {
    // Marginal hypo tax (home) on the one-off
    const hypoWithOneOffLocal = (hypoGrossComp + oneOffPayment) / homeFx;
    const hypoWithOneOffTaxLocal = calculateHypoTax(hypoWithOneOffLocal, homeCountry, homeStateTaxRate, homeLocalTaxRate, input.hypoTaxPhilosophy, numChildren, isMarried);
    const hypoWithOneOff = convertTaxResult(hypoWithOneOffTaxLocal, homeFx);
    const marginalHypoTax = hypoWithOneOff.totalIncomeTax - hypoTax.totalIncomeTax;
    const marginalHypoSS = hypoWithOneOff.ssEmployee - hypoTax.ssEmployee;
    const marginalRate = oneOffPayment > 0 ? marginalHypoTax / oneOffPayment : 0;

    // Marginal host tax gross-up on the one-off
    const hostWithOneOffLocal = (hostTaxableIncome + oneOffPayment) / hostFx;
    const hostWithOneOffTaxLocal = calculateTax(hostWithOneOffLocal, hostCountry, hostStateTaxRate, hostLocalTaxRate, numChildren, isMarried);
    const hostWithOneOff = convertTaxResult(hostWithOneOffTaxLocal, hostFx);
    const marginalHostTax = hostWithOneOff.totalIncomeTax - hostTax.totalIncomeTax;

    // Marginal employer SS on the one-off — respects ssStrategy
    let marginalERSS = 0;
    if (input.ssStrategy === 'home' || input.ssStrategy === 'both') {
      const packageWithOneOffLocal = (totalGrossComp + totalAllowances + oneOffPayment) / homeFx;
      marginalERSS += computeEmployerSS(packageWithOneOffLocal, homeCountry, homeFx) - homeSS_ER;
    }
    if (input.ssStrategy === 'host' || input.ssStrategy === 'both') {
      const hostPackageWithOneOffLocal = (hostTaxableIncome + oneOffPayment) / hostFx;
      const hostERSSWithOneOff = computeEmployerSS(hostPackageWithOneOffLocal, hostCountry, hostFx);
      marginalERSS += hostERSSWithOneOff - hostSS_ER;
    }

    const netToEmployee = oneOffPayment - marginalHypoTax - marginalHypoSS;

    oneOffAnalysis = {
      payment: oneOffPayment,
      hypoTax: marginalHypoTax,
      hypoSS: marginalHypoSS,
      netToEmployee,
      hostTaxGrossUp: marginalHostTax,
      employerSS: marginalERSS,
      totalCost: netToEmployee + marginalHostTax + marginalERSS,
      marginalRate,
    };
  }

  return {
    input,
    homeCompensation: {
      baseSalary,
      annualBonus,
      equityIncome,
      totalGross: totalGrossComp,
    },
    homeTax,
    hostTax,
    hypoTax,
    splitSourcing,
    benefits: {
      housing: housingAnnual,
      cola: colaAnnual,
      education: schoolingAnnual,
      homeLeave: homeLeaveAnnual,
      transportation: transportAnnual,
      utilities: utilitiesAnnual,
      immigration: immigrationAnnual,
      relocation: relocationAnnual,
      taxPreparation: taxPrepAnnual,
      assignmentAllowances,
      totalAllowances,
      totalNetBenefits: totalAllowances,
    },
    hostTaxOnComp: hostTaxOnCompValue,
    grossUp: {
      taxOnAllowances: grossUpResult.taxOnAllowances,
      iterativeGrossUp: grossUpResult.grossAllowances,
      totalGrossUp: grossUpResult.taxOnAllowances,
    },
    balanceSheet: {
      homeGross: totalGrossComp,
      hypoTax: hypoTax.totalIncomeTax,
      hypoSS: hypoSS,
      netHomeComp,
      hostAllowances: assignmentAllowances,
      totalHostPackage,
    },
    totalEstimatedCost,
    annualCost,
    monthlyCost,
    employerCost: totalEstimatedCost,
    employeeCost: netHomeComp,
    costBreakdown,
    oneOffAnalysis,
  };
}
