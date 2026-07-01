import type { BenefitConfig } from '../types';

export function getDefaultBenefits(): Record<string, BenefitConfig> {
  return {
    includeHousing: {
      id: 'includeHousing',
      label: 'Housing Allowance',
      description: 'Cost of accommodation in host location',
      enabled: true,
      annualAmount: 0, // Populated from city data
    },
    includeCola: {
      id: 'includeCola',
      label: 'Cost of Living Allowance',
      description: 'Cost of Living Allowance based on goods & services index',
      enabled: true,
      annualAmount: 0,
      isPercentage: true,
      percentageOf: 'baseSalary',
    },
    includeSchooling: {
      id: 'includeSchooling',
      label: 'Education Allowance',
      description: 'International school fees for eligible children',
      enabled: false,
      annualAmount: 0,
    },
    includeHomeLeave: {
      id: 'includeHomeLeave',
      label: 'Home Leave Allowance',
      description: 'Annual flight tickets to home country',
      enabled: true,
      annualAmount: 5000,
    },
    includeTransportation: {
      id: 'includeTransportation',
      label: 'Transportation Allowance',
      description: 'Car allowance or public transport commutation',
      enabled: true,
      annualAmount: 0,
    },
    includeUtilities: {
      id: 'includeUtilities',
      label: 'Utilities Allowance',
      description: 'Electricity, water, heating, and internet',
      enabled: false,
      annualAmount: 0,
    },
    includeImmigration: {
      id: 'includeImmigration',
      label: 'Visa Fees',
      description: 'Visa and work permit fees',
      enabled: true,
      annualAmount: 3500,
    },
    includeRelocation: {
      id: 'includeRelocation',
      label: 'Relocation',
      description: 'Shipping of household goods',
      enabled: true,
      annualAmount: 15000,
    },
    includeTaxPreparation: {
      id: 'includeTaxPreparation',
      label: 'Tax Preparation',
      description: 'Professional tax return assistance',
      enabled: true,
      annualAmount: 5000,
    },
  };
}

export const assignmentTypes = [
  { value: 'longTerm', label: 'Long-Term Assignment', description: 'Standard international assignment (1-5 years)' },
  { value: 'shortTerm', label: 'Short-Term Assignment', description: 'Temporary assignment under 12 months' },
  { value: 'localPlus', label: 'Local Plus', description: 'Local contract with supplemental benefits' },
  { value: 'permanent', label: 'Permanent Transfer', description: 'One-way relocation to host country' },
  { value: 'commuter', label: 'Commuter Assignment', description: 'Regular commute between home and host — split time between locations' },
] as const;

export const equityTypes = [
  { value: 'rsu', label: 'Restricted Stock Units (RSUs)' },
  { value: 'options', label: 'Stock Options' },
  { value: 'espp', label: 'Employee Stock Purchase Plan (ESPP)' },
  { value: 'phantom', label: 'Phantom Equity / SARs' },
] as const;

export const vestingSchedules = [
  { value: 'annual', label: 'Annual (cliff or anniversary)' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'monthly', label: 'Monthly' },
] as const;

export const familyStatuses = [
  { value: 'single', label: 'Single', icon: '1' },
  { value: 'married', label: 'Married / Partner', icon: '2' },
  { value: 'married_children', label: 'Married + Children', icon: '2+' },
] as const;

export const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20ac', name: 'Euro' },
  { code: 'GBP', symbol: '\u00a3', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'KRW', symbol: '\u20a9', name: 'South Korean Won' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso' },
  { code: 'COP', symbol: 'COP$', name: 'Colombian Peso' },
  { code: 'PEN', symbol: 'S/.', name: 'Peruvian Sol' },
  { code: 'BND', symbol: 'B$', name: 'Brunei Dollar' },
  { code: 'BOB', symbol: 'Bs.', name: 'Bolivian Boliviano' },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
  { code: 'CRC', symbol: '\u20a1', name: 'Costa Rican Colon' },
] as const;
