import type { EstimateInput, CostEstimateResult } from '../types';
import { getCountry, getCity, getState } from '../data/countries';
import { calculateTax, calculateHypoTax, calculateGrossUp } from './tax';
import { computeSplitSourcing } from './splitSourcing';

export function computeEstimate(input: EstimateInput): CostEstimateResult | null {
  const homeCountry = getCountry(input.homeCountryCode);
  const hostCountry = getCountry(input.hostCountryCode);
  const homeCity = getCity(input.homeCountryCode, input.homeCityCode);
  const hostCity = getCity(input.hostCountryCode, input.hostCityCode);

  if (!homeCountry || !hostCountry || !homeCity || !hostCity) return null;

  const homeState = getState(input.homeCountryCode, input.homeCityCode);
  const hostState = getState(input.hostCountryCode, input.hostCityCode);

  // --- Compensation ---
  const baseSalary = input.baseSalary || 0;
  const annualBonus = input.bonusType === 'percentage'
    ? baseSalary * (input.bonusPercentage / 100)
    : (input.annualBonus || 0);
  const equityIncome = input.equityIncome || 0;

  const totalCashComp = baseSalary + annualBonus;
  const totalGrossComp = totalCashComp + equityIncome;

  // --- Benefits ---
  const benefits = input.benefits;
  const numChildren = input.familyStatus === 'married_children' ? (input.numChildren || 1) : 0;
  const isMarried = input.familyStatus !== 'single';

  // Compute benefit amounts from city data
  const housingAnnual = benefits.includeHousing?.enabled ? (benefits.includeHousing.annualAmount || hostCity.housingMonthly * 12) : 0;

  // COLA: difference between host and home cost indices applied to base salary
  const colaPercentage = hostCity.colaIndex > 100 ? (hostCity.colaIndex - 100) / 100 : 0;
  const colaAnnual = benefits.includeCola?.enabled ? (benefits.includeCola.annualAmount || baseSalary * colaPercentage) : 0;

  const schoolingAnnual = benefits.includeSchooling?.enabled
    ? (benefits.includeSchooling.annualAmount || hostCity.schoolingAnnual * numChildren)
    : 0;

  const homeLeaveAnnual = benefits.includeHomeLeave?.enabled
    ? (benefits.includeHomeLeave.annualAmount || 5000)
    : 0;

  const transportAnnual = benefits.includeTransportation?.enabled
    ? (benefits.includeTransportation.annualAmount || hostCity.transportMonthly * 12)
    : 0;

  const utilitiesAnnual = benefits.includeUtilities?.enabled
    ? (benefits.includeUtilities.annualAmount || hostCity.utilitiesMonthly * 12)
    : 0;

  const immigrationAnnual = benefits.includeImmigration?.enabled
    ? (benefits.includeImmigration.annualAmount || 3500)
    : 0;

  const relocationAnnual = benefits.includeRelocation?.enabled
    ? (benefits.includeRelocation.annualAmount || 15000)
    : 0;

  const taxPrepAnnual = benefits.includeTaxPreparation?.enabled
    ? (benefits.includeTaxPreparation.annualAmount || 5000)
    : 0;

  const totalAllowances = housingAnnual + colaAnnual + schoolingAnnual + homeLeaveAnnual
    + transportAnnual + utilitiesAnnual + immigrationAnnual + relocationAnnual + taxPrepAnnual;

  // --- Split-Sourcing ---
  const splitSourcing = computeSplitSourcing(input);
  const bonusHostTaxable = splitSourcing.bonus.hostTaxableAmount;
  const equityHostTaxable = splitSourcing.equity.hostTaxableAmount;

  // --- Tax Calculations ---
  const homeStateTaxRate = homeState?.stateTaxRate || 0;
  const homeLocalTaxRate = homeState?.localTaxRate || 0;
  const hostStateTaxRate = hostState?.stateTaxRate || 0;
  const hostLocalTaxRate = hostState?.localTaxRate || 0;

  // Home country tax on total compensation (worldwide)
  const homeTax = calculateTax(
    totalGrossComp,
    homeCountry,
    homeStateTaxRate,
    homeLocalTaxRate,
    numChildren,
    isMarried,
  );

  // Host country tax: base salary + split-sourced bonus/equity + allowances
  const hostTaxableIncome = baseSalary + bonusHostTaxable + equityHostTaxable + totalAllowances;
  const hostTax = calculateTax(
    hostTaxableIncome,
    hostCountry,
    hostStateTaxRate,
    hostLocalTaxRate,
    numChildren,
    isMarried,
  );

  // Hypothetical tax (what employee would have paid at home)
  const hypoTax = calculateHypoTax(
    totalGrossComp,
    homeCountry,
    homeStateTaxRate,
    homeLocalTaxRate,
    input.hypoTaxPhilosophy,
    numChildren,
    isMarried,
  );

  // --- Gross-up ---
  // Use top applicable bracket rate + state + local as marginal rate (effective rate already includes state/local)
  const hostBrackets = (isMarried && hostCountry.marriedBrackets) ? hostCountry.marriedBrackets : hostCountry.federalBrackets;
  const topFederalRate = hostBrackets.length > 0
    ? hostBrackets.find(b => hostTax.taxableIncome <= b.max)?.rate || hostBrackets[hostBrackets.length - 1].rate
    : 0;
  const hostMarginalRate = topFederalRate + (hostStateTaxRate || 0) + (hostLocalTaxRate || 0);
  const effectiveMarginalRate = Math.min(hostMarginalRate, 0.6); // cap at 60%
  const grossUpResult = calculateGrossUp(totalAllowances, effectiveMarginalRate);

  // --- Social Security ---
  const homeSS_ER = homeTax.ssEmployer;
  const hostSS_ER = hostTax.ssEmployer;

  // Hypo SS (what employee would have paid at home)
  const hypoSS = hypoTax.ssEmployee;

  // --- Employee Balance Sheet ---
  const netHomeComp = totalGrossComp - hypoTax.totalIncomeTax - hypoSS;
  const totalHostPackage = netHomeComp + totalAllowances;

  // --- Total Employer Cost ---
  // Salary + Bonus + Equity + Allowances + Gross-up + Employer SS + Tax Prep + Immigration + Relocation
  const employerSSCost = input.ssStrategy === 'home' ? homeSS_ER
    : input.ssStrategy === 'host' ? hostSS_ER
    : homeSS_ER + hostSS_ER;

  const totalEstimatedCost = totalGrossComp + totalAllowances + grossUpResult.taxOnAllowances + employerSSCost;

  const annualCost = totalEstimatedCost;
  const monthlyCost = annualCost / 12;

  // --- Cost Breakdown ---
  const costItems: { category: string; amount: number; oneOff?: boolean }[] = [
    { category: 'Base Salary', amount: baseSalary },
    { category: 'Annual Bonus', amount: annualBonus },
    { category: 'Equity Income', amount: equityIncome },
    { category: 'Housing', amount: housingAnnual },
    { category: 'COLA', amount: colaAnnual },
    { category: 'Education', amount: schoolingAnnual },
    { category: 'Home Leave', amount: homeLeaveAnnual },
    { category: 'Transportation', amount: transportAnnual },
    { category: 'Utilities', amount: utilitiesAnnual },
    { category: 'Immigration', amount: immigrationAnnual, oneOff: true },
    { category: 'Relocation', amount: relocationAnnual, oneOff: true },
    { category: 'Tax Preparation', amount: taxPrepAnnual },
    { category: 'Gross-up', amount: grossUpResult.taxOnAllowances },
    { category: 'Employer SS', amount: employerSSCost },
  ].filter(item => item.amount > 0);

  const costBreakdown = costItems.map(item => ({
    ...item,
    percentage: totalEstimatedCost > 0 ? (item.amount / totalEstimatedCost) * 100 : 0,
  }));

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
      totalAllowances,
      totalNetBenefits: totalAllowances,
    },
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
      hostAllowances: totalAllowances,
      totalHostPackage,
    },
    totalEstimatedCost,
    annualCost,
    monthlyCost,
    employerCost: totalEstimatedCost,
    employeeCost: netHomeComp,
    costBreakdown,
  };
}
