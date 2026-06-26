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

export function calculateTax(
  grossIncome: number,
  country: Country,
  stateTaxRate: number = 0,
  localTaxRate: number = 0,
  numChildren: number = 0,
  _isMarried: boolean = false,
): TaxResult {
  // Deductions
  const deductions = country.standardDeduction + country.personalAllowance;
  const taxableIncome = Math.max(0, grossIncome - deductions);

  // Federal/national tax
  const federal = calculateBracketTax(taxableIncome, country.federalBrackets);

  // State/provincial tax (flat rate approximation)
  const stateTax = taxableIncome * stateTaxRate;
  const localTax = taxableIncome * localTaxRate;

  // Child credits
  let childCredits = 0;
  if (country.childCredits && numChildren > 0) {
    childCredits = Math.min(numChildren, country.childCredits.maxChildren) * country.childCredits.perChild;
  }

  const totalIncomeTax = Math.max(0, federal.total + stateTax + localTax - childCredits);

  // Social security
  const ssCappedIncome = country.ssCap > 0 ? Math.min(grossIncome, country.ssCap) : grossIncome;
  const ssEmployee = ssCappedIncome * country.ssEmployeeRate;
  const ssEmployer = ssCappedIncome * country.ssEmployerRate;

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
): TaxResult {
  return calculateTax(grossIncome, country, stateTaxRate, localTaxRate, numChildren);
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
