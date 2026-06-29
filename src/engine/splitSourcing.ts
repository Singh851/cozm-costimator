import type { EstimateInput, SplitSourcingResult } from '../types';

const MS_PER_DAY = 86_400_000;

/** Inclusive day count between two dates */
export function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
}

/** Overlap days between two date ranges (inclusive). Returns 0 if no overlap. */
export function overlapDays(
  periodStart: Date, periodEnd: Date,
  assignStart: Date, assignEnd: Date,
): number {
  const overlapStart = periodStart > assignStart ? periodStart : assignStart;
  const overlapEnd = periodEnd < assignEnd ? periodEnd : assignEnd;
  if (overlapStart > overlapEnd) return 0;
  return daysBetween(overlapStart, overlapEnd);
}

/** Compute assignment end date from start + duration in months */
export function computeAssignmentEnd(start: Date, months: number): Date {
  const end = new Date(start);
  const targetMonth = end.getUTCMonth() + months;
  end.setUTCMonth(targetMonth);
  // Clamp day-of-month to avoid month-rollover (e.g. Jan 31 + 1mo → Mar 3)
  if (end.getUTCMonth() !== ((targetMonth % 12) + 12) % 12) {
    end.setUTCDate(0); // last day of previous month
  }
  end.setUTCDate(end.getUTCDate() - 1); // last day of assignment
  return end;
}

function parseDate(s: string): Date {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(NaN);
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function computeSplitSourcing(input: EstimateInput): SplitSourcingResult {
  let assignStart = parseDate(input.startDate);
  // Guard: if startDate is malformed, fall back to today
  if (isNaN(assignStart.getTime())) {
    const today = new Date();
    assignStart = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  }
  const assignEnd = computeAssignmentEnd(assignStart, input.durationMonths);

  const annualBonus = input.bonusType === 'percentage'
    ? (input.baseSalary || 0) * (input.bonusPercentage / 100)
    : (input.annualBonus || 0);
  const equityIncome = input.equityIncome || 0;

  // Bonus split-sourcing
  let bonusResult: SplitSourcingResult['bonus'];
  if (input.bonusPerformancePeriodStart && input.bonusPerformancePeriodEnd && annualBonus > 0) {
    const perfStart = parseDate(input.bonusPerformancePeriodStart);
    const perfEnd = parseDate(input.bonusPerformancePeriodEnd);
    const totalDays = daysBetween(perfStart, perfEnd);
    const overlap = overlapDays(perfStart, perfEnd, assignStart, assignEnd);
    const ratio = totalDays > 0 ? overlap / totalDays : 1;
    bonusResult = {
      performancePeriodDays: totalDays,
      overlapDays: overlap,
      hostRatio: ratio,
      hostTaxableAmount: Math.round(annualBonus * ratio),
    };
  } else {
    // Default: 100% host (backward compatible — full amount taxable in host)
    bonusResult = {
      performancePeriodDays: 365,
      overlapDays: 365,
      hostRatio: 1.0,
      hostTaxableAmount: annualBonus,
    };
  }

  // Equity split-sourcing
  let equityResult: SplitSourcingResult['equity'];
  if (input.equityVestingStart && input.equityVestingEnd && equityIncome > 0) {
    const vestStart = parseDate(input.equityVestingStart);
    const vestEnd = parseDate(input.equityVestingEnd);
    const totalDays = daysBetween(vestStart, vestEnd);
    const overlap = overlapDays(vestStart, vestEnd, assignStart, assignEnd);
    const ratio = totalDays > 0 ? overlap / totalDays : 1;
    equityResult = {
      vestingPeriodDays: totalDays,
      overlapDays: overlap,
      hostRatio: ratio,
      hostTaxableAmount: Math.round(equityIncome * ratio),
    };
  } else {
    equityResult = {
      vestingPeriodDays: 365,
      overlapDays: 365,
      hostRatio: 1.0,
      hostTaxableAmount: equityIncome,
    };
  }

  return {
    bonus: bonusResult,
    equity: equityResult,
    assignmentStart: input.startDate,
    assignmentEnd: assignEnd.toISOString().slice(0, 10),
  };
}
