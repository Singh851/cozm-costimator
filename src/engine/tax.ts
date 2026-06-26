import type { Country, TaxResult, TaxBracket } from '../types';

export function calculateBracketTax(income: number, brackets: TaxBracket[]): { total: number; breakdown: { bracket: TaxBracket; taxInBracket: number }[] } {
  let remaining = income;
  let total = 0;
  const breakdown: { bracket: TaxBracket; taxInBracket: number }[] = [];

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const bracketWidth = bracket.max === Infinity ? remaining : bracket.max - bracket.min;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    const taxInBracket = taxableInBracket * bracket.rate;
    total += taxInBracket;
    breakdown.push({ bracket, taxInBracket });
    remaining -= taxableInBracket;
  }

  return { total, breakdown };
}

export function calculateBracketSS(
  grossIncome: number,
  brackets: { threshold: number; rate: number; cap?: number }[],
): number {
  let total = 0;
  for (let i = 0; i < brackets.length; i++) {
    const { threshold, rate, cap } = brackets[i];
    if (grossIncome <= threshold) continue;
    const ceiling = cap != null ? cap : (i + 1 < brackets.length ? brackets[i + 1].threshold : Infinity);
    const taxableInBand = Math.min(grossIncome, ceiling) - threshold;
    if (taxableInBand > 0) {
      total += taxableInBand * rate;
    }
  }
  return total;
}

export function calculateTax(
  grossIncome: number,
  country: Country,
  stateTaxRate: number = 0,
  localTaxRate: number = 0,
  numChildren: number = 0,
  isMarried: boolean = false,
): TaxResult {
  // Personal allowance with taper (e.g. UK: reduce by 50p per £1 over £100k)
  let effectivePA = country.personalAllowance;
  if (country.personalAllowanceTaper && grossIncome > country.personalAllowanceTaper.threshold) {
    const excess = grossIncome - country.personalAllowanceTaper.threshold;
    const reduction = Math.floor(excess * country.personalAllowanceTaper.rate);
    effectivePA = Math.max(0, effectivePA - reduction);
  }

  // Deductions — use married standard deduction when available
  const stdDeduction = (isMarried && country.marriedStandardDeduction != null)
    ? country.marriedStandardDeduction
    : country.standardDeduction;
  const deductions = stdDeduction + effectivePA;
  const taxableIncome = Math.max(0, grossIncome - deductions);

  // Federal/national tax — use married brackets when available
  const brackets = (isMarried && country.marriedBrackets)
    ? country.marriedBrackets
    : country.federalBrackets;
  const federal = calculateBracketTax(taxableIncome, brackets);

  // State/provincial tax (flat rate approximation)
  const stateTax = taxableIncome * stateTaxRate;
  const localTax = taxableIncome * localTaxRate;

  // Child credits — apply against federal tax only (not state/local)
  let childCredits = 0;
  if (country.childCredits && numChildren > 0) {
    const maxCredit = Math.min(numChildren, country.childCredits.maxChildren) * country.childCredits.perChild;
    childCredits = Math.min(maxCredit, federal.total); // can't exceed federal tax
  }

  const totalIncomeTax = Math.max(0, federal.total - childCredits + stateTax + localTax);

  // Social security — bracket-based (e.g. UK NIC) or flat rate (capped)
  let ssEmployee: number;
  let ssEmployer: number;

  if (country.ssBrackets) {
    ssEmployee = calculateBracketSS(grossIncome, country.ssBrackets.employee);
    ssEmployer = calculateBracketSS(grossIncome, country.ssBrackets.employer);
  } else {
    const ssCappedIncome = country.ssCap > 0 ? Math.min(grossIncome, country.ssCap) : grossIncome;
    ssEmployee = ssCappedIncome * country.ssEmployeeRate;
    ssEmployer = ssCappedIncome * country.ssEmployerRate;
  }

  if (country.medicareEmployeeRate != null) {
    ssEmployee += grossIncome * country.medicareEmployeeRate;
  }
  if (country.medicareEmployerRate != null) {
    ssEmployer += grossIncome * country.medicareEmployerRate;
  }

  const effectiveRate = grossIncome > 0 ? totalIncomeTax / grossIncome : 0;

  return {
    grossIncome,
    federalTax: federal.total,
    stateTax,
    localTax,
    totalIncomeTax,
    effectiveRate,
    ssEmployee,
    ssEmployer,
    deductions,
    taxableIncome,
    childCredits,
    brackets: federal.breakdown,
  };
}

export function calculateHypoTax(
  grossIncome: number,
  country: Country,
  stateTaxRate: number = 0,
  localTaxRate: number = 0,
  _philosophy: 'taxEqualization' | 'taxProtection' | 'stayAtHome',
  numChildren: number = 0,
  isMarried: boolean = false,
): TaxResult {
  return calculateTax(grossIncome, country, stateTaxRate, localTaxRate, numChildren, isMarried);
}

export function calculateGrossUp(
  netAllowances: number,
  marginalRate: number,
  maxIterations: number = 20,
  tolerance: number = 0.01,
): { grossAllowances: number; taxOnAllowances: number } {
  if (marginalRate <= 0 || marginalRate >= 1) {
    return { grossAllowances: netAllowances, taxOnAllowances: 0 };
  }

  // Iterative gross-up: find gross such that gross - tax(gross) = net
  let gross = netAllowances / (1 - marginalRate);

  for (let i = 0; i < maxIterations; i++) {
    const tax = gross * marginalRate;
    const net = gross - tax;
    const diff = net - netAllowances;

    if (Math.abs(diff) < tolerance) break;

    gross -= diff;
  }

  const taxOnAllowances = gross - netAllowances;
  return { grossAllowances: gross, taxOnAllowances };
}
