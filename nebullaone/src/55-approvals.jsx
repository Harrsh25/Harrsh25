// One approval engine for vendor and contract stages.
// A stage can run at the same time as the one before it ("with previous" = parallel group) and can need
// more than one approval ("approvals needed": 1 = any one approver, N = N different people must approve).
// The next group opens only when every stage in the current group is approved.

// Stage settings rows (Procurement Settings) for a vendor / a contract value
function vendorFlowRows(v, st) {
  const flow = (settingsOf(st || getState()).vendorFlow || []).filter((x) => x.name && (x.scope === "All" || !x.scope || (x.scope === "Contractors") === !!(v && (v.isContractor || hasType(v, "Labor")))));
  return flow.length ? flow : APPROVAL_FLOW.map((name) => ({ name }));
}
function contractFlowRows(value, st) {
  const flow = (settingsOf(st || getState()).contractFlow || []).filter((x) => x.name && (Number(value) || 0) >= (Number(x.minValue) || 0));
  return flow.length ? flow : CONTRACT_FLOW.map((name) => ({ name }));
}
// key = "dept" (vendor) or "role" (contract)
const stageFrom = (key) => (r, i) => ({ [key]: r.name, status: "Waiting", parallel: i > 0 && !!r.parallel, need: Math.max(1, Number(r.need) || 1), votes: [], by: null, at: null, remark: "" });
// Make stage j and the stages that run with it Pending
function openStageGroup(stages, j, at) {
  if (j < 0 || j >= stages.length) return;
  for (let k = j; k < stages.length && (k === j || stages[k].parallel); k++) Object.assign(stages[k], { status: "Pending", since: at, votes: [], escalated: null });
}
// Would approving stage i finish the whole route?
const approvalFinishes = (stages, i) => (stages[i].votes || []).length + 1 >= (stages[i].need || 1) && stages.every((s, j) => j === i || s.status === "Approved");
// Record one approval on stage i (mutates). Returns "partial" (more approvals needed), "stage" (stage done, more to go) or "done" (route complete).
function recordApproval(stages, i, remark) {
  const s = stages[i], at = new Date().toISOString();
  s.votes = [...(s.votes || []), { by: currentUser(), at, remark: remark || "" }];
  if (s.votes.length < (s.need || 1)) return "partial";
  Object.assign(s, { status: "Approved", by: s.votes.map((x) => x.by).join(", "), at, remark: remark || "" });
  if (stages.some((x) => x.status === "Pending")) return "stage";
  const next = stages.findIndex((x) => x.status === "Waiting");
  if (next < 0) return "done";
  openStageGroup(stages, next, at);
  return "stage";
}
// The same person can't approve one stage twice (when it needs several approvals)
const alreadyVoted = (stage) => (stage.votes || []).some((x) => x.by === currentUser());
const stageNeedText = (s) => ((s.need || 1) > 1 ? ` (${(s.votes || []).length} of ${s.need} approvals)` : "");
