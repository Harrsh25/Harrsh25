// Minimal inline stroke icons — avoids pulling in an icon-font/library
// dependency for a handful of glyphs used in the nav and toolbars.
const base = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export const IconVendors = (p) => (
  <svg {...base} {...p}><rect x="3" y="7" width="18" height="13" rx="1.5" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
);
export const IconApprovals = (p) => (
  <svg {...base} {...p}><path d="M9 11l2.5 2.5L16 8" /><circle cx="12" cy="12" r="9" /></svg>
);
export const IconRfq = (p) => (
  <svg {...base} {...p}><path d="M4 6h16M4 12h10M4 18h7" /><circle cx="19" cy="17" r="2.5" /></svg>
);
export const IconContracts = (p) => (
  <svg {...base} {...p}><path d="M7 3h8l4 4v14H7z" /><path d="M15 3v4h4M9 12h6M9 16h6" /></svg>
);
export const IconPO = (p) => (
  <svg {...base} {...p}><path d="M6 3h9l4 4v14H6z" /><path d="M6 3v4H2M9 12l2 2 4-4" /></svg>
);
export const IconLabor = (p) => (
  <svg {...base} {...p}><circle cx="9" cy="8" r="3" /><path d="M2 20c0-3.3 3.1-6 7-6s7 2.7 7 6" /><circle cx="18" cy="7" r="2.2" /><path d="M22 19.5c0-2.5-2.1-4.5-4.6-4.9" /></svg>
);
export const IconInvoices = (p) => (
  <svg {...base} {...p}><path d="M7 3h10v18l-3-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>
);
export const IconPayments = (p) => (
  <svg {...base} {...p}><rect x="2" y="6" width="20" height="13" rx="2" /><path d="M2 10h20" /><path d="M6 15h4" /></svg>
);
export const IconScorecards = (p) => (
  <svg {...base} {...p}><path d="M4 20V10M11 20V4M18 20v-7" /></svg>
);
export const IconSearch = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
);
export const IconFilter = (p) => (
  <svg {...base} {...p}><path d="M4 5h16M7 12h10M10 19h4" /></svg>
);
export const IconRefresh = (p) => (
  <svg {...base} {...p}><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></svg>
);
export const IconChevronLeft = (p) => (
  <svg {...base} {...p}><path d="M15 18l-6-6 6-6" /></svg>
);
export const IconChevronRight = (p) => (
  <svg {...base} {...p}><path d="M9 18l6-6-6-6" /></svg>
);
