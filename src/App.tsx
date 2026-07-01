import { useState, useMemo, useCallback } from 'react';
import type { EstimateInput } from './types';
import { countries } from './data/countries';
import { getDefaultBenefits, equityTypes } from './data/benefits';
import { computeEstimate } from './engine/costEstimate';
import { CostCharts } from './components/Charts';
import { TaxBreakdown } from './components/TaxBreakdown';
import { BalanceSheet } from './components/BalanceSheet';
import { PrintReport } from './components/PrintReport';
import { TaxReference } from './components/TaxReference';
import { CompensationStatement } from './components/CompensationStatement';
import { InputPanel } from './components/InputPanel';
import { CostComparison } from './components/CostComparison';
import { fmt, Card, SummaryRow, SubtotalRow, SectionHeader, MetricCard, TaxSummaryCard, InsightCard } from './components/ui';

function App() {
  const [activeTab, setActiveTab] = useState<'estimate' | 'host' | 'hypo' | 'planning' | 'compStatement' | 'compare'>('estimate');
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
    incentivePlanName: '',
    performancePeriodType: 'annual',
    equityQualifying: false,
    equityCarveOut: false,
    inflationRate: 0.03,
    otherCompensation: [],
    otherBenefits: [],
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
              { id: 'compStatement' as const, label: 'Compensation Statement' },
              { id: 'compare' as const, label: 'Compare' },
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

        {activeTab === 'compStatement' && result && (
          <CompensationStatement
            result={result}
            currency={input.currency}
            input={input}
            homeCountry={homeCountry}
            hostCountry={hostCountry}
          />
        )}

        {activeTab === 'compare' && (
          <CostComparison
            result={result}
            input={input}
            currency={input.currency}
            homeCountry={homeCountry}
            hostCountry={hostCountry}
          />
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

      {/* Days Split Bar */}
      {(result.input.hostDaysPerYear ?? 365) < 365 && (() => {
        const hostDays = result.input.hostDaysPerYear ?? 365;
        const homeDays = 365 - hostDays;
        const hostPct = Math.round(hostDays / 365 * 100);
        return (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">Home / Host Split</h3>
              <span className="text-xs text-slate-400">{result.input.assignmentType === 'commuter' ? 'Commuter Assignment' : 'Partial Assignment'}</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-4">
              <div className="bg-[#40AEBC] transition-all flex items-center justify-center" style={{ width: `${hostPct}%` }}>
                {hostPct >= 20 && <span className="text-[10px] font-semibold text-white">{hostPct}%</span>}
              </div>
              <div className="bg-slate-300 transition-all flex items-center justify-center" style={{ width: `${100 - hostPct}%` }}>
                {(100 - hostPct) >= 20 && <span className="text-[10px] font-semibold text-slate-600">{100 - hostPct}%</span>}
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1.5">
              <span>Host: {hostDays} days/year</span>
              <span>Home: {homeDays} days/year</span>
            </div>
          </div>
        );
      })()}

      {/* Compensation Summary */}
      <Card title="Compensation Summary">
        <div className="space-y-2">
          <SummaryRow label="Base Salary" value={result.homeCompensation.baseSalary} currency={currency} />
          <SummaryRow label={result.input.incentivePlanName?.trim() || 'Annual Bonus'} value={result.homeCompensation.annualBonus} currency={currency} accent="amber" />
          <SummaryRow label="Equity Income" value={result.homeCompensation.equityIncome} currency={currency} accent="purple" />
          <div className="border-t border-slate-200 pt-2">
            <SummaryRow label="Total Gross Compensation" value={result.homeCompensation.totalGross} currency={currency} bold />
          </div>
        </div>
      </Card>

      {/* Key Metrics */}
      <Card title="Key Metrics">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Cost / Month" value={fmt(result.monthlyCost, currency)} />
          <MetricCard label="Cost Multiple" value={`${(result.totalEstimatedCost / (result.homeCompensation.baseSalary || 1)).toFixed(2)}x base`} />
          <MetricCard label="Tax EQ Premium" value={fmt(result.hostTaxOnComp - result.hypoTax.totalIncomeTax, currency)} sub={result.hostTaxOnComp > result.hypoTax.totalIncomeTax ? 'Host tax exceeds hypo' : 'Hypo exceeds host tax'} />
          <MetricCard label="SS Employer Cost" value={fmt(result.costBreakdown.find(c => c.category === 'Employer SS')?.amount ?? 0, currency)} sub={`Strategy: ${result.input.ssStrategy}`} />
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
          <SummaryRow label={result.input.incentivePlanName?.trim() || 'Annual Bonus'} value={result.homeCompensation.annualBonus} currency={currency} />
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
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-purple-800">Equity Split-Sourcing</h4>
                  <div className="flex items-center gap-2">
                    {result.input.equityQualifying !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${result.input.equityQualifying ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {result.input.equityQualifying ? 'Qualifying' : 'Non-Qualifying'}
                      </span>
                    )}
                    {result.input.equityCarveOut && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-200 text-purple-800">Carved Out</span>
                    )}
                  </div>
                </div>
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
        <Card title="One-off Payment Analysis" subtitle="Hypothetical tax calculation on one-time payment">
          <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
            <div className="space-y-1.5 text-sm">
              {/* Step 1: Gross payment */}
              <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider pb-1">Step 1: Employee Deductions</p>
              <div className="flex justify-between">
                <span className="text-rose-700 font-medium">Gross One-Time Payment</span>
                <span className="font-semibold text-rose-800">{fmt(result.oneOffAnalysis.payment, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700">Less: Hypothetical Tax at Marginal Rate ({(result.oneOffAnalysis.marginalRate * 100).toFixed(1)}%)</span>
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

              {/* Step 2: Employer costs */}
              <p className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider pt-3 pb-1">Step 2: Employer Tax Cost</p>
              <div className="flex justify-between">
                <span className="text-rose-700">Host Tax Gross-Up on Payment</span>
                <span className="font-medium text-rose-800">{fmt(result.oneOffAnalysis.hostTaxGrossUp, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700">Marginal Employer Social Security</span>
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
      <Card title={`Cost Projection (${((input.inflationRate ?? 0.03) * 100).toFixed(1)}% inflation)`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase">Year</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Base Salary</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Incentive</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Equity</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Allowances</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Tax & SS</th>
                <th className="text-right py-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const inflationRate = input.inflationRate ?? 0.03;
                const assignmentYears = Math.ceil(input.durationMonths / 12);
                const employerSSCost = result.costBreakdown.find(c => c.category === 'Employer SS')?.amount ?? 0;
                const rows: React.ReactNode[] = [];
                let grandTotal = 0;

                for (let i = 0; i < assignmentYears; i++) {
                  const f = Math.pow(1 + inflationRate, i);
                  const base = result.homeCompensation.baseSalary * f;
                  const incentive = result.homeCompensation.annualBonus * f;
                  const equity = result.homeCompensation.equityIncome * f;
                  const allow = result.benefits.totalAllowances * f;
                  const taxSS = (result.hostTaxOnComp - result.hypoTax.totalIncomeTax + result.grossUp.totalGrossUp + employerSSCost) * f;
                  const total = result.totalEstimatedCost * f;
                  grandTotal += total;
                  rows.push(
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 font-medium text-slate-700">Year {i + 1}</td>
                      <td className="py-2 text-right text-slate-600">{fmt(base, currency)}</td>
                      <td className="py-2 text-right text-slate-600">{fmt(incentive, currency)}</td>
                      <td className="py-2 text-right text-slate-600">{fmt(equity, currency)}</td>
                      <td className="py-2 text-right text-slate-600">{fmt(allow, currency)}</td>
                      <td className="py-2 text-right text-slate-600">{fmt(taxSS, currency)}</td>
                      <td className="py-2 text-right font-semibold text-slate-800">{fmt(total, currency)}</td>
                    </tr>
                  );
                }

                // Trailing years for bonus/equity beyond assignment end
                const hasTrailing = (result.homeCompensation.annualBonus > 0 || result.homeCompensation.equityIncome > 0);
                if (hasTrailing) {
                  const tf = Math.pow(1 + inflationRate, assignmentYears);
                  const trailingIncentive = result.homeCompensation.annualBonus * tf;
                  const trailingEquity = result.homeCompensation.equityIncome * tf;
                  const trailingTotal = trailingIncentive + trailingEquity;
                  if (trailingTotal > 0) {
                    grandTotal += trailingTotal;
                    rows.push(
                      <tr key="trailing" className="border-b border-slate-100 bg-amber-50/50">
                        <td className="py-2 font-medium text-amber-700 text-xs">Post-Assignment</td>
                        <td className="py-2 text-right text-slate-400">—</td>
                        <td className="py-2 text-right text-amber-600">{fmt(trailingIncentive, currency)}</td>
                        <td className="py-2 text-right text-amber-600">{fmt(trailingEquity, currency)}</td>
                        <td className="py-2 text-right text-slate-400">—</td>
                        <td className="py-2 text-right text-slate-400">—</td>
                        <td className="py-2 text-right font-semibold text-amber-700">{fmt(trailingTotal, currency)}</td>
                      </tr>
                    );
                  }
                }

                rows.push(
                  <tr key="total" className="border-t-2 border-slate-300">
                    <td className="py-2 font-bold text-slate-800">Total</td>
                    <td className="py-2 text-right text-slate-400">—</td>
                    <td className="py-2 text-right text-slate-400">—</td>
                    <td className="py-2 text-right text-slate-400">—</td>
                    <td className="py-2 text-right text-slate-400">—</td>
                    <td className="py-2 text-right text-slate-400">—</td>
                    <td className="py-2 text-right font-bold text-[#40AEBC]">{fmt(grandTotal, currency)}</td>
                  </tr>
                );

                return rows;
              })()}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default App;
