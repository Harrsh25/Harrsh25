// One place for "can this happen?". Every screen asks the same rule, so two screens can't disagree:
// RFQ invite, PO, contract, work order, worker on a work order, measurement, RA bill, payment, close, release.
// Each rule returns { ok, reasons[] }. The vendor's type decides which lifecycle it follows.

const rule = (reasons) => { const r = reasons.flat().filter(Boolean); return { ok: !r.length, reasons: r }; };

// ---------------------------------------------------------------- vendor type → lifecycle
const VENDOR_FLOWS = {
  Goods: { label: "Goods supplier", flow: "RFQ → PO → dispatch → receipt & inspection → bill → payment" },
  Services: { label: "Service provider", flow: "RFQ → PO or service contract → work order → acceptance → bill → payment" },
  Labor: { label: "Labour supplier", flow: "Workers → work order → daily attendance → labour bill → payment" },
  Contractor: { label: "Works contractor", flow: "Contract → work order → measurement → RA bill → final settlement → release" },
};
const vendorFlows = (v) => [...vTypes(v), ...(v?.isContractor ? ["Contractor"] : [])].filter((k, i, a) => VENDOR_FLOWS[k] && a.indexOf(k) === i).map((k) => ({ key: k, ...VENDOR_FLOWS[k] }));
const canTakePo = (v) => hasType(v, "Goods") || hasType(v, "Services");
const canTakeContract = (v) => !!v && (v.isContractor || hasType(v, "Labor") || hasType(v, "Services"));

// ---------------------------------------------------------------- qualification scope (projects, trades, review date)
function qualScopeIssues(v, o = {}) {
  const q = v?.qualification;
  if (!q) return [];
  const out = [];
  if (o.project && (q.projects || []).length && !q.projects.includes(o.project)) out.push(`${v.name} is not qualified for ${o.project}`);
  if (o.trade && (q.trades || []).length && !q.trades.includes(o.trade)) out.push(`${v.name} is not qualified for ${o.trade} work`);
  if (q.nextReview && q.nextReview < todayISO()) out.push(`qualification review was due ${fmtDate(q.nextReview)}`);
  return out;
}

// ---------------------------------------------------------------- the rules
const RULES = {
  rfq: (st, v) => rule([
    !v && "Vendor not found",
    v && !eligibleForRfq(v) && `${v.name} is ${v.status}${v.frozen ? " (frozen)" : ""}`,
    v && sourcingGate(st, v, "rfq").block && sourcingGate(st, v, "rfq").issues.join("; "),
    v && scorecardGate(st, v.id, "rfq").block && `Scorecard standing ${scorecardGate(st, v.id, "rfq").standing?.name} stops new RFQs`,
  ]),
  po: (st, v, o = {}) => rule([
    !v && "Vendor not found",
    v && !eligibleForPo(v) && `${v.name} can't receive a PO (${v.status}, ${v.regTier})`,
    v && !canTakePo(v) && `${v.name} supplies labour only - use a work order and a labour bill, not a PO`,
    v && sourcingGate(st, v, "po").block && sourcingGate(st, v, "po").issues.join("; "),
    v && scorecardGate(st, v.id, "po").block && `Scorecard standing ${scorecardGate(st, v.id, "po").standing?.name} stops new POs`,
    v && qualScopeIssues(v, o),
  ]),
  contract: (st, v, o = {}) => rule([
    !v && "Contractor not found",
    v && !canTakeContract(v) && `${v.name} supplies goods only - use a PO, not a contract`,
    v && ["Blacklisted", "Inactive", "Rejected"].includes(v.status) && `${v.name} is ${v.status}`,
    v && isBlockedFor(v, "All") && `${v.name} is on hold for all transactions`,
    v && ["Not qualified", "Expired", "Requalification required"].includes(qualStatus(v).status) && `Qualification: ${qualStatus(v).status}`,
    v && qualScopeIssues(v, o),
  ]),
  wo: (st, c) => {
    const v = c && byId(st.vendors, c.vendorId), cs = c && contractStatus(c);
    return rule([
      !c && "Contract not found",
      c && ["Draft", "Pending Approval", "Rejected", "Closed", "Terminated", "Completed"].includes(cs) && `Contract ${c.id} is ${cs}`,
      v && isBlockedFor(v, "All") && `${v.name} is on hold for all transactions`,
      v && qualScopeIssues(v, { project: c.project }),
    ]);
  },
  worker: (st, w, wo, on) => {
    const subOk = w && wo && w.subcontractId && allSubs(st).some((x) => x.id === w.subcontractId && x.contract.id === wo.contractId);
    return rule([
      !w && "Worker not found",
      w && workerIssues(w, on).block,
      w && !w.gatePass && "No gate pass issued",
      w && wo && w.vendorId !== wo.vendorId && !subOk && `${w.name} works for ${vendorName(st, w.vendorId)}, not ${vendorName(st, wo.vendorId)}`,
    ]);
  },
  measure: (st, wo) => {
    const c = wo && byId(st.contracts, wo.contractId);
    return rule([
      !wo && "Work order not found",
      wo && !["Issued", "In Progress"].includes(wo.status) && `${wo.id} is ${wo.status}`,
      wo && ["Pending", "Declined"].includes(wo.acceptance?.status) && `Contractor has ${wo.acceptance.status === "Pending" ? "not yet accepted" : "declined"} ${wo.id}`,
      c && c.terminated && `Contract ${c.id} is terminated - measurements are frozen`,
    ]);
  },
  raBill: (st, wo) => {
    const v = wo && byId(st.vendors, wo.vendorId);
    const ready = wo ? st.measurements.filter((m) => m.woId === wo.id && m.jms?.status === "Signed" && !m.billedIn && !m.voided) : [];
    return rule([
      !wo && "Work order not found",
      wo && !ready.length && `No signed, unbilled measurements on ${wo.id}`,
      v && isBlockedFor(v, "Invoices") && `${v.name} is on hold for invoices`,
    ]);
  },
  pay: (st, inv) => rule([!inv && "Bill not found", inv && paymentGate(st, inv).stops]),
  close: (st, c) => rule(closureChecklist(st, c).filter((i) => !i.ok).map((i) => i.label)),
  release: (st, c) => rule(releaseBlockers(st, c).filter((i) => !i.ok).map((i) => i.label)),
};
// Toasts the first reason and returns false when the rule fails
function allowed(name, ...args) {
  const r = RULES[name](getState(), ...args);
  if (!r.ok) toast(r.reasons[0], "red");
  return r.ok;
}

