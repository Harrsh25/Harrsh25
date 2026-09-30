import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''      A = b.filter(u => !u.blocked && u.payNow > 0);
    return e(we, {
      open: !0,
      onClose: s,
      width: 920,''','''      A = b.filter(u => !u.blocked && u.payNow > 0),
      nxLatest = l.reduce((u, v) => v.date > u ? v.date : u, ""),
      nxLastPay = l.flatMap(u => u.payments || []).reduce((u, v) => v.date > u ? v.date : u, ""),
      payErr = {
        date: !p ? "Required" : VX.notFuture(p, "Value date can't be in the future") || (p < nxLatest ? `Before the bill date (${_(nxLatest)})` : ""),
        override: Object.entries(c).some(([u, v]) => A.some(I => I.inv.id === u) && String(v || "").trim().length < 5) ? "Enter an override reason (min 5 characters)" : ""
      };
    return e(we, {
      open: !0,
      onClose: s,
      width: 920,''',label='pay err')
s=rep(s,'''      }, "Paying ", e("b", null, A.length), " \\xB7 net ", e("b", {
        className: "num"
      }, Q(F(A, u => u.net)))), e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !A.length,''','''      }, "Paying ", e("b", null, A.length), " \\xB7 net ", e("b", {
        className: "num"
      }, Q(F(A, u => u.net)))), nxFix(payErr), e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !A.length || VX.any(payErr),''',label='pay footer')
s=rep(s,'''      label: "Value date"
    }, e(Re, {
      value: p,
      onChange: m
    })), e(L, {''','''      label: "Value date",
      required: !0,
      hint: nxLastPay && !payErr.date ? `Last payment ${_(nxLastPay)}` : "",
      error: nxE(payErr, "date")
    }, e(Re, {
      value: p,
      min: nxLatest,
      max: ke(),
      onChange: m
    })), e(L, {''',label='pay date')
save(s); print('p11 applied')
