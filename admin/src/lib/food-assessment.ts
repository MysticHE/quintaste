type Finding = { decision?: string; reason?: string; confidence?: number; failed?: boolean };
export type FoodAssessment = {
  code: 'needs-evidence' | 'conflict' | 'low-confidence' | 'worker-error' | 'clear' | 'hold';
  label: string; mint: string; kaya: string; agreement: boolean; needsOwner: boolean; threshold: number;
};
const labels: Record<string, string> = { clear: 'Clear', hold: 'Food-policy concern', uncertain: 'Needs evidence' };

/** A review of evidence, not an estimate of the probability that food contains meat. Also explains older stored decisions. */
export function foodAssessment(evidence: Record<string, unknown>, confidence: number | null, floor = 0.95): FoodAssessment {
  const mint = (evidence.mint ?? {}) as Finding, kaya = (evidence.kaya ?? {}) as Finding;
  const agreement = Boolean(mint.decision && mint.decision === kaya.decision);
  const base = { mint: labels[mint.decision ?? ''] ?? 'Not completed', kaya: labels[kaya.decision ?? ''] ?? 'Not completed', agreement, threshold: floor };
  const failed = (value: Finding) => value.failed === true || value.confidence === 0 && value.reason === 'The worker could not finish this review. Staff attention is needed.';
  if (failed(mint) || failed(kaya)) return { ...base, code: 'worker-error', label: 'Review could not finish', needsOwner: true };
  if (!labels[mint.decision ?? ''] || !labels[kaya.decision ?? ''] || agreement && mint.decision === 'uncertain') return { ...base, code: 'needs-evidence', label: 'Needs evidence', needsOwner: true };
  if (!agreement) return { ...base, code: 'conflict', label: 'Different verdicts', needsOwner: true };
  if (confidence === null || confidence < floor) return { ...base, code: 'low-confidence', label: 'Below confidence threshold', needsOwner: true };
  return { ...base, code: mint.decision === 'clear' ? 'clear' : 'hold', label: mint.decision === 'clear' ? 'Food eligibility cleared' : 'Food-policy concern', needsOwner: false };
}

export const foodAskWhy = (status: FoodAssessment) => status.code === 'conflict' ? 'disagree' as const
  : status.code === 'low-confidence' ? 'weak' as const : status.needsOwner ? 'rule' as const : null;
