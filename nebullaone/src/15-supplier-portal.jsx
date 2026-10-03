// Supplier portal with real vendor sign-in (ERPNext "Portal Users" + one-time
// code). Public routes: #/supplier/login, #/supplier, #/vendor-quote/:rfq/:vendor.
// Internal: Vendor Management → Vendor Portal shows the same portal as a preview.

// ---------------------------------------------------------------- sign-in
function VendorLogin({ lockVendorId, onSignedIn }) {
  const st = useStore();
  const lockV = lockVendorId && byId(st.vendors, lockVendorId);
  const [email, setEmail] = y.useState(lockV ? lockV.portalUsers?.[0]?.email || "" : "");
  const [sent, setSent] = y.useState(null);
  const [code, setCode] = y.useState("");
  const [err, setErr] = y.useState("");
  const request = () => {
    setErr("");
    const hit = findPortalUser(getState(), email);
    if (!hit) return setErr("This e-mail isn't registered as a portal user. Ask the buyer to add you, or register your company.");
    if (lockVendorId && hit.vendor.id !== lockVendorId) return setErr(`This link was sent to ${lockV.name}. Sign in with one of their portal e-mails.`);
    setSent({ code: issueOtp(email), vendor: hit.vendor });
  };
  const verify = () => {
    if (!checkOtp(email, code)) return setErr("Incorrect or expired code.");
    const hit = findPortalUser(getState(), email);
    setState((s) => { const u = byId(s.vendors, hit.vendor.id).portalUsers.find((p) => p.email.toLowerCase() === email.toLowerCase()); u.lastLogin = new Date().toISOString(); },
      { entity: "Vendor", id: hit.vendor.id, action: `Portal sign-in by ${email}` });
    setVendorSession({ vendorId: hit.vendor.id, email: email.toLowerCase(), at: Date.now() });
    onSignedIn && onSignedIn(hit.vendor.id);
  };
  return (
    <div className="mx-auto max-w-[420px] space-y-3 py-2">
      {!sent ? (
        <>
          <Field label="Work e-mail registered with the buyer"><TextInput type="email" value={email} onChange={setEmail} placeholder="you@company.com" onKeyDown={(e) => e.key === "Enter" && request()} /></Field>
          {err && <Note tone="red">{err}</Note>}
          <Btn variant="primary" className="w-full" onClick={request} disabled={!EMAIL_RE.test(email)}>Send one-time code</Btn>
        </>
      ) : (
        <>
          <Note icon={Icon.mail}>We've sent a 6-digit code to <b>{email}</b>. <span className="mt-1 block rounded bg-white/70 px-2 py-1 text-[12px]">Demo mode (no mail server): your code is <b className="mono">{sent.code}</b></span></Note>
          <Field label="One-time code"><TextInput value={code} onChange={setCode} maxLength={6} placeholder="••••••" onKeyDown={(e) => e.key === "Enter" && verify()} /></Field>
          {err && <Note tone="red">{err}</Note>}
          <div className="flex gap-2"><Btn onClick={() => { setSent(null); setCode(""); }}>Back</Btn><Btn variant="primary" className="flex-1" onClick={verify} disabled={code.length !== 6}>Sign in</Btn></div>
        </>
      )}
    </div>
  );
}

function SupplierLoginPage() {
  const nav = useNavigate();
  const next = new URLSearchParams(Ht().search).get("next") || "/supplier";
  const s = getVendorSession();
  y.useEffect(() => { if (s) nav(next, { replace: true }); }, []);
  return (
    <PublicShell width={560} title="Supplier portal sign-in" subtitle="Quotations, orders, work orders, bills and documents in one place.">
      <div className="p-6">
        <VendorLogin onSignedIn={() => nav(next, { replace: true })} />
        <p className="mt-4 text-center text-[12.5px] text-ink-soft">New supplier? <a className="font-medium text-brand" href={appUrl("/vendor-register")}>Register your company</a></p>
      </div>
    </PublicShell>
  );
}

function SupplierPortalPage() {
  useStore();
  const nav = useNavigate();
  const s = getVendorSession();
  const v = s && byId(getState().vendors, s.vendorId);
  y.useEffect(() => { if (!v) nav("/supplier/login", { replace: true }); }, [v]);
  if (!v) return null;
  // Access ends when the vendor is blacklisted, made inactive or rejected, or the user is disabled — even mid-session
  const user = (v.portalUsers || []).find((p) => p.email.toLowerCase() === s.email);
  if (!PORTAL_STATUSES.includes(v.status) || (user && !user.active)) return (
    <PublicShell width={560} title="Portal access suspended" subtitle={v.name}>
      <div className="space-y-3 p-6">
        <Note tone="red">{user && !user.active ? "Your portal user has been disabled by the vendor administrator." : `Your company's account is ${v.status.toLowerCase()}, so the supplier portal is no longer available.`} Contact the buyer's procurement team for help.</Note>
        <Btn onClick={() => { setVendorSession(null); nav("/supplier/login"); }}>Sign out</Btn>
      </div>
    </PublicShell>
  );
  return (
    <PublicShell width={1180} title={v.name} subtitle={<span className="flex items-center gap-2">{v.id} · signed in as {s.email} <button className="font-medium text-brand" onClick={() => { setVendorSession(null); nav("/supplier/login"); }}>Sign out</button></span>}>
      <PortalBody vid={v.id} vendorMode />
    </PublicShell>
  );
}

