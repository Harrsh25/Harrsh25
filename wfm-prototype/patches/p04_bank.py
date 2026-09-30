import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
# carry new fields through edit / portal profile updates
s=rep(s,'''    for (const n of ["name", "legalName", "type", "supplierType", "categories", "gstin", "pan", "address", "city", "state", "currency", "paymentTerms", "tds", "tier", "group", "parentCompany", "isContractor"]) s[n] !== void 0 && (t[n] = s[n]);''','''    for (const n of ["name", "legalName", "type", "supplierType", "categories", "gstin", "pan", "address", "city", "state", "country", "pin", "website", "taxId", "currency", "paymentTerms", "tds", "tier", "group", "parentCompany", "isContractor"]) s[n] !== void 0 && (t[n] = s[n]);''',label='Ks fields')
s=rep(s,'''    }), !r && s.bank.account && (t.bankAccounts.find(a => a.account === s.bank.account) || (t.bankAccounts.forEach(a => a.isDefault = !1), t.bankAccounts.push({
      id: Date.now(),
      ...s.bank,
      isDefault: !0
    })));''','''    }), !r && s.bank.account && (t.bankAccounts.find(a => a.account === s.bank.account) || (t.bankAccounts.forEach(a => a.isDefault = !1), t.bankAccounts.push({
      id: Date.now(),
      ...s.bank,
      accountType: s.bank.accountType || "Current",
      status: "Unverified",
      isDefault: !0
    })));''',label='Ks bank')
s=rep(s,'''    bank: t.bankAccounts.find(s => s.isDefault) ? {
      bank: t.bankAccounts.find(s => s.isDefault).bank,
      account: t.bankAccounts.find(s => s.isDefault).account,
      ifsc: t.bankAccounts.find(s => s.isDefault).ifsc
    } : {
      bank: "",
      account: "",
      ifsc: ""
    },''','''    bank: t.bankAccounts.find(s => s.isDefault) ? {
      bank: t.bankAccounts.find(s => s.isDefault).bank,
      holder: t.bankAccounts.find(s => s.isDefault).holder || "",
      account: t.bankAccounts.find(s => s.isDefault).account,
      ifsc: t.bankAccounts.find(s => s.isDefault).ifsc
    } : {
      bank: "",
      holder: "",
      account: "",
      ifsc: ""
    },''',label='zs bank')
