import { useState, useMemo, useCallback } from 'react';
import type { EstimateInput } from './types';
import { countries, getFxToUSD } from './data/countries';
import { getDefaultBenefits, assignmentTypes, equityTypes, vestingSchedules, familyStatuses, currencies } from './data/benefits';
import { computeEstimate } from './engine/costEstimate';
import { CostCharts } from './components/Charts';
import { TaxBreakdown } from './components/TaxBreakdown';
import { BalanceSheet } from './components/BalanceSheet';
import { PrintReport } from './components/PrintReport';
import { TaxReference } from './components/TaxReference';

const sortedCountries = countries.slice().sort((a, b) => a.name.localeCompare(b.name));

const fmt = (n: number, currency?: string) => {
  const c = currencies.find(cc => cc.code === currency);
  const sym = c?.symbol || '$';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? '-' : ''}${sym}${(abs / 1_000_000).toFixed(2)}M`;
  return `${n < 0 ? '-' : ''}${sym}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

function App() {
  const [activeTab, setActiveTab] = useState<'estimate' | 'host' | 'hypo' | 'planning'>('estimate');
  const [showReport, setShowReport] = useState(false);

  const [input, setInput] = useState<EstimateInput>({
    estimateName: '',
    startDate: new Date().toISOString().slice(0, 10),
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
  });

  const update = useCallback((partial: Partial<EstimateInput>) => {
    setInput(prev => ({ ...prev, ...partial }));
  }, []);

  const updateBenefit = useCallback((id: string, changes: Record<string, unknown>) => {
    setInput(prev => ({
      ...prev,
      benefits: {
        ...prev.benefits,
        [id]: { ...prev.benefits[id], ...changes },
      },
    }));
  }, []);

  const handleCountryChange = useCallback((field: 'homeCountryCode' | 'hostCountryCode', code: string) => {
    const country = countries.find(c => c.code === code);
    if (!country) return;
    const cityField = field === 'homeCountryCode' ? 'homeCityCode' : 'hostCityCode';
    update({ [field]: code, [cityField]: country.cities[0]?.code || '' });
  }, [update]);

  const result = useMemo(() => computeEstimate(input), [input]);

  const homeCountry = countries.find(c => c.code === input.homeCountryCode);
  const hostCountry = countries.find(c => c.code === input.hostCountryCode);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <img src="https://www.thecozm.com/images/logo/theCozmLogo.png" alt="Cozm" className="h-8 w-auto" />
            <div>
              <h1 className="text-base font-semibold text-slate-800 leading-tight">Cozm Mobility Costimator</h1>
              <p className="text-[10px] text-slate-400 -mt-0.5">v3.2 — with Equity & Bonus</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <button
                onClick={() => setShowReport(true)}
                className="no-print px-3 py-1.5 text-xs font-medium bg-[#40AEBC] text-white rounded-lg hover:bg-[#2D8A96] transition-colors"
              >
                Generate Report
              </button>
            )}
            <span className="text-xs text-slate-400">Powered by</span>
            <span className="text-xs font-semibold text-[#40AEBC]">The Cozm</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1">
            {[
              { id: 'estimate' as const, label: 'Cost Estimate' },
              { id: 'host' as const, label: 'Host Tax Calculation' },
              { id: 'hypo' as const, label: 'Hypothetical Tax' },
              { id: 'planning' as const, label: 'Planning Insights' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#40AEBC] text-[#40AEBC]'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'estimate' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT: Input Panel */}
            <div className="lg:col-span-5 space-y-4">
              <InputPanel
                input={input}
                update={update}
                updateBenefit={updateBenefit}
                handleCountryChange={handleCountryChange}
                homeCountry={homeCountry}
                hostCountry={hostCountry}
              />
            </div>

            {/* RIGHT: Results Panel */}
            <div className="lg:col-span-7 space-y-4">
              {result ? (
                <ResultsPanel result={result} currency={input.currency} />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                  <p className="text-slate-400">Configure your assignment to see cost estimates</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'host' && result && (
          <TaxBreakdown
            title="Host Tax Calculation"
            tax={result.hostTax}
            country={hostCountry!}
            currency={input.currency}
          />
        )}

        {activeTab === 'hypo' && result && (
          <div className="space-y-6">
            <TaxBreakdown
              title="Hypothetical Tax Calculation"
              subtitle={`Based on ${input.hypoTaxPhilosophy === 'taxEqualization' ? 'Tax Equalisation' : input.hypoTaxPhilosophy === 'taxProtection' ? 'Tax Protection' : 'Stay-at-Home'} philosophy`}
              tax={result.hypoTax}
              country={homeCountry!}
              currency={input.currency}
            />
            <BalanceSheet result={result} currency={input.currency} />
          </div>
        )}

        {activeTab === 'planning' && result && (
          <div className="space-y-6">
            <PlanningInsights result={result} currency={input.currency} input={input} />
            <div className="max-w-4xl mx-auto">
              <TaxReference homeCountry={homeCountry} hostCountry={hostCountry} currency={input.currency} />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <p className="text-xs text-slate-400">Cozm Mobility Costimator v3.2 — For illustration purposes only</p>
          <p className="text-xs text-slate-400">The Cozm Ltd</p>
        </div>
      </footer>

      {showReport && result && (
        <PrintReport
          result={result}
          currency={input.currency}
          homeCountry={homeCountry}
          hostCountry={hostCountry}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

/* ─── Input Panel ─── */
function InputPanel({
  input, update, updateBenefit, handleCountryChange, homeCountry, hostCountry,
}: {
  input: EstimateInput;
  update: (p: Partial<EstimateInput>) => void;
  updateBenefit: (id: string, changes: Record<string, unknown>) => void;
  handleCountryChange: (field: 'homeCountryCode' | 'hostCountryCode', code: string) => void;
  homeCountry: typeof countries[0] | undefined;
  hostCountry: typeof countries[0] | undefined;
}) {
  return (
    <>
      {/* Estimate Name & Timeline */}
      <Card title="Assignment Details">
        <Field label="Estimate Name" hint="Give your scenario a unique name for reports">
          <input
            type="text"
            value={input.estimateName}
            onChange={e => update({ estimateName: e.target.value })}
            placeholder="e.g. Smith, J — London to NYC"
            className="input-field"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Start Date">
            <input type="date" value={input.startDate} onChange={e => update({ startDate: e.target.value })} className="input-field" />
          </Field>
          <Field label="Duration (months)" hint="Duration determines the annualisation of one-off costs">
            <input type="number" value={input.durationMonths} onChange={e => update({ durationMonths: +e.target.value })} className="input-field" min={1} max={120} />
          </Field>
          <Field label="Currency">
            <select value={input.currency} onChange={e => update({ currency: e.target.value })} className="input-field">
              {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
            </select>
          </Field>
        </div>
        <Field label="Assignment Type" hint="Choose the assignment type to apply standard benefits and tax logic">
          <select value={input.assignmentType} onChange={e => update({ assignmentType: e.target.value as EstimateInput['assignmentType'] })} className="input-field">
            {assignmentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        {homeCountry && hostCountry && (
          <div className="bg-sky-50 rounded-lg p-3 border border-sky-200">
            <label className="text-sm font-semibold text-sky-800 block mb-2">Exchange Rates</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-sky-600 mb-1 block">1 {homeCountry.currency[0]} = {input.currency}</label>
                <input
                  type="number"
                  step="0.0001"
                  value={input.homeExchangeRate ?? +(homeCountry.defaultFxToUSD / getFxToUSD(input.currency)).toFixed(4)}
                  onChange={e => update({ homeExchangeRate: +e.target.value || undefined })}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="text-xs text-sky-600 mb-1 block">1 {hostCountry.currency[0]} = {input.currency}</label>
                <input
                  type="number"
                  step="0.0001"
                  value={input.hostExchangeRate ?? +(hostCountry.defaultFxToUSD / getFxToUSD(input.currency)).toFixed(4)}
                  onChange={e => update({ hostExchangeRate: +e.target.value || undefined })}
                  className="input-field text-xs"
                />
              </div>
            </div>
            <p className="text-xs text-sky-500 mt-1">Tax brackets are applied in local currency, then converted back to {input.currency}</p>
          </div>
        )}
      </Card>

      {/* Locations */}
      <Card title="Locations" subtitle="Select Home (Origin) and Host (Destination) locations">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Home</span>
            </div>
            <select value={input.homeCountryCode} onChange={e => handleCountryChange('homeCountryCode', e.target.value)} className="input-field">
              {sortedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            <select value={input.homeCityCode} onChange={e => update({ homeCityCode: e.target.value })} className="input-field">
              {homeCountry?.cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Host</span>
            </div>
            <select value={input.hostCountryCode} onChange={e => handleCountryChange('hostCountryCode', e.target.value)} className="input-field">
              {sortedCountries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
            <select value={input.hostCityCode} onChange={e => update({ hostCityCode: e.target.value })} className="input-field">
              {hostCountry?.cities.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Family Status */}
      <Card title="Family Status" subtitle="Affects tax allowances, housing size, and school fees">
        <div className="grid grid-cols-3 gap-2">
          {familyStatuses.map(fs => (
            <button
              key={fs.value}
              onClick={() => update({ familyStatus: fs.value as EstimateInput['familyStatus'] })}
              className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                input.familyStatus === fs.value
                  ? 'border-[#40AEBC] bg-[#40AEBC]/10 text-[#40AEBC]'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {fs.label}
            </button>
          ))}
        </div>
        {input.familyStatus === 'married_children' && (
          <Field label="Number of Children">
            <input type="number" value={input.numChildren} onChange={e => update({ numChildren: +e.target.value })} className="input-field" min={1} max={10} />
          </Field>
        )}
      </Card>

      {/* Compensation */}
      <Card title="Compensation" subtitle="Enter annual gross amounts in the selected currency">
        <Field label="Annual Base Salary">
          <CurrencyInput value={input.baseSalary} onChange={v => update({ baseSalary: v })} currency={input.currency} />
        </Field>

        {/* Annual Bonus - Enhanced */}
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-amber-800">Annual Bonus</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => update({ bonusType: 'fixed' })}
                className={`px-2 py-0.5 text-xs rounded ${input.bonusType === 'fixed' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}
              >Fixed</button>
              <button
                onClick={() => update({ bonusType: 'percentage' })}
                className={`px-2 py-0.5 text-xs rounded ${input.bonusType === 'percentage' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}
              >% of Base</button>
            </div>
          </div>
          {input.bonusType === 'fixed' ? (
            <CurrencyInput value={input.annualBonus} onChange={v => update({ annualBonus: v })} currency={input.currency} />
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={input.bonusPercentage}
                onChange={e => update({ bonusPercentage: +e.target.value })}
                className="input-field w-24"
                min={0}
                max={200}
              />
              <span className="text-sm text-amber-700">% = {fmt(input.baseSalary * input.bonusPercentage / 100, input.currency)}</span>
            </div>
          )}
          <p className="text-xs text-amber-600 mt-1">Target bonus — included in hypothetical tax and gross-up calculations</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-xs text-amber-600 mb-1 block">Performance Period Start</label>
              <input type="date" value={input.bonusPerformancePeriodStart || ''} onChange={e => update({ bonusPerformancePeriodStart: e.target.value || undefined })} className="input-field text-xs" />
            </div>
            <div>
              <label className="text-xs text-amber-600 mb-1 block">Performance Period End</label>
              <input type="date" value={input.bonusPerformancePeriodEnd || ''} onChange={e => update({ bonusPerformancePeriodEnd: e.target.value || undefined })} className="input-field text-xs" />
            </div>
          </div>
        </div>

        {/* Equity Income - NEW */}
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <label className="text-sm font-semibold text-purple-800 block mb-2">Equity Income</label>
          <CurrencyInput value={input.equityIncome} onChange={v => update({ equityIncome: v })} currency={input.currency} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-xs text-purple-600 mb-1 block">Equity Type</label>
              <select value={input.equityType} onChange={e => update({ equityType: e.target.value as EstimateInput['equityType'] })} className="input-field text-xs">
                {equityTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-purple-600 mb-1 block">Vesting Schedule</label>
              <select value={input.equityVestingSchedule} onChange={e => update({ equityVestingSchedule: e.target.value as EstimateInput['equityVestingSchedule'] })} className="input-field text-xs">
                {vestingSchedules.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label className="text-xs text-purple-600 mb-1 block">Vesting Period Start</label>
              <input type="date" value={input.equityVestingStart || ''} onChange={e => update({ equityVestingStart: e.target.value || undefined })} className="input-field text-xs" />
            </div>
            <div>
              <label className="text-xs text-purple-600 mb-1 block">Vesting Period End</label>
              <input type="date" value={input.equityVestingEnd || ''} onChange={e => update({ equityVestingEnd: e.target.value || undefined })} className="input-field text-xs" />
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-1.5">
            Equity compensation subject to split-sourcing rules between home and host jurisdictions.
            {input.equityType === 'rsu' && ' RSUs are typically taxed as ordinary income upon vesting.'}
            {input.equityType === 'options' && ' Stock options may qualify for capital gains treatment in some jurisdictions.'}
            {input.equityType === 'espp' && ' ESPP discount is generally treated as ordinary income.'}
            {input.equityType === 'phantom' && ' Phantom equity is always taxed as ordinary income.'}
          </p>
        </div>

        {/* One-off Payment */}
        <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
          <label className="text-sm font-semibold text-rose-800 block mb-2">One-off Payment (optional)</label>
          <CurrencyInput value={input.oneOffPayment || 0} onChange={v => update({ oneOffPayment: v || undefined })} currency={input.currency} />
          <p className="text-xs text-rose-600 mt-1">Enter a lump sum to see the marginal tax cost (e.g. sign-on bonus, relocation lump sum)</p>
        </div>
      </Card>

      {/* Assignment Benefits */}
      <Card title="Assignment Benefits" subtitle="Toggle and customise allowances">
        <div className="space-y-2">
          {Object.values(input.benefits).map(benefit => {
            const hostCity = hostCountry?.cities.find(c => c.code === input.hostCityCode);
            const numChildren = input.familyStatus === 'married_children' ? (input.numChildren || 1) : 0;
            const colaIdx = hostCity ? (hostCity.colaIndex > 100 ? (hostCity.colaIndex - 100) / 100 : 0) : 0;
            // City defaults are in host local currency — convert to reporting currency
            const hFx = input.hostExchangeRate ?? (hostCountry ? hostCountry.defaultFxToUSD / getFxToUSD(input.currency) : 1);
            const defaults: Record<string, number> = {
              includeHousing: (hostCity?.housingMonthly || 0) * 12 * hFx,
              includeCola: Math.round(input.baseSalary * colaIdx),
              includeSchooling: (hostCity?.schoolingAnnual || 0) * numChildren * hFx,
              includeHomeLeave: 5000,
              includeTransportation: (hostCity?.transportMonthly || 0) * 12 * hFx,
              includeUtilities: (hostCity?.utilitiesMonthly || 0) * 12 * hFx,
              includeImmigration: 3500,
              includeRelocation: 15000,
              includeTaxPreparation: 5000,
            };
            const defaultVal = defaults[benefit.id];
            return (
              <div key={benefit.id} className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${benefit.enabled ? 'border-[#40AEBC]/30 bg-[#40AEBC]/5' : 'border-slate-100 bg-slate-50'}`}>
                <div
                  className={`toggle-switch mt-0.5 shrink-0 ${benefit.enabled ? 'active' : ''}`}
                  onClick={() => updateBenefit(benefit.id, { enabled: !benefit.enabled })}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${benefit.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{benefit.label}</span>
                    {benefit.enabled && (
                      <CurrencyInput
                        value={benefit.annualAmount}
                        onChange={v => updateBenefit(benefit.id, { annualAmount: v })}
                        currency={input.currency}
                        compact
                        placeholder={defaultVal ? defaultVal.toLocaleString() : undefined}
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{benefit.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tax Philosophy */}
      <Card title="Tax & Social Security Strategy">
        <Field label="Hypothetical Tax Philosophy">
          <select value={input.hypoTaxPhilosophy} onChange={e => update({ hypoTaxPhilosophy: e.target.value as EstimateInput['hypoTaxPhilosophy'] })} className="input-field">
            <option value="taxEqualization">Tax Equalisation</option>
            <option value="taxProtection">Tax Protection</option>
            <option value="stayAtHome">Stay-at-Home Compensation</option>
          </select>
        </Field>
        <Field label="Social Security Strategy">
          <select value={input.ssStrategy} onChange={e => update({ ssStrategy: e.target.value as EstimateInput['ssStrategy'] })} className="input-field">
            <option value="home">Home Country Only (A1/CoC)</option>
            <option value="host">Host Country Only</option>
            <option value="both">Both (Dual Liability)</option>
          </select>
        </Field>
      </Card>
    </>
  );
}

/* ─── Results Panel ─── */
function ResultsPanel({ result, currency }: { result: NonNullable<ReturnType<typeof computeEstimate>>; currency: string }) {
  return (
    <>
      {/* Total Cost Banner */}
      <div className="bg-gradient-to-br from-[#40AEBC] to-[#2D8A96] rounded-xl p-6 text-white">
        <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Total Estimated Annual Cost</p>
        <p className="text-4xl font-bold mt-1">{fmt(result.totalEstimatedCost, currency)}</p>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-xs text-white/60">Monthly</p>
            <p className="text-lg font-semibold">{fmt(result.monthlyCost, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Employer Cost</p>
            <p className="text-lg font-semibold">{fmt(result.employerCost, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60">Duration Total</p>
            <p className="text-lg font-semibold">{fmt(result.totalEstimatedCost * (result.input.durationMonths / 12), currency)}</p>
          </div>
        </div>
      </div>

      {/* Compensation Summary */}
      <Card title="Compensation Summary">
        <div className="space-y-2">
          <SummaryRow label="Base Salary" value={result.homeCompensation.baseSalary} currency={currency} />
          <SummaryRow label="Annual Bonus" value={result.homeCompensation.annualBonus} currency={currency} accent="amber" />
          <SummaryRow label="Equity Income" value={result.homeCompensation.equityIncome} currency={currency} accent="purple" />
          <div className="border-t border-slate-200 pt-2">
            <SummaryRow label="Total Gross Compensation" value={result.homeCompensation.totalGross} currency={currency} bold />
          </div>
        </div>
      </Card>

      {/* Cost Distribution Chart */}
      <Card title="Cost Distribution">
        <CostCharts breakdown={result.costBreakdown} currency={currency} />
      </Card>

      {/* Detailed Breakdown */}
      <Card title="Detailed Cost Breakdown">
        <div className="space-y-1">
          {/* Compensation Section */}
          <SectionHeader label="Compensation" />
          <SummaryRow label="Base Salary" value={result.homeCompensation.baseSalary} currency={currency} />
          <SummaryRow label="Annual Bonus" value={result.homeCompensation.annualBonus} currency={currency} />
          <SummaryRow label="Equity Income" value={result.homeCompensation.equityIncome} currency={currency} />

          {/* Allowances Section */}
          <SectionHeader label="Assignment Allowances" />
          {result.benefits.housing > 0 && <SummaryRow label="Housing" value={result.benefits.housing} currency={currency} />}
          {result.benefits.cola > 0 && <SummaryRow label="COLA" value={result.benefits.cola} currency={currency} />}
          {result.benefits.education > 0 && <SummaryRow label="Education" value={result.benefits.education} currency={currency} />}
          {result.benefits.homeLeave > 0 && <SummaryRow label="Home Leave" value={result.benefits.homeLeave} currency={currency} />}
          {result.benefits.transportation > 0 && <SummaryRow label="Transportation" value={result.benefits.transportation} currency={currency} />}
          {result.benefits.utilities > 0 && <SummaryRow label="Utilities" value={result.benefits.utilities} currency={currency} />}
          <SubtotalRow label="Total Assignment Allowances" value={result.benefits.assignmentAllowances} currency={currency} />

          {/* One-off / Admin */}
          <SectionHeader label="One-off & Administration" />
          {result.benefits.immigration > 0 && <SummaryRow label="Immigration / Visa Fees" value={result.benefits.immigration} currency={currency} />}
          {result.benefits.relocation > 0 && <SummaryRow label="Relocation" value={result.benefits.relocation} currency={currency} />}
          {result.benefits.taxPreparation > 0 && <SummaryRow label="Tax Preparation" value={result.benefits.taxPreparation} currency={currency} />}

          {/* Tax & SS Section */}
          <SectionHeader label="Taxes & Social Security" />
          <SummaryRow label="Home Hypothetical Taxes" value={-result.hypoTax.totalIncomeTax} currency={currency} />
          <SummaryRow label="Host Gross-Up on Home Compensation" value={result.hostTaxOnComp} currency={currency} />
          <SummaryRow label="Host Gross-Up on Assignment Allowances" value={result.grossUp.totalGrossUp} currency={currency} />
          <SummaryRow label={result.input.ssStrategy === 'home' ? 'Home Employer SS' : result.input.ssStrategy === 'host' ? 'Host Employer SS' : 'Home + Host Employer SS'} value={result.costBreakdown.find(c => c.category === 'Employer SS')?.amount ?? 0} currency={currency} />

          {/* Total */}
          <div className="border-t-2 border-[#40AEBC] pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-base font-bold text-slate-800">TOTAL ESTIMATED COST</span>
              <span className="text-xl font-bold text-[#40AEBC]">{fmt(result.totalEstimatedCost, currency)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Tax Comparison */}
      <Card title="Tax Comparison">
        <div className="grid grid-cols-3 gap-4">
          <TaxSummaryCard title="Home Rules" rate={result.homeTax.effectiveRate} tax={result.homeTax.totalIncomeTax} ss={result.homeTax.ssEmployee} currency={currency} color="blue" />
          <TaxSummaryCard title="Host Rules" rate={result.hostTax.effectiveRate} tax={result.hostTax.totalIncomeTax} ss={result.hostTax.ssEmployee} currency={currency} color="emerald" />
          <TaxSummaryCard title="Hypo Tax" rate={result.hypoTax.effectiveRate} tax={result.hypoTax.totalIncomeTax} ss={result.hypoTax.ssEmployee} currency={currency} color="amber" />
        </div>
      </Card>

      {/* Equity Tax Implications */}
      {/* Split-Sourcing Summary */}
      {(result.homeCompensation.equityIncome > 0 || result.homeCompensation.annualBonus > 0) && (
        <Card title="Split-Sourcing Analysis">
          <div className="space-y-4">
            {result.homeCompensation.annualBonus > 0 && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="text-sm font-semibold text-amber-800 mb-2">Bonus Split-Sourcing</h4>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Total Bonus</p>
                    <p className="text-lg font-semibold text-amber-800">{fmt(result.homeCompensation.annualBonus, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-amber-600 font-medium">Host-Taxable Bonus</p>
                    <p className="text-lg font-semibold text-amber-800">{fmt(result.splitSourcing.bonus.hostTaxableAmount, currency)}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Performance Period Days</span>
                    <span className="font-medium text-amber-800">{result.splitSourcing.bonus.performancePeriodDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Days in Host During Period</span>
                    <span className="font-medium text-amber-800">{result.splitSourcing.bonus.overlapDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-700">Host Ratio</span>
                    <span className="font-medium text-amber-800">{(result.splitSourcing.bonus.hostRatio * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            )}
            {result.homeCompensation.equityIncome > 0 && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-800 mb-2">Equity Split-Sourcing</h4>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Total Equity ({equityTypes.find(t => t.value === result.input.equityType)?.label})</p>
                    <p className="text-lg font-semibold text-purple-800">{fmt(result.homeCompensation.equityIncome, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Host-Taxable Equity</p>
                    <p className="text-lg font-semibold text-purple-800">{fmt(result.splitSourcing.equity.hostTaxableAmount, currency)}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Vesting Period Days</span>
                    <span className="font-medium text-purple-800">{result.splitSourcing.equity.vestingPeriodDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Days in Host During Vesting</span>
                    <span className="font-medium text-purple-800">{result.splitSourcing.equity.overlapDays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Host Ratio</span>
                    <span className="font-medium text-purple-800">{(result.splitSourcing.equity.hostRatio * 100).toFixed(2)}%</span>
                  </div>
                </div>
                <p className="text-xs text-purple-500 mt-3">
                  Equity split-sourced by day-count during the vesting period per HMRC / IRC &sect;861 rules.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* One-off Payment Analysis */}
      {result.oneOffAnalysis && (
        <Card title="One-off Payment Analysis">
          <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-rose-700 font-medium">Payment Amount</span>
                <span className="font-semibold text-rose-800">{fmt(result.oneOffAnalysis.payment, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700">Less: Hypo Tax ({(result.oneOffAnalysis.marginalRate * 100).toFixed(0)}%)</span>
                <span className="font-medium text-red-600">({fmt(result.oneOffAnalysis.hypoTax, currency)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700">Less: Marginal Employee Social Security</span>
                <span className="font-medium text-red-600">({fmt(result.oneOffAnalysis.hypoSS, currency)})</span>
              </div>
              <div className="flex justify-between border-t border-rose-200 pt-1.5">
                <span className="text-rose-700 font-medium">Net Payment to Employee</span>
                <span className="font-semibold text-rose-800">{fmt(result.oneOffAnalysis.netToEmployee, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700">Add: Host Tax Gross-Up</span>
                <span className="font-medium text-rose-800">{fmt(result.oneOffAnalysis.hostTaxGrossUp, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700">Add: Employer Social Security</span>
                <span className="font-medium text-rose-800">{fmt(result.oneOffAnalysis.employerSS, currency)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-rose-300 pt-2 mt-1">
                <span className="text-rose-800 font-bold">Total Employer Cost of One-Off</span>
                <span className="font-bold text-[#40AEBC] text-base">{fmt(result.oneOffAnalysis.totalCost, currency)}</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

/* ─── Planning Insights ─── */
function PlanningInsights({ result, currency, input }: {
  result: NonNullable<ReturnType<typeof computeEstimate>>;
  currency: string;
  input: EstimateInput;
}) {
  const taxDiff = result.hostTax.totalIncomeTax - result.homeTax.totalIncomeTax;
  const ssDiff = (result.hostTax.ssEmployee + result.hostTax.ssEmployer) - (result.homeTax.ssEmployee + result.homeTax.ssEmployer);
  const equityRatio = result.homeCompensation.equityIncome > 0
    ? result.homeCompensation.equityIncome / result.homeCompensation.totalGross * 100
    : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card title="Planning Opportunities & Tax Insights">
        <div className="space-y-4">
          {/* Tax Position */}
          <InsightCard
            title="Tax Position"
            status={taxDiff > 0 ? 'warning' : 'positive'}
            description={taxDiff > 0
              ? `Host country taxes are ${fmt(taxDiff, currency)} higher than home. Tax equalisation protects the employee but increases employer cost.`
              : `Host country taxes are ${fmt(Math.abs(taxDiff), currency)} lower than home. The employee benefits under tax protection; under equalisation the employer saves.`
            }
          />

          {/* SS Strategy */}
          <InsightCard
            title="Social Security Strategy"
            status={ssDiff > 0 ? 'info' : 'positive'}
            description={`Current strategy: ${input.ssStrategy === 'home' ? 'Home Only (A1/CoC)' : input.ssStrategy === 'host' ? 'Host Only' : 'Dual Liability'}. ${
              ssDiff > 0 ? `Host SS costs are ${fmt(ssDiff, currency)} higher.` : `Home SS arrangement saves ${fmt(Math.abs(ssDiff), currency)}.`
            } Consider totalisation agreements where available.`}
          />

          {/* Equity */}
          {equityRatio > 0 && (
            <InsightCard
              title="Equity Income Considerations"
              status="info"
              description={`Equity represents ${equityRatio.toFixed(1)}% of total compensation (${fmt(result.homeCompensation.equityIncome, currency)}). ${
                input.equityType === 'rsu' ? 'RSU vesting during assignment triggers split-sourcing obligations.' :
                input.equityType === 'options' ? 'Options exercised during assignment may require host reporting.' :
                'Review equity plan terms for cross-border implications.'
              } Consider timing of vesting/exercise relative to assignment dates.`}
            />
          )}

          {/* Bonus */}
          {result.homeCompensation.annualBonus > 0 && (
            <InsightCard
              title="Bonus Tax Treatment"
              status="info"
              description={`Annual bonus of ${fmt(result.homeCompensation.annualBonus, currency)} (${(result.homeCompensation.annualBonus / result.homeCompensation.baseSalary * 100).toFixed(1)}% of base). Bonus earned during assignment is typically taxable in the host country. Consider bonus accrual timing relative to assignment start/end dates.`}
            />
          )}

          {/* Housing */}
          {result.benefits.housing > 0 && (
            <InsightCard
              title="Housing Market"
              status="neutral"
              description={`Housing allowance: ${fmt(result.benefits.housing, currency)}/year (${fmt(result.benefits.housing / 12, currency)}/month). This represents ${(result.benefits.housing / result.totalEstimatedCost * 100).toFixed(1)}% of total assignment cost. Consider corporate housing vs. allowance for cost optimisation.`}
            />
          )}
        </div>
      </Card>

      {/* Projection */}
      <Card title="Cost Projection">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Year</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Compensation</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Allowances</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Tax & SS</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil(input.durationMonths / 12) }, (_, i) => {
                const inflationFactor = Math.pow(1.03, i); // 3% annual inflation
                const comp = result.homeCompensation.totalGross * inflationFactor;
                const allow = result.benefits.totalAllowances * inflationFactor;
                const taxSS = (result.grossUp.totalGrossUp + result.homeTax.ssEmployer) * inflationFactor;
                const total = result.totalEstimatedCost * inflationFactor;
                return (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 font-medium text-slate-700">Year {i + 1}</td>
                    <td className="py-2 text-right text-slate-600">{fmt(comp, currency)}</td>
                    <td className="py-2 text-right text-slate-600">{fmt(allow, currency)}</td>
                    <td className="py-2 text-right text-slate-600">{fmt(taxSS, currency)}</td>
                    <td className="py-2 text-right font-semibold text-slate-800">{fmt(total, currency)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <td className="py-2 font-bold text-slate-800">Total</td>
                <td className="py-2 text-right text-slate-600">—</td>
                <td className="py-2 text-right text-slate-600">—</td>
                <td className="py-2 text-right text-slate-600">—</td>
                <td className="py-2 text-right font-bold text-[#40AEBC]">{fmt(
                  Array.from({ length: Math.ceil(input.durationMonths / 12) }, (_, i) => result.totalEstimatedCost * Math.pow(1.03, i)).reduce((a, b) => a + b, 0),
                  currency
                )}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─── Reusable Components ─── */
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function CurrencyInput({ value, onChange, currency, compact, placeholder }: { value: number; onChange: (v: number) => void; currency: string; compact?: boolean; placeholder?: string }) {
  return (
    <div className={`flex items-center gap-1 ${compact ? 'w-40' : ''}`}>
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(+e.target.value)}
        className={`input-field flex-1 ${compact ? 'text-xs py-1' : ''}`}
        min={0}
        placeholder={placeholder}
      />
      <span className={`text-slate-400 shrink-0 ${compact ? 'text-[10px]' : 'text-xs'}`}>{currency}</span>
    </div>
  );
}

function SummaryRow({ label, value, currency, bold, muted, accent }: {
  label: string; value: number; currency: string; bold?: boolean; muted?: boolean; accent?: string;
}) {
  const colorClass = accent === 'amber' ? 'text-amber-600' : accent === 'purple' ? 'text-purple-600' : '';
  return (
    <div className={`flex justify-between items-center py-1 ${muted ? 'opacity-50' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'} ${colorClass}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-semibold text-slate-800' : 'text-slate-700'} ${colorClass}`}>
        {value < 0 ? `(${fmt(Math.abs(value), currency)})` : fmt(value, currency)}
      </span>
    </div>
  );
}

function SubtotalRow({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-t border-dashed border-slate-200 mt-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <span className="text-sm font-semibold text-slate-800 tabular-nums">{fmt(value, currency)}</span>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1">
      <h4 className="text-xs font-semibold text-[#40AEBC] uppercase tracking-wider">{label}</h4>
    </div>
  );
}

function TaxSummaryCard({ title, rate, tax, ss, currency, color }: {
  title: string; rate: number; tax: number; ss: number; currency: string; color: string;
}) {
  const borderColor = color === 'blue' ? 'border-blue-200' : color === 'emerald' ? 'border-emerald-200' : 'border-amber-200';
  const bgColor = color === 'blue' ? 'bg-blue-50' : color === 'emerald' ? 'bg-emerald-50' : 'bg-amber-50';
  const textColor = color === 'blue' ? 'text-blue-700' : color === 'emerald' ? 'text-emerald-700' : 'text-amber-700';
  return (
    <div className={`rounded-lg p-3 border ${borderColor} ${bgColor}`}>
      <p className={`text-xs font-semibold ${textColor} uppercase tracking-wider`}>{title}</p>
      <p className={`text-2xl font-bold ${textColor} mt-1`}>{(rate * 100).toFixed(1)}%</p>
      <p className="text-xs text-slate-500 mt-1">Effective Rate</p>
      <div className="mt-2 pt-2 border-t border-slate-200/50 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Income Tax</span>
          <span className="text-slate-700 font-medium">{fmt(tax, currency)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Social Security</span>
          <span className="text-slate-700 font-medium">{fmt(ss, currency)}</span>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ title, status, description }: { title: string; status: 'positive' | 'warning' | 'info' | 'neutral'; description: string }) {
  const styles = {
    positive: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', title: 'text-emerald-800' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-500', title: 'text-amber-800' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-500', title: 'text-blue-800' },
    neutral: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-500', title: 'text-slate-800' },
  }[status];
  const icons = { positive: '\u2713', warning: '\u26a0', info: '\u2139', neutral: '\u2022' };

  return (
    <div className={`rounded-lg p-4 border ${styles.border} ${styles.bg}`}>
      <div className="flex items-start gap-3">
        <span className={`text-lg ${styles.icon}`}>{icons[status]}</span>
        <div>
          <h4 className={`text-sm font-semibold ${styles.title}`}>{title}</h4>
          <p className="text-sm text-slate-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default App;
