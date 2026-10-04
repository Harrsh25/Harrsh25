// Shared field validation (merged from the validation pass on the other build) plus
// bank-account verification, foreign-vendor rules and document versioning helpers.
// Every checker returns "" when the value is fine, otherwise the message to show.

const VX = {
  blank: (v) => v === undefined || v === null || String(v).trim() === "",
  req: (v, m = "Required") => (VX.blank(v) ? m : ""),
  num: (v, { min = -Infinity, max = Infinity, int = false, label = "Value", gt } = {}) => {
    if (VX.blank(v)) return "Required";
    const n = Number(v);
    if (!Number.isFinite(n)) return "Enter a number";
    if (int && !Number.isInteger(n)) return "Whole number only";
    if (gt !== undefined && !(n > gt)) return `${label} must be greater than ${gt}`;
    if (n < min) return `${label} can't be below ${min}`;
    if (n > max) return `${label} can't be above ${max}`;
    return "";
  },
  pct: (v, label = "Percentage") => VX.num(v, { min: 0, max: 100, label }),
  dateOrder: (a, b, m) => (a && b && a > b ? m : ""),
  notFuture: (d, m = "Date can't be in the future") => (d && d > todayISO() ? m : ""),
  notPast: (d, m = "Date can't be in the past") => (d && d < todayISO() ? m : ""),
  email: (v) => (VX.blank(v) ? "" : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim()) ? "" : "Enter a valid email"),
  phone: (v) => (VX.blank(v) ? "" : /^(\+?\d{1,3}[\s-]?)?\d[\d\s-]{8,13}\d$/.test(String(v).trim()) && String(v).replace(/\D/g, "").length >= 10 ? "" : "Enter a valid phone number (10+ digits)"),
  mobile: (v) => (VX.blank(v) ? "" : /^(\+91[\s-]?)?[6-9]\d{9}$/.test(String(v).replace(/[\s-]/g, "")) ? "" : "Enter a 10-digit mobile number starting 6–9"),
  pin: (v, c = "India") => (VX.blank(v) ? "" : c === "India" ? (/^[1-9][0-9]{5}$/.test(String(v).trim()) ? "" : "PIN code must be 6 digits") : /^[A-Za-z0-9 -]{3,10}$/.test(String(v).trim()) ? "" : "Enter a valid postal code"),
  ifsc: (v) => (VX.blank(v) ? "" : /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(v).trim().toUpperCase()) ? "" : "IFSC must be 11 characters, e.g. HDFC0001234"),
  acct: (v) => (VX.blank(v) ? "" : /^[0-9]{9,18}$/.test(String(v).replace(/\s/g, "")) ? "" : "Account number must be 9–18 digits"),
  clra: (v) => (VX.blank(v) ? "" : /^[A-Za-z0-9][A-Za-z0-9/-]{5,29}$/.test(String(v).trim()) ? "" : "Use letters, digits, / or - (6–30 chars), e.g. CLRA/PUN/2025/0412"),
  pf: (v) => (VX.blank(v) ? "" : /^[A-Z]{5}[0-9]{7,10}$/.test(String(v).replace(/[\s/]/g, "").toUpperCase()) ? "" : "PF code: 5 letters + 7–10 digits, e.g. PUPUN1123344000"),
  esi: (v) => (VX.blank(v) ? "" : /^[0-9]{17}$/.test(String(v).replace(/[\s-]/g, "")) ? "" : "ESI code must be 17 digits"),
  url: (v) => (VX.blank(v) ? "" : /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(String(v).trim()) ? "" : "Enter a valid website, e.g. www.example.com"),
  reason: (v, min = 5) => (VX.blank(v) ? "Required" : String(v).trim().length < min ? `Give a clear reason (min ${min} characters)` : ""),
  FILE_MAX: 5 * 1024 * 1024,
  FILE_TYPES: /\.(pdf|jpe?g|png)$/i,
  SHEET_TYPES: /\.(pdf|jpe?g|png|xlsx?|csv)$/i,
  file: (f, types = VX.FILE_TYPES) => (!f ? "" : f.size > VX.FILE_MAX ? `File is ${(f.size / 1048576).toFixed(2)} MB — over the 5 MB limit` : types.test(f.name) ? "" : types === VX.FILE_TYPES ? "Only PDF, JPG or PNG files are allowed" : "Only PDF, JPG, PNG, Excel or CSV files are allowed"),
  any: (o) => Object.values(o).some(Boolean),
  count: (o) => Object.values(o).filter(Boolean).length,
};
if (typeof window !== "undefined") window.__NX_VX = VX;
// Inline error under a field
const FieldErr = ({ m }) => (m ? <span className="mt-1 block text-[11px] text-red-600">{m}</span> : null);
// Normalised document / invoice number for duplicate checks (case and spaces ignored)
const normNo = (s) => String(s || "").toUpperCase().replace(/\s+/g, "");

