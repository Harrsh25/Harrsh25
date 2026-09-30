import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,''', v = u > 0 && t.items.every((f, C) => i.noBid[C] || Number(i.rates[C]) > 0) && i.validUntil && m, I = async f => {''',''', qErr = {
      lines: t.items.map((f, C) => i.noBid[C] ? "" : i.rates[C] !== "" && !(Number(i.rates[C]) > 0) ? `Line ${C+1}: rate must be greater than 0` : VX.pct(i.discounts[C], {
        optional: !0,
        label: "Discount"
      }) ? `Line ${C+1}: discount must be 0\\u2013100%` : VX.num(i.leadDays[C], {
        min: 0,
        max: 365,
        int: !0,
        label: "Lead days"
      }) ? `Line ${C+1}: lead days must be a whole number 0\\u2013365` : "").filter(Boolean).join(" \\xB7 "),
      fx: i.currency === "INR" ? "" : VX.num(i.fx, {
        gt: 0,
        label: "Exchange rate"
      }),
      validUntil: !i.validUntil ? "Required" : VX.notPast(i.validUntil, "Validity can't be in the past") || (t.dueDate && i.validUntil < t.dueDate ? `Must be valid at least until the RFQ closes (${_(t.dueDate)})` : "")
    }, v = u > 0 && !VX.any(qErr) && t.items.every((f, C) => i.noBid[C] || Number(i.rates[C]) > 0) && i.validUntil && m, I = async f => {''',label='q err')
s=rep(s,'''    }, i.currency, " ", de(A * (1 + i.gstPct / 100))), e(U, null), e(U, null))))), e("div", {
      className: "grid grid-cols-5 gap-3"
    }, e(L, {''','''    }, i.currency, " ", de(A * (1 + i.gstPct / 100)), i.currency !== "INR" && Number(i.fx) > 0 && e("span", {
      className: "block text-[11px] font-normal text-ink-mute"
    }, "\\u2248 ", Q(A * (1 + i.gstPct / 100) * Number(i.fx)))), e(U, null), e(U, null))))), qErr.lines && e(re, {
      tone: "red"
    }, qErr.lines), e("div", {
      className: "grid grid-cols-5 gap-3"
    }, e(L, {''',label='q total')
s=rep(s,'''      options: ["INR", "USD", "EUR", "AED"]
    })), e(L, {
      label: "GST %"
    }, e(ue, {
      value: String(i.gstPct),''','''      options: ["INR", "USD", "EUR", "AED"]
    })), i.currency !== "INR" && e(L, {
      label: `Exchange rate (\\u20B9 per ${i.currency})`,
      required: !0,
      hint: "Used to compare and award in INR",
      error: nxE(qErr, "fx")
    }, e(ge, {
      value: i.fx,
      min: 0,
      step: .01,
      onChange: f => p({
        ...i,
        fx: f
      })
    })), e(L, {
      label: "GST %"
    }, e(ue, {
      value: String(i.gstPct),''',label='q fx')
s=rep(s,'''      label: "Valid until",
      required: !0
    }, e(Re, {
      value: i.validUntil,''','''      label: "Valid until",
      required: !0,
      error: nxE(qErr, "validUntil")
    }, e(Re, {
      min: ke(),
      value: i.validUntil,''',label='q valid')
s=rep(s,'''    }) : e("span", null), e(M, {
      variant: "primary",
      icon: x.send,
      disabled: !v,
      onClick: w''','''    }) : e("span", null), nxFix({
      ...qErr,
      lines: qErr.lines ? "x" : ""
    }), e(M, {
      variant: "primary",
      icon: x.send,
      disabled: !v,
      onClick: w''',label='q footer')
save(s); print('p13 applied')
