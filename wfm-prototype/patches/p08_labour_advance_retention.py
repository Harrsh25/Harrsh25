import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
# ---- retention release
s=rep(s,'''        v = b ? b.retentionBalance - F(t.retentionReleases.filter(I => I.contractId === d.id && I.status !== "Released"), I => I.amount) : 0;
      return e(we, {''','''        v = b ? b.retentionBalance - F(t.retentionReleases.filter(I => I.contractId === d.id && I.status !== "Released"), I => I.amount) : 0,
        rrErr = {
          contract: d ? "" : "Required",
          amount: VX.num(n.amount, {
            gt: 0,
            label: "Amount"
          }) || (d && Number(n.amount) > v + .5 ? `Exceeds available retention (${Q(Math.max(0,v))})` : ""),
          dlp: u ? "DLP not over" : "",
          note: n.type === "Against bank guarantee" && VX.blank(n.note) ? "Enter the BG number / reference" : ""
        };
      return e(we, {''',label='rr err')
s=rep(s,'''        title: "Request retention release",
        footer: e(z, null, e(M, {
          onClick: () => a(null)
        }, "Cancel"), e(M, {
          variant: "primary",
          disabled: !d || !(n.amount > 0) || n.amount > v + .5 || u,''','''        title: "Request retention release",
        footer: e(z, null, nxFix({
          ...rrErr,
          dlp: ""
        }), e(M, {
          onClick: () => a(null)
        }, "Cancel"), e(M, {
          variant: "primary",
          disabled: VX.any(rrErr),''',label='rr footer')
s=rep(s,'''        label: "Amount (\\u20B9)",
        hint: d ? `Available ${Q(v)}` : ""
      }, e(ge, {
        value: n.amount,''','''        label: "Amount (\\u20B9)",
        hint: d ? `Available ${Q(v)}` : "",
        error: nxE(rrErr, "amount")
      }, e(ge, {
        min: 0,
        value: n.amount,''',label='rr amount')
s=rep(s,'''        label: "Note",
        span: 2
      }, e(ee, {
        value: n.note,
        onChange: I => a({''','''        label: n.type === "Against bank guarantee" ? "BG reference" : "Note",
        required: n.type === "Against bank guarantee",
        span: 2,
        error: nxE(rrErr, "note")
      }, e(ee, {
        value: n.note,
        onChange: I => a({''',label='rr note')
# ---- contractor advance
s=rep(s,'''    })(), l && e(we, {
      open: !0,
      onClose: () => o(null),
      width: 520,
      title: "Record advance paid to contractor",''','''    })(), l && (() => {
      const nxC = j(t.contracts, l.contractId),
        nxCap = nxC && l.type === "Mobilisation advance" && nxC.advancePct > 0 ? Tt(nxC) * nxC.advancePct / 100 - (nxC.advanceAmount || 0) : null,
        adErr = {
          contract: nxC ? "" : "Required",
          amount: VX.num(l.amount, {
            gt: 0,
            label: "Amount"
          }) || (nxC && Number(l.amount) > Tt(nxC) ? "Advance can't exceed the contract value" : nxCap !== null && Number(l.amount) > nxCap + .5 ? `Exceeds the contract's ${nxC.advancePct}% mobilisation advance (${Q(Math.max(0,nxCap))} left)` : ""),
          date: !l.date ? "Required" : VX.notFuture(l.date, "Payment date can't be in the future") || (nxC && nxC.start && l.date < Ne(-90, nxC.start) ? "More than 90 days before the contract start" : ""),
          ref: VX.blank(l.ref) ? "Required" : ""
        };
      return e(we, {
      open: !0,
      onClose: () => o(null),
      width: 520,
      title: "Record advance paid to contractor",''',label='ad wrap')
s=rep(s,'''      footer: e(z, null, e(M, {
        onClick: () => o(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !l.contractId || !(l.amount > 0),''','''      footer: e(z, null, nxFix(adErr), e(M, {
        onClick: () => o(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: VX.any(adErr),''',label='ad footer')
s=rep(s,'''            action: `${l.type} of ${Q(l.amount)} recorded (${l.ref||"no ref"})`''','''            action: `${l.type} of ${Q(l.amount)} paid ${_(l.date)} recorded (${l.ref})`''',label='ad audit')
s=rep(s,'''    })), e(L, {
      label: "Amount (\\u20B9)"
    }, e(ge, {
      value: l.amount,
      onChange: d => o({
        ...l,
        amount: d
      })
    })), e(L, {
      label: "Date"
    }, e(Re, {
      value: l.date,''','''    })), e(L, {
      label: "Amount (\\u20B9)",
      required: !0,
      hint: nxCap !== null ? `Up to ${Q(Math.max(0,nxCap))} (${nxC.advancePct}% of value)` : "",
      error: nxE(adErr, "amount")
    }, e(ge, {
      min: 0,
      value: l.amount,
      onChange: d => o({
        ...l,
        amount: d
      })
    })), e(L, {
      label: "Date paid",
      required: !0,
      error: nxE(adErr, "date")
    }, e(Re, {
      max: ke(),
      value: l.date,''',label='ad amount/date')