// ---------------------------------------------------------------- status transitions (one table per document)
const STATUS_FLOW = {
  Vendor: { Draft: ["Pending Approval"], "Pending Approval": ["Active", "Changes Requested", "Rejected"], "Changes Requested": ["Pending Approval"], Active: ["On Hold", "Inactive", "Blacklisted"], "On Hold": ["Active", "Inactive", "Blacklisted"], Inactive: ["Active"], Blacklisted: [], Rejected: [] },
  Requisition: { Draft: ["Pending Approval", "Cancelled"], "Pending Approval": ["Approved", "Rejected"], Rejected: ["Pending Approval", "Cancelled"], Approved: ["Ordered", "Cancelled"], Ordered: [], Cancelled: [] },
  PO: { Draft: ["Issued", "Cancelled"], Issued: ["Partially Received", "Received", "Closed", "Cancelled"], "Partially Received": ["Received", "Closed"], Received: ["Closed"], Closed: [], Cancelled: [] },
  Contract: { Draft: ["Pending Approval"], "Pending Approval": ["Approved", "Active", "Rejected", "Draft"], Rejected: ["Draft"], Approved: ["Active"], Active: ["Terminated", "Closed"], Closed: [], Terminated: [] },
  "Work Order": { Draft: ["Issued", "Cancelled"], Issued: ["In Progress", "Suspended", "Short-closed", "Cancelled"], "In Progress": ["Suspended", "Completed", "Short-closed"], Suspended: ["In Progress", "Short-closed"], Completed: ["Closed"], "Short-closed": ["Closed"], Cancelled: [], Closed: [] },
  "RA Bill": { Draft: ["Submitted"], Submitted: ["Verified", "Rejected"], Verified: ["Certified", "Rejected"], Certified: ["Approved", "Rejected"], Approved: ["Paid"], Rejected: [], Paid: [] },
  Claim: { Submitted: ["Under review", "Assessed", "Rejected"], "Under review": ["Assessed", "Rejected"], Assessed: ["Settled", "Rejected"], Settled: [], Rejected: [] },
  "Payment proposal": { Draft: ["Approved", "Cancelled"], Approved: ["Sent to bank", "Cancelled"], "Sent to bank": ["Paid", "Failed"], Failed: ["Sent to bank", "Cancelled"], Paid: [], Cancelled: [] },
};
const canMove = (entity, from, to) => !STATUS_FLOW[entity] || !STATUS_FLOW[entity][from] || STATUS_FLOW[entity][from].includes(to);
function guardMove(entity, from, to) {
  if (canMove(entity, from, to)) return true;
  toast(`${entity} can't go from ${from} to ${to}`, "red");
  return false;
}

// ---------------------------------------------------------------- vendor record: what this vendor can be used for
function VendorEligibility({ v }) {
  const st = useStore();
  if (!lifeStatus(v)) return null;
  const rows = [
    ["RFQ invitation", RULES.rfq(st, v)],
    ...(canTakePo(v) ? [["Purchase order", RULES.po(st, v)]] : []),
    ...(canTakeContract(v) ? [["Contract / work order", RULES.contract(st, v)]] : []),
  ];
  return (
    <Section title="Can be used for" icon={Icon.listChecks}>
      <div data-eligibility className="divide-y divide-line">
        {vendorFlows(v).map((f) => <p key={f.key} className="px-4 py-2 text-[12.5px]"><b>{f.label}</b> <span className="text-ink-soft">{f.flow}</span></p>)}
        {rows.map(([k, r]) => (
          <div key={k} className="flex items-start justify-between gap-3 px-4 py-2 text-[13px]">
            <span>{k}</span>
            <span className={cls("text-right", r.ok ? "text-green-700" : "text-red-600")}>{r.ok ? "Allowed" : r.reasons.join(" · ")}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

// Demo: workers recorded before gate passes were required get one
function seedRules(s) {
  if (s.rulesSeeded) return false;
  s.rulesSeeded = true;
  (s.workers || []).forEach((w, i) => { if (!w.gatePass) w.gatePass = `GP-${4300 + i + 1}`; });
  return true;
}