// Buyer-side preview (internal page)
function VendorPortalPage() {
  const st = useStore();
  const list = st.vendors.filter((v) => PORTAL_STATUSES.includes(v.status));
  const [vid, setVid] = y.useState(list[0]?.id);
  if (!byId(st.vendors, vid)) return <Page title="Vendor Portal" icon={Icon.globe}><EmptyState icon={Icon.globe} title="No vendors with portal access" /></Page>;
  return (
    <Page title="Vendor Portal" subtitle="Preview of what a vendor sees after signing in at the supplier portal" icon={Icon.globe}
      actions={<>
        <Btn icon={Icon.globe} onClick={() => window.open(appUrl("/supplier/login"), "_blank")}>Open supplier sign-in</Btn>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-soft">Viewing as
          <div className="w-[240px]"><Select label="Viewing as" value={vid} onChange={setVid} options={list.map((x) => ({ value: x.id, label: x.name }))} className="h-[28px]" /></div></label>
      </>}>
      <PortalBody key={vid} vid={vid} />
    </Page>
  );
}

// ---------------------------------------------------------------- quote link (public, sign-in gated)
function VendorQuotePage() {
  const st = useStore();
  const [, , rfqId, vendorId] = Ht().pathname.split("/");
  const rfq = byId(st.rfqs, rfqId), v = byId(st.vendors, vendorId);
  const s = getVendorSession();
  const shell = (title, body, w = 760) => <PublicShell title={title} width={w}><div className="p-6">{body}</div></PublicShell>;
  if (!rfq || !v || !rfq.vendorIds.includes(vendorId)) return shell("Link not valid", <Note tone="red">This quotation link is not valid. Please use the link from the buyer's RFQ e-mail.</Note>);
  if (rfq.status === "Draft") return shell("RFQ not open yet", <Note>This request for quotation hasn't been released yet.</Note>);
  if (settingsOf(st).quoteLogin && (!s || s.vendorId !== vendorId))
    return shell(`Sign in to respond to ${rfq.id}`, <><p className="mb-4 text-center text-[13px] text-ink-soft">{rfq.title} · for <b>{v.name}</b></p><VendorLogin lockVendorId={vendorId} /></>, 620);
  const mine = rfq.quotes.find((q) => q.vendorId === vendorId);
  return (
    <PublicShell width={1100} title={`Request for quotation — ${rfq.title}`} subtitle={<span>{rfq.id} · {v.name} · project {rfq.project} {s && <><span className="mx-1">·</span><a className="font-medium text-brand" href={appUrl("/supplier")}>Go to portal</a></>}</span>}>
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-4 gap-3">
          <StatTile tone="blue" label="Lines" value={rfq.items.length} icon={Icon.listChecks} />
          <StatTile tone={daysUntil(rfq.dueDate) < 0 ? "red" : "amber"} label="Quotes due" value={fmtDate(rfq.dueDate)} icon={Icon.clock} />
          <StatTile tone="purple" label="Incoterm" value={rfq.incoterm.split(" ")[0]} icon={Icon.truck} />
          <StatTile tone={mine ? "green" : "cyan"} label="Your quotation" value={mine ? quoteStatus(rfq, mine) : "Not submitted"} icon={Icon.send} />
        </div>
        <Note icon={Icon.file}><b>Buyer's terms:</b> {rfq.tnc} <button className="ml-1 font-medium text-brand" onClick={() => printRfq(rfq, v)}>Download RFQ (PDF)</button></Note>
        <VendorRfqView rfq={rfq} vendorId={vendorId} />
      </div>
    </PublicShell>
  );
}

// ---------------------------------------------------------------- portal body
function PortalBody({ vid, vendorMode }) {
  const st = useStore();
  const v = byId(st.vendors, vid);
  const isContractor = v.isContractor || hasType(v, "Labor");
  // Holds and suspension are enforced here too: an "All" hold stops new quotes, WO acceptance, claims and attendance;
  // an "Invoices" hold stops claims and invoice submission
  const txBlocked = isBlockedFor(v, "All") || !["Active", "On Hold"].includes(v.status) && v.status !== "Pending Approval" && v.status !== "Changes Requested" && v.status !== "Draft";
  const billBlocked = txBlocked || isBlockedFor(v, "Invoices");
  const [tab, setTab] = y.useState(v.status === "Changes Requested" || v.status === "Draft" ? "reg" : "rfq");
  const [quoteFor, setQuoteFor] = y.useState(null);
  const [claimFor, setClaimFor] = y.useState(null);
  const [woDecline, setWoDecline] = y.useState(null);
  const [tk, setTk] = y.useState({ subject: "", body: "" });
  const [reup, setReup] = y.useState(null);
  const [newUser, setNewUser] = y.useState({ name: "", email: "" });
  const [detail, setDetail] = y.useState(null);
  const [invNew, setInvNew] = y.useState(false);
  const open = (kind, id) => setDetail({ kind, id });
  const stop = (e) => e.stopPropagation();
  const pos = st.purchaseOrders.filter((p) => p.vendorId === vid && p.status !== "Draft");
  const invs = st.invoices.filter((i) => i.vendorId === vid);
  const bills = st.raBills.filter((b) => b.vendorId === vid);
  const docs = requiredDocs(v).map((n) => v.docs.find((d) => d.name === n) || { name: n, status: "Missing" });
  const tickets = st.tickets.filter((t) => t.vendorId === vid);
  const rfqs = st.rfqs.filter((r) => r.vendorIds.includes(vid) && r.status !== "Draft");
  const toQuote = rfqs.filter((r) => ["Sent", "Quotes Received", "Partially Awarded"].includes(r.status) && daysUntil(r.dueDate) >= 0 && !r.quotes.some((q) => q.vendorId === vid && q.review !== "Returned"));
  const wos = st.workOrders.filter((w) => w.vendorId === vid && w.status !== "Draft");
  const claims = st.claims.filter((c) => c.vendorId === vid);
  const pricelist = pos.flatMap((p) => p.lines.map((l) => ({ ...l, po: p.id, date: p.date })));
  const tabs = [
    ...(v.status !== "Active" && v.status !== "On Hold" ? [{ id: "reg", label: v.status === "Changes Requested" ? "Registration — action needed" : "Registration", icon: Icon.clipboardCheck }] : []),
    { id: "rfq", label: "RFQs", icon: Icon.scale },
    { id: "orders", label: "Purchase orders", icon: Icon.truck },
    ...(isContractor ? [{ id: "wo", label: "Work orders", icon: Icon.clipboardList }, { id: "claims", label: "RA claims", icon: Icon.receipt }] : []),
    ...(isContractor && st.workers.some((w) => w.vendorId === vid) ? [{ id: "att", label: "Daily attendance", icon: Icon.users }] : []),
    ...(isContractor && (st.punchItems || []).some((pi) => byId(st.contracts, pi.contractId)?.vendorId === vid) ? [{ id: "punch", label: "Punch list", icon: Icon.listChecks }] : []),
    { id: "bills", label: "Bills & payments", icon: Icon.rupee },
    { id: "price", label: "Pricelist", icon: Icon.sheet },
    { id: "docs", label: "Documents", icon: Icon.folderCheck },
    { id: "help", label: "Queries", icon: Icon.message },
    { id: "users", label: "Users", icon: Icon.users },
  ];
  const actWo = (wo, status, reason) => {
    setState((s) => {
      const w = byId(s.workOrders, wo.id);
      w.acceptance = { status, by: vendorMode ? getVendorSession()?.email : v.contact.name, at: new Date().toISOString(), reason: reason || "" };
    }, { entity: "Work Order", id: wo.id, action: `${status} by contractor${reason ? ` — ${reason}` : ""}` });
    toast(status === "Accepted" ? `${wo.id} accepted — work can start` : `${wo.id} declined`, status === "Accepted" ? "green" : "red");
  };
  return (
    <>
      <div className="flex items-center justify-between gap-4 border-b border-line bg-gradient-to-r from-brand-soft to-white px-5 py-3">
        <div><p className="text-[15px] font-semibold">Welcome, {v.contact.name}</p><p className="text-[12.5px] text-ink-soft">{v.name} · {v.id}{!vendorMode && " · buyer preview"}</p></div>
        <div className="flex items-center gap-2"><Status>{v.status}</Status><Status>{complianceOf(v).status}</Status></div>
      </div>
      <StatGrid>
        <StatTile tone="blue" label="RFQs to quote" value={toQuote.length} icon={Icon.scale} />
        <StatTile tone="purple" label={isContractor ? "Work orders to accept" : "Open POs"} value={isContractor ? wos.filter((w) => w.acceptance?.status === "Pending").length : pos.filter((p) => poStatus(p) !== "Received").length} icon={Icon.clipboardList} />
        <StatTile tone="amber" label="Amount due to you" value={inrShort(sum(invs, (i) => invoiceTotals(i).balance))} icon={Icon.rupee} />
        <StatTile tone="red" label="Documents to renew" value={docs.filter((d) => ["Missing", "Expired", "Expiring", "Rejected"].includes(docState(d))).length} icon={Icon.fileClock} />
      </StatGrid>
      {(txBlocked || billBlocked) && <div className="px-5 pt-3"><Note tone="red" icon={Icon.lock}>{txBlocked ? `Your account is ${v.status === "On Hold" ? "on hold" : v.status.toLowerCase()}${v.hold?.reason ? ` — ${v.hold.reason}` : ""}. You can view your records, but new quotations, work-order acceptance, claims and attendance are paused.` : `Invoices are on hold${v.hold?.reason ? ` — ${v.hold.reason}` : ""}${v.hold?.until ? ` until ${fmtDate(v.hold.until)}` : ""}. New claims and invoices are paused.`}</Note></div>}
      <TabBar active={tab} onChange={setTab} tabs={tabs} />
      <div className={cls(tab === "reg" && "p-5")}>
        {tab === "reg" && <RegistrationFix v={v} />}
        {tab === "rfq" && <DataTable rows={rfqs} onRow={(r) => setQuoteFor(r.id)} empty={<EmptyState icon={Icon.scale} title="No RFQs yet" text="Requests for quotation you're invited to will appear here." />} columns={[
          { key: "title", label: "Requirement", className: "font-medium" }, { key: "project", label: "Project", filterOptions: FO.projects, filter: true },
          { key: "n", label: "Lines", align: "center", render: (r) => r.items.length },
          { key: "due", label: "Quotes due", render: (r) => <ExpiryCell iso={["Awarded", "Closed"].includes(r.status) ? null : r.dueDate} /> },
          { key: "inv", label: "Invitation", filterOptions: FO.invitation, filter: (r) => (r.responses?.[vid] || {}).status || "Invited", render: (r) => <Status>{(r.responses?.[vid] || {}).status || "Invited"}</Status> },
          { key: "me", label: "My quotation", render: (r) => { const q = r.quotes.find((x) => x.vendorId === vid); return q ? <span className="flex flex-col"><span className="num">{inrShort(quoteTotal(r, q))}</span><Status>{quoteStatus(r, q)}</Status></span> : <span className="text-ink-faint">—</span>; } },
          { key: "a", label: "", align: "right", render: (r) => <Btn size="sm" variant={toQuote.includes(r) ? "primary" : "secondary"} icon={Icon.eye} onClick={() => setQuoteFor(r.id)}>{toQuote.includes(r) ? "Respond" : "View"}</Btn> },
        ]} />}
        {tab === "orders" && <DataTable rows={pos} onRow={(p) => open("po", p.id)} empty={<EmptyState icon={Icon.package} title="No purchase orders" />} columns={[
          { key: "id", label: "PO", className: "mono text-[12px]" }, { key: "project", label: "Deliver to", filterOptions: FO.projects, filter: true },
          { key: "v", label: "Value", align: "right", num: true, render: (p) => inrShort(poValue(p)) },
          { key: "dd", label: "Delivery due", render: (p) => fmtDate(p.deliveryDate) },
          { key: "r", label: "Delivered", render: (p) => { const r = poReceived(p); return <Progress value={Math.round(pct(sum(r, (x) => x.received), sum(r, (x) => x.qty)))} />; } },
          { key: "ret", label: "Returned", align: "right", render: (p) => (p.returns?.length ? <span className="text-red-600">{num(sum(p.returns, (x) => x.qty))}</span> : "—") },
          { key: "b", label: "Billing", filterOptions: FO.poBilling, filter: (p) => poBillingStatus(st, p), render: (p) => <Status tone="blue">{poBillingStatus(st, p)}</Status> },
          { key: "s", label: "Status", filterOptions: FO.poStatus, filter: (p) => poStatus(p), render: (p) => <Status>{poStatus(p)}</Status> },
        ]} />}
        {tab === "wo" && <DataTable rows={wos} onRow={(w) => open("wo", w.id)} empty={<EmptyState icon={Icon.clipboardList} title="No work orders" />} columns={[
          { key: "id", label: "WO", className: "mono text-[12px]" }, { key: "title", label: "Scope", className: "font-medium" }, { key: "type", label: "Type", filterOptions: FO.woType, filter: true },
          { key: "val", label: "Value", align: "right", num: true, render: (w) => inrShort(woValue(w)) },
          { key: "d", label: "Period", render: (w) => `${fmtDate(w.start)} → ${fmtDate(w.end)}` },
          { key: "p", label: "Progress", render: (w) => <Progress value={Math.round(woProgress(st, w).physical)} /> },
          { key: "acc", label: "Acceptance", filterOptions: FO.acceptance, filter: (w) => w.acceptance?.status || "—", render: (w) => <Status tone={{ Accepted: "green", Pending: "amber", Declined: "red" }[w.acceptance?.status] || "gray"}>{w.acceptance?.status || "—"}</Status> },
          { key: "a", label: "", align: "right", render: (w) => txBlocked ? null : w.acceptance?.status === "Pending" ? (
            <span className="flex justify-end gap-1" onClick={stop}><Btn size="sm" variant="success" onClick={() => actWo(w, "Accepted")}>Accept</Btn><Btn size="sm" variant="danger" onClick={() => setWoDecline({ wo: w, reason: "" })}>Decline</Btn></span>
          ) : woAccepted(w) && ["Issued", "In Progress"].includes(w.status) && !billBlocked ? <span onClick={stop}><Btn size="sm" icon={Icon.receipt} onClick={() => setClaimFor(w.id)}>Submit RA claim</Btn></span> : null },
        ]} />}
        {tab === "claims" && <DataTable rows={claims.slice().reverse()} onRow={(c) => open("claim", c.id)} empty={<EmptyState icon={Icon.receipt} title="No claims yet" text="Submit a running-account claim from the Work orders tab." />} columns={[
          { key: "id", label: "Claim", className: "mono text-[12px]" }, { key: "wo", label: "Work order", render: (c) => `${c.woId} · ${byId(st.workOrders, c.woId).title}` },
          { key: "d", label: "Submitted", render: (c) => fmtDate(c.date) },
          { key: "v", label: "Claimed value", align: "right", num: true, render: (c) => inr(claimValue(st, c)) },
          { key: "s", label: "Status", filterOptions: FO.claimStatus, filter: (c) => c.status, render: (c) => <span className="flex flex-col"><Status tone={{ Submitted: "blue", Verified: "green", Returned: "red" }[c.status]}>{c.status}</Status>{c.status === "Returned" && <span className="max-w-[260px] whitespace-normal text-[11px] text-red-600">{c.history[c.history.length - 1].remark}</span>}</span> },
          { key: "b", label: "RA bill", render: (c) => (c.raBillId ? `${c.raBillId} · ${byId(st.raBills, c.raBillId)?.status}` : "—") },
          { key: "a", label: "", align: "right", render: (c) => c.status === "Returned" && !c.resubmittedAs && !billBlocked && <span onClick={stop}><Btn size="sm" onClick={() => setClaimFor({ woId: c.woId, from: c.id })}>Revise & resubmit</Btn></span> },
        ]} />}
        {tab === "att" && (txBlocked ? <div className="p-4"><Note tone="red">Attendance entry is paused while the account is on hold.</Note></div> : <AttendanceSheet vendorId={vid} portal />)}
        {tab === "punch" && <PunchTable rows={(st.punchItems || []).filter((pi) => byId(st.contracts, pi.contractId)?.vendorId === vid)} portal by={vendorMode ? getVendorSession()?.email : v.contact.name} />}
        {tab === "bills" && <DataTable actions={pos.length > 0 && <Btn size="sm" variant="primary" icon={Icon.receipt} disabled={billBlocked} title={billBlocked ? "Invoices are paused while your account is on hold" : ""} onClick={() => setInvNew(true)}>Submit invoice</Btn>} rows={[...invs.map((i) => ({ key: i.id, kind: "inv", ref: i.number, what: i.source === "RA Bill" ? i.raBillId : i.poId, amt: invoiceTotals(i).payable, bal: invoiceTotals(i).balance, status: invoiceStatus(i), due: i.due })),
          ...bills.filter((b) => !b.invoiceId).map((b) => ({ key: b.id, kind: "bill", ref: b.id, what: `${b.woId} · RA ${b.seq}`, amt: b.net, bal: b.net, status: b.status, due: null }))]} rowKey={(r) => r.key} onRow={(r) => open(r.kind, r.key)} columns={[
          { key: "ref", label: "Reference", className: "mono text-[12px]" }, { key: "what", label: "Against" },
          { key: "amt", label: "Amount", align: "right", num: true, render: (r) => inr(r.amt) }, { key: "bal", label: "Balance", align: "right", num: true, render: (r) => inr(r.bal) },
          { key: "due", label: "Due", render: (r) => fmtDate(r.due) }, { key: "status", label: "Status", filter: true, render: (r) => <Status>{r.status}</Status> },
        ]} />}
        {tab === "price" && <PortalPriceList v={v} readOnly={txBlocked} />}
        {tab === "price" && <DataTable rows={pricelist} onRow={(r) => open("po", r.po)} rowKey={(r, i) => r.po + i} empty={<EmptyState icon={Icon.sheet} title="No agreed prices yet" />} columns={[
          { key: "desc", label: "Item" }, { key: "unit", label: "Unit" }, { key: "rate", label: "Agreed rate", align: "right", num: true, render: (r) => inr(r.rate) }, { key: "po", label: "Last PO", className: "mono text-[12px]" }, { key: "date", label: "Since", render: (r) => fmtDate(r.date) },
        ]} />}
        {tab === "docs" && <><DataTable noun="documents" rows={docs} rowKey={(d) => d.name} onRow={(d) => open("doc", d.name)} columns={[
          { key: "name", label: "Document", className: "font-medium" }, { key: "e", label: "Valid till", render: (d) => <ExpiryCell iso={d.expiry} /> },
          { key: "s", label: "Status", filterOptions: FO.docState, filter: (d) => docState(d), render: (d) => <span className="flex flex-col"><Status>{docState(d)}</Status>{d.status === "Rejected" && d.remark && <span className="max-w-[260px] whitespace-normal text-[11px] text-red-600">{d.remark}</span>}</span> },
          { key: "a", label: "", align: "right", render: (d) => ["Missing", "Expired", "Expiring", "Rejected"].includes(docState(d)) && <span onClick={stop}><Btn size="sm" icon={Icon.upload} onClick={() => setReup({ name: d.name, expiry: shiftDays(365), file: "", dataUrl: null })}>Upload</Btn></span> },
        ]} /><div className="p-4"><InsurancePolicies v={v} portal locked={false} /></div></>}
        {tab === "help" && (
          <div className="grid grid-cols-[1fr_360px] gap-4 p-4">
            <Section title="My queries & disputes" icon={Icon.message}>
              <ul className="divide-y divide-line">
                {tickets.length === 0 && <li className="p-4 text-[13px] text-ink-mute">No queries raised.</li>}
                {tickets.map((t) => (
                  <li key={t.id} className="cursor-pointer p-4 text-[13px] hover:bg-gray-50" onClick={() => open("ticket", t.id)}>
                    <p className="flex items-center justify-between"><span className="font-medium"><span className="mono mr-2 text-[11.5px] text-ink-mute">{t.id}</span>{t.subject}</span><Status>{t.status}</Status></p>
                    <p className="mt-1 text-ink-soft">{t.body}</p>
                    {t.replies.length > 0 && <p className="mt-2 rounded-md bg-gray-50 px-2 py-1 text-[12.5px]"><b>{t.replies[t.replies.length - 1].vendor ? "You" : t.replies[t.replies.length - 1].by}:</b> {t.replies[t.replies.length - 1].text}</p>}
                    <p className="mt-2 text-[12px] font-medium text-brand">Open thread ({t.replies.length} {t.replies.length === 1 ? "reply" : "replies"}) →</p>
                  </li>
                ))}
              </ul>
            </Section>
            <Section title="Raise a query / dispute" icon={Icon.plus}>
              <div className="space-y-3 p-4">
                <Field label="Subject"><TextInput value={tk.subject} onChange={(x) => setTk({ ...tk, subject: x })} /></Field>
                <Field label="Details"><TextArea value={tk.body} onChange={(x) => setTk({ ...tk, body: x })} /></Field>
                <Btn variant="primary" icon={Icon.send} disabled={!tk.subject || !tk.body} onClick={() => {
                  const id = nextId("TKT", st.tickets);
                  setState((s) => s.tickets.unshift({ id, vendorId: vid, ...tk, status: "Open", raisedOn: todayISO(), replies: [] }), { entity: "Ticket", id, action: `Raised by ${v.name}` });
                  setTk({ subject: "", body: "" }); toast(`${id} raised`);
                }}>Submit</Btn>
              </div>
            </Section>
          </div>
        )}
        {tab === "users" && (
          <div className="space-y-4 p-4">
            <PortalProfileFields v={v} readOnly={txBlocked} />
            <Section title="Portal users" icon={Icon.users} actions={<span className="text-[12px] text-ink-mute">Anyone listed can sign in with a one-time code</span>}>
              <DataTable dense rows={v.portalUsers || []} rowKey={(u) => u.email} columns={[
                { key: "name", label: "Name", className: "font-medium" }, { key: "email", label: "E-mail" }, { key: "role", label: "Role" },
                { key: "l", label: "Last sign-in", render: (u) => (u.lastLogin ? fmtDateTime(u.lastLogin) : "Never") },
                { key: "s", label: "Status", render: (u) => <Status tone={u.active ? "green" : "gray"}>{u.active ? "Active" : "Disabled"}</Status> },
                { key: "a", label: "", align: "right", render: (u) => u.role !== "Admin" && <Btn size="sm" onClick={() => setState((s) => { const x = byId(s.vendors, vid).portalUsers.find((p) => p.email === u.email); x.active = !x.active; }, { entity: "Vendor", id: vid, action: `Portal user ${u.email} ${u.active ? "disabled" : "enabled"}` })}>{u.active ? "Disable" : "Enable"}</Btn> },
              ]} />
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 border-t border-line p-3">
                <TextInput value={newUser.name} onChange={(x) => setNewUser({ ...newUser, name: x })} placeholder="Name" />
                <TextInput value={newUser.email} onChange={(x) => setNewUser({ ...newUser, email: x })} placeholder="colleague@company.com" />
                <Btn variant="primary" icon={Icon.userPlus} disabled={!newUser.name || !EMAIL_RE.test(newUser.email) || !!findPortalUser(st, newUser.email)} onClick={() => {
                  setState((s) => byId(s.vendors, vid).portalUsers.push({ ...newUser, email: newUser.email.toLowerCase(), active: true, role: "User", lastLogin: null }), { entity: "Vendor", id: vid, action: `Portal user added: ${newUser.email}` });
                  setNewUser({ name: "", email: "" }); toast("User added");
                }}>Add user</Btn>
              </div>
            </Section>
          </div>
        )}
      </div>
      {invNew && <PortalInvoiceModal v={v} by={vendorMode ? getVendorSession()?.email || v.contact.name : v.contact.name} onClose={() => setInvNew(false)} />}
      {detail?.kind === "po" && <PortalPoDrawer key={detail.id} id={detail.id} open={open} onClose={() => setDetail(null)} />}
      {detail?.kind === "wo" && <PortalWoDrawer key={detail.id} id={detail.id} open={open} onClose={() => setDetail(null)} onAccept={(w) => (txBlocked ? toast("Your account is on hold — work orders can't be accepted", "red") : actWo(w, "Accepted"))} onDecline={(w) => setWoDecline({ wo: w, reason: "" })}
        onClaim={(wid) => (billBlocked ? toast("Claims are paused while your account is on hold", "red") : setClaimFor(wid))} />}
      {detail?.kind === "claim" && <PortalClaimDrawer key={detail.id} id={detail.id} open={open} onClose={() => setDetail(null)} onRevise={(c) => setClaimFor({ woId: c.woId, from: c.id })} />}
      {detail?.kind === "bill" && <PortalRaBillDrawer key={detail.id} id={detail.id} open={open} onClose={() => setDetail(null)} />}
      {detail?.kind === "inv" && <PortalInvoiceDrawer key={detail.id} id={detail.id} open={open} onClose={() => setDetail(null)} />}
      {detail?.kind === "doc" && <PortalDocDrawer vid={vid} name={detail.id} onClose={() => setDetail(null)} onUpload={(d) => setReup({ name: d.name, expiry: d.expiry && daysUntil(d.expiry) > 30 ? d.expiry : shiftDays(365), file: "", dataUrl: null })} />}
      {detail?.kind === "ticket" && <PortalTicketDrawer id={detail.id} author={vendorMode ? getVendorSession()?.email || v.contact.name : v.contact.name} onClose={() => setDetail(null)} />}
      {quoteFor && (
        <Modal open onClose={() => setQuoteFor(null)} width={1100} title={byId(st.rfqs, quoteFor).title} subtitle={`${quoteFor} · due ${fmtDate(byId(st.rfqs, quoteFor).dueDate)} · ${byId(st.rfqs, quoteFor).incoterm}`}>
          <div className="mb-3"><Note icon={Icon.file}><b>Buyer's terms:</b> {byId(st.rfqs, quoteFor).tnc} <button className="ml-1 font-medium text-brand" onClick={() => printRfq(byId(st.rfqs, quoteFor), v)}>Download RFQ (PDF)</button></Note></div>
          <VendorRfqView rfq={byId(st.rfqs, quoteFor)} vendorId={vid} onDone={() => setQuoteFor(null)} />
        </Modal>
      )}
      {claimFor && <ClaimModal woId={claimFor.woId || claimFor} fromClaim={claimFor.from} onClose={() => setClaimFor(null)} />}
      {woDecline && (
        <Modal open onClose={() => setWoDecline(null)} width={460} title={`Decline ${woDecline.wo.id}`} footer={<><Btn onClick={() => setWoDecline(null)}>Cancel</Btn><Btn variant="danger" disabled={!woDecline.reason} onClick={() => { actWo(woDecline.wo, "Declined", woDecline.reason); setWoDecline(null); }}>Decline</Btn></>}>
          <Field label="Reason"><TextArea value={woDecline.reason} onChange={(x) => setWoDecline({ ...woDecline, reason: x })} placeholder="e.g. Rates for item 3.4 not as negotiated" /></Field>
        </Modal>
      )}
      {reup && (
        <Modal open onClose={() => setReup(null)} width={460} title={`Upload — ${reup.name}`}
          footer={<><Btn onClick={() => setReup(null)}>Cancel</Btn><Btn variant="primary" disabled={!reup.file} onClick={() => {
            if (reup.expiry && reup.expiry < todayISO()) return toast("Valid-till date is in the past — upload a current document", "red");
            setState((s) => { const x = byId(s.vendors, vid); let d = x.docs.find((dd) => dd.name === reup.name); if (!d) { d = { name: reup.name }; x.docs.push(d); } withVersion(d, { status: "Pending", file: reup.file, dataUrl: reup.dataUrl, expiry: reup.expiry, uploadedAt: todayISO() }, vendorMode ? getVendorSession()?.email : v.contact.name); }, { entity: "Vendor", id: vid, action: `${reup.name} uploaded via portal` });
            toast("Uploaded — the buyer will verify it"); setReup(null);
          }}>Upload</Btn></>}>
          <div className="space-y-3">
            <Field label="File"><input type="file" className="block w-full text-[13px]" onChange={async (e) => { const a = await readAttachment(e.target.files[0]); a && setReup((r) => ({ ...r, file: a.name, dataUrl: a.dataUrl })); }} /></Field>
            <Field label="Valid till"><DateInput value={reup.expiry} onChange={(x) => setReup({ ...reup, expiry: x })} /></Field>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- registration fixes (vendor side of "Request changes")
const vendorToForm = (v) => ({
  ...emptyVendor(), ...v, contact: { ...v.contact }, uploads: {},
  bank: v.bankAccounts.find((b) => b.isDefault) ? { ...emptyVendor().bank, ...v.bankAccounts.find((b) => b.isDefault), accountConfirm: v.bankAccounts.find((b) => b.isDefault).account } : emptyVendor().bank, notesText: "",
  contractor: v.contractor ? { ...v.contractor } : emptyVendor().contractor,
});
function applyForm(x, f, { lockBank } = {}) {
  for (const k of ["name", "legalName", "type", "supplierType", "categories", "gstin", "pan", "address", "city", "state", "currency", "paymentTerms", "tds", "tier", "group", "parentCompany", "isContractor"]) if (f[k] !== undefined) x[k] = f[k];
  for (const k of VENDOR_FORM_KEYS) if (f[k] !== undefined) x[k] = f[k];
  if (f.notesText && f.notesText.trim()) { x.notes = x.notes || []; x.notes.unshift({ at: todayISO(), by: currentUser(), text: f.notesText.trim() }); }
  x.contact = { ...f.contact };
  if (x.contractor || f.isContractor || hasType(f, "Labor")) x.contractor = { ...f.contractor };
  if (!lockBank && f.bank.account) {
    const cur = x.bankAccounts.find((b) => b.account === f.bank.account);
    if (!cur) { x.bankAccounts.forEach((b) => (b.isDefault = false)); x.bankAccounts.push({ id: Date.now(), ...f.bank, isDefault: true }); }
  }
  for (const [name, u] of Object.entries(f.uploads || {})) if (u.file) {
    let d = x.docs.find((dd) => dd.name === name);
    if (!d) { d = { name }; x.docs.push(d); }
    Object.assign(d, { status: "Pending", file: u.file, dataUrl: u.dataUrl || null, expiry: u.expiry || d.expiry || null, uploadedAt: todayISO() });
  }
}

function RegistrationFix({ v }) {
  const [f, setF] = y.useState(() => vendorToForm(v));
  const cr = v.changeRequest;
  const stage = v.approval.stages.find((s) => ["Pending", "Changes Requested"].includes(s.status));
  if (v.status === "Pending Approval")
    return <div className="space-y-3"><Note>Your registration is with our <b>{stage?.dept}</b> team. We'll e-mail you if anything is needed.</Note>
      <Stepper steps={v.approval.stages.map((s) => ({ label: s.dept, status: s.status === "Approved" ? "done" : s.status === "Pending" ? "current" : "todo" }))} /></div>;
  const resubmit = () => {
    setState((s) => {
      const x = byId(s.vendors, v.id);
      applyForm(x, f);
      const st2 = x.approval.stages.find((a) => a.status === "Changes Requested");
      if (st2) Object.assign(st2, { status: "Pending", remark: "" });
      else { const w = x.approval.stages.find((a) => a.status === "Waiting"); if (w) w.status = "Pending"; }
      x.changeRequest = cr ? { ...cr, resolvedAt: new Date().toISOString() } : null;
      x.status = "Pending Approval";
    }, { entity: "Vendor", id: v.id, action: "Vendor updated registration and resubmitted" });
    toast("Resubmitted — thank you");
  };
  return (
    <div className="space-y-4">
      {cr && !cr.resolvedAt && (
        <Note tone="amber" icon={Icon.alert}>
          <b>{cr.by} ({cr.dept}) asked for changes on {fmtDate(cr.at)}:</b>
          <ul className="mt-1 list-disc pl-5">{cr.items.map((it, i) => <li key={i}><b>{it.label}</b>{it.note ? ` — ${it.note}` : ""}</li>)}</ul>
          {cr.message && <p className="mt-1">{cr.message}</p>}
        </Note>
      )}
      <VendorForm f={f} set={setF} errors={{}} publicMode />
      <div className="flex justify-end border-t border-line pt-3"><Btn variant="primary" icon={Icon.send} onClick={resubmit}>Save & resubmit for approval</Btn></div>
    </div>
  );
}
