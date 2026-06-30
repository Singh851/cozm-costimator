import { useState, useMemo } from 'react';
import type { EstimateInput, CostEstimateResult, Country } from '../types';
import { countries } from '../data/countries';
import { getDefaultBenefits } from '../data/benefits';
import { computeEstimate } from '../engine/costEstimate';
import { fmt } from './ui';

const sortedCountries = countries.slice().sort((a, b) => a.name.localeCompare(b.name));

interface CompareFormState {
  name: string;
  homeCountryCode: string;
  homeCityCode: string;
  hostCountryCode: string;
  hostCityCode: string;
  baseSalary: number;
  annualBonus: number;
  durationMonths: number;
}

function getDefaultForm(): CompareFormState {
  return {
    name: '',
    homeCountryCode: 'US',
    homeCityCode: 'NYC',
    hostCountryCode: 'GB',
    hostCityCode: 'LON',
    baseSalary: 100000,
    annualBonus: 15000,
    durationMonths: 24,
  };
}

function buildEstimateInput(form: CompareFormState, currency: string): EstimateInput {
  return {
    estimateName: form.name,
    startDate: new Date().toISOString().slice(0, 10),
    durationMonths: form.durationMonths,
    projectionYears: Math.ceil(form.durationMonths / 12),
    homeCountryCode: form.homeCountryCode,
    homeCityCode: form.homeCityCode,
    hostCountryCode: form.hostCountryCode,
    hostCityCode: form.hostCityCode,
    currency,
    baseSalary: form.baseSalary,
    annualBonus: form.annualBonus,
    bonusType: 'fixed',
    bonusPercentage: 15,
    equityIncome: 0,
    equityType: 'rsu',
    equityVestingSchedule: 'annual',
    familyStatus: 'single',
    numChildren: 0,
    assignmentType: 'longTerm',
    benefits: getDefaultBenefits(),
    hypoTaxPhilosophy: 'taxEqualization',
    ssStrategy: 'home',
    inflationRate: 0.03,
    otherCompensation: [],
    otherBenefits: [],
  };
}

interface MetricRow {
  label: string;
  getValue: (r: CostEstimateResult) => number;
}

const metrics: MetricRow[] = [
  { label: 'Total Assignment Cost', getValue: r => r.totalEstimatedCost },
  { label: 'Annual Cost', getValue: r => r.annualCost },
  { label: 'Monthly Cost', getValue: r => r.monthlyCost },
  { label: 'Base Salary', getValue: r => r.homeCompensation.baseSalary },
  { label: 'Total Gross Comp', getValue: r => r.homeCompensation.totalGross },
  { label: 'Duration (months)', getValue: r => r.input.durationMonths },
  { label: 'Total Allowances', getValue: r => r.benefits.totalAllowances },
  { label: 'Tax Gross-Up', getValue: r => r.grossUp.totalGrossUp },
  { label: 'Employer SS', getValue: r => r.costBreakdown.find(c => c.category === 'Employer SS')?.amount ?? 0 },
];

