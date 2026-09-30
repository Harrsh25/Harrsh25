import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''  typeof window < "u" && (window.__NX_VX = VX);''','''  typeof window < "u" && (window.__NX_VX = VX);
  // inline error (hide plain "Required" until the user has typed something) + footer summary
  const nxE = (er, k) => er[k] && er[k] !== "Required" ? er[k] : "",
    nxFix = er => {
      const n = VX.count(er),
        m = Object.values(er).filter(v => v && v !== "Required").length;
      return n ? e("span", {
        role: "alert",
        className: "mr-auto text-[12px] text-red-600"
      }, m ? `Fix ${m} field${m>1?"s":""}` : "", m && n > m ? " and " : "", n > m ? `fill ${n-m} required field${n-m>1?"s":""}` : "", " to continue") : null
    };''',label='helpers')
# ---- Create contract
s=rep(s,'''      p = Bn(n).filter(d => d.status === "Active" && d.regTier === "Spend Authorized"),
      m = l.vendorId && l.title && l.value > 0 && l.end > l.start,''','''      p = Bn(n).filter(d => d.status === "Active" && d.regTier === "Spend Authorized"),
      er = {
        vendorId: VX.req(l.vendorId),
        title: VX.req(l.title),
        value: VX.amount(l.value, {
          gt: 0,
          label: "Contract value"
        }),
        end: VX.req(l.end) || (l.end <= l.start ? "Completion date must be after the start date" : ""),
        retentionPct: VX.pct(l.retentionPct),
        advancePct: VX.pct(l.advancePct),
        advanceRecoveryPct: VX.pct(l.advanceRecoveryPct) || (Number(l.advancePct) > 0 && !(Number(l.advanceRecoveryPct) > 0) ? "Set a recovery % when an advance is given" : ""),
        cessPct: VX.num(l.cessPct, {
          min: 0,
          max: 10,
          label: "Cess %"
        }),
        dlpMonths: VX.num(l.dlpMonths, {
          min: 0,
          max: 120,
          int: !0,
          label: "DLP"
        }),
        ldPctPerWeek: VX.num(l.ldPctPerWeek, {
          min: 0,
          max: 10,
          label: "LD per week"
        }),
        ldCapPct: VX.pct(l.ldCapPct) || (Number(l.ldCapPct) < Number(l.ldPctPerWeek) ? "LD cap can't be lower than the weekly LD" : ""),
        bgExpiry: l.bgNo && !l.bgExpiry ? "Enter the BG expiry date" : VX.dateOrder(l.start, l.bgExpiry, "BG must be valid beyond the contract start")
      },
      m = !VX.any(er),''',label='contract errs')
s=rep(s,'''      footer: e(z, null, e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        disabled: !m,
        onClick: () => c(!1)
      }, "Save draft"), e(M, {
        variant: "primary",
        disabled: !m,
        onClick: () => c(!0)
      }, "Sign & activate"))''','''      footer: e(z, null, nxFix(er), e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        disabled: !m,
        onClick: () => c(!1)
      }, "Save draft"), e(M, {
        variant: "primary",
        disabled: !m,
        onClick: () => c(!0)
      }, "Sign & activate"))''',label='contract footer')
for lab,key in [('Contract value (\\u20B9, excl. GST)','value'),('Completion date','end'),('Retention (%)','retentionPct'),('Advance recovery per bill (%)','advanceRecoveryPct'),('Labour welfare cess (%)','cessPct'),('Defect liability (months)','dlpMonths'),('LD per week (%)','ldPctPerWeek'),('LD cap (%)','ldCapPct'),('BG valid till','bgExpiry')]:
    s=rep(s,f'''      label: "{lab}"''',f'''      label: "{lab}",
      error: nxE(er, "{key}")''',label='contract lab '+key) if s.count(f'''      label: "{lab}"''')==1 else s
s=rep(s,'''      label: "Mobilisation advance (%)",
      hint: l.value ? J(l.value * (l.advancePct || 0) / 100) : ""''','''      label: "Mobilisation advance (%)",
      error: nxE(er, "advancePct"),
      hint: l.value ? J(l.value * (l.advancePct || 0) / 100) : ""''',label='adv')
# ---- Change order
s=rep(s,'''      footer: e(z, null, e(M, {
        onClick: () => l(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !a.desc || !a.amount,
        onClick: () => {
          const v = `CO-${String(n.changeOrders.length+1).padStart(3,"0")}`;''','''      footer: e(z, null, nxFix(nxCO(a, n)), e(M, {
        onClick: () => l(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: VX.any(nxCO(a, n)),
        onClick: () => {
          const v = `CO-${String(n.changeOrders.length+1).padStart(3,"0")}`;''',label='co footer')
s=rep(s,'''    }, e(L, {
      label: "Change description",
      span: 2
    }, e(ee, {''','''    }, e(L, {
      label: "Change description",
      required: !0,
      span: 2
    }, e(ee, {''',label='co desc')
s=rep(s,'''      label: "Value (\\u20B9, can be negative)"
    }, e(ge, {''','''      label: "Value (\\u20B9, can be negative)",
      required: !0,
      error: nxE(nxCO(a, n), "amount")
    }, e(ge, {''',label='co val')
s=rep(s,'''      label: "Time extension (days)"
    }, e(ge, {''','''      label: "Time extension (days)",
      error: nxE(nxCO(a, n), "days")
    }, e(ge, {''',label='co days')
s=rep(s,'''      label: "Reason / instruction ref.",
      span: 2
    }, e(ee, {''','''      label: "Reason / instruction ref.",
      required: !0,
      span: 2
    }, e(ee, {''',label='co reason')
s=rep(s,'''  function dr({
    id: t,
    onClose: s
  }) {''','''  const nxCO = (a, n) => {
    const cur = Tt(n);
    return {
      desc: VX.req(a.desc),
      amount: VX.num(a.amount, {
        label: "Value"
      }) || (Number(a.amount) === 0 ? "Enter a non-zero value" : "") || (cur + Number(a.amount) < 0 ? `Would make the contract value negative (current ${J(cur)})` : ""),
      days: VX.num(a.days, {
        min: 0,
        max: 3650,
        int: !0,
        label: "Extension",
        optional: !0
      }),
      reason: VX.req(a.reason)
    }
  };

  function dr({
    id: t,
    onClose: s
  }) {''',label='nxCO def')
# ---- Extend / renew
s=rep(s,'''        variant: "primary",
        disabled: !o.note || o.end <= n.end,''','''        variant: "primary",
        disabled: !o.note || !o.end || o.end <= n.end,''',label='ext btn')
s=rep(s,'''      label: "New completion date"
    }, e(Re, {
      value: o.end,''','''      label: "New completion date",
      required: !0,
      error: o.end && o.end <= n.end ? `Must be after the current completion date (${_(n.end)})` : ""
    }, e(Re, {
      value: o.end,
      min: Ne(1, n.end),''',label='ext date')
s=rep(s,'''      label: "Reason"
    }, e(ee, {
      value: o.note,''','''      label: "Reason",
      required: !0
    }, e(ee, {
      value: o.note,''',label='ext reason')
save(s); print('p05 applied')