// ---------------------------------------------------------------- foreign vendors
const COUNTRIES = ["India", "United Arab Emirates", "Singapore", "United States", "United Kingdom", "Germany", "China"];
const COUNTRY_CURRENCY = { India: "INR", "United Arab Emirates": "AED", Singapore: "SGD", "United States": "USD", "United Kingdom": "GBP", Germany: "EUR", China: "CNY" };
const CURRENCIES = ["INR", "USD", "EUR", "AED", "GBP", "SGD", "CNY"];
const DEFAULT_FX = { INR: 1, USD: 83.2, EUR: 90.1, AED: 22.65, GBP: 105.4, SGD: 61.8, CNY: 11.5 };
const isForeign = (v) => (v.country || "India") !== "India";

// ---------------------------------------------------------------- bank accounts
const bankStatus = (a) => a.status || (a.verifiedAt ? "Verified" : "Unverified");
// Bank-account change control on an approved vendor: change requested → penny-drop verification → Finance approval →
// cooling period (Procurement Settings) while the OLD account stays the default and keeps getting paid → the new account
// becomes the default on the switch date; the old one is kept (replaced) in the history. The vendor's contact is told.
const bankCooling = (a) => (a && a.change && a.change.status === "Approved" && a.change.switchOn && a.change.switchOn > todayISO() ? a.change.switchOn : null);
const bankChangePending = (a) => !!(a && a.change && ["Requested", "Approved"].includes(a.change.status));
// The account payments go to today (an approved change takes over on its switch date)
const defaultBank = (v) => { const acc = v?.bankAccounts || []; return acc.find((b) => b.change?.status === "Approved" && b.change.switchOn && b.change.switchOn <= todayISO()) || acc.find((b) => b.isDefault); };
const bankPayable = (a) => !!a && !a.disabled && a.paymentsEnabled !== false && bankStatus(a) === "Verified" && !bankChangePending(a);
// Make the switch permanent once its date has come (run when the store loads)
function applyBankSwitches(s) {
  let n = 0;
  for (const v of s.vendors || []) for (const b of v.bankAccounts || []) if (b.change?.status === "Approved" && b.change.switchOn && b.change.switchOn <= todayISO()) {
    v.bankAccounts.forEach((o) => { if (o.isDefault && o.id !== b.id) Object.assign(o, { isDefault: false, replacedOn: b.change.switchOn }); });
    b.isDefault = true; b.change = { ...b.change, status: "Switched" };
    (s.audit = s.audit || []).unshift({ at: new Date().toISOString(), by: "System", entity: "Vendor", id: v.id, action: `Bank change completed — ${b.bank} ••${String(b.account).slice(-4)} is now the default bank account (cooling period ended)` });
    n++;
  }
  return n;
}
const coolingDate = (st) => { const n = Number(settingsOf(st || getState()).bankCoolingDays); return n > 0 ? new Date(Date.now() + n * DAY).toISOString().slice(0, 10) : null; };
// Penny-drop simulation: the beneficiary name returned by the bank must match the vendor's legal / trade name
const nameMatch = (holder, v) => {
  const n = (s) => String(s || "").toUpperCase().replace(/\b(PVT|PRIVATE|LTD|LIMITED|LLP|CO|COMPANY|THE|AND|&)\b/g, "").replace(/[^A-Z0-9]/g, "");
  const h1 = n(holder); if (!h1) return false;
  return [v.legalName, v.name].filter(Boolean).some((x) => { const t = n(x); return t && (t.includes(h1) || h1.includes(t)); });
};
function bankErrors(b, v, existing = []) {
  const foreign = v && isForeign(v);
  const e = {
    holder: VX.req(b.holder, "Enter the account holder name as per bank records"),
    bank: VX.req(b.bank, "Enter the bank name"),
    account: b.account ? (foreign ? (/^[A-Z0-9]{8,34}$/i.test(String(b.account).replace(/\s/g, "")) ? "" : "Enter a valid account / IBAN (8–34 letters or digits)") : VX.acct(b.account)) || (existing.some((a) => a.account === String(b.account).replace(/\s/g, "")) ? "This account is already on file" : "") : "Required",
    ifsc: foreign ? (b.swift ? (/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(String(b.swift).toUpperCase()) ? "" : "SWIFT code must be 8 or 11 characters") : "Required") : b.ifsc ? VX.ifsc(b.ifsc) : "Required",
  };
  return e;
}

// ---------------------------------------------------------------- document versions
// Replacing a file keeps the previous one in the document's history
function withVersion(d, patch, by) {
  if (d.file) d.versions = [...(d.versions || []), { file: d.file, dataUrl: d.dataUrl || null, expiry: d.expiry || null, status: d.status, uploadedAt: d.uploadedAt || null, verifiedBy: d.verifiedBy || null, verifiedAt: d.verifiedAt || null, replacedAt: new Date().toISOString(), replacedBy: by }];
  Object.assign(d, { verifiedBy: null, verifiedAt: null, remark: "" }, patch);
  return d;
}
