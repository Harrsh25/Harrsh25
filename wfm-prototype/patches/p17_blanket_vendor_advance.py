import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
# ---- blanket order
s=rep(s,'''      b = p.vendorId && p.title && p.lines.every(v => v.desc && v.qty > 0 && v.rate > 0),
      A = v => F(v.lines, I => I.qty * I.rate),''','''      boErr = {
        vendor: p.vendorId ? "" : "Required",
        title: VX.req(p.title),
        start: VX.req(p.start),
        deadline: !p.deadline ? "Required" : p.start && p.deadline <= p.start ? "Must be after the start date" : VX.notPast(p.deadline, "Agreement has already ended"),
        lines: p.lines.map((v, I) => !String(v.desc || "").trim() ? `Line ${I+1}: item required` : !String(v.unit || "").trim() ? `Line ${I+1}: unit required` : !(Number(v.qty) > 0) ? `Line ${I+1}: agreed qty must be greater than 0` : !(Number(v.rate) > 0) ? `Line ${I+1}: rate must be greater than 0` : "").filter(Boolean).join(" \\xB7 "),
        dupe: new Set(p.lines.map(v => String(v.desc || "").trim().toLowerCase()).filter(Boolean)).size !== p.lines.filter(v => String(v.desc || "").trim()).length ? "The same item appears twice" : ""
      },
      b = !VX.any(boErr),
      A = v => F(v.lines, I => I.qty * I.rate),''',label='bo err')
s=rep(s,'''      subtitle: "Rates are fixed for the agreement period; POs are drawn against it",
      footer: e(z, null, e(M, {
        onClick: () => a(!1)
      }, "Cancel"), e(M, {''','''      subtitle: "Rates are fixed for the agreement period; POs are drawn against it",
      footer: e(z, null, nxFix({
        ...boErr,
        lines: boErr.lines && p.lines.some(v => v.desc || v.qty || v.rate) ? "x" : boErr.lines ? "Required" : ""
      }), e(M, {
        onClick: () => a(!1)
      }, "Cancel"), e(M, {''',label='bo footer')
s=rep(s,'''      label: "Agreement deadline"
    }, e(Re, {
      value: p.deadline,''','''      label: "Agreement deadline",
      required: !0,
      error: nxE(boErr, "deadline")
    }, e(Re, {
      min: p.start,
      value: p.deadline,''',label='bo deadline')
s=rep(s,'''    }, "Add line"), e(L, {
      label: "Terms"
    }, e(Ke, {
      rows: 2,
      value: p.terms,''','''    }, "Add line"), (boErr.lines && p.lines.some(v => v.desc || v.qty || v.rate) || boErr.dupe) && e(re, {
      tone: "red"
    }, [boErr.lines, boErr.dupe].filter(Boolean).join(" \\xB7 ")), e(L, {
      label: "Terms"
    }, e(Ke, {
      rows: 2,
      value: p.terms,''',label='bo lines msg')
# ---- vendor advance
s=rep(s,'''      subtitle: "Adjust it later against the vendor's bills",
      footer: e(z, null, e(M, {
        onClick: () => b(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !d.vendorId || !(d.amount > 0),''','''      subtitle: "Adjust it later against the vendor's bills",
      footer: e(z, null, nxFix(nxVAdvErr(d)), e(M, {
        onClick: () => b(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: VX.any(nxVAdvErr(d)),''',label='vadv footer')
s=rep(s,'''            amount: Number(d.amount),
            date: ke(),
            allocated: []''','''            amount: Number(d.amount),
            ref: String(d.ref).trim(),
            date: d.date || ke(),
            allocated: []''',label='vadv save')
s=rep(s,'''    })), e(L, {
      label: "Amount"
    }, e(ge, {
      value: d.amount,
      onChange: w => b({
        ...d,
        amount: w
      })
    })), e(L, {
      label: "Payment reference"
    }, e(ee, {
      value: d.ref,''','''    })), e(L, {
      label: "Amount (\\u20B9)",
      required: !0,
      error: nxE(nxVAdvErr(d), "amount")
    }, e(ge, {
      min: 0,
      value: d.amount,
      onChange: w => b({
        ...d,
        amount: w
      })
    })), e(L, {
      label: "Date paid",
      required: !0,
      error: nxE(nxVAdvErr(d), "date")
    }, e(Re, {
      max: ke(),
      value: d.date || ke(),
      onChange: w => b({
        ...d,
        date: w
      })
    })), e(L, {
      label: "Payment reference",
      required: !0,
      span: 2
    }, e(ee, {
      value: d.ref,''',label='vadv fields')
s=rep(s,'''  function Oi() {
    const t = be(),''','''  function nxVAdvErr(d) {
    const v = d.vendorId && j(Pe().vendors, d.vendorId);
    return {
      vendor: d.vendorId ? "" : "Required",
      amount: VX.num(d.amount, {
        gt: 0,
        label: "Amount"
      }) || (v && v.bankAccounts && !v.bankAccounts.length ? "Vendor has no bank account on file" : ""),
      date: VX.notFuture(d.date || ke(), "Payment date can't be in the future"),
      ref: VX.req(d.ref)
    }
  }

  function Oi() {
    const t = be(),''',label='vadv helper')
save(s); print('p17 applied')
