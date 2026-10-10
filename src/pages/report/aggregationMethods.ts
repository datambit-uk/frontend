export interface AggregationMethodCopy {
  id: string;
  label: string;
  explanation: string;
}

/** Methods shown on the report, in display order. Min/max confidence stay off the page. */
export const REPORT_AGGREGATIONS: AggregationMethodCopy[] = [
  {
    id: 'persistent_peak_run',
    label: 'Peak run',
    explanation:
      'A one-window spike is trusted in a short clip and discounted as the clip gets longer. A suspicious stretch of a few windows keeps its score. One fake window in a two-window clip is enough to call the video fake.',
  },
  {
    id: 'max_fake_confidence',
    label: 'Max fake',
    explanation:
      'The file score is the single window with the highest fake probability. One strongly fake moment is enough to call the video fake.',
  },
  {
    id: 'dual_branch',
    label: 'Dual branch',
    explanation:
      'Every window contributes to a tempered average, so repeated similar windows cannot push the score to 1 on their own. The most suspicious windows then pull that average slightly toward the peak.',
  },
  {
    id: 'majority_vote',
    label: 'Majority vote',
    explanation:
      'Each window votes for its most likely class. The file score is the share of windows that voted for a fake class rather than real.',
  },
];

const REPORT_AGGREGATION_IDS = new Set(REPORT_AGGREGATIONS.map((method) => method.id));

export const aggregationCopy = (method: string): AggregationMethodCopy | undefined =>
  REPORT_AGGREGATIONS.find((item) => item.id === method);

export const isReportAggregation = (method: string): boolean =>
  REPORT_AGGREGATION_IDS.has(method);
