import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''      address: "",
      city: "",
      state: "Maharashtra",
      currency: "INR",''','''      address: "",
      city: "",
      state: "Maharashtra",
      country: "India",
      pin: "",
      website: "",
      taxId: "",
      currency: "INR",''',label='Yt defaults')
s=rep(s,'''      bank: {
        bank: "",
        account: "",
        ifsc: ""
      },
      contractor: {
        labourLicence: "",''','''      bank: {
        bank: "",
        holder: "",
        account: "",
        ifsc: ""
      },
      contractor: {
        labourLicence: "",''',label='Yt bank')
old='''  function Ps(t) {
    const s = {};
    t.name.trim() || (s.name = "Required"), ga.test(t.gstin.trim().toUpperCase()) || (s.gstin = "Enter a valid 15-character GSTIN"), Ss.test(t.pan.trim().toUpperCase()) ? ga.test(t.gstin.trim().toUpperCase()) && t.gstin.toUpperCase().slice(2, 12) !== t.pan.toUpperCase() && (s.pan = "PAN doesn't match GSTIN") : s.pan = "Enter a valid PAN (ABCDE1234F)";
    const r = Rs(t).gstin;
    return r && (s.gstin = `Already registered as ${r.id} \\u2014 ${r.name}`), t.contact.name.trim() || (s.contactName = "Required"), Dn.test(t.contact.email) || (s.email = "Enter a valid email"), t.categories.length || (s.categories = "Pick at least one category"), s
  }'''
new='''  function Ps(t) {
    const s = {},
      IN = (t.country || "India") === "India";
    t.name.trim() || (s.name = "Required"), IN ? (ga.test(t.gstin.trim().toUpperCase()) || (s.gstin = "Enter a valid 15-character GSTIN"), Ss.test(t.pan.trim().toUpperCase()) ? ga.test(t.gstin.trim().toUpperCase()) && t.gstin.toUpperCase().slice(2, 12) !== t.pan.toUpperCase() && (s.pan = "PAN doesn't match GSTIN") : s.pan = "Enter a valid PAN (ABCDE1234F)") : (t.taxId || "").trim().length < 5 && (s.taxId = "Enter the tax / VAT registration number");
    const r = IN && Rs(t).gstin;
    r && (s.gstin = `Already registered as ${r.id} \\u2014 ${r.name}`), t.contact.name.trim() || (s.contactName = "Required"), Dn.test(t.contact.email) || (s.email = "Enter a valid email"), t.categories.length || (s.categories = "Pick at least one category");
    const P = (k, v) => v && (s[k] = v);
    P("phone", VX.phone(t.contact.phone)), P("pin", VX.pin(t.pin, t.country || "India")), P("website", VX.url(t.website));
    const B = t.bank || {};
    if (B.account || B.ifsc || B.holder) P("bankAccount", B.account ? VX.acct(B.account) : "Required when adding bank details"), P("bankIfsc", IN ? B.ifsc ? VX.ifsc(B.ifsc) : "Required" : ""), P("bankHolder", (B.holder || "").trim() ? "" : "Enter the account holder name as per bank records");
    if (t.type === "Labor" || t.isContractor) {
      const c = t.contractor || {};
      P("clra", VX.clra(c.labourLicence)), P("pf", VX.pf(c.pfCode)), P("esi", VX.esi(c.esiCode)), P("workforce", VX.num(c.workforce, {
        min: 1,
        max: 1e5,
        int: !0,
        label: "Workforce",
        optional: !0
      })), P("experience", VX.num(c.experienceYrs, {
        min: 0,
        max: 100,
        label: "Experience",
        optional: !0
      })), P("licenceExpiry", c.labourLicence && !c.licenceExpiry ? "Enter the licence expiry date" : VX.notPast(c.licenceExpiry, "Licence has already expired"))
    }
    const U = t.uploads || {};
    for (const [k, v] of Object.entries(U)) v && v.error && (s.docs = `${k}: ${v.error}`), v && v.file && v.expiry && v.expiry < ke() && (s.docs = `${k}: expiry date is in the past`);
    return s
  }'''
s=rep(s,old,new,label='Ps')
s=rep(s,'''        bankAccounts: t.bank.account ? [{
          id: 1,
          ...t.bank,
          isDefault: !0
        }] : [],
        approval: {
          stages: Kn.map((o, i) => ({''','''        bankAccounts: t.bank.account ? [{
          id: 1,
          ...t.bank,
          accountType: "Current",
          status: "Unverified",
          isDefault: !0
        }] : [],
        approval: {
          stages: nxStages().map((o, i) => ({''',label='As bank')
s=rep(s,'''      a(o);
      const p = await Xt(i);
      a(null), r({
        ...s,
        [o]: {
          ...s[o] || {},
          file: p.name,
          dataUrl: p.dataUrl
        }
      })
    };''','''      const er = VX.file(i);
      if (er) {
        r({
          ...s,
          [o]: {
            ...s[o] || {},
            file: "",
            dataUrl: null,
            error: er
          }
        }), me(er, "red");
        return
      }
      a(o);
      const p = await Xt(i);
      a(null), r({
        ...s,
        [o]: {
          ...s[o] || {},
          file: p.name,
          dataUrl: p.dataUrl,
          size: p.size,
          error: ""
        }
      })
    };''',label='di upload')
s=rep(s,'''      }), o), e("label", {
        className: K("flex h-[30px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", i.file ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 text-ink-soft hover:border-brand hover:text-brand")''','''      }), o, i.error && e("span", {
        role: "alert",
        className: "text-[11px] text-red-600"
      }, i.error)), e("label", {
        className: K("flex h-[30px] cursor-pointer items-center gap-2 truncate rounded-md border border-dashed px-2.5 text-[12.5px]", i.file ? "border-green-300 bg-green-50 text-green-700" : i.error ? "border-red-300 text-red-600" : "border-gray-300 text-ink-soft hover:border-brand hover:text-brand")''',label='di row')
s=rep(s,'''      })), p ? e(Re, {
        value: i.expiry || "",
        onChange: m => r({''','''      })), p ? e(Re, {
        value: i.expiry || "",
        min: ke(),
        onChange: m => r({''',label='di expiry')
save(s); print('p01 applied')
