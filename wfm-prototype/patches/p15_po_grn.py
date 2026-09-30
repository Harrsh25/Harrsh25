import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
# ---- PO
s=rep(s,'''      f = i.vendorId && v.length && v.every(P => P.desc && P.qty > 0 && P.rate > 0) && !b.block && !w,''','''      poErr = {
        vendor: i.vendorId ? "" : "Required",
        deliveryDate: !i.deliveryDate ? "Required" : VX.notPast(i.deliveryDate, "Delivery date can't be in the past"),
        tolerance: VX.num(i.tolerance, {
          min: 0,
          max: 20,
          label: "Tolerance"
        }),
        lines: (A ? v : i.lines).map((P, h) => A ? VX.num(P.qty, {
          gt: 0,
          label: "Qty"
        }) ? `Line ${h+1}: quantity must be greater than 0` : "" : !String(P.desc || "").trim() ? `Line ${h+1}: description required` : !String(P.unit || "").trim() ? `Line ${h+1}: unit required` : !(Number(P.qty) > 0) ? `Line ${h+1}: quantity must be greater than 0` : !(Number(P.rate) > 0) ? `Line ${h+1}: rate must be greater than 0` : "").filter(Boolean).join(" \\xB7 "),
        noLines: v.length ? "" : "Required"
      },
      f = !VX.any(poErr) && i.vendorId && v.length && v.every(P => P.desc && P.qty > 0 && P.rate > 0) && !b.block && !w,''',label='po err')
s=rep(s,'''      }, Q(I)), " + GST"), e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !f,''','''      }, Q(I)), " + GST"), nxFix({
        ...poErr,
        lines: poErr.lines && (i.lines.some(P => P.desc || P.qty || (!A && P.rate)) || A) ? "x" : poErr.lines ? "Required" : ""
      }), e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !f,''',label='po footer')
s=rep(s,'''      label: "Delivery by"
    }, e(Re, {
      value: i.deliveryDate,''','''      label: "Delivery by",
      required: !0,
      error: nxE(poErr, "deliveryDate")
    }, e(Re, {
      min: ke(),
      value: i.deliveryDate,''',label='po deliv')
s=rep(s,'''      label: "Receipt tolerance (%)"
    }, e(ge, {
      value: i.tolerance,''','''      label: "Receipt tolerance (%)",
      hint: "0\\u201320%",
      error: nxE(poErr, "tolerance")
    }, e(ge, {
      min: 0,
      max: 20,
      value: i.tolerance,''',label='po tol')
s=rep(s,'''    }))), w && e(re, {
      tone: "red"
    }, "Quantity exceeds what's left on the blanket order plus the ", l.blanketAllowancePct, "% allowance.")))''','''    }))), poErr.lines && i.lines.some(P => P.desc || P.qty || P.rate) && e(re, {
      tone: "red"
    }, poErr.lines), w && e(re, {
      tone: "red"
    }, "Quantity exceeds what's left on the blanket order plus the ", l.blanketAllowancePct, "% allowance.")))''',label='po lines msg')
# ---- GRN
s=rep(s,'''      p = F(a.lines, c => (Number(c.qty) || 0) - (Number(c.accepted) || 0)),
      m = () => {
        const c = je("GRN", r.purchaseOrders.flatMap(b => b.receipts));''','''      p = F(a.lines, c => (Number(c.qty) || 0) - (Number(c.accepted) || 0)),
      nxAcc = F(a.lines, c => Number(c.accepted) || 0),
      grnErr = {
        date: !a.date ? "Required" : VX.notFuture(a.date, "Receipt date can't be in the future") || (t.date && a.date < t.date ? `Before the PO date (${_(t.date)})` : ""),
        neg: a.lines.some(c => Number(c.accepted) < 0) ? "Accepted quantity can't be negative" : "",
        qc: a.qc === "Passed" && p > 0 ? `Inspection says Passed but ${de(p)} units are rejected \\u2014 choose \\u201CPartially rejected\\u201D` : a.qc === "Failed" && nxAcc > 0 ? "Inspection Failed \\u2014 accepted quantity must be 0" : a.qc === "Partially rejected" && p <= 0 ? "Enter the rejected quantity (accepted < received)" : "",
        reason: p > 0 && VX.blank(a.reason) ? "Required" : "",
        location: p > 0 && VX.blank(a.rejectedLocation) ? "Required" : "",
        accLoc: nxAcc > 0 && VX.blank(a.acceptedLocation) ? "Required" : ""
      },
      m = () => {
        const c = je("GRN", r.purchaseOrders.flatMap(b => b.receipts));''',label='grn err')
s=rep(s,'''      footer: e(z, null, e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: o || i || !a.lines.some(c => c.qty > 0),''','''      footer: e(z, null, nxFix(grnErr), e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: o || i || VX.any(grnErr) || !a.lines.some(c => c.qty > 0),''',label='grn footer')
s=rep(s,'''      label: "Receipt date"
    }, e(Re, {
      value: a.date,''','''      label: "Receipt date",
      required: !0,
      error: nxE(grnErr, "date")
    }, e(Re, {
      max: ke(),
      min: t.date,
      value: a.date,''',label='grn date')
s=rep(s,'''      label: "Quality inspection"
    }, e(ue, {
      value: a.qc,''','''      label: "Quality inspection",
      error: nxE(grnErr, "qc")
    }, e(ue, {
      value: a.qc,''',label='grn qc')
s=rep(s,'''      label: "Rejection reason"
    }, e(ee, {
      value: a.reason,''','''      label: "Rejection reason",
      required: !0
    }, e(ee, {
      value: a.reason,''',label='grn reason')
save(s); print('p15 applied')
