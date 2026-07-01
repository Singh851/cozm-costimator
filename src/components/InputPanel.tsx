import type { EstimateInput, Country } from '../types';
import { countries, getFxToUSD } from '../data/countries';
import { assignmentTypes, equityTypes, vestingSchedules, familyStatuses, currencies } from '../data/benefits';
import { Card, Field, CurrencyInput, fmt } from './ui';

const sortedCountries = countries.slice().sort((a, b) => a.name.localeCompare(b.name));

export function InputPanel({
  input, update, updateBenefit, handleCountryChange, homeCountry, hostCountry,
}: {
  input: EstimateInput;
  update: (p: Partial<EstimateInput>) => void;
  updateBenefit: (id: string, changes: Record<string, unknown>) => void;
  handleCountryChange: (field: 'homeCountryCode' | 'hostCountryCode', code: string) => void;
  homeCountry: Country | undefined;
  hostCountry: Country | undefined;
}) {
  const hostDays = input.hostDaysPerYear ?? 365;
  const hostPct = Math.round(hostDays / 365 * 100);

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
        <Field label="Inflation Rate (%)" hint="Applied to year-by-year cost projections">
          <input
            type="number"
            value={((input.inflationRate ?? 0.03) * 100)}
            onChange={e => update({ inflationRate: +e.target.value / 100 })}
            className="input-field"
            min={0}
            max={20}
            step={0.5}
          />
        </Field>
        <Field label="Assignment Type" hint="Choose the assignment type to apply standard benefits and tax logic">
          <select
            value={input.assignmentType}
            onChange={e => {
              const type = e.target.value as EstimateInput['assignmentType'];
              const updates: Partial<EstimateInput> = { assignmentType: type };
              if (type === 'commuter' && (input.hostDaysPerYear ?? 365) === 365) {
                updates.hostDaysPerYear = 183;
              }
              update(updates);
            }}
            className="input-field"
          >
            {assignmentTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Days in Host Country" hint={`${hostDays} days host / ${365 - hostDays} days home = ${hostPct}% host, ${100 - hostPct}% home`}>
          <div className="flex items-center gap-3">
            <input
              type="range"
              value={input.hostDaysPerYear ?? 365}
              onChange={e => update({ hostDaysPerYear: +e.target.value })}
              className="flex-1 accent-[#40AEBC] h-2 cursor-pointer"
              min={0}
              max={365}
              step={1}
            />
            <input
              type="number"
              value={input.hostDaysPerYear ?? 365}
              onChange={e => update({ hostDaysPerYear: Math.max(0, Math.min(365, +e.target.value)) })}
              className="input-field w-16 text-center text-xs"
              min={0}
              max={365}
            />
          </div>
          {/* Visual split bar */}
          <div className="mt-2">
            <div className="flex rounded-full overflow-hidden h-3">
              <div className="bg-[#40AEBC] transition-all" style={{ width: `${hostPct}%` }} />
              <div className="bg-slate-300 transition-all" style={{ width: `${100 - hostPct}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Host: {hostDays} days ({hostPct}%)</span>
              <span>Home: {365 - hostDays} days ({100 - hostPct}%)</span>
            </div>
          </div>
        </Field>
        <Field label="Host Role %" hint="For split-role / partial assignments (e.g. 30% host, 70% home). Scales host-taxable base salary.">
          <input
            type="number"
            value={input.hostRolePercentage ?? 100}
            onChange={e => update({ hostRolePercentage: Math.max(0, Math.min(100, +e.target.value)) })}
            className="input-field"
            min={0}
            max={100}
            step={5}
          />
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
            <input
              type="number"
              value={input.numChildren || ''}
              onChange={e => {
                const raw = e.target.value;
                update({ numChildren: raw === '' ? 0 : parseInt(raw, 10) || 0 });
              }}
              className="input-field"
              min={1}
              max={10}
              placeholder="1"
            />
          </Field>
        )}
      </Card>

      {/* Compensation */}
      <Card title="Compensation" subtitle="Enter annual gross amounts in the selected currency">
        <Field label="Annual Base Salary">
          <CurrencyInput value={input.baseSalary} onChange={v => update({ baseSalary: v })} currency={input.currency} />
        </Field>

        {/* Cash Incentive Plan */}
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-amber-800">Cash Incentive Plan</label>
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
          <div className="mb-2">
            <label className="text-xs text-amber-600 mb-1 block">Plan Name</label>
            <input
              type="text"
              value={input.incentivePlanName || ''}
              onChange={e => update({ incentivePlanName: e.target.value })}
              placeholder="e.g. Annual STIP, 3-Year LTIP"
              className="input-field text-xs"
            />
          </div>
          <div className="mb-2">
            <label className="text-xs text-amber-600 mb-1 block">Performance Period Type</label>
            <div className="flex items-center gap-2">
              {(['annual', '3year', 'custom'] as const).map(pt => (
                <button
                  key={pt}
                  onClick={() => update({ performancePeriodType: pt })}
                  className={`px-2 py-0.5 text-xs rounded ${input.performancePeriodType === pt ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-700'}`}
                >
                  {pt === 'annual' ? 'Annual' : pt === '3year' ? '3-Year' : 'Custom'}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-2">
            <label className="text-xs text-amber-600 mb-1 block">Target</label>
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
          </div>
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
          <p className="text-xs text-amber-600 mt-1">Target incentive — included in hypothetical tax and gross-up calculations</p>
        </div>

        {/* Equity Income */}
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
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div
                className={`toggle-switch shrink-0 ${input.equityQualifying ? 'active' : ''}`}
                onClick={() => update({ equityQualifying: !input.equityQualifying })}
              />
              <span className="text-xs text-purple-700">Qualifying Plan</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`toggle-switch shrink-0 ${input.equityCarveOut ? 'active' : ''}`}
                onClick={() => update({ equityCarveOut: !input.equityCarveOut })}
              />
              <span className="text-xs text-purple-700">Carve-Out from Tax EQ</span>
            </div>
          </div>
          <p className="text-xs text-purple-600 mt-1.5">
            Equity compensation subject to split-sourcing rules between home and host jurisdictions.
            {input.equityType === 'rsu' && ' RSUs are typically taxed as ordinary income upon vesting.'}
            {input.equityType === 'options' && ' Stock options may qualify for capital gains treatment in some jurisdictions.'}
            {input.equityType === 'espp' && ' ESPP discount is generally treated as ordinary income.'}
            {input.equityType === 'phantom' && ' Phantom equity is always taxed as ordinary income.'}
            {input.equityCarveOut && ' Equity income is carved out from the hypothetical tax base.'}
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
        {input.equityIncome > 0 && (
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
            <div className="flex items-center gap-2">
              <div
                className={`toggle-switch shrink-0 ${input.equityCarveOut ? 'active' : ''}`}
                onClick={() => update({ equityCarveOut: !input.equityCarveOut })}
              />
              <div>
                <span className="text-xs font-medium text-purple-800">Equity Carve-Out from Tax Equalisation</span>
                <p className="text-[10px] text-purple-600">When enabled, equity income is excluded from the hypothetical tax base</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Other Compensation & Benefits */}
      <Card title="Other Items" subtitle="Custom compensation and benefit line items">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Other Compensation</label>
            <p className="text-[10px] text-slate-400 mb-2">Added to gross comp (fully taxable + SS chargeable)</p>
            {(input.otherCompensation || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => {
                    const items = [...(input.otherCompensation || [])];
                    items[idx] = { ...items[idx], name: e.target.value };
                    update({ otherCompensation: items });
                  }}
                  placeholder="e.g. Hardship Allowance"
                  className="input-field text-xs flex-1"
                />
                <CurrencyInput
                  value={item.amount}
                  onChange={v => {
                    const items = [...(input.otherCompensation || [])];
                    items[idx] = { ...items[idx], amount: v };
                    update({ otherCompensation: items });
                  }}
                  currency={input.currency}
                  compact
                />
                <button
                  onClick={() => {
                    const items = (input.otherCompensation || []).filter((_, i) => i !== idx);
                    update({ otherCompensation: items });
                  }}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >✕</button>
              </div>
            ))}
            {(input.otherCompensation || []).length < 3 && (
              <button
                onClick={() => update({ otherCompensation: [...(input.otherCompensation || []), { name: '', amount: 0 }] })}
                className="text-xs text-[#40AEBC] hover:text-[#2D8A96] font-medium"
              >+ Add Compensation Item</button>
            )}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Other Benefits</label>
            <p className="text-[10px] text-slate-400 mb-2">Added to allowances (grossed up, fully taxable + SS chargeable)</p>
            {(input.otherBenefits || []).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={item.name}
                  onChange={e => {
                    const items = [...(input.otherBenefits || [])];
                    items[idx] = { ...items[idx], name: e.target.value };
                    update({ otherBenefits: items });
                  }}
                  placeholder="e.g. Language Training"
                  className="input-field text-xs flex-1"
                />
                <CurrencyInput
                  value={item.amount}
                  onChange={v => {
                    const items = [...(input.otherBenefits || [])];
                    items[idx] = { ...items[idx], amount: v };
                    update({ otherBenefits: items });
                  }}
                  currency={input.currency}
                  compact
                />
                <button
                  onClick={() => {
                    const items = (input.otherBenefits || []).filter((_, i) => i !== idx);
                    update({ otherBenefits: items });
                  }}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >✕</button>
              </div>
            ))}
            {(input.otherBenefits || []).length < 3 && (
              <button
                onClick={() => update({ otherBenefits: [...(input.otherBenefits || []), { name: '', amount: 0 }] })}
                className="text-xs text-[#40AEBC] hover:text-[#2D8A96] font-medium"
              >+ Add Benefit Item</button>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
