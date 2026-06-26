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

export interface Country {
  code: string;
  name: string;
  currency: [string, string]; // [code, symbol]
  federalBrackets: TaxBracket[];
  standardDeduction: number;
  personalAllowance: number;
  ssEmployeeRate: number;
  ssEmployerRate: number;
  ssCap: number;
  avgTax: number;
  cities: City[];
  states?: StateProvince[];
  childCredits?: { perChild: number; maxChildren: number };
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
    totalAllowances: number;
    totalNetBenefits: number;
  };
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
  totalEstimatedCost: number;
  annualCost: number;
  monthlyCost: number;
  employerCost: number;
  employeeCost: number;
  costBreakdown: { category: string; amount: number; percentage: number }[];
}
