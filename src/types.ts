export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface City {
  code: string;
  name: string;
  housingMonthly: number;
  schoolingAnnual: number;
  colaIndex: number;
  utilitiesMonthly: number;
  transportMonthly: number;
}

export interface StateProvince {
  code: string;
  name: string;
  stateTaxRate: number;
  localTaxRate?: number;
}

/** Supplementary tax rates from PwC Worldwide Tax Summaries */
export interface TaxReference {
  corporateTaxRate: number;        // headline CIT %
  vatRate: number | null;          // VAT/GST %, null if no VAT (e.g. US sales tax)
  capitalGainsTaxRate: number;     // CGT %
  whtDividends: number;            // WHT on dividends %
  whtInterest: number;             // WHT on interest %
  whtRoyalties: number;            // WHT on royalties %
  dividendTaxBrackets?: { min: number; max: number; rate: number }[]; // dividend tax by PIT band
}

export interface Country {
  code: string;
  name: string;
  currency: [string, string]; // [code, symbol]
  defaultFxToUSD: number; // 1 unit of this currency = X USD
  federalBrackets: TaxBracket[];
  marriedBrackets?: TaxBracket[];
  standardDeduction: number;
  marriedStandardDeduction?: number;
  personalAllowance: number;
  personalAllowanceTaper?: { threshold: number; rate: number }; // e.g. UK: reduce PA by rate per £1 over threshold
  ssEmployeeRate: number;
  ssEmployerRate: number;
  ssCap: number;
  ssBrackets?: {
    employee: { threshold: number; rate: number; cap?: number }[];
    employer: { threshold: number; rate: number; cap?: number }[];
  };
  medicareEmployeeRate?: number; // uncapped (US: 1.45%)
  medicareEmployerRate?: number; // uncapped (US: 1.45%)
  avgTax: number;
  cities: City[];
  states?: StateProvince[];
  childCredits?: { perChild: number; maxChildren: number };
  taxRef?: TaxReference; // PwC WTS supplementary rates
}

export interface BenefitConfig {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  annualAmount: number;
  isPercentage?: boolean;
  percentageOf?: string;
}

export interface CustomItem {
  name: string;
  amount: number;
}

export interface EstimateInput {
  estimateName: string;
  startDate: string;
  durationMonths: number;
  projectionYears: number;
  homeCountryCode: string;
  homeCityCode: string;
  hostCountryCode: string;
  hostCityCode: string;
  currency: string;
  baseSalary: number;
  annualBonus: number;
  bonusType: 'fixed' | 'percentage';
  bonusPercentage: number;
  equityIncome: number;
  equityType: 'rsu' | 'options' | 'espp' | 'phantom';
  equityVestingSchedule: 'annual' | 'quarterly' | 'monthly';
  familyStatus: 'single' | 'married' | 'married_children';
  numChildren: number;
  assignmentType: 'longTerm' | 'shortTerm' | 'localPlus' | 'permanent';
  benefits: Record<string, BenefitConfig>;
  hypoTaxPhilosophy: 'taxEqualization' | 'taxProtection' | 'stayAtHome';
  ssStrategy: 'home' | 'host' | 'both';
  homeExchangeRate?: number; // 1 home currency = X reporting currency
  hostExchangeRate?: number; // 1 host currency = X reporting currency
  oneOffPayment?: number; // one-off payment for marginal tax analysis
  bonusPerformancePeriodStart?: string;
  bonusPerformancePeriodEnd?: string;
  equityVestingStart?: string;
  equityVestingEnd?: string;
  // Cash Incentive Plan
  incentivePlanName?: string;
  performancePeriodType?: 'annual' | '3year' | 'custom';
  // Equity enhancements
  equityQualifying?: boolean;
  equityCarveOut?: boolean;
  // Inflation
  inflationRate?: number; // default 0.03
  // Custom items
  otherCompensation?: CustomItem[];
  otherBenefits?: CustomItem[];
}

export interface SplitSourcingResult {
  bonus: {
    performancePeriodDays: number;
    overlapDays: number;
    hostRatio: number;
    hostTaxableAmount: number;
  };
  equity: {
    vestingPeriodDays: number;
    overlapDays: number;
    hostRatio: number;
    hostTaxableAmount: number;
  };
  assignmentStart: string;
  assignmentEnd: string;
}

export interface TaxResult {
  grossIncome: number;
  federalTax: number;
  stateTax: number;
  localTax: number;
  totalIncomeTax: number;
  effectiveRate: number;
  ssEmployee: number;
  ssEmployer: number;
  deductions: number;
  taxableIncome: number;
  childCredits: number;
  brackets: { bracket: TaxBracket; taxInBracket: number }[];
}

export interface CostEstimateResult {
  input: EstimateInput;
  homeCompensation: {
    baseSalary: number;
    annualBonus: number;
    equityIncome: number;
    totalGross: number;
  };
  homeTax: TaxResult;
  hostTax: TaxResult;
  hypoTax: TaxResult;
  benefits: {
    housing: number;
    cola: number;
    education: number;
    homeLeave: number;
    transportation: number;
    utilities: number;
    immigration: number;
    relocation: number;
    taxPreparation: number;
    assignmentAllowances: number;
    totalAllowances: number;
    totalNetBenefits: number;
  };
  hostTaxOnComp: number;
  grossUp: {
    taxOnAllowances: number;
    iterativeGrossUp: number;
    totalGrossUp: number;
  };
  balanceSheet: {
    homeGross: number;
    hypoTax: number;
    hypoSS: number;
    netHomeComp: number;
    hostAllowances: number;
    totalHostPackage: number;
  };
  splitSourcing: SplitSourcingResult;
  totalEstimatedCost: number;
  annualCost: number;
  monthlyCost: number;
  employerCost: number;
  employeeCost: number;
  costBreakdown: { category: string; amount: number; percentage: number; oneOff?: boolean }[];
  oneOffAnalysis?: {
    payment: number;
    hypoTax: number;
    hypoSS: number;
    netToEmployee: number;
    hostTaxGrossUp: number;
    employerSS: number;
    totalCost: number;
    marginalRate: number;
  };
}
