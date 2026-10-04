// ---------------------------------------------------------------- document header: status bar, related documents, comments
// Related-document buttons with counts (Odoo smart buttons / ERPNext connections): open the linked list, filtered
// Related-document tiles: one row of equal-width tiles that always fits the panel at 100% zoom
// (the grid divides the real available width; long labels wrap to a second line instead of pushing a tile to a new row)
function RelatedButtons({ items }) {
  return (
    <div data-related className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((x) => {
        const body = (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="whitespace-nowrap text-[13px] font-semibold text-ink num">{x.value != null ? x.value : x.count}</span>
            <span className="mt-0.5 flex items-start gap-1 text-[11px] leading-[1.2] text-ink-mute">{x.icon && h(x.icon, { size: 11, className: "mt-px shrink-0" })}<span>{x.label}</span></span>
          </span>);
        const c = "flex min-w-0 items-start rounded-md border border-line bg-white px-2 py-1 text-left hover:border-brand/40 hover:bg-brand-soft/40";
        return x.to && (x.count || x.value != null)
          ? <RouterLink key={x.label} to={x.to} data-count={x.count} className={c}>{body}</RouterLink>
          : <span key={x.label} data-count={x.count} className={cls(c, "cursor-default opacity-70 hover:border-line hover:bg-white")}>{body}</span>;
      })}
    </div>
  );
}
function DocBar({ related }) {
  return <div className="px-6"><RelatedButtons items={related} /></div>;
}

// ---- reason prompt for cancel / close / reverse actions (every platform asks why and logs it)
function ReasonModal({ title, text, action = "Confirm", tone = "danger", onClose, onDone }) {
  const [r, setR] = y.useState("");
  const bad = VX.reason(r);
  return (
    <Modal open onClose={onClose} width={480} title={title}
      footer={<><Btn onClick={onClose}>Back</Btn><Btn variant={tone} disabled={!!bad} title={bad && typeof bad === "string" ? bad : bad ? "Give a reason first" : ""} onClick={() => { onDone(r.trim()); onClose(); }}>{action}</Btn></>}>
      {text && <p className="mb-3 text-[13px] text-ink-soft">{text}</p>}
      <Field label="Reason" required><TextArea rows={2} value={r} onChange={setR} placeholder="Why — kept in the audit log" /></Field>
    </Modal>
  );
}