export function CostComparison({
  result,
  input,
  currency,
  homeCountry,
  hostCountry,
}: {
  result: CostEstimateResult | null;
  input: EstimateInput;
  currency: string;
  homeCountry: Country | undefined;
  hostCountry: Country | undefined;
}) {
  const [form, setForm] = useState<CompareFormState>(getDefaultForm);
  const [compareTriggered, setCompareTriggered] = useState(false);

  const formHomeCountry = countries.find(c => c.code === form.homeCountryCode);
  const formHostCountry = countries.find(c => c.code === form.hostCountryCode);

  const compareResult = useMemo(() => {
    if (!compareTriggered) return null;
    const est = buildEstimateInput(form, currency);
    return computeEstimate(est);
  }, [compareTriggered, form, currency]);

  const handleCompare = () => {
    setCompareTriggered(true);
  };

  const updateForm = (partial: Partial<CompareFormState>) => {
    setForm(prev => ({ ...prev, ...partial }));
    setCompareTriggered(false);
  };

  const handleFormCountryChange = (field: 'homeCountryCode' | 'hostCountryCode', code: string) => {
    const country = countries.find(c => c.code === code);
    if (!country) return;
    const cityField = field === 'homeCountryCode' ? 'homeCityCode' : 'hostCityCode';
    updateForm({ [field]: code, [cityField]: country.cities[0]?.code || '' });
  };

  const currentName = input.estimateName?.trim() || 'Current Estimate';
  const currentRoute = homeCountry && hostCountry
    ? `${homeCountry.name} → ${hostCountry.name}`
    : '';

  const compareName = form.name.trim() || 'Comparison Estimate';
  const compareRoute = formHomeCountry && formHostCountry
    ? `${formHomeCountry.name} → ${formHostCountry.name}`
    : '';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Compact Input Form */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Compare With Another Assignee</h3>
          <p className="text-xs text-slate-400 mt-0.5">Enter details for a second assignee to compare side-by-side</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Assignee Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => updateForm({ name: e.target.value })}
                placeholder="e.g. David Beckham"
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Home Country</label>
              <select
                value={form.homeCountryCode}
                onChange={e => handleFormCountryChange('homeCountryCode', e.target.value)}
                className="input-field text-xs"
              >
                {sortedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Home City</label>
              <select
                value={form.homeCityCode}
                onChange={e => updateForm({ homeCityCode: e.target.value })}
                className="input-field text-xs"
              >
                {formHomeCountry?.cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Host Country</label>
              <select
                value={form.hostCountryCode}
                onChange={e => handleFormCountryChange('hostCountryCode', e.target.value)}
                className="input-field text-xs"
              >
                {sortedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Host City</label>
              <select
                value={form.hostCityCode}
                onChange={e => updateForm({ hostCityCode: e.target.value })}
                className="input-field text-xs"
              >
                {formHostCountry?.cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Base Salary</label>
              <input
                type="number"
                value={form.baseSalary || ''}
                onChange={e => updateForm({ baseSalary: +e.target.value })}
                className="input-field text-xs"
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Annual Bonus</label>
              <input
                type="number"
                value={form.annualBonus || ''}
                onChange={e => updateForm({ annualBonus: +e.target.value })}
                className="input-field text-xs"
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">Duration (months)</label>
              <input
                type="number"
                value={form.durationMonths}
                onChange={e => updateForm({ durationMonths: +e.target.value })}
                className="input-field text-xs"
                min={1}
                max={120}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleCompare}
                className="w-full px-4 py-2 text-xs font-semibold bg-[#40AEBC] text-white rounded-lg hover:bg-[#2D8A96] transition-colors"
              >
                Compare
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-side cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left card — Current Estimate */}
        <div className={`rounded-xl border-2 overflow-hidden ${result ? 'border-[#40AEBC]' : 'border-slate-200'}`}>
          {result ? (
            <>
              <div className="bg-[#40AEBC] px-4 py-3">
                <h4 className="text-sm font-semibold text-white">{currentName}</h4>
                <p className="text-xs text-white/70">{currentRoute}</p>
              </div>
              <div className="bg-white p-4 space-y-2">
                {metrics.map(m => {
                  const val = m.getValue(result);
                  const isDuration = m.label === 'Duration (months)';
                  return (
                    <div key={m.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-sm text-slate-600">{m.label}</span>
                      <span className="text-sm font-semibold text-slate-800 tabular-nums">
                        {isDuration ? val : fmt(val, currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="bg-white p-12 text-center">
              <p className="text-sm text-slate-400">Configure an estimate in the Cost Estimate tab first</p>
            </div>
          )}
        </div>

        {/* Right card — Comparison Estimate */}
        <div className={`rounded-xl border-2 overflow-hidden ${compareResult ? 'border-[#40AEBC]' : 'border-dashed border-slate-300'}`}>
          {compareResult ? (
            <>
              <div className="bg-[#40AEBC] px-4 py-3">
                <h4 className="text-sm font-semibold text-white">{compareName}</h4>
                <p className="text-xs text-white/70">{compareRoute}</p>
              </div>
              <div className="bg-white p-4 space-y-2">
                {metrics.map(m => {
                  const val = m.getValue(compareResult);
                  const isDuration = m.label === 'Duration (months)';
                  const baseVal = result ? m.getValue(result) : null;
                  const diff = baseVal !== null && !isDuration ? val - baseVal : null;
                  return (
                    <div key={m.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                      <span className="text-sm text-slate-600">{m.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 tabular-nums">
                          {isDuration ? val : fmt(val, currency)}
                        </span>
                        {diff !== null && diff !== 0 && (
                          <span className={`text-[10px] font-medium ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {diff > 0 ? '+' : ''}{fmt(diff, currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="bg-white p-12 text-center">
              <div className="text-slate-300 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-sm text-slate-400">Fill in the form above and click Compare</p>
              <p className="text-xs text-slate-300 mt-1">Uses default benefits and tax equalisation</p>
            </div>
          )}
        </div>
      </div>

      {/* Delta summary */}
      {result && compareResult && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Cost Difference Summary</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4">
              {(() => {
                const totalDiff = compareResult.totalEstimatedCost - result.totalEstimatedCost;
                const monthlyDiff = compareResult.monthlyCost - result.monthlyCost;
                const taxDiff = (compareResult.grossUp.totalGrossUp + compareResult.hostTax.totalIncomeTax) -
                                (result.grossUp.totalGrossUp + result.hostTax.totalIncomeTax);
                return (
                  <>
                    <div className={`rounded-lg p-4 border ${totalDiff > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Annual Cost Diff</p>
                      <p className={`text-xl font-bold mt-1 ${totalDiff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {totalDiff > 0 ? '+' : ''}{fmt(totalDiff, currency)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">{compareName} vs {currentName}</p>
                    </div>
                    <div className={`rounded-lg p-4 border ${monthlyDiff > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Monthly Cost Diff</p>
                      <p className={`text-xl font-bold mt-1 ${monthlyDiff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {monthlyDiff > 0 ? '+' : ''}{fmt(monthlyDiff, currency)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Per month difference</p>
                    </div>
                    <div className={`rounded-lg p-4 border ${taxDiff > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tax Cost Diff</p>
                      <p className={`text-xl font-bold mt-1 ${taxDiff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {taxDiff > 0 ? '+' : ''}{fmt(taxDiff, currency)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">Gross-up + host tax</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
