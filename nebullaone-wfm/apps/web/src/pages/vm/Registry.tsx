import { Building2, Mail, Plus, Star } from 'lucide-react';
import { useState } from 'react';
import { ActionForm } from '../../components/ActionForm';
import { DataTable } from '../../components/DataTable';
import type { FieldSpec } from '../../components/FormModal';
import { Page } from '../../components/Layout';
import { Badge, Chip, Progress, Tabs } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useList, type Doc } from '../../lib/data';
import { fmtDate } from '../../lib/format';
import { useScorecard, useVendors } from '../../lib/hooks';
import { VendorDrawer } from './VendorDrawer';

export const TRADES = ['Civil', 'RCC / Structural', 'Formwork', 'Masonry', 'Excavation', 'Waterproofing', 'Scaffolding', 'Painting & Finishing', 'Electrical', 'Plumbing', 'Tower Erection', 'Stringing', 'Solar EPC', 'Steel', 'Cement & Aggregates', 'Hardware', 'Equipment Hire', 'Manpower Supply'];

const REGISTER_FIELDS: FieldSpec[] = [
  { name: 'name', label: 'Company / trade name', required: true },
  { name: 'legalName', label: 'Registered legal name', help: 'As on the GST certificate — leave empty if same' },
  { name: 'type', label: 'Vendor type', type: 'select', required: true, options: [{ value: 'Goods', label: 'Goods — supplies material' }, { value: 'Services', label: 'Services — hire, installation, EPC' }, { value: 'Labor', label: 'Labour — supplies workers' }] },
  { name: 'supplierType', label: 'Supplier type', type: 'select', default: 'Company', options: ['Company', 'Firm', 'Individual', 'HUF'], help: 'Individual / HUF: 1% TDS (194C), others 2%; goods 194Q' },
  { name: 'isContractor', label: 'This vendor executes work on site (contractor / subcontractor)', type: 'checkbox', show: (v) => v.type !== 'Goods', help: 'Contractors are managed in Contract & Labor and need labour licence, PF and ESI.' },
  { name: 'categories', label: 'Trades / categories', type: 'multiselect', options: TRADES, required: true },
  { name: 'gstin', label: 'GSTIN', required: true, placeholder: '27AAKCS4412M1Z3', help: 'State is taken from the first two digits' },
  { name: 'pan', label: 'PAN', required: true, placeholder: 'AAKCS4412M', help: 'Must match characters 3–12 of the GSTIN' },
  { name: 'contactName', label: 'Contact person', required: true },
  { name: 'contactEmail', label: 'Contact email', type: 'email', required: true, help: 'Becomes the vendor’s portal admin' },
  { name: 'contactPhone', label: 'Phone' },
  { name: 'city', label: 'City' },
  { name: 'address', label: 'Registered address', span: 2 },
  { name: 'paymentTerms', label: 'Payment terms', type: 'select', default: 'Net 30', options: ['Net 15', 'Net 30', 'Net 45', 'Net 60'] },
  { name: 'msmeType', label: 'MSME type', type: 'select', default: 'Not MSME', options: ['Not MSME', 'Micro', 'Small', 'Medium'], help: 'MSME vendors must be paid within 45 days (MSMED Act)' },
  { name: 'tier', label: 'Supplier tier', type: 'select', default: 'Approved', options: ['Strategic', 'Preferred', 'Approved', 'Transactional'] },
  { name: 'regTier', label: 'Registration tier', type: 'select', default: 'Spend Authorized', options: ['Spend Authorized', 'Prospective'], help: 'Prospective vendors can quote but cannot receive POs' },
  { name: 'bank', label: 'Bank' },
  { name: 'holder', label: 'Account holder name', help: 'Exactly as in bank records (penny-drop check)' },
  { name: 'account', label: 'Account number' },
  { name: 'reAccount', label: 'Re-enter account number' },
  { name: 'ifsc', label: 'IFSC' },
  { name: 'noteToApprover', label: 'Note to approver', type: 'textarea' },
];

const toRegistration = (v: Record<string, any>) => ({
  name: v.name, legalName: v.legalName, type: v.type, supplierType: v.supplierType, isContractor: v.type !== 'Goods' && !!v.isContractor,
  categories: v.categories, gstin: (v.gstin ?? '').toUpperCase(), pan: (v.pan ?? '').toUpperCase(),
  contact: { name: v.contactName, email: v.contactEmail, phone: v.contactPhone }, city: v.city, address: v.address,
  paymentTerms: v.paymentTerms, msmeType: v.msmeType, tier: v.tier, regTier: v.regTier, noteToApprover: v.noteToApprover,
  bankAccounts: v.account ? [{ bank: v.bank, holder: v.holder, account: v.account, reAccount: v.reAccount, ifsc: (v.ifsc ?? '').toUpperCase() }] : [],
});

