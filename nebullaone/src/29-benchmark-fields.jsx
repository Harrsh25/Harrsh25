// Fields added from the Vendor Module Benchmark workbook (ERPNext, Odoo, Oracle, Zoho, Procore,
// ServiceNow, SAP Fieldglass, Workday VNDLY, Beeline, Connecteam). One "More details" panel is
// shared by every purchasing document so the same header fields (company, cost centre, currency,
// addresses, incoterm, printing…) look and behave the same on RFQ, quote, PO, receipt, bill and payment.

const COMPANIES = (st) => { const s = settingsOf(st); return [s.ourCompany, ...(s.groupCompanies || [])]; };
const SITE_ADDRESSES = (st) => [...PROJECTS.map((p) => `Site — ${p}`), ...(settingsOf(st).stores || [])];
const vendorAddresses = (v) => (v ? [
  ...(v.address ? [{ id: "REG", title: "Registered office", line1: v.address, city: v.city, state: v.state }] : []),
  ...(v.addresses || []).filter((a) => !a.disabled),
] : []);
const addrLabel = (a) => [a.title, a.line1, a.city].filter(Boolean).join(" · ");
const vendorContacts = (v) => (v ? [
  ...(v.contact?.name ? [{ id: "MAIN", name: v.contact.name, email: v.contact.email, designation: v.contact.designation }] : []),
  ...(v.contacts || []).filter((c) => c.status !== "Unsubscribed"),
] : []);
const contactLabel = (c) => `${[c.salutation, c.name || [c.firstName, c.lastName].filter(Boolean).join(" ")].filter(Boolean).join(" ")}${c.designation ? ` (${c.designation})` : ""}`;
const vendorBankOptions = (v) => (v?.bankAccounts || []).filter((a) => !a.disabled && (a.status || "Verified") !== "Rejected").map((a) => ({ value: String(a.id), label: `${a.bank} ••${String(a.account).slice(-4)}${a.isDefault ? " (default)" : ""}` }));
// Options plus the stored value when it is no longer in the list (e.g. a renamed master)
const keepCurrent = (opts, cur) => (cur === undefined || cur === null || cur === "" || opts.some((o) => String(typeof o === "object" ? o.value : o) === String(cur)) ? opts : [...opts, String(cur)]);
const fxRate = (cur) => (cur && cur !== "INR" ? DEFAULT_FX[cur] || 1 : 1);

// Field catalogue. group decides the sub-heading; kinds lists the documents that show it.
const DOC_FIELDS = [
  // Header
  { key: "company", label: "Company / buying entity", group: "Header", type: "select", opts: (st) => COMPANIES(st), def: (st) => settingsOf(st).ourCompany, kinds: "req rfq quote po blanket grn bill payment contract" },
  { key: "title", label: "Title", group: "Header", type: "text", kinds: "quote po grn bill" },
  { key: "docDateTime", label: "Document date & time", group: "Header", type: "datetime", kinds: "po", def: () => new Date().toISOString().slice(0, 16) },
  { key: "rfqDate", label: "RFQ date", group: "Header", type: "date", kinds: "rfq", def: () => todayISO() },
  { key: "quoteDate", label: "Quotation date", group: "Header", type: "date", kinds: "quote", def: () => todayISO() },
  { key: "postingDate", label: "Posting / accounting date", group: "Header", type: "date", kinds: "bill payment grn", def: () => todayISO() },
  { key: "supplyDate", label: "Delivery / taxable supply date", group: "Header", type: "date", kinds: "bill" },
  { key: "buyer", label: "Buyer", group: "Header", type: "text", kinds: "rfq blanket po", def: () => currentUser() },
  { key: "priority", label: "Priority", group: "Header", type: "select", opts: () => ["Normal", "Urgent"], def: () => "Normal", kinds: "rfq grn" },
  { key: "vendorRef", label: "Vendor reference", group: "Header", type: "text", kinds: "rfq" },
  { key: "previewDate", label: "Preview / open date", group: "Header", type: "date", kinds: "rfq", hint: "Vendors can see the RFQ from this date" },
  { key: "awardDate", label: "Anticipated award date", group: "Header", type: "date", kinds: "rfq" },
  { key: "requisitioningBu", label: "Requisitioning BU", group: "Header", type: "select", opts: (st) => COMPANIES(st), kinds: "po" },
  { key: "billToBu", label: "Bill-to BU", group: "Header", type: "select", opts: (st) => COMPANIES(st), kinds: "po" },
  { key: "docStyle", label: "Document style", group: "Header", type: "select", opts: () => ["Standard purchase order", "Blanket release", "Service order", "Rate contract order"], def: () => "Standard purchase order", kinds: "po" },
  { key: "subcontracted", label: "Subcontracted (job work)", group: "Header", type: "check", kinds: "quote po" },
  { key: "confirmNo", label: "Vendor order confirmation no.", group: "Header", type: "text", kinds: "po" },
  { key: "confirmDate", label: "Confirmation date", group: "Header", type: "date", kinds: "po" },
  { key: "supplierGroup", label: "Supplier group", group: "Header", type: "readonly", value: (st, v) => v?.group || "Not grouped", kinds: "bill" },
  { key: "journal", label: "Journal", group: "Accounting", type: "select", opts: (st) => settingsOf(st).journals, kinds: "bill payment" },
  { key: "sourceEmail", label: "Received from e-mail", group: "Header", type: "text", kinds: "bill", hint: "Mailbox the bill arrived in" },
  { key: "operationType", label: "Operation type", group: "Header", type: "select", opts: () => ["Receipt", "Return receipt", "Direct to site (drop-ship)"], def: () => "Receipt", kinds: "grn" },
  { key: "responsible", label: "Responsible", group: "Header", type: "text", kinds: "grn", def: () => currentUser() },
  { key: "shippingPolicy", label: "Shipping policy", group: "Header", type: "select", opts: () => ["As soon as possible (partial)", "When all items are ready"], def: () => "As soon as possible (partial)", kinds: "grn po" },
  { key: "deliveryNote", label: "Supplier delivery note / challan no.", group: "Header", type: "text", kinds: "grn" },
  { key: "paymentType", label: "Payment type", group: "Header", type: "select", opts: () => ["Pay", "Advance", "Refund received"], def: () => "Pay", kinds: "payment" },
  { key: "agreementType", label: "Agreement / order type", group: "Header", type: "select", opts: () => ["Blanket order", "Rate contract", "Purchase template"], def: () => "Blanket order", kinds: "blanket" },
  { key: "orderDate", label: "Order date", group: "Header", type: "date", kinds: "blanket", def: () => todayISO() },
  { key: "linkedBlanket", label: "Link to purchase agreement", group: "Header", type: "select", opts: (st) => (st.blanketOrders || []).map((b) => ({ value: b.id, label: `${b.id} — ${b.vendorId ? vendorName(st, b.vendorId) : ""}` })), kinds: "rfq" },
  { key: "opening", label: "Opening entry (balance brought forward)", group: "Accounting", type: "check", kinds: "bill payment" },
  // Currency & pricing
  { key: "currency", label: "Currency", group: "Currency & pricing", type: "select", opts: () => CURRENCIES, def: (st, v) => v?.currency || "INR", kinds: "rfq quote po blanket grn bill payment" },
  { key: "fx", label: "Exchange rate (₹ per unit)", group: "Currency & pricing", type: "number", def: (st, v) => fxRate(v?.currency), kinds: "rfq quote po blanket grn bill payment", show: (d) => d.currency && d.currency !== "INR" },
  { key: "allowedCurrencies", label: "Allowed quote currencies", group: "Currency & pricing", type: "text", kinds: "rfq", def: () => "INR", hint: "Comma-separated, e.g. INR, USD" },
  { key: "priceList", label: "Price list", group: "Currency & pricing", type: "select", opts: (st) => settingsOf(st).priceLists, def: (st) => settingsOf(st).defaultPriceList, kinds: "req quote po blanket grn bill" },
  { key: "ignorePricing", label: "Ignore pricing rule (don't fill rates from the price list)", group: "Currency & pricing", type: "check", kinds: "quote po bill" },
  { key: "discApplyOn", label: "Additional discount — apply on", group: "Currency & pricing", type: "select", opts: () => ["Net total", "Grand total"], def: () => "Net total", kinds: "quote po grn bill" },
  { key: "discPct", label: "Additional discount (%)", group: "Currency & pricing", type: "number", kinds: "quote po grn bill" },
  { key: "discAmt", label: "Additional discount (₹)", group: "Currency & pricing", type: "number", kinds: "quote po grn bill" },
  { key: "noRounding", label: "Disable rounded total", group: "Currency & pricing", type: "check", kinds: "quote po bill" },
  { key: "paymentTerms", label: "Payment terms template", group: "Currency & pricing", type: "select", opts: (st) => settingsOf(st).paymentTermTemplates.map((t) => t.name), def: (st, v) => v?.paymentTerms, kinds: "rfq po bill" },
  // Taxes & shipping
  { key: "taxCategory", label: "Tax category", group: "Taxes & shipping", type: "select", opts: (st) => settingsOf(st).taxCategories, kinds: "quote po grn bill payment" },
  { key: "taxTemplate", label: "Purchase taxes & charges template", group: "Taxes & shipping", type: "select", opts: (st) => settingsOf(st).taxTemplates.map((t) => t.name), kinds: "quote po grn bill payment" },
  { key: "fiscalPosition", label: "Tax position", group: "Taxes & shipping", type: "select", opts: () => ["Domestic", "Import", "SEZ", "Exempt"], def: () => "Domestic", kinds: "rfq bill" },
  { key: "shippingRule", label: "Shipping rule (freight)", group: "Taxes & shipping", type: "select", opts: (st) => settingsOf(st).shippingRules.map((r) => r.name), kinds: "quote po grn bill" },
  { key: "incoterm", label: "Incoterm", group: "Taxes & shipping", type: "select", opts: () => INCOTERMS, kinds: "quote po grn bill" },
  { key: "namedPlace", label: "Named place (incoterm location)", group: "Taxes & shipping", type: "text", kinds: "rfq quote po grn bill" },
  // Address & contact
  { key: "supplierAddress", label: "Supplier address / site", group: "Address & contact", type: "select", opts: (st, v) => vendorAddresses(v).map((a) => ({ value: a.id, label: addrLabel(a) })), kinds: "quote po grn bill" },
  { key: "supplierContact", label: "Supplier contact", group: "Address & contact", type: "select", opts: (st, v) => vendorContacts(v).map((c) => ({ value: c.id, label: contactLabel(c) })), kinds: "quote po grn bill payment" },
  { key: "shipTo", label: "Ship-to / deliver-to address", group: "Address & contact", type: "select", opts: (st) => SITE_ADDRESSES(st), kinds: "rfq quote po grn bill" },
  { key: "dispatchAddress", label: "Dispatch address (from)", group: "Address & contact", type: "text", kinds: "po grn" },
  { key: "billingAddress", label: "Company billing address", group: "Address & contact", type: "select", opts: (st) => COMPANIES(st).map((c) => `${c} — registered office`), kinds: "rfq quote po grn bill" },
  { key: "dropshipContact", label: "Drop-ship site contact", group: "Address & contact", type: "text", kinds: "po" },
  { key: "store", label: "Receiving store / warehouse", group: "Address & contact", type: "select", opts: (st) => settingsOf(st).stores, kinds: "req po grn" },
  // Accounting
  { key: "costCentre", label: "Cost centre", group: "Accounting", type: "select", opts: (st) => settingsOf(st).costCentres, kinds: "req quote po blanket grn bill payment contract" },
  { key: "project", label: "Project", group: "Accounting", type: "select", opts: () => PROJECTS, kinds: "quote po grn bill payment" },
  { key: "payableAccount", label: "Credit to / payable account", group: "Accounting", type: "select", opts: (st) => settingsOf(st).payableAccounts, def: (st, v) => v?.payableAccount, kinds: "bill" },
  // Transport
  { key: "transporter", label: "Transporter name", group: "Transport", type: "text", kinds: "grn" },
  { key: "vehicleNo", label: "Vehicle number", group: "Transport", type: "text", kinds: "grn" },
  { key: "vehicleDate", label: "Vehicle date", group: "Transport", type: "date", kinds: "grn" },
  // Terms & printing
  { key: "letterHead", label: "Letter head", group: "Terms & printing", type: "select", opts: (st) => settingsOf(st).letterHeads, kinds: "rfq quote po bill" },
  { key: "printHeading", label: "Print heading", group: "Terms & printing", type: "select", opts: (st) => settingsOf(st).printHeadings, kinds: "rfq quote po bill" },
  { key: "groupSame", label: "Group same items when printing", group: "Terms & printing", type: "check", kinds: "quote po bill" },
  { key: "printLanguage", label: "Print language", group: "Terms & printing", type: "select", opts: (st) => settingsOf(st).printLanguages, def: (st, v) => v?.printLanguage || "English", kinds: "po" },
  { key: "repeatFrom", label: "Auto-repeat from", group: "Terms & printing", type: "date", kinds: "po bill" },
  { key: "repeatTo", label: "Auto-repeat to", group: "Terms & printing", type: "date", kinds: "po bill" },
  { key: "repeatEvery", label: "Repeat every", group: "Terms & printing", type: "select", opts: () => ["Month", "Quarter", "Year"], kinds: "po bill" },
  { key: "notes", label: "Notes / remarks / instructions", group: "Terms & printing", type: "textarea", kinds: "po grn bill payment" },
];
const DOC_GROUPS = ["Header", "Currency & pricing", "Taxes & shipping", "Address & contact", "Accounting", "Transport", "Terms & printing"];
const docFields = (kind) => DOC_FIELDS.filter((f) => f.kinds.split(" ").includes(kind));
function docDefaults(kind, st, v) {
  const d = {};
  for (const f of docFields(kind)) if (f.def) { const x = f.def(st, v); if (x !== undefined && x !== null && x !== "") d[f.key] = x; }
  return d;
}
// Discount, freight and rounding on top of the line subtotal
function docAdjust(d, subtotal, st) {
  d = d || {};
  const base = Number(subtotal) || 0;
  const disc = round2((Number(d.discPct) || 0) / 100 * base + (Number(d.discAmt) || 0));
  const freight = Number((settingsOf(st || getState()).shippingRules.find((r) => r.name === d.shippingRule) || {}).amount) || 0;
  const raw = base - disc + freight;
  const total = d.noRounding ? round2(raw) : Math.round(raw);
  return { base, disc, freight, rounding: round2(total - raw), total, inr: round2(total * (Number(d.fx) || 1)) };
}
function docDetailErrors(kind, d) {
  const e = {};
  if (Number(d.discPct) < 0 || Number(d.discPct) > 100) e.discPct = "Discount must be 0–100%";
  if (Number(d.discAmt) < 0) e.discAmt = "Discount can't be negative";
  if (d.currency && d.currency !== "INR" && !(Number(d.fx) > 0)) e.fx = "Enter the exchange rate";
  if (d.repeatFrom && d.repeatTo && d.repeatTo <= d.repeatFrom) e.repeatTo = "Must be after the start";
  if (d.confirmDate && d.confirmDate > todayISO()) e.confirmDate = "Can't be in the future";
  if (d.vehicleDate && d.vehicleDate > todayISO()) e.vehicleDate = "Can't be in the future";
  if (kind === "rfq" && d.previewDate && d.awardDate && d.awardDate < d.previewDate) e.awardDate = "Award can't be before the open date";
  return e;
}

