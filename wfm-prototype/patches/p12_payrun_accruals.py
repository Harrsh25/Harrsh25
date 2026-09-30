import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
# accruals helper (module level, before $i)
s=rep(s,'''  function $i() {
    const t = be(),
      [s, r] = Lt(),
      [n, a] = y.useState([]),''','''  // Accruals: goods received but not billed (PO) + JMS-signed measurements not yet on an RA bill
  function nxAccruals(t) {
    const g = [];
    for (const k of t.purchaseOrders.filter(k => !["Draft", "Cancelled"].includes(k.status))) St(k).forEach((D, T) => {
      const billed = F(t.invoices.filter(q => q.poId === k.id).flatMap(q => q.lines.filter(E => E.line === T)), q => q.qty),
        un = Math.max(0, D.accepted - billed);
      un > 1e-9 && g.push({
        id: `${k.id}-${T}`,
        src: "Goods received, not billed",
        ref: k.id,
        vendorId: k.vendorId,
        project: k.project,
        desc: D.desc,
        qty: un,
        unit: D.unit,
        rate: D.rate,
        amount: Oe(un * D.rate),
        since: k.receipts.filter(q => q.lines.some(E => E.line === T)).map(q => q.date).sort()[0]
      })
    });
    for (const w of t.measurements.filter(w => w.jms && w.jms.status === "Signed" && !w.billedIn)) {
      const o = j(t.workOrders, w.woId);
      if (!o || o.type === "Lump Sum") continue;
      const it = o.items.find(C => C.id === w.lineId);
      it && g.push({
        id: w.id,
        src: "Work measured (JMS signed), not billed",
        ref: `${w.id} / ${o.id}`,
        vendorId: o.vendorId,
        project: o.project,
        desc: it.desc,
        qty: w.qty,
        unit: it.unit,
        rate: it.rate,
        amount: Oe(w.qty * it.rate),
        since: w.date
      })
    }
    return g
  }

  function nxAccrualDlg({
    onClose: s
  }) {
    const t = be(),
      g = nxAccruals(t);
    return e(we, {
      open: !0,
      onClose: s,
      width: 980,
      title: "Accruals \\u2014 received / measured, not yet billed",
      subtitle: "Month-end liability to accrue. Clears automatically when the vendor bill or RA bill is entered.",
      footer: e(z, null, e("span", {
        className: "mr-auto text-[13px]"
      }, g.length, " lines \\xB7 total ", e("b", {
        className: "num"
      }, Q(F(g, a => a.amount)))), e(M, {
        onClick: s
      }, "Close"))
    }, g.length ? e("table", {
      className: "w-full"
    }, e("thead", null, e("tr", null, e(ne, null, "Source"), e(ne, null, "Reference"), e(ne, null, "Vendor / contractor"), e(ne, null, "Item"), e(ne, {
      align: "right"
    }, "Qty"), e(ne, {
      align: "right"
    }, "Rate"), e(ne, {
      align: "right"
    }, "Accrue"), e(ne, null, "Since"))), e("tbody", null, g.map(a => e("tr", {
      key: a.id
    }, e(U, null, e(G, {
      tone: a.src.startsWith("Goods") ? "blue" : "purple"
    }, a.src.startsWith("Goods") ? "GRN" : "Measurement")), e(U, {
      className: "mono text-[12px]"
    }, a.ref), e(U, null, Z(t, a.vendorId)), e(U, {
      className: "max-w-[240px] whitespace-normal"
    }, a.desc), e(U, {
      align: "right",
      className: "num"
    }, +a.qty.toFixed(3), " ", a.unit || ""), e(U, {
      align: "right",
      className: "num"
    }, Q(a.rate)), e(U, {
      align: "right",
      className: "num font-semibold"
    }, Q(a.amount)), e(U, null, a.since ? _(a.since) : "\\u2014"))))) : e(re, {
      tone: "green"
    }, "Nothing to accrue \\u2014 every receipt and signed measurement has been billed."))
  }

  function $i() {
    const t = be(),
      [s, r] = Lt(),
      [n, a] = y.useState([]),
      [nxAcc, nxSetAcc] = y.useState(!1),''',label='accr helper')
s=rep(s,'''      }, "Record advance"), e(M, {
        icon: x.plus,
        onClick: () => p(!0)
      }, "Enter vendor bill"), e(M, {
        variant: "primary",
        icon: x.rupee,
        disabled: !n.length,
        onClick: () => o(!0)
      }, "Payment run", n.length ? ` (${n.length})` : ""))''','''      }, "Record advance"), e(M, {
        onClick: () => nxSetAcc(!0)
      }, "Accruals"), e(M, {
        icon: x.plus,
        onClick: () => p(!0)
      }, "Enter vendor bill"), e(M, {
        onClick: () => {
          if (n.length) return a([]);
          const w = t.invoices.filter(f => !["Paid", "On Hold"].includes(dt(f)) && De(f).balance > .5 && An(t, f).stops.length === 0 && ie((Vs(f) || f).due) <= 7).map(f => f.id);
          a(w), me(w.length ? `${w.length} bill(s) due within 7 days and clear of payment checks selected` : "No bills are due and clear to pay", w.length ? void 0 : "amber")
        }
      }, n.length ? "Clear selection" : "Select payable"), e(M, {
        variant: "primary",
        icon: x.rupee,
        disabled: !n.length,
        onClick: () => o(!0)
      }, "Payment run", n.length ? ` (${n.length})` : ""))''',label='payrun btns')
save(s); print('p12 applied')
s=load()
s=rep(s,'''    }), l && e(Oa, {
      invIds: n,
      onClose: () => {
        o(!1), a([])
      }
    }), e(Es, {''','''    }), nxAcc && e(nxAccrualDlg, {
      onClose: () => nxSetAcc(!1)
    }), l && e(Oa, {
      invIds: n,
      onClose: () => {
        o(!1), a([])
      }
    }), e(Es, {''',label='accr render')
save(s); print('p12b applied')