export function Registry() {
  const vendors = useVendors();
  const sc = useScorecard();
  const invites = useList('invites');
  const { can } = useAuth();
  const [tab, setTab] = useState<'vendors' | 'invites'>('vendors');
  const [open, setOpen] = useState<string | null>(null);
  const rows = vendors.data ?? [];

  return (
    <Page title="Vendor Registry" icon={Building2}
      actions={can('procurement') && (
        <>
          <ActionForm label={<><Mail size={14} />Invite vendor</>} title="Invite a vendor to register" path="/invites"
            fields={[{ name: 'name', label: 'Company name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'category', label: 'Category', type: 'select', options: TRADES, required: true }]} />
          <ActionForm className="btn btn-primary" label={<><Plus size={14} />Register vendor</>} title="Register vendor" wide path="/vendors" transform={toRegistration}
            description="Saving creates a vendor ID and a draft record; submitting routes it through the approval stages in Procurement Settings." submitLabel="Save draft"
            fields={REGISTER_FIELDS} onDone={(v) => setOpen(v.id)} />
        </>
      )}
      tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: 'vendors', label: 'Vendors', count: rows.length }, { id: 'invites', label: 'Invitations', count: invites.data?.length }]} />}>
      {tab === 'vendors' ? (
        <DataTable rows={rows} loading={vendors.isLoading} onRowClick={(r) => setOpen(r.id)} exportName="vendors"
          filters={[
            { label: 'Status', options: [...new Set(rows.map((r) => r.status))], value: (r) => r.status },
            { label: 'Type', options: ['Goods', 'Services', 'Labor'], value: (r) => r.type },
            { label: 'Compliance', options: ['Compliant', 'Expiring', 'Non-Compliant'], value: (r) => r._compliance?.status },
          ]}
          footer={<span><b className="text-amber-600">{rows.filter((r) => r.preferred).length}</b> preferred</span>}
          columns={[
            { key: 'name', header: 'Vendor', render: (r: Doc) => <span className="flex items-center gap-2 font-medium">{r.name}{r.preferred && <Star size={14} className="fill-amber-400 text-amber-400" />}</span> },
            { key: 'status', header: 'Status', render: (r) => <span className="flex flex-wrap gap-1"><Badge>{r.status}</Badge>{r._holdFlag && r._holdFlag !== r.status && <Badge tone="amber">{r._holdFlag}</Badge>}</span> },
            { key: 'type', header: 'Type', value: (r) => `${r.type}${r.isContractor ? ' · Contractor' : ''}` },
            { key: 'categories', header: 'Trades', value: (r) => (r.categories ?? []).join(', '), render: (r) => <span className="flex flex-wrap items-center gap-1">{(r.categories ?? []).slice(0, 2).map((c: string) => <Chip key={c}>{c}</Chip>)}{r.categories?.length > 2 && <span className="text-[12px] text-ink-mute">+{r.categories.length - 2}</span>}</span> },
            { key: 'tier', header: 'Tier' },
            { key: 'regTier', header: 'Registration', render: (r) => <Badge>{r.regTier}</Badge> },
            { key: 'compliance', header: 'Compliance', value: (r) => r._compliance?.status, render: (r) => <Badge>{r._compliance?.status}</Badge> },
            { key: 'score', header: 'Score', value: (r) => sc.map.get(r.id)?.score ?? null, render: (r) => { const s = sc.map.get(r.id)?.score; return s == null ? <span className="text-[12px] text-ink-faint">New</span> : <span className="flex items-center gap-2"><Progress value={s} /><span className="w-7 text-right num">{s}</span></span>; } },
          ]} />
      ) : (
        <DataTable rows={invites.data} loading={invites.isLoading} exportName="invitations" empty={{ title: 'No invitations yet' }}
          columns={[
            { key: 'name', header: 'Company' }, { key: 'email', header: 'Email' }, { key: 'category', header: 'Category' },
            { key: 'sentOn', header: 'Sent', render: (r) => fmtDate(r.sentOn) }, { key: 'by', header: 'By' }, { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
          ]} />
      )}
      <VendorDrawer id={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
