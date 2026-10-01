/** Badge colour for every status used in the app (ported from the prototype's tone map). */
export type Tone = 'green' | 'gray' | 'red' | 'blue' | 'purple' | 'amber';

const TONES: Record<string, Tone> = {
  active: 'green', approved: 'green', verified: 'green', certified: 'green', accepted: 'green', paid: 'green', signed: 'green',
  compliant: 'green', completed: 'green', awarded: 'green', received: 'green', onboarded: 'green', released: 'green',
  'spend authorized': 'green', matched: 'green', met: 'green', open_gate: 'green',
  closed: 'gray', superseded: 'gray', disabled: 'gray', inactive: 'gray', draft: 'gray', 'not sent': 'gray',
  'nothing to bill': 'gray', 'fully consumed': 'gray', cancelled: 'gray', 'short-closed': 'gray', 'not required': 'gray',
  expired: 'red', overdue: 'red', rejected: 'red', blacklisted: 'red', 'non-compliant': 'red', disputed: 'red', missing: 'red',
  'action required': 'red', returned: 'red', declined: 'red', late: 'red', terminated: 'red', failed: 'red', blocked: 'red',
  mismatch: 'red', failing: 'red', critical: 'red', major: 'red',
  submitted: 'blue', issued: 'blue', 'in progress': 'blue', sent: 'blue', 'in review': 'blue', 'under review': 'blue',
  'to send': 'blue', 'claim submitted': 'blue', 'awaiting review': 'blue', 'rework done': 'blue', rectified: 'blue', investigating: 'blue',
  'quotes received': 'purple', prospective: 'purple', held: 'purple', 'in dlp': 'purple', 'partially ordered': 'purple',
  'partially awarded': 'purple', 'partially billed': 'purple', 'handed over': 'purple', 'retention & guarantees': 'purple',
  'pending approval': 'amber', pending: 'amber', 'partially paid': 'amber', 'partially received': 'amber', expiring: 'amber',
  'on hold': 'amber', 'docs pending': 'amber', open: 'amber', unpaid: 'amber', 'changes requested': 'amber', invited: 'amber',
  waiting: 'amber', 'waiting bills': 'amber', exception: 'amber', suspended: 'amber', warning: 'amber', 'at risk': 'amber',
  minor: 'amber', delayed: 'red', 'on track': 'green', execution: 'blue', 'ready to close': 'green', passed: 'green',
  registered: 'green', quoted: 'green', ordered: 'green', 'fully billed': 'green',
};

export const toneFor = (status: string | null | undefined): Tone => TONES[String(status ?? '').toLowerCase()] ?? 'gray';