# rewrite bank tab
start=s.index('  function pi({\n    v: t\n  }) {')
end=s.index('  function mi({\n    v: t\n  }) {')
new_pi='''  const nxBankStatus = a => a.status || "Verified",
    nxNameMatch = (h, v) => {
      const w = x => String(x || "").toLowerCase().replace(/pvt|ltd|private|limited|llp|co\\b|\\.|,/g, " ").split(/\\s+/).filter(z => z.length > 2);
      const H = w(h), N = new Set([...w(v.legalName), ...w(v.name)]);
      return H.length > 0 && H.filter(z => N.has(z)).length / H.length >= .5
    };

  function pi({
    v: t,
    portal: P
  }) {
    const E = {
        holder: t.legalName || t.name || "",
        bank: "",
        account: "",
        ifsc: "",
        accountType: "Current"
      },
      [s, r] = y.useState(E),
      [sub, setSub] = y.useState(!1),
      [rej, setRej] = y.useState(null),
      n = (a, l) => oe(o => a(j(o.vendors, t.id)), {
        entity: "Vendor",
        id: t.id,
        action: l
      }),
      IN = (t.country || "India") === "India",
      er = {
        holder: VX.req(s.holder, "Enter the account holder name"),
        bank: VX.req(s.bank, "Enter the bank name"),
        account: s.account ? VX.acct(s.account) || (t.bankAccounts.some(a => a.account === s.account.replace(/\\s/g, "")) ? "This account is already on file" : "") : "Required",
        ifsc: IN ? s.ifsc ? VX.ifsc(s.ifsc) : "Required" : ""
      },
      bad = VX.any(er),
      chq = (t.docs || []).find(d => /Cheque|Bank Letter/i.test(d.name));
    return e(Y, {
      title: "Bank accounts",
      icon: x.wallet
    }, e(ae, {
      dense: !0,
      rows: t.bankAccounts,
      empty: e("p", {
        className: "p-4 text-[13px] text-ink-mute"
      }, "No bank account on file \\u2014 payments are blocked until one is added."),
      columns: [{
        key: "holder",
        label: "Account holder",
        render: a => a.holder || e("span", {
          className: "text-ink-mute"
        }, "\\u2014")
      }, {
        key: "bank",
        label: "Bank",
        className: "font-medium"
      }, {
        key: "account",
        label: "Account no.",
        className: "mono text-[12px]",
        render: a => "\\u2022\\u2022\\u2022\\u2022 " + a.account.slice(-4)
      }, {
        key: "ifsc",
        label: "IFSC",
        className: "mono text-[12px]"
      }, {
        key: "accountType",
        label: "Type",
        render: a => a.accountType || "Current"
      }, {
        key: "status",
        label: "Verification",
        render: a => e("span", {
          className: "flex flex-col"
        }, e(G, {
          tone: nxBankStatus(a) === "Verified" ? "green" : nxBankStatus(a) === "Rejected" ? "red" : "amber"
        }, nxBankStatus(a)), a.verifiedAt && e("span", {
          className: "text-[11px] text-ink-mute"
        }, a.verifiedBy, " \\xB7 ", _(a.verifiedAt), a.method ? ` \\xB7 ${a.method}` : ""), a.remark && e("span", {
          className: "max-w-[200px] whitespace-normal text-[11px] text-red-600"
        }, a.remark))
      }, {
        key: "d",
        label: "",
        align: "right",
        render: a => e("span", {
          className: "flex justify-end gap-1"
        }, !P && nxBankStatus(a) !== "Verified" && e(M, {
          size: "sm",
          variant: "success",
          onClick: () => {
            const ok = nxNameMatch(a.holder, t);
            n(l => {
              const b = l.bankAccounts.find(o => o.id === a.id);
              Object.assign(b, ok ? {
                status: "Verified",
                remark: "",
                verifiedBy: Ae(),
                verifiedAt: new Date().toISOString(),
                method: "Penny drop \\u2014 name matched"
              } : {
                status: "Rejected",
                remark: `Penny drop: beneficiary name does not match \\u201C${t.legalName||t.name}\\u201D`,
                verifiedBy: Ae(),
                verifiedAt: new Date().toISOString(),
                method: "Penny drop"
              })
            }, ok ? `Bank account \\u2022\\u2022${a.account.slice(-4)} verified (penny drop)` : `Bank account \\u2022\\u2022${a.account.slice(-4)} failed verification \\u2014 name mismatch`), me(ok ? "Bank account verified" : "Verification failed \\u2014 holder name mismatch", ok ? "green" : "red")
          }
        }, "Verify"), !P && nxBankStatus(a) === "Unverified" && e(M, {
          size: "sm",
          variant: "danger",
          onClick: () => setRej(a)
        }, "Reject"), a.isDefault ? e(G, {
          tone: "green"
        }, "Default") : e(z, null, e(M, {
          size: "sm",
          disabled: nxBankStatus(a) === "Rejected",
          title: nxBankStatus(a) === "Rejected" ? "A rejected account can't be the default" : "",
          onClick: () => n(l => l.bankAccounts.forEach(o => o.isDefault = o.id === a.id), `Default bank set to ${a.bank} \\u2022\\u2022${a.account.slice(-4)}`)
        }, "Make default"), e(M, {
          size: "sm",
          variant: "ghost",
          onClick: () => {
            confirm(`Remove ${a.bank} \\u2022\\u2022${a.account.slice(-4)}?`) && (n(l => {
              l.bankAccounts = l.bankAccounts.filter(o => o.id !== a.id)
            }, `Bank account ${a.bank} \\u2022\\u2022${a.account.slice(-4)} removed`), me("Bank account removed"))
          }
        }, "Remove")))
      }]
    }), t.bankAccounts.some(a => a.isDefault && nxBankStatus(a) !== "Verified") && e("div", {
      className: "border-t border-line px-4 py-2"
    }, e(re, {
      tone: "amber"
    }, "The default account is not verified \\u2014 payments show a warning until it is verified.")), e("div", {
      className: "grid grid-cols-[1.2fr_1fr_1fr_140px_130px_auto] items-start gap-3 border-t border-line p-4"
    }, e(L, {
      label: "Account holder",
      required: !0,
      error: sub && er.holder
    }, e(ee, {
      value: s.holder,
      onChange: a => r({
        ...s,
        holder: a
      })
    })), e(L, {
      label: "Bank",
      required: !0,
      error: sub && er.bank
    }, e(ee, {
      value: s.bank,
      onChange: a => r({
        ...s,
        bank: a
      })
    })), e(L, {
      label: "Account no.",
      required: !0,
      error: sub && er.account
    }, e(ee, {
      value: s.account,
      inputMode: "numeric",
      maxLength: 18,
      onChange: a => r({
        ...s,
        account: a.replace(/\\s/g, "")
      })
    })), e(L, {
      label: "IFSC",
      required: IN,
      error: sub && er.ifsc
    }, e(ee, {
      value: s.ifsc,
      onChange: a => r({
        ...s,
        ifsc: a.toUpperCase()
      }),
      maxLength: 11
    })), e(L, {
      label: "Account type"
    }, e(ue, {
      value: s.accountType,
      onChange: a => r({
        ...s,
        accountType: a
      }),
      options: ["Current", "Savings", "Cash credit", "Overdraft"]
    })), e("span", {
      className: "pt-[19px]"
    }, e(M, {
      variant: "primary",
      icon: x.plus,
      onClick: () => {
        if (setSub(!0), bad) return;
        n(a => a.bankAccounts.push({
          id: Date.now(),
          ...s,
          account: s.account.replace(/\\s/g, ""),
          status: "Unverified",
          isDefault: a.bankAccounts.length === 0
        }), `Bank account added (${s.bank} \\u2022\\u2022${s.account.slice(-4)}) \\u2014 pending verification`), me("Bank account added \\u2014 verify it before payments"), r(E), setSub(!1)
      }
    }, "Add"))), e("p", {
      className: "border-t border-line px-4 py-2 text-[11.5px] text-ink-mute"
    }, "Supporting document: ", chq ? e(z, null, chq.name, " \\u2014 ", e(G, null, $t(chq))) : "Cancelled cheque / bank letter not on file", ". Verification runs a penny-drop and matches the beneficiary name to the vendor's legal name."), rej && e(Ma, {
      title: `Reject bank account \\u2022\\u2022${rej.account.slice(-4)}`,
      onClose: () => setRej(null),
      onReject: d => (n(l => {
        const b = l.bankAccounts.find(o => o.id === rej.id);
        Object.assign(b, {
          status: "Rejected",
          remark: d,
          verifiedBy: Ae(),
          verifiedAt: new Date().toISOString()
        })
      }, `Bank account \\u2022\\u2022${rej.account.slice(-4)} rejected \\u2014 ${d}`), me("Bank account rejected", "red"))
    }))
  }

'''
s=s[:start]+new_pi+s[end:]
# payment gate: unverified/rejected default account -> warn (stop if rejected)
s=rep(s,'''n.bankAccounts.some(p => p.isDefault) || a.push("No default bank account"),''','''(() => {
      const Dq = n.bankAccounts.find(p => p.isDefault);
      Dq ? nxBankStatus(Dq) === "Rejected" ? a.push("Default bank account failed verification") : nxBankStatus(Dq) === "Unverified" && l.push("Default bank account not yet verified") : a.push("No default bank account")
    })(),''',label='gate bank')
save(s); print('p04 applied')
