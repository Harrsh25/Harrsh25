import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
# credit/debit note
s=rep(s,'''      title: "Credit / debit note",
      footer: e(z, null, e(M, {
        onClick: () => m(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !(p.amount > 0) || !p.reason,''','''      title: "Credit / debit note",
      footer: e(z, null, nxFix(nxNoteErr(p, I)), e(M, {
        onClick: () => m(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: VX.any(nxNoteErr(p, I)),''',label='note footer')
s=rep(s,'''      label: "Amount (\\u20B9, incl. GST)"
    }, e(ge, {
      value: p.amount,''','''      label: "Amount (\\u20B9, incl. GST)",
      required: !0,
      hint: p.type === "Debit Note" ? `Up to ${Q(I.balance)} outstanding` : "",
      error: nxE(nxNoteErr(p, I), "amount")
    }, e(ge, {
      min: 0,
      value: p.amount,''',label='note amt')
s=rep(s,'''      label: "Reason",
      span: 2
    }, e(ee, {
      value: p.reason,''','''      label: "Reason",
      required: !0,
      span: 2,
      error: nxE(nxNoteErr(p, I), "reason")
    }, e(ee, {
      value: p.reason,''',label='note reason')
# schedule
s=rep(s,'''      subtitle: "Shares must total 100%",
      footer: e(z, null, e(M, {
        onClick: () => d(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: F(c, q => q.pct) !== 100,''','''      subtitle: "Shares must total 100%",
      footer: e(z, null, nxFix(nxSchedErr(c, n)), e(M, {
        onClick: () => d(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: VX.any(nxSchedErr(c, n)),''',label='sched footer')
s=rep(s,'''    }, "Total ", F(c, q => q.pct), "%"))), b && e(we, {''','''    }, "Total ", F(c, q => q.pct), "%"), nxSchedErr(c, n).rows && e("p", {
      role: "alert",
      className: "text-[12px] text-red-600"
    }, nxSchedErr(c, n).rows))), b && e(we, {''',label='sched msg')
# advance adjust
s=rep(s,'''      title: "Adjust vendor advance against this bill",
      footer: e(z, null, e(M, {
        onClick: () => A(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !(b.amount > 0),''','''      title: "Adjust vendor advance against this bill",
      footer: e(z, null, nxFix(nxAdjErr(b, $, I)), e(M, {
        onClick: () => A(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: VX.any(nxAdjErr(b, $, I)),''',label='adj footer')
s=rep(s,'''      label: "Amount to adjust"
    }, e(ge, {
      value: b.amount,''','''      label: "Amount to adjust",
      error: nxE(nxAdjErr(b, $, I), "amount")
    }, e(ge, {
      min: 0,
      value: b.amount,''',label='adj amt')
s=rep(s,'''  function Ai({
    id: t,
    onClose: s
  }) {''','''  const nxNoteErr = (p, I) => ({
      amount: VX.num(p.amount, {
        gt: 0,
        label: "Amount"
      }) || (p.type === "Debit Note" && Number(p.amount) > I.balance + .5 ? `Debit note can't exceed the outstanding ${Q(I.balance)}` : ""),
      reason: VX.blank(p.reason) ? "Required" : String(p.reason).trim().length < 5 ? "Give a clear reason (min 5 characters)" : ""
    }),
    nxSchedErr = (c, n) => {
      const tot = F(c, q => Number(q.pct) || 0);
      return {
        total: Math.abs(tot - 100) > .001 ? `Shares total ${tot}% \\u2014 must be 100%` : "",
        rows: c.map((q, V) => !q.due ? `#${V+1}: due date required` : q.due < n.date ? `#${V+1}: due before the bill date (${_(n.date)})` : V > 0 && c[V - 1].due && q.due <= c[V - 1].due ? `#${V+1}: must fall after instalment #${V}` : !(Number(q.pct) > 0) ? `#${V+1}: share must be greater than 0` : "").filter(Boolean).join(" \\xB7 ")
      }
    },
    nxAdjErr = (b, $, I) => {
      const adv = $.find(q => q.id === b.advId);
      return {
        adv: adv ? "" : "Required",
        amount: VX.num(b.amount, {
          gt: 0,
          label: "Amount"
        }) || (adv && Number(b.amount) > adv.left + .5 ? `Only ${Q(adv.left)} left on ${adv.id}` : Number(b.amount) > I.balance + .5 ? `Exceeds the bill balance ${Q(I.balance)}` : "")
      }
    };

  function Ai({
    id: t,
    onClose: s
  }) {''',label='helpers')
save(s); print('p16 applied')