s=rep(s,'''    })), e(L, {
      label: "Payment ref / BG no."
    }, e(ee, {
      value: l.ref,
      onChange: d => o({
        ...l,
        ref: d
      })
    })))))
  }''','''    })), e(L, {
      label: "Payment ref / BG no.",
      required: !0
    }, e(ee, {
      value: l.ref,
      onChange: d => o({
        ...l,
        ref: d
      })
    }))))
    })())
  }''',label='ad end')
# ---- labour rate
s=rep(s,'''      l = n.trade && n.minWage > 0 && n.rate > 0 && n.effectiveFrom && (!t || n.reason);''','''      lrErr = {
        trade: VX.req(n.trade),
        minWage: VX.num(n.minWage, {
          gt: 0,
          label: "Minimum wage"
        }),
        rate: VX.num(n.rate, {
          gt: 0,
          label: "Rate"
        }) || (Number(n.minWage) > 0 && Number(n.rate) < Number(n.minWage) ? "Billing rate can't be below the statutory minimum wage" : ""),
        ot: VX.num(n.otMultiplier, {
          min: 1,
          max: 3,
          label: "OT multiplier"
        }),
        effectiveFrom: !n.effectiveFrom ? "Required" : t ? (n.effectiveFrom <= t.effectiveFrom ? `Must be after the current version's start (${_(t.effectiveFrom)})` : "") : "",
        reason: t ? VX.req(n.reason) : "",
        dup: !t && r.laborRates.some(p => ["Active", "Pending Approval"].includes(p.status) && Pt(p) === Pt({
          ...n,
          vendorId: n.vendorId || null
        })) ? "A rate card for this trade, zone and contractor already exists \\u2014 use Revise" : ""
      },
      l = !VX.any(lrErr);''',label='lr err')
s=rep(s,'''      subtitle: "New versions go for approval; the approved one supersedes the current card from its effective date",
      footer: e(z, null, e(M, {
        onClick: s
      }, "Cancel"), e(M, {''','''      subtitle: "New versions go for approval; the approved one supersedes the current card from its effective date",
      footer: e(z, null, nxFix(lrErr), e(M, {
        onClick: s
      }, "Cancel"), e(M, {''',label='lr footer')
s=rep(s,'''      label: "Statutory minimum wage / day (\\u20B9)",
      required: !0
    }, e(ge, {''','''      label: "Statutory minimum wage / day (\\u20B9)",
      required: !0,
      error: nxE(lrErr, "minWage")
    }, e(ge, {
      min: 0,''',label='lr min')
s=rep(s,'''      hint: n.minWage && n.rate ? `${Un(n).toFixed(1)}% over minimum wage` : ""
    }, e(ge, {''','''      hint: n.minWage && n.rate ? `${Un(n).toFixed(1)}% over minimum wage` : "",
      error: nxE(lrErr, "rate")
    }, e(ge, {
      min: 0,''',label='lr rate')
s=rep(s,'''      label: "Overtime multiplier"
    }, e(ge, {''','''      label: "Overtime multiplier",
      hint: "1\\u20133 (Factories Act: 2\\xD7)",
      error: nxE(lrErr, "ot")
    }, e(ge, {
      min: 1,
      max: 3,
      step: .25,''',label='lr ot')
s=rep(s,'''      label: "Effective from"
    }, e(Re, {
      value: n.effectiveFrom,''','''      label: "Effective from",
      required: !0,
      error: nxE(lrErr, "effectiveFrom")
    }, e(Re, {
      min: t ? Ne(1, t.effectiveFrom) : void 0,
      value: n.effectiveFrom,''',label='lr eff')
s=rep(s,'''      placeholder: "e.g. VDA notification w.e.f. 1 Oct"
    }))), n.minWage > 0 && n.rate > 0 && n.rate < n.minWage && e("div", {
      className: "mt-3"
    }, e(re, {
      tone: "red"
    }, "Billing rate is below the statutory minimum wage \\u2014 this card will be flagged non-compliant.")))''','''      placeholder: "e.g. VDA notification w.e.f. 1 Oct"
    }))), lrErr.dup && e("div", {
      className: "mt-3"
    }, e(re, {
      tone: "amber"
    }, lrErr.dup)))''',label='lr dup')
save(s); print('p08 applied')
