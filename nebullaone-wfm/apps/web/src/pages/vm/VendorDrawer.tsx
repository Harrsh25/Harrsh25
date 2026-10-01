import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useState } from 'react';
import { ActionButton, ActionForm } from '../../components/ActionForm';
import { AuditTrail } from '../../components/AuditTrail';
import { Badge, Chip, Drawer, Empty, KV, Notice, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useDoc, useGet } from '../../lib/data';
import { fmtDate, fmtINR, todayISO } from '../../lib/format';

type Tab = 'profile' | 'compliance' | 'bank' | 'approval' | 'holds' | 'activity';

const STAGE_ROLE: Record<string, string> = { Procurement: 'procurement', Legal: 'legal', Finance: 'finance' };

export function VendorDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: v } = useDoc('vendors', id);
  const { can, user } = useAuth();
  const settings = useGet<any>('/config/settings', ['config', 'settings']).data;
  const [tab, setTab] = useState<Tab>('profile');
  if (!id) return null;
  const c = v?._compliance;
  const pendingStage = v?.approval?.stages?.find((s: any) => s.status === 'Pending');
  const myStage = pendingStage && (user?.role === 'admin' || STAGE_ROLE[pendingStage.dept] === user?.role);
  const docNames = (settings?.complianceDocs ?? []).map((d: any) => d.name);

  return (
    <Drawer open={!!id} onClose={onClose} title={v?.name ?? '…'}
      subtitle={v && <span className="flex flex-wrap items-center gap-2">{v.id} · {v.type}{v.isContractor ? ' · Contractor' : ''} <Badge>{v.status}</Badge>{v._holdFlag && <Badge tone="amber">{v._holdFlag}</Badge>}</span>}
      actions={v && (
        <>
          {['Draft', 'Changes Requested'].includes(v.status) && can('procurement') && <ActionButton className="btn btn-primary btn-sm" label="Submit for approval" path={`/vendors/${v.id}/submit`} />}
          {can('procurement') && <ActionButton className="btn btn-sm" label={v.preferred ? '★ Preferred' : '☆ Mark preferred'} path={`/vendors/${v.id}/preferred`} />}
          {v.status !== 'Blacklisted' && can('procurement', 'legal') && (
            <ActionForm className="btn btn-sm" danger label="Blacklist" title={`Blacklist ${v.name}`} path={`/vendors/${v.id}/blacklist`} submitLabel="Blacklist vendor"
              description="Blacklisting places a permanent hold with scope All: no RFQs, orders, bills or payments. Only Legal or an administrator can lift it."
              fields={[{ name: 'reason', label: 'Reason', type: 'textarea', required: true }]} />
          )}
        </>
      )}>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'profile', label: 'Profile' }, { id: 'compliance', label: 'Compliance', count: c?.issues?.length },
        { id: 'bank', label: 'Bank' }, { id: 'approval', label: 'Approval' }, { id: 'holds', label: 'Holds', count: v?._holds?.length }, { id: 'activity', label: 'Activity' },
      ]} />
      {!v ? null : tab === 'profile' ? (
        <div className="space-y-5 p-5">
          <KV rows={[
            ['Legal name', v.legalName], ['GSTIN', v.gstin], ['PAN', v.pan], ['Supplier type', v.supplierType], ['TDS section', v.tds],
            ['Tier', v.tier], ['Registration tier', v.regTier], ['Payment terms', v.paymentTerms], ['Currency', v.currency],
            ['Vendor group', v.group || '—'], ['Contact', `${v.contact?.name ?? ''} · ${v.contact?.email ?? ''}`], ['Phone', v.contact?.phone],
            ['Address', [v.address, v.city, v.state].filter(Boolean).join(', ')], ['MSME', v.msmeType ?? '—'], ['Registered', fmtDate(v.createdAt)], ['Approved', fmtDate(v.approvedOn)],
          ]} />
          <div><div className="label">Trades / categories</div><div className="flex flex-wrap gap-1">{(v.categories ?? []).map((t: string) => <Chip key={t}>{t}</Chip>)}</div></div>
          {v.contractor && (
            <div className="rounded-lg border border-line p-4"><div className="mb-2 text-[13px] font-semibold">Contractor statutory details</div>
              <KV rows={[['Labour licence (CLRA)', v.contractor.labourLicence], ['Licence expiry', fmtDate(v.contractor.licenceExpiry)], ['PF code', v.contractor.pfCode], ['ESI code', v.contractor.esiCode], ['Workforce', v.contractor.workforce], ['Experience', v.contractor.experienceYrs ? `${v.contractor.experienceYrs} years` : '—']]} />
            </div>
          )}
          {v.qualification && (
            <div className="rounded-lg border border-line p-4"><div className="mb-2 text-[13px] font-semibold">Qualification</div>
              <KV rows={[['Rule set', v.qualification.ruleSet], ['Score', v.qualification.score], ['Decision', v.qualification.decision ?? 'Qualified'], ['Assessed', fmtDate(v.qualification.at)], ['Exceptions', v.qualification.exceptions || '—']]} />
            </div>
          )}
          {can('procurement') && (
            <ActionForm label="Record qualification result" title="Qualification decision (stage 02)" path={`/vendors/${v.id}/qualification`}
              initial={{ ruleSet: v.qualification?.ruleSet ?? (v.isContractor ? 'Contractor — High value' : 'Supplier — standard'), score: v.qualification?.score ?? '' }}
              fields={[
                { name: 'ruleSet', label: 'Rule set', required: true }, { name: 'score', label: 'Score (0–100)', type: 'number', required: true },
                { name: 'decision', label: 'Decision', type: 'select', options: ['Qualified', 'Conditionally Qualified', 'Rejected', 'Requalification Required'], required: true },
                { name: 'expiry', label: 'Qualification valid until', type: 'date' }, { name: 'exceptions', label: 'Exceptions / conditions', type: 'textarea' },
              ]} />
          )}
        </div>
      ) : tab === 'compliance' ? (
        <div className="space-y-4 p-5">
          {c && <Notice tone={c.status === 'Compliant' ? 'green' : c.status === 'Expiring' ? 'amber' : 'red'} title={`${c.status} · payment gate ${v._paymentGate === 'Blocked' ? 'blocked' : 'open'}`}
            items={c.blocking.map((i: any) => `${i.name}: ${i.note}`)} />}
          <table className="tbl w-full"><thead><tr><th>Requirement</th><th>Status</th><th>Expiry</th><th /></tr></thead>
            <tbody>
              {(c?.items ?? []).map((i: any) => {
                const doc = (v.docs ?? []).find((d: any) => d.name === i.name);
                return (
                  <tr key={i.name}>
                    <td><div className="font-medium">{i.name}</div><div className="text-[12px] text-ink-mute">{i.kind}{i.blocks ? ' · blocking' : ''}</div></td>
                    <td>{i.level === 0 ? <Badge tone="green">OK</Badge> : i.level === 1 ? <Badge tone="amber">{i.note}</Badge> : <Badge tone="red">{i.note}</Badge>}</td>
                    <td className="num">{fmtDate(i.expiry)}</td>
                    <td className="text-right">
                      {i.kind === 'Document' && doc?.status === 'Pending' && can('procurement', 'legal') && (
                        <span className="inline-flex gap-1">
                          <ActionButton className="btn btn-sm" label="Verify" path={`/vendors/${v.id}/docs/verify`} body={{ name: i.name, decision: 'Verified' }} />
                          <ActionForm className="btn btn-sm" label="Reject" title={`Reject ${i.name}`} path={`/vendors/${v.id}/docs/verify`} transform={(x) => ({ ...x, name: i.name, decision: 'Rejected' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-2">
            {can('procurement') && (
              <ActionForm label="Upload document" title="Upload compliance document" path={`/vendors/${v.id}/docs`}
                description="Record the document file reference; it goes to verification."
                fields={[{ name: 'name', label: 'Document', type: 'select', options: docNames, required: true }, { name: 'file', label: 'File name / reference', required: true, placeholder: 'e.g. WC_Policy_2027.pdf' }, { name: 'expiry', label: 'Expiry date', type: 'date' }]} />
            )}
            {can('procurement') && (
              <ActionForm label="Add insurance policy" title="Add insurance policy" path={`/vendors/${v.id}/insurance`}
                fields={[{ name: 'type', label: 'Type', type: 'select', options: ['Workmen Compensation', "Contractor's All Risk", 'Third Party Liability', 'Professional Indemnity'], required: true }, { name: 'policy', label: 'Policy number', required: true }, { name: 'insurer', label: 'Insurer', required: true }, { name: 'cover', label: 'Cover (₹)', type: 'number', required: true }, { name: 'expiry', label: 'Expiry', type: 'date', required: true }]} />
            )}
          </div>
          {(v.insurance ?? []).length > 0 && (
            <table className="tbl w-full"><thead><tr><th>Policy</th><th>Insurer</th><th className="text-right">Cover</th><th>Expiry</th></tr></thead>
              <tbody>{v.insurance.map((p: any) => <tr key={p.policy}><td><div className="font-medium">{p.type}</div><div className="text-[12px] text-ink-mute">{p.policy}</div></td><td>{p.insurer}</td><td className="text-right num">{fmtINR(p.cover)}</td><td className={p.expiry < todayISO() ? 'text-red-600' : ''}>{fmtDate(p.expiry)}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      ) : tab === 'bank' ? (
        <div className="p-5">
          {(v.bankAccounts ?? []).length === 0 ? <Empty title="No bank account on file" /> : (
            <table className="tbl w-full"><thead><tr><th>Bank</th><th>Account</th><th>IFSC</th><th>Status</th><th /></tr></thead>
              <tbody>{v.bankAccounts.map((b: any) => (
                <tr key={b.id}><td><div className="font-medium">{b.bank}</div><div className="text-[12px] text-ink-mute">{b.holder}{b.isDefault ? ' · default' : ''}</div></td>
                  <td className="num">•••• {String(b.account).slice(-4)}</td><td>{b.ifsc}</td>
                  <td>{b.status === 'Verified' ? <Badge tone="green">Verified</Badge> : <Badge>{b.status}</Badge>}<div className="text-[11.5px] text-ink-mute">{b.method}</div></td>
                  <td className="text-right">{b.status !== 'Verified' && can('finance') && (
                    <span className="inline-flex gap-1">
                      <ActionButton className="btn btn-sm" label="Name matched" path={`/vendors/${v.id}/bank/verify`} body={{ bankId: b.id, nameMatched: true }} />
                      <ActionButton className="btn btn-sm" label="Mismatch" path={`/vendors/${v.id}/bank/verify`} body={{ bankId: b.id, nameMatched: false }} />
                    </span>)}</td>
                </tr>))}
              </tbody>
            </table>
          )}
        </div>
      ) : tab === 'approval' ? (
        <div className="space-y-4 p-5">
          {!(v.approval?.stages ?? []).length ? <Empty title="Not submitted yet" /> : (
            <ol className="space-y-3">
              {v.approval.stages.map((s: any, i: number) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-line p-3">
                  {s.status === 'Approved' ? <CheckCircle2 className="text-green-600" size={18} /> : s.status === 'Pending' ? <Clock3 className="text-amber-500" size={18} /> : <XCircle className="text-red-600" size={18} />}
                  <div className="flex-1"><div className="font-medium">L{i + 1} · {s.dept}</div><div className="text-[12px] text-ink-mute">{s.status}{s.by ? ` · ${s.by} · ${fmtDate(s.at)}` : ''}{s.remark ? ` — ${s.remark}` : ''}</div></div>
                </li>
              ))}
            </ol>
          )}
          {v.status === 'Pending Approval' && myStage && (
            <div className="flex gap-2">
              <ActionForm className="btn btn-primary" label={`Approve as ${pendingStage.dept}`} title={`Approve — ${pendingStage.dept}`} path={`/vendors/${v.id}/approval`} transform={(x) => ({ ...x, decision: 'Approve' })} fields={[{ name: 'remark', label: 'Remark', type: 'textarea' }]} />
              <ActionForm label="Return for changes" title="Return to requester" path={`/vendors/${v.id}/approval`} transform={(x) => ({ ...x, decision: 'Return' })} fields={[{ name: 'remark', label: 'What needs to change', type: 'textarea', required: true }]} />
              <ActionForm danger label="Reject" title="Reject registration" path={`/vendors/${v.id}/approval`} transform={(x) => ({ ...x, decision: 'Reject' })} fields={[{ name: 'remark', label: 'Reason', type: 'textarea', required: true }]} />
            </div>
          )}
          {v.status === 'Pending Approval' && pendingStage && !myStage && <Notice tone="blue" title={`Waiting for ${pendingStage.dept}`} />}
        </div>
      ) : tab === 'holds' ? (
        <div className="space-y-3 p-5">
          {(v._holds ?? []).length === 0 ? <Empty title="No active holds" /> : v._holds.map((h: any) => (
            <Notice key={h.id} tone="amber" title={`${h.id} · ${h.level} · scope ${h.scope} · ${h.reason}`}><p className="mt-0.5">{h.detail}</p></Notice>
          ))}
          <p className="text-[12px] text-ink-mute">Manage holds in the Holds Register.</p>
        </div>
      ) : <AuditTrail entity="vendors" refId={v.id} />}
    </Drawer>
  );
}