// ---- related documents per record: { label, count, to, icon, value? }
const q_ = (x) => encodeURIComponent(x);
function relatedFor(st, kind, r) {
  const VM = VM_BASE, CL = CL_BASE;
  if (kind === "vendor") {
    const pos = st.purchaseOrders.filter((p) => p.vendorId === r.id), bills = st.invoices.filter((i) => i.vendorId === r.id);
    const due = sum(bills, (i) => Math.max(0, invoiceTotals(i).balance));
    const out = [
      { label: "Purchase orders", count: pos.length, to: `${VM}/purchase-orders?q=${q_(r.name)}`, icon: Icon.package },
      { label: "Bills", count: bills.length, to: `${VM}/invoices?q=${q_(r.name)}`, icon: Icon.receipt },
      { label: "Balance due", count: bills.length, value: inrShort(due), to: `${VM}/invoices?q=${q_(r.name)}`, icon: Icon.wallet },
      { label: "RFQs", count: st.rfqs.filter((x) => (x.vendorIds || []).includes(r.id)).length, to: `${VM}/rfq?q=${q_(r.name)}`, icon: Icon.scale },
    ];
    if (r.isContractor || hasType(r, "Labor") || st.contracts.some((c) => c.vendorId === r.id)) out.push(
      { label: "Contracts", count: st.contracts.filter((c) => c.vendorId === r.id).length, to: `${CL}/contracts?q=${q_(r.name)}`, icon: Icon.file },
      { label: "Work orders", count: st.workOrders.filter((w) => w.vendorId === r.id).length, to: `${CL}/work-orders?q=${q_(r.name)}`, icon: Icon.hardHat });
    return out;
  }
  if (kind === "po") return [
    { label: "Receipts", count: (r.receipts || []).length, icon: Icon.truck },
    { label: "Returns", count: (r.returns || []).length, icon: Icon.refresh },
    { label: "Bills", count: st.invoices.filter((i) => i.poId === r.id).length, to: `${VM}/invoices?q=${q_(r.id)}`, icon: Icon.receipt },
    ...(r.rfqId ? [{ label: "RFQ", count: 1, to: `${VM}/rfq?open=${r.rfqId}`, icon: Icon.scale }] : []),
  ];
  if (kind === "bill") {
    const t = invoiceTotals(r);
    return [
      ...(r.poId ? [{ label: "Purchase order", count: 1, to: `${VM}/purchase-orders?open=${r.poId}`, icon: Icon.package }] : []),
      ...(r.raBillId ? [{ label: "RA bill", count: 1, to: `${CL}/ra-bills?open=${r.raBillId}`, icon: Icon.file }] : []),
      { label: "Payments", count: (r.payments || []).length, icon: Icon.wallet },
      { label: "Credit / debit notes", count: (r.notes || []).length, icon: Icon.file },
      { label: "Balance", count: 1, value: inrShort(Math.max(0, t.balance)), icon: Icon.rupee },
    ];
  }
  if (kind === "rfq") return [
    { label: "Vendors invited", count: (r.vendorIds || []).length, icon: Icon.users },
    { label: "Quotations", count: (r.quotes || []).length, icon: Icon.file },
    { label: "Purchase orders", count: st.purchaseOrders.filter((p) => p.rfqId === r.id).length, to: `${VM}/purchase-orders?q=${q_(r.id)}`, icon: Icon.package },
    { label: "Contracts", count: st.contracts.filter((c) => c.rfqId === r.id).length, to: `${CL}/contracts?q=${q_(r.id)}`, icon: Icon.handshake },
  ];
  if (kind === "req") {
    const rfqs = r.rfqIds || [], pos = st.purchaseOrders.filter((p) => rfqs.includes(p.rfqId) || p.requisitionId === r.id);
    const one = (list, page, many) => (list.length === 1 ? `${VM}/${page}?open=${list[0]}` : many);
    return [
      { label: "RFQs", count: rfqs.length, to: one(rfqs, "rfq", `${VM}/rfq?q=${q_(r.id)}`), icon: Icon.scale },
      { label: "Purchase orders", count: pos.length, to: one(pos.map((p) => p.id), "purchase-orders", rfqs.length === 1 ? `${VM}/purchase-orders?q=${q_(rfqs[0])}` : `${VM}/purchase-orders`), icon: Icon.package },
    ];
  }
  if (kind === "blanket") {
    const pos = st.purchaseOrders.filter((p) => p.blanketId === r.id);
    return [{ label: "Call-off POs", count: pos.length, to: `${VM}/purchase-orders?q=${q_(r.id)}`, icon: Icon.package }];
  }
  if (kind === "contract") return [
    { label: "Work orders", count: st.workOrders.filter((w) => w.contractId === r.id).length, to: `${CL}/work-orders?q=${q_(r.id)}`, icon: Icon.hardHat },
    { label: "RA bills", count: st.raBills.filter((b) => b.contractId === r.id).length, to: `${CL}/ra-bills?q=${q_(r.id)}`, icon: Icon.receipt },
    { label: "Change orders", count: (r.changeOrders || []).length, icon: Icon.pencil },
    { label: "Guarantees", count: (r.guarantees || []).length, icon: Icon.shield },
  ];
  if (kind === "wo") return [
    { label: "Measurements", count: st.measurements.filter((m) => m.woId === r.id).length, to: `${CL}/measurement-book?q=${q_(r.id)}`, icon: Icon.ruler },
    { label: "RA bills", count: st.raBills.filter((b) => b.woId === r.id).length, to: `${CL}/ra-bills?q=${q_(r.id)}`, icon: Icon.receipt },
    { label: "Contract", count: r.contractId ? 1 : 0, to: `${CL}/contracts?open=${r.contractId}`, icon: Icon.file },
  ];
  if (kind === "ra") return [
    { label: "Work order", count: 1, to: `${CL}/work-orders?open=${r.woId}`, icon: Icon.hardHat },
    { label: "Measurements", count: (r.mbIds || st.measurements.filter((m) => m.billedIn === r.id).map((m) => m.id)).length, to: `${CL}/measurement-book?q=${q_(r.id)}`, icon: Icon.ruler },
    { label: "Vendor bill", count: st.invoices.filter((i) => i.raBillId === r.id).length, to: `${VM}/invoices?q=${q_(r.id)}`, icon: Icon.receipt },
  ];
  return [];
}

