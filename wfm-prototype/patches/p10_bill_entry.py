import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''            qty: Math.max(0, W(D) - V(T)),
            rate: D.rate
          }))''','''            qty: Math.max(0, W(D) - V(T)),
            max: Math.max(0, W(D) - V(T)),
            poRate: D.rate,
            rate: D.rate
          }))''',label='bill lines')
s=rep(s,'''      [d, b] = y.useState({
        number: "",
        date: ke(),
        gstPct: 18,
        lines: []
      }),
      A = j(n.purchaseOrders, i),''','''      [d, b] = y.useState({
        number: "",
        date: ke(),
        due: "",
        gstPct: 18,
        lines: []
      }),
      A = j(n.purchaseOrders, i),''',label='bill state')
s=rep(s,'''      t && (o("po"), p(r || ""), c(""), b({
        number: "",
        date: ke(),''','''      t && (o("po"), p(r || ""), c(""), b({
        number: "",
        date: ke(),
        due: "",''',label='bill reset')
s=rep(s,'''      P = d.number && I && !dn(I, "Invoices") && (l === "po" ? A && d.lines.some($ => $.qty > 0) && !C : w && d.lines.some($ => $.desc && $.qty > 0 && $.rate > 0)),''','''      nxK = I ? parseInt((I.paymentTerms || "").replace(/\\D/g, ""), 10) || 0 : 0,
      nxDue = d.due || (d.date ? Ne(nxK, d.date) : ""),
      nxLineErr = l === "po" ? d.lines.map(($, k) => VX.blank($.qty) || Number($.qty) < 0 ? `Line ${k+1}: quantity can't be negative` : $.max !== void 0 && Number($.qty) > $.max + 1e-9 ? `Line ${k+1} (${$.desc}): billing ${$.qty}, only ${$.max} is billable` : Number($.qty) > 0 && !(Number($.rate) > 0) ? `Line ${k+1}: rate must be greater than 0` : "").filter(Boolean) : d.lines.map(($, k) => !$.desc && !$.qty && !$.rate ? "" : !String($.desc || "").trim() ? `Line ${k+1}: description required` : !(Number($.qty) > 0) ? `Line ${k+1}: quantity must be greater than 0` : !(Number($.rate) > 0) ? `Line ${k+1}: rate must be greater than 0` : "").filter(Boolean),
      nxDupInv = I && d.number && n.invoices.find($ => $.vendorId === I.id && String($.number).trim().toLowerCase() === String(d.number).trim().toLowerCase()),
      bErr = {
        number: VX.blank(d.number) ? "Required" : nxDupInv ? `Already entered as ${nxDupInv.id} for this vendor` : "",
        date: !d.date ? "Required" : VX.notFuture(d.date, "Invoice date can't be in the future"),
        due: nxDue && d.date && nxDue < d.date ? "Due date can't be before the invoice date" : "",
        lines: nxLineErr.join(" \\xB7 ")
      },
      nxWarn = [l === "po" && A && d.date && A.date && d.date < A.date ? `Invoice date is before the PO date (${_(A.date)})` : "", ...(l === "po" ? d.lines.filter($ => $.poRate && Number($.qty) > 0 && Number($.rate) > $.poRate).map($ => `${$.desc}: billed rate ${Q($.rate)} is above the PO rate ${Q($.poRate)} \\u2014 will fail 3-way match`) : [])].filter(Boolean),
      P = !VX.any(bErr) && d.number && I && !dn(I, "Invoices") && (l === "po" ? A && d.lines.some($ => $.qty > 0) && !C : w && d.lines.some($ => $.desc && $.qty > 0 && $.rate > 0)),''',label='bill err')
s=rep(s,'''          number: d.number,
          date: d.date,
          due: Ne(k, d.date),''','''          number: String(d.number).trim(),
          date: d.date,
          due: nxDue,
          ...d.due ? {
            dueOverride: {
              by: Ae(),
              default: Ne(k, d.date)
            }
          } : {},''',label='bill save')
s=rep(s,'''      title: "Enter vendor bill",
      subtitle: a.poRequiredForBill ? "PO required for bills (Procurement Settings) unless the vendor is exempt" : "Bills can be entered with or without a PO",
      footer: e(z, null, e(M, {''','''      title: "Enter vendor bill",
      subtitle: a.poRequiredForBill ? "PO required for bills (Procurement Settings) unless the vendor is exempt" : "Bills can be entered with or without a PO",
      footer: e(z, null, nxFix({
        ...bErr,
        lines: bErr.lines ? "x" : ""
      }), e(M, {''',label='bill footer')
s=rep(s,'''      label: "Vendor invoice no.",
      required: !0
    }, e(ee, {''','''      label: "Vendor invoice no.",
      required: !0,
      error: nxE(bErr, "number")
    }, e(ee, {''',label='bill no')
s=rep(s,'''      label: "Invoice date"
    }, e(Re, {
      value: d.date,
      onChange: $ => b({
        ...d,
        date: $
      })
    }))), I && dn(I, "Invoices")''','''      label: "Invoice date",
      required: !0,
      error: nxE(bErr, "date")
    }, e(Re, {
      value: d.date,
      max: ke(),
      onChange: $ => b({
        ...d,
        date: $
      })
    })), e(L, {
      label: "Due date",
      hint: I ? d.due ? e("button", {
        type: "button",
        className: "text-brand",
        onClick: () => b({
          ...d,
          due: ""
        })
      }, "Reset to ", I.paymentTerms || "terms") : `${I.paymentTerms||"Immediate"} from invoice date` : "From vendor payment terms",
      error: nxE(bErr, "due")
    }, e(Re, {
      value: nxDue,
      min: d.date,
      onChange: $ => b({
        ...d,
        due: $
      })
    }))), bErr.lines && e(re, {
      tone: "red"
    }, bErr.lines), nxWarn.length > 0 && e(re, {
      tone: "amber"
    }, nxWarn.join(" \\xB7 ")), I && dn(I, "Invoices")''',label='bill date/due')
save(s); print('p10 applied')