// Editable panel. value = the document's details object; vendor gives addresses, contacts, currency.
function DocDetails({ kind, value, onChange, vendor, subtotal, open: openInit = false, customKind }) {
  const st = useStore();
  const [open, setOpen] = y.useState(openInit);
  const d = value || {};
  const set = (k, x) => onChange({ ...d, [k]: x });
  const errs = docDetailErrors(kind, d);
  const fields = docFields(kind).filter((f) => !f.show || f.show(d));
  const custom = (settingsOf(st).customFields || {})[customKind || kind] || [];
  const adj = subtotal !== undefined && ["quote", "po", "grn", "bill"].includes(kind) ? docAdjust(d, subtotal, st) : null;
  const filled = Object.keys(d).filter((k) => d[k] !== "" && d[k] !== undefined && d[k] !== false).length;
  const input = (f) => {
    const val = d[f.key];
    if (f.type === "readonly") return <span className="flex h-[32px] items-center text-[13px] text-ink-soft">{f.value(st, vendor)}</span>;
    if (f.type === "select") return <Select value={val ?? ""} placeholder="—" onChange={(x) => set(f.key, x)} options={keepCurrent(f.opts(st, vendor) || [], val)} />;
    if (f.type === "number") return <NumInput value={val ?? ""} onChange={(x) => set(f.key, x)} />;
    if (f.type === "date") return <DateInput value={val || ""} onChange={(x) => set(f.key, x)} />;
    if (f.type === "datetime") return <input type="datetime-local" value={val || ""} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />;
    if (f.type === "check") return <div className="flex h-[32px] items-center"><Check checked={!!val} onChange={(b) => set(f.key, b)} label="Yes" /></div>;
    if (f.type === "textarea") return <TextArea rows={2} value={val || ""} onChange={(x) => set(f.key, x)} />;
    return <TextInput value={val || ""} onChange={(x) => set(f.key, x)} />;
  };
  return (
    <section className="rounded-lg border border-line" data-docdetails={kind}>
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-gray-50">
        <span className="flex items-center gap-2">{h(open ? Icon.chevronDown : Icon.chevronRight, { size: 14 })}More details <span className="font-normal text-ink-mute">company, currency, taxes, addresses, accounting, printing</span></span>
        <span className="text-[11.5px] font-normal text-ink-mute">{filled} filled{adj && adj.total !== adj.base ? ` · adjusted total ${inr(adj.total)}` : ""}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-3">
          {DOC_GROUPS.map((g) => {
            const fs = fields.filter((f) => f.group === g);
            if (!fs.length) return null;
            return (
              <div key={g}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">{g}</p>
                <div className="grid grid-cols-3 gap-3">
                  {fs.map((f) => <Field key={f.key} label={f.label} hint={f.hint} span={f.type === "textarea" ? 3 : 1}>{input(f)}<FieldErr m={errs[f.key]} /></Field>)}
                </div>
              </div>
            );
          })}
          {custom.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Custom fields</p>
              <CustomFieldInputs defs={custom} value={d.custom || {}} onChange={(c) => set("custom", c)} />
            </div>
          )}
          {adj && (adj.disc || adj.freight || adj.rounding || (d.currency && d.currency !== "INR")) ? (
            <p className="rounded-md bg-gray-50 px-3 py-2 text-[12.5px] text-ink-soft">
              Lines <b className="num">{inr(adj.base)}</b>{adj.disc ? <> − discount <b className="num">{inr(adj.disc)}</b></> : null}{adj.freight ? <> + freight <b className="num">{inr(adj.freight)}</b></> : null}{adj.rounding ? <> {adj.rounding > 0 ? "+" : "−"} rounding <b className="num">{inr(Math.abs(adj.rounding))}</b></> : null} = <b className="num text-ink">{d.currency && d.currency !== "INR" ? `${d.currency} ${adj.total.toLocaleString("en-IN")} ≈ ${inr(adj.inr)}` : inr(adj.total)}</b>
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
// Read-only view for drawers
function DocDetailsView({ kind, value, vendor }) {
  const st = useStore();
  const d = value || {};
  const lbl = (f) => {
    const x = d[f.key];
    if (x === undefined || x === "" || x === false) return null;
    if (f.type === "check") return "Yes";
    if (f.key === "supplierAddress") { const a = vendorAddresses(vendor).find((q) => q.id === x); return a ? addrLabel(a) : x; }
    if (f.key === "supplierContact") { const c = vendorContacts(vendor).find((q) => q.id === x); return c ? contactLabel(c) : x; }
    if (f.type === "date") return fmtDate(x);
    return String(x);
  };
  const items = docFields(kind).map((f) => [f.label, lbl(f)]).filter((r) => r[1]);
  const custom = Object.entries(d.custom || {}).filter(([, x]) => x !== "" && x !== undefined);
  if (!items.length && !custom.length) return null;
  return <Section title="More details" icon={Icon.info}><KV items={[...items, ...custom]} /></Section>;
}

// Custom fields defined in Procurement Settings (vendor, RFQ, PO)
function CustomFieldInputs({ defs, value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {defs.map((c) => {
        const v = value[c.label] ?? "";
        const set = (x) => onChange({ ...value, [c.label]: x });
        return (
          <Field key={c.label} label={c.label}>
            {c.type === "Number" ? <NumInput value={v} onChange={set} /> : c.type === "Date" ? <DateInput value={v} onChange={set} />
              : c.type === "Dropdown" ? <Select value={v} placeholder="—" onChange={set} options={String(c.options || "").split(",").map((x) => x.trim()).filter(Boolean)} />
              : <TextInput value={v} onChange={set} />}
          </Field>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- vendor master additions
const ENTITY_TYPES = ["Private limited company", "Public limited company", "LLP", "Partnership firm", "Proprietorship", "Trust / Society", "Government / PSU", "Foreign company"];
const GST_TREATMENTS = ["Registered — regular", "Registered — composition", "Unregistered", "Overseas", "SEZ"];
const TAX_PREFS = ["Taxable", "Tax exempt", "Non-GST supply"];
const MSME_TYPES = ["Not MSME", "Micro", "Small", "Medium"];
const PAY_METHODS = ["NEFT", "RTGS", "IMPS", "Cheque", "Wire transfer (SWIFT)", "UPI"];
const BILL_DELIVERY = ["Supplier portal", "E-mail", "Paper (courier)"];
const FEDERAL_TAX_TYPES = ["Corporation", "Partnership", "Individual / sole proprietor", "Exempt organisation", "Not applicable"];
const SALUTATIONS = ["Mr", "Ms", "Mrs", "Dr", "Er"];
const ACCOUNT_TYPES = ["Current", "Savings", "Cash credit", "Overdraft", "Escrow"];
const ADDRESS_TYPES = ["Billing", "Shipping", "Office", "Site", "Registered", "Warehouse"];
const SITE_PURPOSES = ["Purchasing", "Pay", "Primary pay", "Sourcing only"];
// Top-level vendor keys the registration form edits (copied by applyForm on edit)
const VENDOR_FORM_KEYS = ["country", "pin", "website", "taxId", "addressLine2", "district", "entityType", "taxPreference", "gstTreatment", "placeOfSupply", "msmeType", "udyamNo", "duns",
  "federalTaxType", "tags", "logo", "logoName", "isTransporter", "printLanguage", "paymentMethod", "priceList", "creditLimit", "payableAccount", "billDelivery", "autoPostBills",
  "defaultBuyer", "purchaseWarning", "receiptReminderDays", "custom", "noteToApprover"];
const vendorExtraDefaults = () => ({ addressLine2: "", district: "", entityType: "Private limited company", taxPreference: "Taxable", gstTreatment: "Registered — regular", placeOfSupply: "",
  msmeType: "Not MSME", udyamNo: "", duns: "", federalTaxType: "", tags: [], logo: null, logoName: "", isTransporter: false, printLanguage: "English", paymentMethod: "NEFT", priceList: "",
  creditLimit: "", payableAccount: "", billDelivery: "Supplier portal", autoPostBills: false, defaultBuyer: "", purchaseWarning: "", receiptReminderDays: "", custom: {}, notesText: "", noteToApprover: "",
  contacts: [], addresses: [] });
function vendorExtraErrors(f) {
  const e = {};
  if (f.udyamNo && !/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/.test(String(f.udyamNo).toUpperCase())) e.udyamNo = "Format UDYAM-MH-26-0012345";
  if (f.msmeType && f.msmeType !== "Not MSME" && !f.udyamNo) e.udyamNo = "Enter the Udyam registration no.";
  if (f.duns && !/^\d{9}$/.test(String(f.duns).replace(/-/g, ""))) e.duns = "D-U-N-S is 9 digits";
  if (!VX.blank(f.creditLimit)) { const c = VX.num(f.creditLimit, { min: 0, label: "Credit limit" }); if (c) e.creditLimit = c; }
  if (!VX.blank(f.receiptReminderDays)) { const c = VX.num(f.receiptReminderDays, { min: 0, max: 30, int: true, label: "Reminder days" }); if (c) e.receiptReminderDays = c; }
  const m = f.contact?.mobile && VX.mobile(f.contact.mobile); if (m) e.mobile = m;
  const b = f.bank || {};
  if (b.account && b.accountConfirm !== undefined && b.accountConfirm !== "" && b.accountConfirm !== b.account) e.bank_confirm = "Account numbers don't match";
  if (b.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(String(b.iban).replace(/\s/g, "").toUpperCase())) e.bank_iban = "IBAN: 2 letters, 2 digits, then 10–30 letters / digits";
  return e;
}

// Extra registration section (rendered inside VendorForm)
function VendorMoreFields({ f, set, errors, publicMode, foreign }) {
  const st = useStore();
  const upd = (k, x) => set({ ...f, [k]: x });
  const updC = (k, x) => set({ ...f, contact: { ...f.contact, [k]: x } });
  const err = (k) => errors[k] && <span className="mt-1 block text-[11px] text-red-600">{errors[k]}</span>;
  const [tag, setTag] = y.useState("");
  const custom = (settingsOf(st).customFields || {}).vendor || [];
  const logo = async (file) => { if (!file) return; const a = await readAttachment(file, /\.(png|jpe?g)$/i); if (a) set({ ...f, logo: a.dataUrl, logoName: a.name }); };
  const sub = (t) => <p className="col-span-3 mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-mute first:mt-0">{t}</p>;
  return (
    <div className="grid grid-cols-3 gap-3">
      {sub("Contact person details")}
      <Field label="Salutation"><Select value={f.contact.salutation || ""} placeholder="—" onChange={(x) => updC("salutation", x)} options={SALUTATIONS} /></Field>
      <Field label="Designation / job position"><TextInput value={f.contact.designation || ""} onChange={(x) => updC("designation", x)} placeholder="e.g. Sales manager" /></Field>
      <Field label="Department"><TextInput value={f.contact.department || ""} onChange={(x) => updC("department", x)} placeholder="e.g. Sales" /></Field>
      <Field label="Mobile"><TextInput value={f.contact.mobile || ""} onChange={(x) => updC("mobile", x)} placeholder="98xxxxxxxx" />{err("mobile")}</Field>
      <Field label="Fax"><TextInput value={f.contact.fax || ""} onChange={(x) => updC("fax", x)} /></Field>
      <Field label="Gender"><Select value={f.contact.gender || ""} placeholder="—" onChange={(x) => updC("gender", x)} options={["Female", "Male", "Other", "Prefer not to say"]} /></Field>
      {sub("Address")}
      <Field label="Address line 2"><TextInput value={f.addressLine2 || ""} onChange={(x) => upd("addressLine2", x)} placeholder="Landmark, area" /></Field>
      <Field label="District / county"><TextInput value={f.district || ""} onChange={(x) => upd("district", x)} /></Field>
      <Field label="Place of supply" hint={!foreign ? "Defaults to the GSTIN state" : ""}><Select value={f.placeOfSupply || (foreign ? "" : f.state)} placeholder="—" onChange={(x) => upd("placeOfSupply", x)} options={withCurrent(STATES, f.placeOfSupply)} /></Field>
      {sub("Tax & statutory")}
      <Field label="Entity type"><Select value={f.entityType || ""} onChange={(x) => upd("entityType", x)} options={ENTITY_TYPES} /></Field>
      {!foreign && <Field label="GST treatment"><Select value={f.gstTreatment || ""} onChange={(x) => upd("gstTreatment", x)} options={GST_TREATMENTS} /></Field>}
      <Field label="Tax preference"><Select value={f.taxPreference || ""} onChange={(x) => upd("taxPreference", x)} options={TAX_PREFS} /></Field>
      {!foreign && <Field label="MSME type"><Select value={f.msmeType || "Not MSME"} onChange={(x) => upd("msmeType", x)} options={MSME_TYPES} /></Field>}
      {!foreign && <Field label="Udyam registration no." hint="MSME vendors must be paid within 45 days"><TextInput value={f.udyamNo || ""} onChange={(x) => upd("udyamNo", x.toUpperCase())} placeholder="UDYAM-MH-26-0012345" />{err("udyamNo")}</Field>}
      <Field label="D-U-N-S number"><TextInput value={f.duns || ""} onChange={(x) => upd("duns", x)} placeholder="9 digits" maxLength={11} />{err("duns")}</Field>
      {foreign && <Field label="Federal income tax type"><Select value={f.federalTaxType || ""} placeholder="—" onChange={(x) => upd("federalTaxType", x)} options={FEDERAL_TAX_TYPES} /></Field>}
      {!publicMode && <>
        {sub("Purchasing & payment defaults")}
        <Field label="Payment method"><Select value={f.paymentMethod || ""} onChange={(x) => upd("paymentMethod", x)} options={PAY_METHODS} /></Field>
        <Field label="Price list"><Select value={f.priceList || ""} placeholder="Company default" onChange={(x) => upd("priceList", x)} options={settingsOf(st).priceLists} /></Field>
        <Field label="Credit limit (₹)" hint="Outstanding above this shows a warning on new POs"><NumInput value={f.creditLimit ?? ""} onChange={(x) => upd("creditLimit", x)} />{err("creditLimit")}</Field>
        <Field label="Payable account"><Select value={f.payableAccount || ""} placeholder="Default for vendor type" onChange={(x) => upd("payableAccount", x)} options={settingsOf(st).payableAccounts} /></Field>
        <Field label="Bill delivery"><Select value={f.billDelivery || ""} onChange={(x) => upd("billDelivery", x)} options={BILL_DELIVERY} /></Field>
        <Field label="Default buyer"><TextInput value={f.defaultBuyer || ""} onChange={(x) => upd("defaultBuyer", x)} placeholder="Name of the buyer" /></Field>
        <Field label="Receipt reminder (days before delivery)"><NumInput value={f.receiptReminderDays ?? ""} onChange={(x) => upd("receiptReminderDays", x)} placeholder={String(settingsOf(st).receiptReminderDays)} />{err("receiptReminderDays")}</Field>
        <Field label="Print language"><Select value={f.printLanguage || "English"} onChange={(x) => upd("printLanguage", x)} options={settingsOf(st).printLanguages} /></Field>
        <div className="flex flex-col justify-end gap-1.5 pb-1">
          <Check checked={!!f.autoPostBills} onChange={(b) => upd("autoPostBills", b)} label="Auto-post bills from this vendor" />
          <Check checked={!!f.isTransporter} onChange={(b) => upd("isTransporter", b)} label="Also a transporter" />
        </div>
        <Field label="Purchase warning / message" span={3} hint="Shown to buyers on RFQs and POs for this vendor"><TextInput value={f.purchaseWarning || ""} onChange={(x) => upd("purchaseWarning", x)} placeholder="e.g. Confirm stock before ordering above 20 MT" /></Field>
      </>}
      {sub("Profile")}
      <Field label="Tags" span={2}>
        <div className="flex flex-wrap items-center gap-1.5">
          {(f.tags || []).map((t) => <span key={t} className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-[2px] text-[12px]">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => upd("tags", f.tags.filter((x) => x !== t))} className="text-ink-mute hover:text-red-600">×</button></span>)}
          <input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tag.trim()) { e.preventDefault(); if (!(f.tags || []).includes(tag.trim())) upd("tags", [...(f.tags || []), tag.trim()]); setTag(""); } }} placeholder="Type a tag and press Enter" className={cls(inputCls, "w-[200px]")} />
        </div>
      </Field>
      <Field label="Logo / image" hint="PNG or JPG, up to 5 MB">
        <label className="flex h-[32px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed border-gray-300 px-2.5 text-[12.5px] text-ink-soft hover:border-brand hover:text-brand">
          {f.logo ? <img src={f.logo} alt="" className="h-5 w-5 rounded object-cover" /> : h(Icon.upload, { size: 13 })}<span className="truncate">{f.logoName || "Choose image"}</span>
          <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={(e) => logo(e.target.files[0])} />
        </label>
      </Field>
      {custom.length > 0 && <>{sub("Custom fields")}<div className="col-span-3"><CustomFieldInputs defs={custom} value={f.custom || {}} onChange={(c) => upd("custom", c)} /></div></>}
      {sub("Notes")}
      <Field label="Notes / vendor details" span={publicMode ? 3 : 2}><TextArea rows={2} value={f.notesText || ""} onChange={(x) => upd("notesText", x)} placeholder="Anything the team should know about this vendor" /></Field>
      {!publicMode && <Field label="Note to approver"><TextArea rows={2} value={f.noteToApprover || ""} onChange={(x) => upd("noteToApprover", x)} placeholder="Shown on the approval screen" /></Field>}
    </div>
  );
}

// Contacts & addresses tab (ERPNext Contact / Address lists, Oracle supplier sites)
function VendorContactsAddresses({ v, locked }) {
  const st = useStore();
  const [c, setC] = y.useState(null), [a, setA] = y.useState(null);
  const mut = (fn, action) => setState((s) => fn(byId(s.vendors, v.id)), { entity: "Vendor", id: v.id, action });
  const cErr = !c ? "" : !(c.firstName || "").trim() ? "Enter the first name" : !EMAIL_RE.test(c.email || "") ? "Enter a valid e-mail" : VX.phone(c.phone) || (c.mobile ? VX.mobile(c.mobile) : "") || "";
  const aErr = !a ? "" : !(a.title || "").trim() ? "Enter an address title" : !(a.line1 || "").trim() ? "Enter address line 1" : !(a.city || "").trim() ? "Enter the city" : VX.pin(a.pin, a.country || "India") || "";
  const saveC = () => {
    if (cErr) return toast(cErr, "red");
    mut((x) => { x.contacts = x.contacts || []; if (c.primary) x.contacts.forEach((o) => (o.primary = false)); const i = x.contacts.findIndex((o) => o.id === c.id); if (i >= 0) x.contacts[i] = c; else x.contacts.push({ ...c, id: `CT-${Date.now().toString(36)}` });
      if (c.primary) Object.assign(x.contact, { name: `${c.firstName} ${c.lastName || ""}`.trim(), email: c.email, phone: c.phone || x.contact.phone, salutation: c.salutation, designation: c.designation, department: c.department, mobile: c.mobile }); },
      `Contact ${c.firstName} ${c.lastName || ""} ${c.id ? "updated" : "added"}${c.primary ? " (primary)" : ""}`);
    toast("Contact saved"); setC(null);
  };
  const saveA = () => {
    if (aErr) return toast(aErr, "red");
    mut((x) => { x.addresses = x.addresses || [];
      if (a.preferredBilling) x.addresses.forEach((o) => (o.preferredBilling = false));
      if (a.preferredShipping) x.addresses.forEach((o) => (o.preferredShipping = false));
      const i = x.addresses.findIndex((o) => o.id === a.id); if (i >= 0) x.addresses[i] = a; else x.addresses.push({ ...a, id: `AD-${Date.now().toString(36)}` }); },
      `Address "${a.title}" ${a.id ? "updated" : "added"}`);
    toast("Address saved"); setA(null);
  };
  const blankC = () => ({ salutation: "", firstName: "", middleName: "", lastName: "", designation: "", department: "", gender: "", email: "", phone: "", mobile: "", fax: "", primary: !(v.contacts || []).length, status: "Active", portalUser: false });
  const blankA = () => ({ title: "", type: "Billing", line1: "", line2: "", city: "", district: "", state: v.state || "Maharashtra", pin: "", country: v.country || "India", purposes: ["Purchasing", "Pay"], bu: settingsOf(st).ourCompany, preferredBilling: !(v.addresses || []).length, preferredShipping: false, disabled: false });
  const contacts = [{ id: "MAIN", firstName: v.contact.name, email: v.contact.email, phone: v.contact.phone, mobile: v.contact.mobile, designation: v.contact.designation, salutation: v.contact.salutation, main: true, primary: !(v.contacts || []).some((x) => x.primary), status: "Active", portalUser: true }, ...(v.contacts || [])];
  return (
    <>
      <Section title="Contacts" icon={Icon.users} actions={!locked && <Btn size="sm" icon={Icon.plus} onClick={() => setC(blankC())}>Add contact</Btn>}>
        <DataTable dense rows={contacts} rowKey={(r) => r.id} columns={[
          { key: "n", label: "Name", className: "font-medium", render: (r) => <span className="flex items-center gap-2">{[r.salutation, r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ")}{r.primary && <Status tone="blue">Primary</Status>}{r.main && <span className="text-[11px] text-ink-mute">registration contact</span>}</span> },
          { key: "d", label: "Designation · department", render: (r) => [r.designation, r.department].filter(Boolean).join(" · ") || "—" },
          { key: "e", label: "E-mail", render: (r) => r.email || "—" }, { key: "p", label: "Phone / mobile", render: (r) => [r.phone, r.mobile].filter(Boolean).join(" · ") || "—" },
          { key: "s", label: "Status", render: (r) => <Status tone={r.status === "Unsubscribed" ? "gray" : "green"}>{r.status || "Active"}</Status> },
          { key: "u", label: "Portal user", render: (r) => (r.main || (v.portalUsers || []).some((u) => u.email === (r.email || "").toLowerCase()) ? "Yes" : "—") },
          { key: "a", label: "", align: "right", render: (r) => !locked && !r.main && <Btn size="sm" icon={Icon.pencil} onClick={() => setC({ ...r })}>Edit</Btn> },
        ]} />
      </Section>
      <Section title="Addresses & supplier sites" icon={Icon.pin} actions={!locked && <Btn size="sm" icon={Icon.plus} onClick={() => setA(blankA())}>Add address</Btn>}>
        <DataTable dense rows={[...(v.address ? [{ id: "REG", title: "Registered office", type: "Registered", line1: v.address, line2: v.addressLine2, city: v.city, district: v.district, state: v.state, pin: v.pin, country: v.country, purposes: ["Purchasing", "Pay"], reg: true }] : []), ...(v.addresses || [])]} rowKey={(r) => r.id} empty={<p className="p-4 text-[13px] text-ink-mute">No addresses yet.</p>} columns={[
          { key: "t", label: "Title", className: "font-medium", render: (r) => <span className="flex items-center gap-2">{r.title}{r.preferredBilling && <Status tone="blue">Billing</Status>}{r.preferredShipping && <Status tone="purple">Shipping</Status>}{r.disabled && <Status tone="gray">Disabled</Status>}</span> },
          { key: "ty", label: "Type", render: (r) => r.type },
          { key: "ad", label: "Address", render: (r) => <span className="text-[12.5px]">{[r.line1, r.line2, r.city, r.district, r.state, r.pin, r.country].filter(Boolean).join(", ")}</span> },
          { key: "pu", label: "Site purposes", render: (r) => (r.purposes || []).join(", ") || "—" }, { key: "bu", label: "Business unit", render: (r) => r.bu || "—" },
          { key: "a", label: "", align: "right", render: (r) => !locked && !r.reg && <Btn size="sm" icon={Icon.pencil} onClick={() => setA({ ...r })}>Edit</Btn> },
        ]} />
      </Section>
      {c && (
        <Modal open onClose={() => setC(null)} width={680} title={c.id ? "Edit contact" : "Add contact"} footer={<>{cErr && <span className="mr-auto text-[12px] text-red-600">{cErr}</span>}<Btn onClick={() => setC(null)}>Cancel</Btn><Btn variant="primary" disabled={!!cErr} onClick={saveC}>Save contact</Btn></>}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Salutation"><Select value={c.salutation} placeholder="—" onChange={(x) => setC({ ...c, salutation: x })} options={SALUTATIONS} /></Field>
            <Field label="First name" required><TextInput value={c.firstName} onChange={(x) => setC({ ...c, firstName: x })} /></Field>
            <Field label="Middle name"><TextInput value={c.middleName} onChange={(x) => setC({ ...c, middleName: x })} /></Field>
            <Field label="Last name"><TextInput value={c.lastName} onChange={(x) => setC({ ...c, lastName: x })} /></Field>
            <Field label="Designation / job position"><TextInput value={c.designation} onChange={(x) => setC({ ...c, designation: x })} /></Field>
            <Field label="Department"><TextInput value={c.department} onChange={(x) => setC({ ...c, department: x })} /></Field>
            <Field label="E-mail" required><TextInput type="email" value={c.email} onChange={(x) => setC({ ...c, email: x })} /></Field>
            <Field label="Phone"><TextInput value={c.phone} onChange={(x) => setC({ ...c, phone: x })} /></Field>
            <Field label="Mobile"><TextInput value={c.mobile} onChange={(x) => setC({ ...c, mobile: x })} /></Field>
            <Field label="Fax"><TextInput value={c.fax} onChange={(x) => setC({ ...c, fax: x })} /></Field>
            <Field label="Gender"><Select value={c.gender} placeholder="—" onChange={(x) => setC({ ...c, gender: x })} options={["Female", "Male", "Other", "Prefer not to say"]} /></Field>
            <Field label="Status"><Select value={c.status} onChange={(x) => setC({ ...c, status: x })} options={["Active", "Unsubscribed"]} /></Field>
            <div className="col-span-3 flex gap-6"><Check checked={!!c.primary} onChange={(b) => setC({ ...c, primary: b })} label="Primary contact (replaces the registration contact)" /><Check checked={!!c.portalUser} onChange={(b) => setC({ ...c, portalUser: b })} label="Give portal access" /></div>
          </div>
        </Modal>
      )}
      {a && (
        <Modal open onClose={() => setA(null)} width={720} title={a.id ? "Edit address" : "Add address / supplier site"} footer={<>{aErr && <span className="mr-auto text-[12px] text-red-600">{aErr}</span>}<Btn onClick={() => setA(null)}>Cancel</Btn><Btn variant="primary" disabled={!!aErr} onClick={saveA}>Save address</Btn></>}>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Address title" required><TextInput value={a.title} onChange={(x) => setA({ ...a, title: x })} placeholder="e.g. Chakan works" /></Field>
            <Field label="Address type"><Select value={a.type} onChange={(x) => setA({ ...a, type: x })} options={ADDRESS_TYPES} /></Field>
            <Field label="Business unit (client / bill-to)"><Select value={a.bu} onChange={(x) => setA({ ...a, bu: x })} options={COMPANIES(st)} /></Field>
            <Field label="Address line 1" required span={2}><TextInput value={a.line1} onChange={(x) => setA({ ...a, line1: x })} /></Field>
            <Field label="Address line 2"><TextInput value={a.line2} onChange={(x) => setA({ ...a, line2: x })} /></Field>
            <Field label="City" required><TextInput value={a.city} onChange={(x) => setA({ ...a, city: x })} /></Field>
            <Field label="District / county"><TextInput value={a.district} onChange={(x) => setA({ ...a, district: x })} /></Field>
            <Field label="State"><Select value={a.state} onChange={(x) => setA({ ...a, state: x })} options={withCurrent(STATES, a.state)} /></Field>
            <Field label="Postal / PIN code"><TextInput value={a.pin} onChange={(x) => setA({ ...a, pin: x })} maxLength={10} /></Field>
            <Field label="Country"><Select value={a.country} onChange={(x) => setA({ ...a, country: x })} options={COUNTRIES} /></Field>
            <Field label="Site purposes"><TradePicker options={SITE_PURPOSES} value={a.purposes || []} onChange={(x) => setA({ ...a, purposes: x })} /></Field>
            <div className="col-span-3 flex flex-wrap gap-6">
              <Check checked={!!a.preferredBilling} onChange={(b) => setA({ ...a, preferredBilling: b })} label="Preferred billing address" />
              <Check checked={!!a.preferredShipping} onChange={(b) => setA({ ...a, preferredShipping: b })} label="Preferred shipping address" />
              <Check checked={!!a.disabled} onChange={(b) => setA({ ...a, disabled: b })} label="Disable address" />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// Vendor master extras shown on the Overview tab
function VendorMoreView({ v }) {
  const custom = Object.entries(v.custom || {}).filter(([, x]) => x !== "" && x !== undefined);
  const items = [
    ["Entity type", v.entityType], ["GST treatment", v.gstTreatment], ["Tax preference", v.taxPreference], ["Place of supply", v.placeOfSupply],
    ["MSME", v.msmeType && v.msmeType !== "Not MSME" ? `${v.msmeType}${v.udyamNo ? ` · ${v.udyamNo}` : ""}` : null], ["D-U-N-S", v.duns], ["Federal tax type", v.federalTaxType],
    ["Payment method", v.paymentMethod], ["Price list", v.priceList], ["Credit limit", v.creditLimit ? inrShort(v.creditLimit) : null], ["Payable account", v.payableAccount],
    ["Bill delivery", v.billDelivery], ["Auto-post bills", v.autoPostBills ? "Yes" : null], ["Default buyer", v.defaultBuyer], ["Receipt reminder", v.receiptReminderDays ? `${v.receiptReminderDays} days before delivery` : null],
    ["Print language", v.printLanguage], ["Transporter", v.isTransporter ? "Yes" : null], ["Website", v.website], ["Tags", (v.tags || []).length ? <CategoryChips list={v.tags} max={99} wrap /> : null],
    ["Frozen", v.frozen ? "Yes — no new transactions" : null], ...custom,
  ].filter((r) => r[1]);
  return (
    <>
      {v.purchaseWarning && <Note tone="amber" icon={Icon.warning}><b>Purchase warning:</b> {v.purchaseWarning}</Note>}
      {items.length > 0 && <Section title="More details" icon={Icon.info} actions={v.logo && <img src={v.logo} alt={`${v.name} logo`} className="h-7 w-7 rounded object-cover" />}><KV items={items} /></Section>}
    </>
  );
}

// ---------------------------------------------------------------- settings: masters and purchasing controls
// Table editor for a list of objects. cols: { key, label, type: text|number|check|select|textarea, options, width }
function TableEditor({ title, icon, hint, rows, onChange, cols, blank }) {
  const upd = (i, k, x) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: x } : r)));
  return (
    <Section title={title} icon={icon || Icon.layers} actions={<Btn size="sm" icon={Icon.plus} onClick={() => onChange([...rows, blank()])}>Add</Btn>}>
      {hint && <p className="border-b border-line px-4 py-2 text-[12px] text-ink-mute">{hint}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead><tr>{cols.map((c) => <th key={c.key} className="border-b border-line px-2 py-1.5 text-left text-[11px] font-medium text-ink-mute" style={{ minWidth: c.width || 90 }}>{c.label}</th>)}<th className="border-b border-line" /></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                {cols.map((c) => (
                  <td key={c.key} className="px-2 py-1 align-top">
                    {c.type === "check" ? <input type="checkbox" aria-label={c.label} className="h-4 w-4 accent-[#0b5ed7]" checked={!!r[c.key]} onChange={(e) => upd(i, c.key, e.target.checked)} />
                      : c.type === "number" ? <NumInput value={r[c.key] ?? ""} onChange={(x) => upd(i, c.key, x)} />
                      : c.type === "select" ? <Select value={r[c.key] ?? ""} onChange={(x) => upd(i, c.key, x)} options={c.options} />
                      : <TextInput value={r[c.key] ?? ""} onChange={(x) => upd(i, c.key, x)} />}
                  </td>
                ))}
                <td className="px-2 py-1 text-right"><Btn size="sm" variant="danger" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
function benchSettingsErr(f) {
  for (const t of f.tdsCategories || []) {
    if (!String(t.code || "").trim() || !String(t.name || "").trim()) return "TDS categories: every row needs a code and a name";
    if (!(Number(t.rate) >= 0 && Number(t.rate) <= 100)) return `TDS ${t.code}: rate must be 0–100%`;
    if (Number(t.singleThreshold) < 0 || Number(t.cumulativeThreshold) < 0) return `TDS ${t.code}: thresholds can't be negative`;
  }
  const codes = (f.tdsCategories || []).map((t) => String(t.code).trim().toUpperCase());
  if (new Set(codes).size !== codes.length) return "TDS categories: codes must be unique";
  for (const t of f.paymentTermTemplates || []) {
    if (!String(t.name || "").trim()) return "Payment terms: every row needs a name";
    if (Number(t.days) < 0 || Number(t.discountDays) < 0 || Number(t.discountPct) < 0 || Number(t.discountPct) > 100) return `Payment terms "${t.name}": days and discount must be valid`;
    if (Number(t.discountDays) > Number(t.days) && Number(t.days) > 0) return `Payment terms "${t.name}": discount days can't be after the due days`;
  }
  for (const t of f.taxTemplates || []) if (!String(t.name || "").trim() || !(Number(t.rate) >= 0 && Number(t.rate) <= 100)) return "Tax templates: name and a rate of 0–100% needed";
  for (const t of f.shippingRules || []) if (!String(t.name || "").trim() || Number(t.amount) < 0) return "Shipping rules: name and a non-negative amount needed";
  for (const k of ["vendor", "rfq", "po"]) for (const c of (f.customFields || {})[k] || []) {
    if (!String(c.label || "").trim()) return "Custom fields: every field needs a label";
    if (c.type === "Dropdown" && !String(c.options || "").trim()) return `Custom field "${c.label}": list the dropdown options`;
  }
  for (const q of f.questionLibrary || []) if (!String(q.question || "").trim()) return "Question library: every question needs text";
  for (const k of ["poApprovalMin", "invoiceQtyTolPct", "invoiceAmtTolPct", "earlyReceiptDays", "lateReceiptDays", "receiptReminderDays", "daysToPurchase"]) if (Number(f[k]) < 0) return "Purchasing controls: values can't be negative";
  if (f.rfqSenderEmail && !EMAIL_RE.test(f.rfqSenderEmail)) return "RFQ sender e-mail is not valid";
  return "";
}
function BenchmarkSettings({ f, setF, mode, yesNo }) {
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const num = (k, label, hint) => <Field label={label} hint={hint}><NumInput value={f[k]} onChange={set(k)} /></Field>;
  const cf = f.customFields || {};
  const cfCols = [{ key: "label", label: "Label", width: 160 }, { key: "type", label: "Type", type: "select", options: ["Text", "Number", "Date", "Dropdown"] }, { key: "options", label: "Dropdown options (comma-separated)", width: 200 }];
  return (
    <>
      <Section title="Purchase controls" icon={Icon.sliders}>
        {yesNo("lockConfirmedOrders", "Lock confirmed orders", "Issued POs can't be edited — cancel or amend instead")}
        {yesNo("purchaseWarnings", "Purchase warnings", "Show each vendor's purchase warning on RFQs and POs")}
        {yesNo("allowZeroQty", "Allow zero-quantity lines", "On RFQs, quotations and POs")}
        {yesNo("allowDuplicateItems", "Allow the same item twice on a PO", "If No, duplicate item lines are blocked")}
        {yesNo("txnDateFx", "Use the transaction-date exchange rate", "Otherwise the rate entered on the document")}
        {yesNo("disableLastPurchaseRate", "Disable last purchase rate", "Don't default rates from the last PO for the vendor")}
        {yesNo("allowNegativeRates", "Allow negative rates", "For credit lines on bills")}
        {yesNo("landedCostFromInvoice", "Set landed cost based on invoice rate", "Receipt valuation follows the bill rate")}
        {yesNo("valuationRejected", "Set valuation rate for rejected materials", "Rejected quantity keeps its purchase rate")}
        {yesNo("blindReceiving", "Blind receiving", "Hide ordered quantities on the goods receipt")}
        {yesNo("dropshipping", "Drop-shipping to site", "Vendors may deliver straight to a project site")}
        {yesNo("autoPostBills", "Auto-post bills", "Bills entered from a PO skip the draft step")}
        {yesNo("showPayButton", "Show pay button in the PO portal", "Vendors see an advance-payment request button")}
        <div className="grid grid-cols-3 gap-3 p-4">
          {num("poApprovalMin", "PO approval — minimum amount (₹)", "At or above this a PO needs approval (double validation)")}
          {num("receiptReminderDays", "Receipt reminder (days before delivery)")}
          {num("daysToPurchase", "Days to purchase", "Added to the vendor lead time")}
          {num("invoiceQtyTolPct", "Invoice quantity tolerance (%)")}
          {num("invoiceAmtTolPct", "Invoice amount tolerance (%)")}
          <Field label="Supplier naming by"><Select value={f.supplierNaming} onChange={set("supplierNaming")} options={["Naming series", "Supplier name"]} /></Field>
          <Field label="Default supplier group"><Select value={f.defaultSupplierGroup || ""} placeholder="— none —" onChange={set("defaultSupplierGroup")} options={f.vendorGroups || []} /></Field>
          <Field label="Default buying price list"><Select value={f.defaultPriceList || ""} onChange={set("defaultPriceList")} options={f.priceLists || []} /></Field>
          <Field label="Project purchase-cost update"><Select value={f.projectCostUpdate} onChange={set("projectCostUpdate")} options={["Each transaction", "Daily", "Manual"]} /></Field>
          <Field label="RFQ sender e-mail (fixed outgoing account)"><TextInput value={f.rfqSenderEmail || ""} onChange={set("rfqSenderEmail")} /></Field>
          <Field label="Our company (default buying entity)"><TextInput value={f.ourCompany || ""} onChange={set("ourCompany")} /></Field>
        </div>
      </Section>
      <Section title="Receiving tolerances" icon={Icon.truck}>
        {mode("overReceiptAction", "Over-receipt action", "Receiving more than ordered (plus the allowance)")}
        {mode("receiptDateAction", "Receipt date exception", "Receipt outside the early / late window")}
        <div className="grid grid-cols-2 gap-3 p-4">
          {num("earlyReceiptDays", "Early receipt tolerance (days)")}
          {num("lateReceiptDays", "Late receipt tolerance (days)")}
        </div>
      </Section>
      <ListEditor title="Cost centres" icon={Icon.layers} items={f.costCentres || []} onChange={set("costCentres")} placeholder="CC-260 New project" usage={() => 0} />
      <ListEditor title="Stores / warehouses" icon={Icon.boxes} items={f.stores || []} onChange={set("stores")} placeholder="Site store — Tower C" usage={() => 0} />
      <ListEditor title="Price lists" icon={Icon.receipt} items={f.priceLists || []} onChange={set("priceLists")} placeholder="Rate contract 2027–28" usage={() => 0} />
      <ListEditor title="Tax categories" icon={Icon.percent} items={f.taxCategories || []} onChange={set("taxCategories")} placeholder="In-state (CGST + SGST)" usage={() => 0} />
      <ListEditor title="Payable accounts" icon={Icon.book} items={f.payableAccounts || []} onChange={set("payableAccounts")} placeholder="Sundry creditors — Imports" usage={() => 0} />
      <ListEditor title="Journals" icon={Icon.book} items={f.journals || []} onChange={set("journals")} placeholder="Purchase journal" usage={() => 0} />
      <ListEditor title="Company bank accounts" icon={Icon.wallet} items={f.companyBanks || []} onChange={set("companyBanks")} placeholder="Axis Bank — Current ••1234" usage={() => 0} />
      <ListEditor title="Letter heads" icon={Icon.file} items={f.letterHeads || []} onChange={set("letterHeads")} placeholder="NebullaOne — standard" usage={() => 0} />
      <ListEditor title="Print headings" icon={Icon.file} items={f.printHeadings || []} onChange={set("printHeadings")} placeholder="Purchase Order" usage={() => 0} />
      <ListEditor title="Print languages" icon={Icon.globe} items={f.printLanguages || []} onChange={set("printLanguages")} placeholder="Gujarati" usage={() => 0} />
      <div className="col-span-2 grid gap-4">
        <TableEditor title="Payment terms templates" icon={Icon.calendar} rows={f.paymentTermTemplates || []} onChange={set("paymentTermTemplates")} blank={() => ({ name: "", days: 30, discountDays: 0, discountPct: 0 })}
          hint="Early-payment discount: pay within the discount days and take the discount %." cols={[{ key: "name", label: "Name", width: 200 }, { key: "days", label: "Due in (days)", type: "number" }, { key: "discountDays", label: "Discount if paid within (days)", type: "number" }, { key: "discountPct", label: "Discount %", type: "number" }]} />
        <TableEditor title="Purchase taxes & charges templates" icon={Icon.percent} rows={f.taxTemplates || []} onChange={set("taxTemplates")} blank={() => ({ name: "", rate: 18 })} cols={[{ key: "name", label: "Name", width: 200 }, { key: "rate", label: "Rate %", type: "number" }]} />
        <TableEditor title="Shipping rules" icon={Icon.truck} rows={f.shippingRules || []} onChange={set("shippingRules")} blank={() => ({ name: "", amount: 0 })} cols={[{ key: "name", label: "Name", width: 200 }, { key: "amount", label: "Freight (₹)", type: "number" }]} />
        <TableEditor title="Tax withholding (TDS) categories" icon={Icon.percent} rows={f.tdsCategories || []} onChange={set("tdsCategories")}
          blank={() => ({ code: "", name: "", rate: 1, basis: "Gross amount", singleThreshold: 0, cumulativeThreshold: 0, roundOff: true, onlyExcess: false, disableCumulative: false, disableTransaction: false })}
          hint="Used on vendor bills and payments. Thresholds: no TDS until a single bill or the year's total crosses them."
          cols={[{ key: "code", label: "Code", width: 80 }, { key: "name", label: "Category name", width: 220 }, { key: "rate", label: "Rate %", type: "number" }, { key: "basis", label: "Deduct tax on basis", type: "select", options: ["Gross amount", "Net total"], width: 140 },
            { key: "singleThreshold", label: "Single txn threshold (₹)", type: "number", width: 120 }, { key: "cumulativeThreshold", label: "Cumulative threshold (₹)", type: "number", width: 120 }, { key: "roundOff", label: "Round off", type: "check", width: 60 },
            { key: "onlyExcess", label: "Only on excess", type: "check", width: 70 }, { key: "disableCumulative", label: "Disable cumulative", type: "check", width: 80 }, { key: "disableTransaction", label: "Disable transaction", type: "check", width: 80 }]} />
        <TableEditor title="E-mail templates" icon={Icon.mail} rows={f.emailTemplates || []} onChange={set("emailTemplates")} blank={() => ({ name: "", subject: "", body: "" })}
          hint="Placeholders: {vendor} {rfq} {po} {due}" cols={[{ key: "name", label: "Name", width: 150 }, { key: "subject", label: "Subject", width: 220 }, { key: "body", label: "Body", width: 320 }]} />
        <TableEditor title="Quality inspection templates" icon={Icon.clipboardCheck} rows={(f.inspectionTemplates || []).map((t) => ({ ...t, params: Array.isArray(t.params) ? t.params.join("; ") : t.params }))}
          onChange={(rows) => setF({ ...f, inspectionTemplates: rows.map((r) => ({ ...r, params: String(r.params || "").split(";").map((x) => x.trim()).filter(Boolean) })) })} blank={() => ({ name: "", params: "" })}
          cols={[{ key: "name", label: "Template", width: 160 }, { key: "params", label: "Parameters (separate with ;)", width: 460 }]} />
        <TableEditor title="Custom fields — vendor" icon={Icon.sliders} rows={cf.vendor || []} onChange={(r) => setF({ ...f, customFields: { ...cf, vendor: r } })} blank={() => ({ label: "", type: "Text", options: "" })} cols={cfCols} hint="Shown on the vendor registration form and the vendor portal profile." />
        <TableEditor title="Custom fields — RFQ" icon={Icon.sliders} rows={cf.rfq || []} onChange={(r) => setF({ ...f, customFields: { ...cf, rfq: r } })} blank={() => ({ label: "", type: "Text", options: "" })} cols={cfCols} />
        <TableEditor title="Custom fields — purchase order" icon={Icon.sliders} rows={cf.po || []} onChange={(r) => setF({ ...f, customFields: { ...cf, po: r } })} blank={() => ({ label: "", type: "Text", options: "" })} cols={cfCols} />
        <TableEditor title="Qualification question library" icon={Icon.listChecks} rows={f.questionLibrary || []} onChange={set("questionLibrary")}
          blank={() => ({ id: `QL-${Date.now().toString(36).slice(-4).toUpperCase()}`, question: "", status: "Active", owner: "", level: "Supplier", responder: "Supplier", required: false, critical: false, attribute: "", responseType: "Yes / No", options: "" })}
          hint="Asked on every vendor's Qualification tab after the rule-set questions. A critical Yes / No question answered No blocks final approval."
          cols={[{ key: "question", label: "Question", width: 280 }, { key: "status", label: "Status", type: "select", options: ["Active", "Inactive"] }, { key: "owner", label: "Owner", width: 130 },
            { key: "level", label: "Level", type: "select", options: ["Supplier", "Contractor"] }, { key: "responder", label: "Responder", type: "select", options: ["Supplier", "Internal"] },
            { key: "required", label: "Required", type: "check", width: 60 }, { key: "critical", label: "Critical", type: "check", width: 60 }, { key: "attribute", label: "Profile attribute", width: 120 },
            { key: "responseType", label: "Response type", type: "select", options: ["Yes / No", "Number", "Text", "Choice"], width: 110 }, { key: "options", label: "Choices", width: 140 }]} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- purchase requisitions (ERPNext Material Request + Fieldglass job posting)
const REQ_PURPOSES = ["Purchase", "Material transfer", "Material issue", "Subcontracting", "Manpower (labour)", "Customer provided"];
const CONTINGENT_TYPES = ["Daily-rated gang", "Item-rate labour", "Staff augmentation"];
const DIST_RULES = ["All invited at once", "Preferred contractors first, others after 2 days", "One contractor at a time"];
const reqOrdered = (st, r) => {
  const pos = st.purchaseOrders.filter((p) => (r.rfqIds || []).includes(p.rfqId) || p.requisitionId === r.id);
  const want = sum(r.items || [], (i) => Number(i.qty) || 0);
  const got = sum(pos.flatMap((p) => p.lines || []), (l) => Number(l.qty) || 0);
  const rec = sum(pos.flatMap((p) => (p.receipts || []).flatMap((g) => g.lines || [])), (l) => Number(l.accepted ?? l.qty) || 0);
  return { pctOrdered: want ? Math.min(100, Math.round((got / want) * 100)) : 0, pctReceived: want ? Math.min(100, Math.round((rec / want) * 100)) : 0 };
};
function reqStatus(st, r) {
  if (["Draft", "Submitted", "Cancelled", "Stopped"].includes(r.status)) return r.status;
  const o = reqOrdered(st, r);
  if (o.pctReceived >= 100) return "Received";
  if (o.pctReceived > 0) return "Partially received";
  if (o.pctOrdered >= 100) return "Ordered";
  if (o.pctOrdered > 0) return "Partially ordered";
  return (r.rfqIds || []).length ? "RFQ raised" : "Approved";
}
function reqErrors(f) {
  const e = [];
  if (!f.date) e.push("Request date required"); else if (f.date > todayISO()) e.push("Request date can't be in the future");
  if (!f.requiredBy) e.push("Required-by date needed"); else if (f.requiredBy < (f.date || todayISO())) e.push("Required-by can't be before the request date");
  if (f.purpose === "Customer provided" && !String(f.client || "").trim()) e.push("Enter the client providing the material");
  if (f.purpose === "Material transfer" && (!f.sourceStore || !f.targetStore)) e.push("Pick the source and target store");
  if (f.purpose === "Material transfer" && f.sourceStore && f.sourceStore === f.targetStore) e.push("Source and target store must differ");
  if (f.purpose === "Manpower (labour)") {
    const L = f.labour || {};
    if (!L.category) e.push("Pick the labour category / trade");
    if (!(Number(L.headcount) > 0)) e.push("Enter the headcount");
    if (!L.start || !L.end) e.push("Enter the start and end dates"); else if (L.end <= L.start) e.push("End date must be after the start");
    if (!(L.distribution || []).length) e.push("Pick at least one contractor for the distribution list");
  } else {
    const lines = (f.items || []).filter((i) => i.desc || i.qty);
    if (!lines.length) e.push("Add at least one item");
    lines.forEach((i, n) => { if (!String(i.desc).trim()) e.push(`Line ${n + 1}: description`); else if (!(Number(i.qty) > 0)) e.push(`Line ${n + 1}: quantity must be above zero`); });
  }
  return e;
}
function RequisitionModal({ onClose, base }) {
  const st = useStore();
  const blank = () => ({ purpose: "Purchase", date: todayISO(), requiredBy: shiftDays(14), project: PROJECTS[0], costCentre: "", company: settingsOf(st).ourCompany, priceList: settingsOf(st).defaultPriceList,
    client: "", sourceStore: "", targetStore: settingsOf(st).stores[1] || "", items: [{ desc: "", unit: "nos", qty: "", rate: "" }], terms: "", notes: "",
    labour: { contingentType: CONTINGENT_TYPES[0], category: "", labourType: "Skilled", headcount: "", start: shiftDays(7), end: shiftDays(97), site: PROJECTS[0], bu: settingsOf(st).ourCompany, costCentre: "", rateCard: "", distribution: [], rule: DIST_RULES[0], qualifications: "" } });
  const [f, setF] = y.useState(() => (base ? JSON.parse(JSON.stringify(base)) : blank()));
  const errs = reqErrors(f);
  const L = f.labour || {};
  const manpower = f.purpose === "Manpower (labour)";
  const contractors = st.vendors.filter((v) => (v.isContractor || v.type === "Labor") && eligibleForRfq(v));
  const cards = st.laborRates.filter((r) => r.status === "Active");
  const setL = (k, x) => setF({ ...f, labour: { ...L, [k]: x } });
  const setItem = (i, k, x) => setF({ ...f, items: f.items.map((it, j) => (j === i ? { ...it, [k]: x } : it)) });
  const save = (submit) => {
    if (errs.length) return toast(errs[0], "red");
    const id = base?.id || nextId("MR", st.requisitions || []);
    const rec = { ...f, id, status: submit ? "Submitted" : "Draft", requestedBy: base?.requestedBy || currentUser(), createdAt: base?.createdAt || new Date().toISOString(), rfqIds: base?.rfqIds || [],
      items: manpower ? [{ desc: `${L.category} (${L.labourType}) — ${L.headcount} workers`, unit: "man-day", qty: Number(L.headcount) * Math.max(1, Math.round((new Date(L.end) - new Date(L.start)) / DAY)), rate: "" }] : f.items.filter((i) => i.desc).map((i) => ({ ...i, qty: Number(i.qty) })) };
    setState((s) => { s.requisitions = s.requisitions || []; const i = s.requisitions.findIndex((x) => x.id === id); if (i >= 0) s.requisitions[i] = rec; else s.requisitions.unshift(rec); },
      { entity: "Requisition", id, action: `${base ? "Updated" : "Created"} (${f.purpose})${submit ? " and submitted" : ""}` });
    toast(`${id} ${submit ? "submitted" : "saved"}`); onClose();
  };
  return (
    <Modal open onClose={onClose} width={920} title={base ? `Edit ${base.id}` : "New purchase requisition"} subtitle="Material request or labour requisition — approved requests become RFQs"
      footer={<>{errs[0] && <span className="mr-auto max-w-[460px] truncate text-[12px] text-red-600" title={errs.join("\n")}>{errs[0]}{errs.length > 1 ? ` (+${errs.length - 1} more)` : ""}</span>}<Btn onClick={onClose}>Cancel</Btn><Btn disabled={!!errs.length} onClick={() => save(false)}>Save draft</Btn><Btn variant="primary" disabled={!!errs.length} onClick={() => save(true)}>Submit</Btn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Request purpose / type" required><Select value={f.purpose} onChange={(x) => setF({ ...f, purpose: x })} options={REQ_PURPOSES} /></Field>
          <Field label="Request date" required><DateInput value={f.date} onChange={(x) => setF({ ...f, date: x })} /></Field>
          <Field label="Required by" required><DateInput value={f.requiredBy} onChange={(x) => setF({ ...f, requiredBy: x })} /></Field>
          <Field label="Company"><Select value={f.company} onChange={(x) => setF({ ...f, company: x })} options={COMPANIES(st)} /></Field>
          <Field label="Project"><Select value={f.project} onChange={(x) => setF({ ...f, project: x })} options={PROJECTS} /></Field>
          <Field label="Cost centre"><Select value={f.costCentre} placeholder="—" onChange={(x) => setF({ ...f, costCentre: x })} options={settingsOf(st).costCentres} /></Field>
          <Field label="Price list"><Select value={f.priceList} onChange={(x) => setF({ ...f, priceList: x })} options={settingsOf(st).priceLists} /></Field>
          {f.purpose === "Customer provided" ? <Field label="Client (customer providing material)" required><TextInput value={f.client} onChange={(x) => setF({ ...f, client: x })} /></Field> : <span />}
          {!manpower && <>
            <Field label="Source store / warehouse"><Select value={f.sourceStore} placeholder="—" onChange={(x) => setF({ ...f, sourceStore: x })} options={settingsOf(st).stores} /></Field>
            <Field label="Target store / warehouse"><Select value={f.targetStore} placeholder="—" onChange={(x) => setF({ ...f, targetStore: x })} options={settingsOf(st).stores} /></Field>
          </>}
        </div>
        {manpower ? (
          <Section title="Labour requisition (contingent labour)" icon={Icon.hardHat}>
            <div className="grid grid-cols-4 gap-3 p-4">
              <Field label="Contingent type"><Select value={L.contingentType} onChange={(x) => setL("contingentType", x)} options={CONTINGENT_TYPES} /></Field>
              <Field label="Category / trade" required><Select value={L.category} placeholder="Select…" onChange={(x) => setL("category", x)} options={[...new Set(st.laborRates.map((r) => r.trade))]} /></Field>
              <Field label="Labour type"><Select value={L.labourType} onChange={(x) => setL("labourType", x)} options={["Unskilled", "Semi-skilled", "Skilled", "Highly Skilled"]} /></Field>
              <Field label="Headcount" required><NumInput value={L.headcount} onChange={(x) => setL("headcount", x)} /></Field>
              <Field label="Start date" required><DateInput value={L.start} onChange={(x) => setL("start", x)} /></Field>
              <Field label="End date" required><DateInput value={L.end} onChange={(x) => setL("end", x)} /></Field>
              <Field label="Site / location"><Select value={L.site} onChange={(x) => setL("site", x)} options={PROJECTS} /></Field>
              <Field label="Business unit"><Select value={L.bu} onChange={(x) => setL("bu", x)} options={COMPANIES(st)} /></Field>
              <Field label="Cost centre"><Select value={L.costCentre} placeholder="—" onChange={(x) => setL("costCentre", x)} options={settingsOf(st).costCentres} /></Field>
              <Field label="Rate grid (labour rate card)" span={2}><Select value={L.rateCard} placeholder="—" onChange={(x) => setL("rateCard", x)} options={cards.map((r) => ({ value: r.id, label: `${r.id} · ${r.trade} · ${r.region} · ₹${r.rate}/day` }))} /></Field>
              <Field label="Distribution rule"><Select value={L.rule} onChange={(x) => setL("rule", x)} options={DIST_RULES} /></Field>
              <Field label="Qualifications required" span={4}><TextInput value={L.qualifications} onChange={(x) => setL("qualifications", x)} placeholder="e.g. ITI certificate, 3 years high-rise experience, valid height pass" /></Field>
              <Field label="Supplier distribution list" span={4} hint="Contractors who receive this requisition as an RFQ">
                <div className="flex flex-wrap gap-1.5">{contractors.map((v) => { const on = (L.distribution || []).includes(v.id); return <button key={v.id} type="button" onClick={() => setL("distribution", on ? L.distribution.filter((x) => x !== v.id) : [...(L.distribution || []), v.id])} className={cls("rounded-full border px-2.5 py-[3px] text-[12px]", on ? "border-brand bg-brand-soft font-medium text-brand" : "border-line text-ink-soft hover:bg-gray-50")}>{v.name}</button>; })}</div>
              </Field>
            </div>
          </Section>
        ) : (
          <Section title="Items" icon={Icon.boxes} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, items: [...f.items, { desc: "", unit: "nos", qty: "", rate: "" }] })}>Add line</Btn>}>
            <div className="space-y-2 p-3">
              <div className="grid grid-cols-[1fr_90px_110px_130px_28px] gap-2 text-[11.5px] font-medium text-ink-mute"><span>Item / description</span><span>Unit</span><span>Quantity</span><span>Estimated rate (₹)</span><span /></div>
              {f.items.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_110px_130px_28px] gap-2">
                  <TextInput value={it.desc} onChange={(x) => setItem(i, "desc", x)} placeholder="e.g. OPC 53 cement" />
                  <TextInput value={it.unit} onChange={(x) => setItem(i, "unit", x)} />
                  <NumInput value={it.qty} onChange={(x) => setItem(i, "qty", x)} />
                  <NumInput value={it.rate} onChange={(x) => setItem(i, "rate", x)} />
                  <IconBtn icon={Icon.trash} title="Remove line" onClick={() => f.items.length > 1 && setF({ ...f, items: f.items.filter((_, j) => j !== i) })} />
                </div>
              ))}
            </div>
          </Section>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Terms & conditions"><TextArea rows={2} value={f.terms} onChange={(x) => setF({ ...f, terms: x })} /></Field>
          <Field label="Notes"><TextArea rows={2} value={f.notes} onChange={(x) => setF({ ...f, notes: x })} /></Field>
        </div>
      </div>
    </Modal>
  );
}
function RequisitionsPage() {
  const st = useStore(), nav = useNavigate();
  const [edit, setEdit] = y.useState(null), [open, setOpen] = useQueryOpen();
  const rows = st.requisitions || [];
  const r = open && rows.find((x) => x.id === open);
  const act = (x, to, what) => { setState((s) => { const q = s.requisitions.find((y2) => y2.id === x.id); q.status = to; q.decidedBy = currentUser(); q.decidedAt = new Date().toISOString(); }, { entity: "Requisition", id: x.id, action: what }); toast(`${x.id} ${what.toLowerCase()}`); };
  return (
    <Page title="Purchase Requisitions" subtitle="Material requests and labour requisitions from sites — approved requests become RFQs" icon={Icon.clipboardList}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setEdit({})}>New requisition</Btn>}>
      <DataTable noun="requisitions" rows={rows} onRow={(x) => setOpen(x.id)} empty={<EmptyState icon={Icon.clipboardList} title="No requisitions yet" text="Sites raise material or labour requisitions here; procurement turns approved ones into RFQs." />} columns={[
        { key: "id", label: "ID", className: "mono text-[12px]" },
        { key: "purpose", label: "Purpose", filterOptions: REQ_PURPOSES, filter: true },
        { key: "what", label: "Requirement", render: (x) => <span className="text-[12.5px]">{itemsSummary(x.items)}</span> },
        { key: "project", label: "Project", filterOptions: FO.projects, filter: true },
        { key: "date", label: "Requested", render: (x) => `${fmtDate(x.date)} · ${x.requestedBy}` },
        { key: "rb", label: "Required by", render: (x) => fmtDate(x.requiredBy) },
        { key: "po", label: "% ordered / received", render: (x) => { const o = reqOrdered(st, x); return <span className="num text-[12px]">{o.pctOrdered}% / {o.pctReceived}%</span>; } },
        { key: "s", label: "Status", filterOptions: ["Draft", "Submitted", "Approved", "RFQ raised", "Partially ordered", "Ordered", "Partially received", "Received", "Stopped", "Cancelled"], filter: (x) => reqStatus(st, x), render: (x) => <Status>{reqStatus(st, x)}</Status> },
      ]} />
      {r && (
        <Drawer open onClose={() => setOpen(null)} width={760} title={`${r.id} — ${r.purpose}`} subtitle={<><Status>{reqStatus(st, r)}</Status><span className="text-ink-mute">{r.project}</span></>}
          actions={<>
            {["Draft", "Submitted"].includes(r.status) && <Btn icon={Icon.pencil} onClick={() => setEdit(r)}>Edit</Btn>}
            {r.status === "Submitted" && <><Btn variant="danger" onClick={() => act(r, "Cancelled", "Rejected")}>Reject</Btn><Btn variant="success" onClick={() => act(r, "Approved", "Approved")}>Approve</Btn></>}
            {r.status === "Approved" && <Btn onClick={() => act(r, "Stopped", "Stopped")}>Stop</Btn>}
            {r.status === "Stopped" && <Btn onClick={() => act(r, "Approved", "Re-opened")}>Re-open</Btn>}
            {r.status === "Approved" && <Btn variant="primary" icon={Icon.send} onClick={() => nav(`${VM_BASE}/rfq?fromReq=${r.id}`)}>Create RFQ</Btn>}
          </>}>
          <div className="space-y-4 px-6 py-5">
            <Section title="Request" icon={Icon.info}>
              <KV items={[["Purpose", r.purpose], ["Request date", fmtDate(r.date)], ["Required by", fmtDate(r.requiredBy)], ["Company", r.company], ["Project", r.project], ["Cost centre", r.costCentre || "—"], ["Price list", r.priceList || "—"],
                ["Client", r.client || null], ["Source store", r.sourceStore || null], ["Target store", r.targetStore || null], ["Requested by", r.requestedBy], ["Decided", r.decidedBy ? `${r.decidedBy} · ${fmtDate(r.decidedAt)}` : null],
                ["% ordered", `${reqOrdered(st, r).pctOrdered}%`], ["% received", `${reqOrdered(st, r).pctReceived}%`], ["RFQs", (r.rfqIds || []).join(", ") || null]]} />
            </Section>
            {r.purpose === "Manpower (labour)" && (
              <Section title="Labour requisition" icon={Icon.hardHat}>
                <KV items={[["Contingent type", r.labour.contingentType], ["Category / trade", r.labour.category], ["Labour type", r.labour.labourType], ["Headcount", r.labour.headcount], ["Start / end", `${fmtDate(r.labour.start)} → ${fmtDate(r.labour.end)}`],
                  ["Site", r.labour.site], ["Business unit", r.labour.bu], ["Cost centre", r.labour.costCentre || "—"], ["Rate grid", r.labour.rateCard || "—"], ["Distribution rule", r.labour.rule],
                  ["Distribution list", (r.labour.distribution || []).map((id) => vendorName(st, id)).join(", ")], ["Qualifications required", r.labour.qualifications || "—"]]} />
              </Section>
            )}
            <Section title="Items" icon={Icon.boxes}>
              <DataTable dense rows={r.items} rowKey={(x) => x.desc} columns={[{ key: "desc", label: "Item" }, { key: "unit", label: "Unit" }, { key: "qty", label: "Qty", align: "right", num: true }, { key: "rate", label: "Est. rate", align: "right", render: (x) => (x.rate ? inr(x.rate) : "—") }]} />
            </Section>
            {(r.terms || r.notes) && <Section title="Terms & notes"><KV cols={2} items={[["Terms", r.terms || "—"], ["Notes", r.notes || "—"]]} /></Section>}
          </div>
        </Drawer>
      )}
      {edit && <RequisitionModal base={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- RFQ extras (Oracle requirements, ranking; ERPNext / Odoo header)
const RANKING = ["Hidden", "Show rank only", "Show rank and best price"];
function RfqExtras({ f, setF }) {
  const st = useStore();
  const qs = f.questions || [];
  const setQ = (i, k, x) => setF({ ...f, questions: qs.map((q, j) => (j === i ? { ...q, [k]: x } : q)) });
  const attach = async (file) => { if (!file) return; const a = await readAttachment(file, VX.SHEET_TYPES); if (a) setF({ ...f, attachments: [...(f.attachments || []), { name: a.name, dataUrl: a.dataUrl }] }); };
  return (
    <div className="space-y-3">
      <Section title="Requirement questions (vendors answer with their quote)" icon={Icon.listChecks} actions={<Btn size="sm" icon={Icon.plus} onClick={() => setF({ ...f, questions: [...qs, { text: "", type: "Yes / No", options: "", required: true }] })}>Add question</Btn>}>
        {qs.length === 0 ? <p className="p-3 text-[12.5px] text-ink-mute">None — add questions such as "Can you deliver in two lots?" or "Mill test certificate with each lot?"</p> : (
          <div className="space-y-2 p-3">
            {qs.map((q, i) => (
              <div key={i} className="grid grid-cols-[1fr_130px_180px_90px_28px] items-center gap-2">
                <TextInput value={q.text} onChange={(x) => setQ(i, "text", x)} placeholder="Question" />
                <Select value={q.type} onChange={(x) => setQ(i, "type", x)} options={["Yes / No", "Number", "Text", "Choice"]} />
                <TextInput value={q.options} onChange={(x) => setQ(i, "options", x)} placeholder={q.type === "Choice" ? "Choices, comma-separated" : "—"} disabled={q.type !== "Choice"} />
                <Check checked={!!q.required} onChange={(b) => setQ(i, "required", b)} label="Required" />
                <IconBtn icon={Icon.trash} title="Remove question" onClick={() => setF({ ...f, questions: qs.filter((_, j) => j !== i) })} />
              </div>
            ))}
          </div>
        )}
      </Section>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Ranking shown to vendors"><Select value={f.ranking || "Hidden"} onChange={(x) => setF({ ...f, ranking: x })} options={RANKING} /></Field>
        <div className="flex items-end pb-1.5"><Check checked={f.multiResponse !== false} onChange={(b) => setF({ ...f, multiResponse: b })} label="Allow vendors to revise their quote" /></div>
        <Field label="Attachments (drawings, specs, BOQ)">
          <label className="flex h-[32px] cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-300 px-2.5 text-[12.5px] text-ink-soft hover:border-brand hover:text-brand">{h(Icon.upload, { size: 13 })}Add file
            <input type="file" className="hidden" onChange={(e) => { attach(e.target.files[0]); e.target.value = ""; }} /></label>
          {(f.attachments || []).length > 0 && <span className="mt-1 flex flex-wrap gap-1">{f.attachments.map((a, i) => <span key={i} className="flex items-center gap-1 rounded bg-gray-100 px-1.5 text-[11.5px]">{a.name}<button type="button" aria-label={`Remove ${a.name}`} onClick={() => setF({ ...f, attachments: f.attachments.filter((_, j) => j !== i) })}>×</button></span>)}</span>}
        </Field>
      </div>
      <DocDetails kind="rfq" value={f.details} onChange={(d) => setF({ ...f, details: d })} />
    </div>
  );
}
// Answers to the RFQ's requirement questions (quote form)
function RfqAnswers({ rfq, value, onChange, readOnly }) {
  const qs = rfq.questions || [];
  if (!qs.length) return null;
  return (
    <Section title="Requirement questions" icon={Icon.listChecks}>
      <div className="divide-y divide-line">
        {qs.map((q, i) => (
          <div key={i} className="grid grid-cols-[1fr_240px] items-center gap-3 px-4 py-2">
            <span className="text-[13px]">{q.text}{q.required && <span className="text-red-500"> *</span>}</span>
            {readOnly ? <span className="text-[13px] text-ink">{value?.[i] ?? "—"}</span>
              : q.type === "Number" ? <NumInput value={value?.[i] ?? ""} onChange={(x) => onChange({ ...(value || {}), [i]: x })} />
              : q.type === "Text" ? <TextInput value={value?.[i] ?? ""} onChange={(x) => onChange({ ...(value || {}), [i]: x })} />
              : <Select value={value?.[i] ?? ""} placeholder="Select…" onChange={(x) => onChange({ ...(value || {}), [i]: x })} options={q.type === "Choice" ? String(q.options).split(",").map((o) => o.trim()).filter(Boolean) : ["Yes", "No"]} />}
          </div>
        ))}
      </div>
    </Section>
  );
}
const rfqAnswerErr = (rfq, ans) => { const i = (rfq.questions || []).findIndex((q, n) => q.required && (ans?.[n] === undefined || ans?.[n] === "")); return i >= 0 ? `Answer question ${i + 1}: ${rfq.questions[i].text}` : ""; };

// ---------------------------------------------------------------- vendor price lists / catalogue (Odoo vendor pricelist)
// Best valid price for a vendor + item at a quantity (minimum quantity, validity, discount)
function vendorPriceFor(st, vendorId, desc, qty, list) {
  if (!vendorId || !desc) return null;
  const d = String(desc).trim().toLowerCase(), today = todayISO();
  const hits = (st.vendorPrices || []).filter((p) => p.vendorId === vendorId && (!list || !p.priceList || p.priceList === list)
    && (String(p.product).toLowerCase() === d || (p.vendorProductName && String(p.vendorProductName).toLowerCase() === d) || (d.length > 4 && String(p.product).toLowerCase().includes(d)))
    && (!p.validFrom || p.validFrom <= today) && (!p.validTo || p.validTo >= today) && (Number(qty) || 0) >= (Number(p.minQty) || 0));
  if (!hits.length) return null;
  const best = hits.map((p) => ({ ...p, price: round2(Number(p.unitPrice) * (1 - (Number(p.discount) || 0) / 100) * fxRate(p.currency)), list: p.priceList || "vendor" })).sort((a, b) => a.price - b.price)[0];
  return best;
}
function priceErr(p, st, id) {
  if (!p.vendorId) return "Pick the vendor";
  if (!String(p.product || "").trim()) return "Enter the product";
  if (!(Number(p.unitPrice) > 0)) return "Unit price must be above zero";
  if (Number(p.minQty) < 0) return "Minimum quantity can't be negative";
  if (Number(p.discount) < 0 || Number(p.discount) > 100) return "Discount must be 0–100%";
  if (Number(p.leadDays) < 0) return "Lead time can't be negative";
  if (p.validFrom && p.validTo && p.validTo < p.validFrom) return "Valid-to is before valid-from";
  if ((st.vendorPrices || []).some((x) => x.id !== id && x.vendorId === p.vendorId && String(x.product).trim().toLowerCase() === String(p.product).trim().toLowerCase() && Number(x.minQty || 0) === Number(p.minQty || 0) && (x.priceList || "") === (p.priceList || "") && !(p.validTo && x.validFrom && p.validTo < x.validFrom) && !(x.validTo && p.validFrom && x.validTo < p.validFrom)))
    return "An overlapping price for this vendor, product and minimum quantity already exists";
  return "";
}
function PriceModal({ base, vendorId, portal, onClose }) {
  const st = useStore();
  const [f, setF] = y.useState(() => base ? { ...base } : { vendorId: vendorId || "", product: "", vendorProductName: "", vendorProductCode: "", unit: "nos", minQty: 1, unitPrice: "", currency: "INR", discount: 0, leadDays: 7, validFrom: todayISO(), validTo: shiftDays(180), priceList: "", company: settingsOf(st).ourCompany });
  const err = priceErr(f, st, base?.id);
  const save = () => {
    if (err) return toast(err, "red");
    const id = base?.id || nextId("VP", st.vendorPrices || []);
    setState((s) => { s.vendorPrices = s.vendorPrices || []; const i = s.vendorPrices.findIndex((x) => x.id === id); const rec = { ...f, id, updatedBy: portal ? "Vendor portal" : currentUser(), updatedAt: new Date().toISOString() }; if (i >= 0) s.vendorPrices[i] = rec; else s.vendorPrices.unshift(rec); },
      { entity: "Vendor", id: f.vendorId, action: `Price list ${base ? "updated" : "added"} — ${f.product} @ ${f.currency} ${f.unitPrice}${portal ? " (via portal)" : ""}` });
    toast("Price saved"); onClose();
  };
  return (
    <Modal open onClose={onClose} width={720} title={base ? "Edit price" : "Add vendor price"} footer={<>{err && <span className="mr-auto text-[12px] text-red-600">{err}</span>}<Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" disabled={!!err} onClick={save}>Save price</Btn></>}>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Vendor" required><Select value={f.vendorId} disabled={!!vendorId} placeholder="Select…" onChange={(x) => setF({ ...f, vendorId: x })} options={st.vendors.filter((v) => !["Blacklisted", "Rejected"].includes(v.status)).map((v) => ({ value: v.id, label: v.name }))} /></Field>
        <Field label="Product (our name)" required span={2}><TextInput value={f.product} onChange={(x) => setF({ ...f, product: x })} placeholder="e.g. OPC 53 grade cement (50 kg bag)" /></Field>
        <Field label="Vendor product name"><TextInput value={f.vendorProductName} onChange={(x) => setF({ ...f, vendorProductName: x })} /></Field>
        <Field label="Vendor product code"><TextInput value={f.vendorProductCode} onChange={(x) => setF({ ...f, vendorProductCode: x })} /></Field>
        <Field label="Unit"><TextInput value={f.unit} onChange={(x) => setF({ ...f, unit: x })} /></Field>
        <Field label="Minimum quantity"><NumInput value={f.minQty} onChange={(x) => setF({ ...f, minQty: x })} /></Field>
        <Field label="Unit price" required><NumInput value={f.unitPrice} onChange={(x) => setF({ ...f, unitPrice: x })} /></Field>
        <Field label="Currency"><Select value={f.currency} onChange={(x) => setF({ ...f, currency: x })} options={CURRENCIES} /></Field>
        <Field label="Discount (%)"><NumInput value={f.discount} onChange={(x) => setF({ ...f, discount: x })} /></Field>
        <Field label="Lead time (days)"><NumInput value={f.leadDays} onChange={(x) => setF({ ...f, leadDays: x })} /></Field>
        <Field label="Price list"><Select value={f.priceList} placeholder="Any" onChange={(x) => setF({ ...f, priceList: x })} options={settingsOf(st).priceLists} /></Field>
        <Field label="Valid from"><DateInput value={f.validFrom} onChange={(x) => setF({ ...f, validFrom: x })} /></Field>
        <Field label="Valid to"><DateInput value={f.validTo} onChange={(x) => setF({ ...f, validTo: x })} /></Field>
        <Field label="Company"><Select value={f.company} onChange={(x) => setF({ ...f, company: x })} options={COMPANIES(st)} /></Field>
      </div>
    </Modal>
  );
}
function PriceListTable({ rows, onEdit, showVendor = true }) {
  const st = useStore();
  const valid = (p) => (p.validTo && p.validTo < todayISO() ? "Expired" : p.validFrom && p.validFrom > todayISO() ? "Upcoming" : "Valid");
  return (
    <DataTable noun="prices" rows={rows} onRow={onEdit} empty={<EmptyState icon={Icon.receipt} title="No prices yet" text="Agreed vendor prices appear here and are suggested on new POs." />} columns={[
      ...(showVendor ? [{ key: "v", label: "Vendor", className: "font-medium", filter: (p) => vendorName(st, p.vendorId), filterOptions: () => uniqSorted((st.vendorPrices || []).map((p) => vendorName(st, p.vendorId))), render: (p) => vendorName(st, p.vendorId) }] : []),
      { key: "product", label: "Product", render: (p) => <span className="flex flex-col"><span>{p.product}</span>{(p.vendorProductName || p.vendorProductCode) && <span className="text-[11.5px] text-ink-mute">{[p.vendorProductCode, p.vendorProductName].filter(Boolean).join(" · ")}</span>}</span> },
      { key: "min", label: "Min qty", align: "right", render: (p) => `${num(p.minQty || 0)} ${p.unit}` },
      { key: "price", label: "Unit price", align: "right", render: (p) => <span className="num">{p.currency} {Number(p.unitPrice).toLocaleString("en-IN")}{Number(p.discount) ? ` −${p.discount}%` : ""}</span> },
      { key: "lead", label: "Lead time", align: "right", render: (p) => `${p.leadDays || 0} d` },
      { key: "list", label: "Price list", render: (p) => p.priceList || "Any" },
      { key: "val", label: "Validity", render: (p) => <span className="flex items-center gap-2 text-[12px]">{fmtDate(p.validFrom)} → {fmtDate(p.validTo)}<Status tone={{ Valid: "green", Expired: "red", Upcoming: "blue" }[valid(p)]}>{valid(p)}</Status></span> },
      { key: "co", label: "Company", render: (p) => p.company || "—" },
    ]} />
  );
}
function VendorPriceListsPage() {
  const st = useStore();
  const [edit, setEdit] = y.useState(null);
  return (
    <Page title="Vendor Price Lists" subtitle="Agreed prices by vendor, product and quantity break — suggested automatically on purchase orders" icon={Icon.receipt}
      actions={<Btn variant="primary" icon={Icon.plus} onClick={() => setEdit({})}>Add price</Btn>}>
      <PriceListTable rows={st.vendorPrices || []} onEdit={(p) => setEdit(p)} />
      {edit && <PriceModal base={edit.id ? edit : null} onClose={() => setEdit(null)} />}
    </Page>
  );
}

// ---------------------------------------------------------------- bill-level TDS (ERPNext tax withholding)
// Bill's own TDS settings override the vendor's: consider / category / ignore threshold / manual entries
function billTds(st, inv, v, taxable, share) {
  const t = inv.tdsSetup || {};
  if (inv.source === "RA Bill" || t.consider === false) return 0;
  const code = t.category || v.tds;
  if (t.manual !== undefined && t.manual !== "" && t.edit) return round2(Number(t.manual) * (share ?? 1));
  const cat = (settingsOf(st).tdsCategories || []).find((c) => c.code === code);
  const rate = tdsRate(code);
  if (!rate) return 0;
  let base = taxable;
  if (cat && !t.ignoreThreshold) {
    const yearStart = `${new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-04-01`;
    const ytd = sum(st.invoices.filter((i) => i.vendorId === v.id && i.id !== inv.id && i.date >= yearStart && i.source !== "RA Bill"), (i) => invoiceTotals(i).taxable);
    const singleOver = cat.disableTransaction || !Number(cat.singleThreshold) || taxable >= Number(cat.singleThreshold);
    const cumOver = !cat.disableCumulative && Number(cat.cumulativeThreshold) > 0 && ytd + taxable > Number(cat.cumulativeThreshold);
    if (!singleOver && !cumOver && (Number(cat.singleThreshold) || Number(cat.cumulativeThreshold))) return 0;
    if (cat.onlyExcess && Number(cat.cumulativeThreshold) > 0) base = Math.max(0, ytd + taxable - Math.max(ytd, Number(cat.cumulativeThreshold)));
  }
  const amt = (base * rate) / 100 * (share ?? 1);
  return cat?.roundOff ? Math.round(amt) : round2(amt);
}
// Bill form: TDS, payment-at-entry, recipient bank, bill copy
function BillExtras({ f, setF, v }) {
  const st = useStore();
  const t = f.tdsSetup || {};
  const setT = (k, x) => setF({ ...f, tdsSetup: { ...t, [k]: x } });
  const attach = async (file) => { if (!file) return; const a = await readAttachment(file); if (a) setF({ ...f, attachment: { name: a.name, dataUrl: a.dataUrl } }); };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <Field label="Bill copy (attachment)">
          <label className="flex h-[32px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed border-gray-300 px-2.5 text-[12.5px] text-ink-soft hover:border-brand hover:text-brand">{h(Icon.upload, { size: 13 })}<span className="truncate">{f.attachment?.name || "Attach PDF / image"}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => attach(e.target.files[0])} /></label>
        </Field>
        <Field label="Payment reference"><TextInput value={f.payRef || ""} onChange={(x) => setF({ ...f, payRef: x })} placeholder="Vendor's reference to quote" /></Field>
        <Field label="Recipient bank"><Select value={f.recipientBank || ""} placeholder="Default account" onChange={(x) => setF({ ...f, recipientBank: x })} options={vendorBankOptions(v)} /></Field>
        <div className="flex items-end pb-1.5"><Check checked={!!f.isPaid} onChange={(b) => setF({ ...f, isPaid: b })} label="Paid at entry (cash / card purchase)" /></div>
        {f.isPaid && <>
          <Field label="Mode of payment"><Select value={f.paidMode || "NEFT"} onChange={(x) => setF({ ...f, paidMode: x })} options={PAY_MODES} /></Field>
          <Field label="Paid amount (₹)"><NumInput value={f.paidAmount ?? ""} onChange={(x) => setF({ ...f, paidAmount: x })} /></Field>
          <Field label="Cash / bank account"><Select value={f.paidFrom || ""} placeholder="Select…" onChange={(x) => setF({ ...f, paidFrom: x })} options={[...settingsOf(st).companyBanks, "Petty cash — site"]} /></Field>
        </>}
      </div>
      <div className="rounded-lg border border-line p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-mute">Tax withholding (TDS)</p>
        <div className="grid grid-cols-4 gap-3">
          <div className="flex items-end pb-1.5"><Check checked={t.consider !== false} onChange={(b) => setT("consider", b)} label="Consider for tax withholding" /></div>
          <Field label="Tax withholding category"><Select value={t.category || v?.tds || ""} onChange={(x) => setT("category", x)} options={tdsOptions()} /></Field>
          <Field label="Tax withholding group"><Select value={t.group || ""} placeholder="—" onChange={(x) => setT("group", x)} options={["Domestic vendors", "Contractors", "Non-resident (195)"]} /></Field>
          <div className="flex flex-col justify-end gap-1 pb-1">
            <Check checked={!!t.ignoreThreshold} onChange={(b) => setT("ignoreThreshold", b)} label="Ignore withholding threshold" />
            <Check checked={!!t.edit} onChange={(b) => setT("edit", b)} label="Edit tax withholding entries" />
          </div>
          {t.edit && <Field label="TDS amount (manual, ₹)"><NumInput value={t.manual ?? ""} onChange={(x) => setT("manual", x)} /></Field>}
        </div>
      </div>
    </div>
  );
}
function billExtrasErr(f, total) {
  if (f.isPaid) {
    if (!(Number(f.paidAmount) > 0)) return "Enter the amount paid at entry";
    if (Number(f.paidAmount) > total + 0.5) return "Paid amount is more than the bill";
    if (!f.paidFrom) return "Pick the cash / bank account it was paid from";
  }
  if (f.tdsSetup?.edit && !(Number(f.tdsSetup.manual) >= 0)) return "Enter the manual TDS amount";
  return "";
}

// ---------------------------------------------------------------- contract extras (ERPNext Contract, Procore commitment, Fieldglass SOW)
const CONTRACT_TEMPLATES = {
  "Standard item-rate works": "Works measured jointly and paid on certified RA bills. Retention and LD as per commercial terms. Defects liability as stated. Disputes: arbitration at Pune under the Arbitration and Conciliation Act, 1996.",
  "Lump-sum EPC": "Fixed price for the complete scope; milestone payments as per schedule. Variations only by approved change order. Performance guarantee valid till the end of DLP.",
  "Labour supply": "Contractor supplies skilled and unskilled workers, pays wages as per the Minimum Wages Act, and complies with CLRA, PF, ESI and BOCW. Principal employer's safety rules apply.",
  "Rate contract (call-off)": "Rates fixed for the contract period; quantities are indicative and ordered by work order. No minimum commitment.",
};
function ContractExtras({ f, setF }) {
  const st = useStore();
  const set = (k) => (x) => setF({ ...f, [k]: x });
  return (
    <Section title="Signing, terms & fulfilment" icon={Icon.file}>
      <div className="grid grid-cols-3 gap-3 p-4">
        <Field label="Authorised signatory (our company)"><TextInput value={f.signatory || ""} onChange={set("signatory")} placeholder="e.g. R. Deshpande, Director — Projects" /></Field>
        <Field label="Contract template"><Select value={f.template || ""} placeholder="—" onChange={(x) => setF({ ...f, template: x, legalTerms: f.legalTerms && f.template === x ? f.legalTerms : CONTRACT_TEMPLATES[x] || f.legalTerms })} options={Object.keys(CONTRACT_TEMPLATES)} /></Field>
        <Field label="Fee characteristics"><Select value={f.feeType || ""} placeholder="—" onChange={set("feeType")} options={["Fixed fee", "Time & material", "Milestone-based", "Unit rate"]} /></Field>
        <Field label="Legal terms" span={3}><TextArea rows={2} value={f.legalTerms || ""} onChange={set("legalTerms")} /></Field>
        <div className="flex items-end pb-1.5"><Check checked={!!f.fulfilmentRequired} onChange={set("fulfilmentRequired")} label="Fulfilment required (checklist to close)" /></div>
        {f.fulfilmentRequired && <Field label="Fulfilment deadline"><DateInput value={f.fulfilmentDeadline || ""} onChange={set("fulfilmentDeadline")} /></Field>}
        {f.fulfilmentRequired && <Field label="Fulfilment terms"><TextInput value={f.fulfilmentTerms || ""} onChange={set("fulfilmentTerms")} placeholder="e.g. As-built drawings, O&M manuals" /></Field>}
        <Field label="Reference document type"><Select value={f.refDocType || ""} placeholder="—" onChange={set("refDocType")} options={["RFQ", "Purchase requisition", "Letter of intent", "Work order (client)"]} /></Field>
        <Field label="Reference document name"><TextInput value={f.refDocName || f.rfqId || ""} onChange={set("refDocName")} /></Field>
        <Field label="Company"><Select value={f.company || settingsOf(st).ourCompany} onChange={set("company")} options={COMPANIES(st)} /></Field>
        <Field label="Cost centre"><Select value={f.costCentre || ""} placeholder="—" onChange={set("costCentre")} options={settingsOf(st).costCentres} /></Field>
      </div>
    </Section>
  );
}
function contractExtrasErr(f) {
  if (f.fulfilmentRequired && !f.fulfilmentDeadline) return "enter the fulfilment deadline";
  if (f.fulfilmentRequired && f.fulfilmentDeadline && f.start && f.fulfilmentDeadline < f.start) return "fulfilment deadline before the start";
  if (f.signatory && f.signatory.trim().length < 3) return "authorised signatory name";
  return "";
}
function ContractExtrasView({ c }) {
  const items = [["Authorised signatory", c.signatory], ["Template", c.template], ["Fee characteristics", c.feeType], ["Company", c.company], ["Cost centre", c.costCentre],
    ["Reference", [c.refDocType, c.refDocName].filter(Boolean).join(" · ") || null], ["Fulfilment", c.fulfilmentRequired ? `Required by ${fmtDate(c.fulfilmentDeadline)}${c.fulfilmentTerms ? ` — ${c.fulfilmentTerms}` : ""}` : null],
    ["Signed contract received", c.signedReceivedOn ? fmtDate(c.signedReceivedOn) : null], ["Legal terms", c.legalTerms]].filter((x) => x[1]);
  return items.length ? <Section title="Signing, terms & fulfilment" icon={Icon.file}><KV items={items} /></Section> : null;
}

// ---------------------------------------------------------------- scorecard setup (ERPNext Supplier Scorecard, Criteria, Variable, Period)
function criteriaErr(cfg) {
  const c = (cfg.criteria || []).filter((x) => x.name || x.formula);
  if (!c.length) return "";
  if (c.some((x) => !String(x.name || "").trim())) return "Every criterion needs a name";
  if (c.some((x) => !(Number(x.maxScore) > 0))) return "Max score must be above zero";
  if (Math.round(sum(c, (x) => Number(x.weight) || 0)) !== 100) return `Criteria weights total ${sum(c, (x) => Number(x.weight) || 0)}% — must be 100%`;
  const test = Object.fromEntries(SCORE_VARIABLES.map((v) => [v.name, 50]));
  const bad = c.find((x) => evalScoreFormula(x.formula, test) == null);
  if (bad) return `Formula for "${bad.name}" is not valid — use {variable} names, numbers and + − × ÷ ( )`;
  return "";
}
function ScoreCriteriaEditor({ cfg, setCfg }) {
  const crit = cfg.criteria || [];
  const set = (i, k, x) => setCfg({ ...cfg, criteria: crit.map((c, j) => (j === i ? { ...c, [k]: x } : c)) });
  const per = cfg.period || { length: "Monthly", start: `${new Date().getFullYear()}-04-01` };
  const periods = (() => { const out = []; let d = new Date(per.start); const step = per.length === "Quarterly" ? 3 : per.length === "Half-yearly" ? 6 : 1;
    for (let i = 0; i < 12 / step; i++) { const e = new Date(d); e.setMonth(e.getMonth() + step); e.setDate(e.getDate() - 1); out.push({ n: i + 1, start: d.toISOString().slice(0, 10), end: e.toISOString().slice(0, 10) }); d = new Date(e); d.setDate(d.getDate() + 1); } return out; })();
  return (
    <>
      <Section title="Scorecard criteria" icon={Icon.listChecks} className="col-span-2" actions={<Btn size="sm" icon={Icon.plus} onClick={() => setCfg({ ...cfg, criteria: [...crit, { name: "", formula: "", maxScore: 100, weight: 0 }] })}>Add criterion</Btn>}>
        <div className="grid grid-cols-3 gap-3 border-b border-line p-4">
          <Field label="Weighting function"><Select value={cfg.weighting || "Weighted average"} onChange={(x) => setCfg({ ...cfg, weighting: x })} options={["Weighted average", "Lowest criterion"]} /></Field>
          <Field label="Scorecard period"><Select value={per.length} onChange={(x) => setCfg({ ...cfg, period: { ...per, length: x } })} options={["Monthly", "Quarterly", "Half-yearly"]} /></Field>
          <Field label="Periods start on"><DateInput value={per.start} onChange={(x) => setCfg({ ...cfg, period: { ...per, start: x } })} /></Field>
        </div>
        {crit.length === 0 ? <p className="p-4 text-[12.5px] text-ink-mute">No criteria — the metric weights below are used. Add criteria to score with your own formulas.</p> : (
          <div className="overflow-x-auto"><table className="w-full text-[12.5px]">
            <thead><tr>{["Criteria name", "Formula", "Max score", "Weight %", ""].map((x) => <th key={x} className="border-b border-line px-2 py-1.5 text-left text-[11px] font-medium text-ink-mute">{x}</th>)}</tr></thead>
            <tbody>{crit.map((c, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-2 py-1" style={{ minWidth: 150 }}><TextInput value={c.name} onChange={(x) => set(i, "name", x)} /></td>
                <td className="px-2 py-1" style={{ minWidth: 320 }}><TextInput value={c.formula} onChange={(x) => set(i, "formula", x)} placeholder="e.g. 100 - {rejection_pct} * 2" /></td>
                <td className="px-2 py-1" style={{ minWidth: 90 }}><NumInput value={c.maxScore} onChange={(x) => set(i, "maxScore", x)} /></td>
                <td className="px-2 py-1" style={{ minWidth: 90 }}><NumInput value={c.weight} onChange={(x) => set(i, "weight", x)} /></td>
                <td className="px-2 py-1 text-right"><Btn size="sm" variant="danger" onClick={() => setCfg({ ...cfg, criteria: crit.filter((_, j) => j !== i) })}>Remove</Btn></td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Section>
      <Section title="Scoring variables" icon={Icon.sliders} className="col-span-2">
        <DataTable dense rows={SCORE_VARIABLES} rowKey={(r) => r.name} columns={[
          { key: "name", label: "Variable", render: (r) => <span className="mono text-[12px]">{`{${r.name}}`}</span> }, { key: "param", label: "Parameter name", className: "mono text-[12px]" },
          { key: "path", label: "Path (source data)", className: "text-[12px]" }, { key: "desc", label: "Description", className: "text-[12px]" },
          { key: "custom", label: "Custom variable", render: (r) => (r.custom ? "Yes" : "Standard") },
        ]} />
      </Section>
      <Section title="Scorecard periods" icon={Icon.calendar} className="col-span-2">
        <DataTable dense rows={periods} rowKey={(r) => r.n} columns={[
          { key: "n", label: "Period" }, { key: "start", label: "Start date", render: (r) => fmtDate(r.start) }, { key: "end", label: "End date", render: (r) => fmtDate(r.end) },
          { key: "ref", label: "Scorecard setup", render: () => `Supplier scorecard — ${per.length.toLowerCase()} (${cfg.weighting || "Weighted average"})` },
          { key: "s", label: "", render: (r) => (r.start <= todayISO() && r.end >= todayISO() ? <Status tone="blue">Current</Status> : r.end < todayISO() ? <Status tone="gray">Closed</Status> : null) },
        ]} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- supplier portal: own price list and custom profile fields
function PortalPriceList({ v, readOnly }) {
  const st = useStore();
  const [edit, setEdit] = y.useState(null);
  return (
    <div className="p-4">
      <Section title="My price list (catalogue)" icon={Icon.receipt} actions={!readOnly && <Btn size="sm" icon={Icon.plus} onClick={() => setEdit({})}>Add price</Btn>}>
        <PriceListTable rows={(st.vendorPrices || []).filter((p) => p.vendorId === v.id)} onEdit={(p) => !readOnly && setEdit(p)} showVendor={false} />
      </Section>
      <p className="mt-2 text-[12px] text-ink-mute">Prices you list here are suggested to buyers when they raise a purchase order. Agreed rates from past POs are listed below.</p>
      {edit && <PriceModal base={edit.id ? edit : null} vendorId={v.id} portal onClose={() => setEdit(null)} />}
    </div>
  );
}
function PortalProfileFields({ v, readOnly }) {
  const st = useStore();
  const defs = (settingsOf(st).customFields || {}).vendor || [];
  const [val, setVal] = y.useState(() => ({ ...(v.custom || {}) }));
  if (!defs.length) return null;
  return (
    <Section title="Company profile — additional details" icon={Icon.building} actions={!readOnly && <Btn size="sm" variant="primary" onClick={() => { setState((s) => { byId(s.vendors, v.id).custom = { ...val }; }, { entity: "Vendor", id: v.id, action: "Profile details updated via portal" }); toast("Profile saved"); }}>Save</Btn>}>
      <div className="p-4"><fieldset disabled={readOnly} className="contents"><CustomFieldInputs defs={defs} value={val} onChange={setVal} /></fieldset></div>
    </Section>
  );
}
