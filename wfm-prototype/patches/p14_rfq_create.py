import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''      c = l.title && m.length > 0 && l.vendorIds.length >= (l.mode === "Single Vendor" ? 1 : 2) && (l.mode !== "Single Vendor" || l.vendorIds.length === 1),''','''      nxW = F(["price", "quality", "delivery"], A => Number(l.weights[A]) || 0),
      rfqErr = {
        title: VX.req(l.title),
        dueDate: !l.dueDate ? "Required" : l.dueDate <= ke() ? "Quotes due date must be in the future" : "",
        lines: l.items.map((A, u) => !A.desc && (A.qty === "" || A.qty == null) ? "" : !String(A.desc || "").trim() ? `Line ${u+1}: description required` : !(Number(A.qty) > 0) ? `Line ${u+1}: quantity must be greater than 0` : !String(A.unit || "").trim() ? `Line ${u+1}: unit required` : !A.requiredBy ? `Line ${u+1}: required-by date missing` : l.dueDate && A.requiredBy < l.dueDate ? `Line ${u+1}: required by ${_(A.requiredBy)} is before quotes are due` : "").filter(Boolean).join(" \\xB7 "),
        noLines: m.length ? "" : "Required",
        weights: ["price", "quality", "delivery"].some(A => VX.pct(l.weights[A])) ? "Each weight must be 0\\u2013100" : Math.abs(nxW - 100) > .01 ? `Weights total ${nxW}% \\u2014 must be 100%` : "",
        vendors: l.mode === "Single Vendor" ? l.vendorIds.length === 1 ? "" : "Required" : l.vendorIds.length >= 2 ? "" : "Invite at least two vendors"
      },
      c = !VX.any(rfqErr) && l.title && m.length > 0 && l.vendorIds.length >= (l.mode === "Single Vendor" ? 1 : 2) && (l.mode !== "Single Vendor" || l.vendorIds.length === 1),''',label='rfq err')
s=rep(s,'''      title: "New request for quotation",
      footer: e(z, null, e(M, {''','''      title: "New request for quotation",
      footer: e(z, null, nxFix({
        ...rfqErr,
        lines: rfqErr.lines ? "x" : "",
        vendors: rfqErr.vendors && l.vendorIds.length ? rfqErr.vendors : rfqErr.vendors ? "Required" : ""
      }), e(M, {''',label='rfq footer')
s=rep(s,'''      label: "Quotes due (order deadline)"
    }, e(Re, {
      value: l.dueDate,''','''      label: "Quotes due (order deadline)",
      required: !0,
      error: nxE(rfqErr, "dueDate")
    }, e(Re, {
      min: Ne(1),
      value: l.dueDate,''',label='rfq due')
s=rep(s,'''    }), e(Re, {
      value: A.requiredBy,
      onChange: v => p(u, "requiredBy", v)
    }), e(kt, {''','''    }), e(Re, {
      value: A.requiredBy,
      min: l.dueDate,
      onChange: v => p(u, "requiredBy", v)
    }), e(kt, {''',label='rfq reqby')
s=rep(s,'''        items: l.items.filter((v, I) => I !== u)
      })
    }))))), e(L, {
      label: l.mode === "Single Vendor" ? "Vendor (exactly one)" : "Invite vendors (at least two)",''','''        items: l.items.filter((v, I) => I !== u)
      })
    }))), rfqErr.lines && e(re, {
      tone: "red"
    }, rfqErr.lines))), e(L, {
      label: l.mode === "Single Vendor" ? "Vendor (exactly one)" : "Invite vendors (at least two)",''',label='rfq lines msg')
s=rep(s,'''    }))))))
  }
  const ns = (t, s) => `Dear ${s.contact.name},''','''    })))), rfqErr.weights && e("p", {
      role: "alert",
      className: "text-[12px] text-red-600"
    }, rfqErr.weights)))
  }
  const ns = (t, s) => `Dear ${s.contact.name},''',label='rfq weights msg')
save(s); print('p14 applied')
