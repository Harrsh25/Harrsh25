const TONE_BY_STATUS = {
  SPEND_AUTHORIZED: "ok",
  APPROVED: "ok",
  MATCHED: "ok",
  PAID: "ok",
  ACCEPTED: "ok",
  RECEIVED: "ok",
  PROSPECTIVE: "accent",
  PENDING_APPROVAL: "warn",
  SUBMITTED: "accent",
  PARTIALLY_PAID: "warn",
  PARTIALLY_RECEIVED: "warn",
  ON_HOLD: "warn",
  MISMATCHED: "danger",
  DISPUTED: "danger",
  OVERDUE: "danger",
  REJECTED: "danger",
  BLACKLISTED: "danger",
  DEACTIVATED: "danger",
  CANCELLED: "danger",
};

export function Badge({ status }) {
  const tone = TONE_BY_STATUS[status] || "";
  return <span className={`badge ${tone ? `badge-${tone}` : ""}`}>{String(status).replaceAll("_", " ")}</span>;
}