// ---------------------------------------------------------------- comments with @mention (Odoo chatter / ERPNext comments)
const TEAM = ["Anita Rao", "Vikram Shah", "Meera Iyer", "Rahul Verma", "Sunita Das", "Arjun Nair"];
const mentionPeople = (st) => [...new Set([currentUser(), ...TEAM, ...(st.audit || []).map((a) => a.by).filter(Boolean)])].filter((n) => n && n !== "—");
const mentionsIn = (text, people) => people.filter((p) => text.includes("@" + p));
function CommentText({ text, people }) {
  const names = people.slice().sort((a, b) => b.length - a.length);
  const parts = []; let rest = text, k = 0;
  while (rest) {
    const at = rest.indexOf("@"); if (at < 0) { parts.push(rest); break; }
    const who = names.find((n) => rest.startsWith("@" + n, at));
    if (!who) { parts.push(rest.slice(0, at + 1)); rest = rest.slice(at + 1); continue; }
    parts.push(rest.slice(0, at), <span key={k++} className="rounded bg-brand-soft px-1 font-medium text-brand">@{who}</span>); rest = rest.slice(at + 1 + who.length);
  }
  return <>{parts}</>;
}
function RecordComments({ id }) {
  const st = useStore();
  const list = ((st.comments || {})[id] || []);
  const people = mentionPeople(st);
  const [text, setText] = y.useState(""), [men, setMen] = y.useState(null);
  const box = y.useRef(null);
  const onType = (v) => {
    setText(v);
    const pos = box.current ? box.current.selectionStart : v.length, m = /@([\w ]{0,20})$/.exec(v.slice(0, pos));
    setMen(m ? m[1].toLowerCase() : null);
  };
  const sugg = men == null ? [] : people.filter((p) => p.toLowerCase().startsWith(men.trim()) || p.toLowerCase().includes(men.trim())).slice(0, 6);
  const choose = (p) => {
    const pos = box.current ? box.current.selectionStart : text.length, before = text.slice(0, pos).replace(/@[\w ]{0,20}$/, "@" + p + " ");
    setText(before + text.slice(pos)); setMen(null); box.current?.focus();
  };
  const post = () => {
    const t = text.trim(); if (!t) return;
    const who = mentionsIn(t, people);
    setState((s) => { s.comments = s.comments || {}; (s.comments[id] = s.comments[id] || []).push({ at: new Date().toISOString(), by: currentUser(), text: t, mentions: who }); },
      { entity: "Comment", id, action: `Comment${who.length ? ` — mentioned ${who.map((w) => "@" + w).join(", ")}` : ""}: ${t.slice(0, 80)}` });
    setText(""); setMen(null); toast(who.length ? `Comment posted — ${who.join(", ")} notified` : "Comment posted");
  };
  return (
    <div data-comments className="px-6 py-4">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold">{h(Icon.message, { size: 15 })}Comments <span className="font-normal text-ink-mute">{list.length || ""}</span></p>
      {list.length > 0 && (
        <ul className="mb-3 space-y-2">
          {list.map((c, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">{String(c.by || "?").slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="text-[12px]"><b>{c.by}</b> <span className="text-ink-mute">· {fmtDateTime(c.at)}</span></p>
                <p className="whitespace-pre-wrap text-[13px] text-ink"><CommentText text={c.text} people={people} /></p>
              </div>
            </li>))}
        </ul>)}
      <div className="relative">
        <textarea ref={box} aria-label="Write a comment" rows={2} value={text} onChange={(e) => onType(e.target.value)}
          onKeyDown={(e) => { if (sugg.length && (e.key === "Enter" || e.key === "Tab")) { e.preventDefault(); choose(sugg[0]); } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) post(); else if (e.key === "Escape" && men != null) { e.stopPropagation(); setMen(null); } }}
          placeholder="Write a comment — type @ to mention someone" className={cls(inputCls, "h-auto resize-y py-1.5")} />
        {sugg.length > 0 && (
          <ul role="listbox" aria-label="Mention" className="absolute bottom-full left-0 z-10 mb-1 w-[240px] rounded-md border border-line bg-white py-1 shadow-lg">
            {sugg.map((p) => <li key={p} role="option" aria-selected="false" onMouseDown={(e) => { e.preventDefault(); choose(p); }} className="cursor-pointer px-3 py-1.5 text-[13px] hover:bg-gray-50">@{p}</li>)}
          </ul>)}
        <div className="mt-1.5 flex justify-end"><Btn size="sm" variant="primary" icon={Icon.send} disabled={!text.trim()} title={text.trim() ? "" : "Write a comment first"} onClick={post}>Comment</Btn></div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- phone layout: a menu button opens the sidebar (CSS in build.mjs)
if (typeof document !== "undefined") {
  const addBurger = () => {
    if (document.querySelector(".nx-burger")) return;
    const root = document.documentElement, btn = document.createElement("button"), scrim = document.createElement("div");
    btn.type = "button"; btn.className = "nx-burger"; btn.setAttribute("aria-label", "Menu");
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
    scrim.className = "nx-scrim";
    btn.onclick = () => root.classList.toggle("nx-nav-open");
    scrim.onclick = () => root.classList.remove("nx-nav-open");
    // picking a page closes the menu
    document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("aside a")) root.classList.remove("nx-nav-open"); });
    document.body.append(scrim, btn);
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", addBurger) : addBurger();
}
