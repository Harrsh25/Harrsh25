import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
# tax section: country-aware
s=rep(s,'''    }, e("div", {
      className: "grid grid-cols-3 gap-3"
    }, e(L, {
      label: "GSTIN",
      required: !0
    }, e(ee, {
      value: t.gstin,
      onChange: C,''','''    }, e("div", {
      className: "grid grid-cols-3 gap-3"
    }, (t.country || "India") !== "India" && e(L, {
      label: "Tax / VAT registration no.",
      required: !0,
      span: 2,
      hint: "Foreign vendor \\u2014 GSTIN and PAN are not required"
    }, e(ee, {
      value: t.taxId || "",
      onChange: W => i("taxId", W.toUpperCase()),
      className: K(At, "mono")
    }), d("taxId")), (t.country || "India") === "India" && e(L, {
      label: "GSTIN",
      required: !0
    }, e(ee, {
      value: t.gstin,
      onChange: C,''',label='gstin country')
s=rep(s,'''    }), d("gstin") || k($.gstin, "Already registered:") || b(I, `Valid \\xB7 ${kn[t.gstin.slice(0,2)]||"state code "+t.gstin.slice(0,2)}`)), e(L, {
      label: "PAN",
      required: !0
    }, e(ee, {''','''    }), d("gstin") || k($.gstin, "Already registered:") || b(I, `Valid \\xB7 ${kn[t.gstin.slice(0,2)]||"state code "+t.gstin.slice(0,2)}`)), (t.country || "India") === "India" && e(L, {
      label: "PAN",
      required: !0
    }, e(ee, {''',label='pan country')
# phone error + country/pin/website
s=rep(s,'''    }, e(ee, {
      value: t.contact.phone,
      onChange: W => p("phone", W),
      placeholder: "+91 98xxx xxxxx"
    })), e(L, {
      label: "Registered address",
      span: 3
    }, e(ee, {
      value: t.address,
      onChange: W => i("address", W),
      placeholder: "Building, street, area"
    })), e(L, {
      label: "City"
    }, e(ee, {
      value: t.city,
      onChange: W => i("city", W)
    })), e(L, {
      label: "State",
      hint: kn[(t.gstin || "").slice(0, 2)] ? "From GSTIN" : ""
    }, e(ue, {
      value: t.state,
      onChange: W => i("state", W),
      options: Kt($s, t.state)
    })))),''','''    }, e(ee, {
      value: t.contact.phone,
      onChange: W => p("phone", W),
      placeholder: "+91 98xxx xxxxx"
    }), d("phone")), e(L, {
      label: "Registered address",
      span: 3
    }, e(ee, {
      value: t.address,
      onChange: W => i("address", W),
      placeholder: "Building, street, area"
    })), e(L, {
      label: "City"
    }, e(ee, {
      value: t.city,
      onChange: W => i("city", W)
    })), (t.country || "India") === "India" ? e(L, {
      label: "State",
      hint: kn[(t.gstin || "").slice(0, 2)] ? "From GSTIN" : ""
    }, e(ue, {
      value: t.state,
      onChange: W => i("state", W),
      options: Kt($s, t.state)
    })) : e(L, {
      label: "State / region"
    }, e(ee, {
      value: t.state,
      onChange: W => i("state", W)
    })), e(L, {
      label: (t.country || "India") === "India" ? "PIN code" : "Postal code"
    }, e(ee, {
      value: t.pin || "",
      onChange: W => i("pin", W.trim()),
      maxLength: 10,
      placeholder: (t.country || "India") === "India" ? "411026" : "",
      className: K(At, "mono")
    }), d("pin")), e(L, {
      label: "Country"
    }, e(ue, {
      value: t.country || "India",
      onChange: W => s({
        ...t,
        country: W,
        currency: W === "India" ? "INR" : t.currency === "INR" ? (W === "United Arab Emirates" ? "AED" : ["Germany", "France", "Italy", "Netherlands"].includes(W) ? "EUR" : "USD") : t.currency,
        state: W === "India" ? "Maharashtra" : ""
      }),
      options: nxCountries
    })), e(L, {
      label: "Website"
    }, e(ee, {
      value: t.website || "",
      onChange: W => i("website", W.trim()),
      placeholder: "www.company.com"
    }), d("website")))),''',label='address block')
# contractor statutory errors
s=rep(s,'''    }, e(ee, {
      value: t.contractor.labourLicence,
      onChange: W => c("labourLicence", W)
    })), e(L, {
      label: "Licence valid till"
    }, e(Re, {
      value: t.contractor.licenceExpiry,
      onChange: W => c("licenceExpiry", W)
    })), e(L, {
      label: "Workforce strength"
    }, e(ge, {
      value: t.contractor.workforce,
      onChange: W => c("workforce", W),
      placeholder: "Workers"
    })), e(L, {
      label: "PF establishment code"
    }, e(ee, {
      value: t.contractor.pfCode,
      onChange: W => c("pfCode", W)
    })), e(L, {
      label: "ESI code"
    }, e(ee, {
      value: t.contractor.esiCode,
      onChange: W => c("esiCode", W)
    })), e(L, {
      label: "Experience (years)"
    }, e(ge, {
      value: t.contractor.experienceYrs,
      onChange: W => c("experienceYrs", W)
    })),''','''    }, e(ee, {
      value: t.contractor.labourLicence,
      onChange: W => c("labourLicence", W.toUpperCase()),
      placeholder: "CLRA/PUN/2025/0412"
    }), d("clra")), e(L, {
      label: "Licence valid till"
    }, e(Re, {
      value: t.contractor.licenceExpiry,
      min: ke(),
      onChange: W => c("licenceExpiry", W)
    }), d("licenceExpiry")), e(L, {
      label: "Workforce strength"
    }, e(ge, {
      value: t.contractor.workforce,
      onChange: W => c("workforce", W),
      min: 1,
      step: 1,
      placeholder: "Workers"
    }), d("workforce")), e(L, {
      label: "PF establishment code"
    }, e(ee, {
      value: t.contractor.pfCode,
      onChange: W => c("pfCode", W.toUpperCase()),
      placeholder: "PUPUN1123344000",
      className: K(At, "mono")
    }), d("pf")), e(L, {
      label: "ESI code"
    }, e(ee, {
      value: t.contractor.esiCode,
      onChange: W => c("esiCode", W),
      placeholder: "17 digits",
      maxLength: 20,
      className: K(At, "mono")
    }), d("esi")), e(L, {
      label: "Experience (years)"
    }, e(ge, {
      value: t.contractor.experienceYrs,
      onChange: W => c("experienceYrs", W),
      min: 0
    }), d("experience")),''',label='contractor fields')
# bank: holder + errors
s=rep(s,'''    }, e("div", {
      className: "grid grid-cols-3 gap-3"
    }, e(L, {
      label: "Bank"
    }, e(ee, {
      value: t.bank.bank,
      disabled: l,
      onChange: W => m("bank", W),
      placeholder: "e.g. HDFC Bank"
    })), e(L, {
      label: "Account no."
    }, e(ee, {
      value: t.bank.account,
      disabled: l,
      onChange: W => m("account", W.replace(/\\s/g, "")),
      className: K(At, "mono")
    })), e(L, {''','''    }, e("div", {
      className: "grid grid-cols-3 gap-3"
    }, e(L, {
      label: "Account holder name",
      hint: "Exactly as in bank records \\u2014 used for penny-drop verification"
    }, e(ee, {
      value: t.bank.holder || "",
      disabled: l,
      onChange: W => m("holder", W),
      placeholder: t.legalName || t.name || "Account holder"
    }), d("bankHolder")), e(L, {
      label: "Bank"
    }, e(ee, {
      value: t.bank.bank,
      disabled: l,
      onChange: W => m("bank", W),
      placeholder: "e.g. HDFC Bank"
    })), e(L, {
      label: "Account no."
    }, e(ee, {
      value: t.bank.account,
      disabled: l,
      onChange: W => m("account", W.replace(/\\s/g, "")),
      inputMode: "numeric",
      maxLength: 18,
      className: K(At, "mono")
    }), d("bankAccount")), e(L, {''',label='bank block')
s=rep(s,'''    }), t.bank.ifsc && !f ? e("span", {
      className: "mt-1 block text-[11px] text-amber-700"
    }, "Format: 4 letters, 0, then 6 characters") : b(f, "Valid IFSC")))), e(zt, {''','''    }), d("bankIfsc") || (t.bank.ifsc && !f ? e("span", {
      className: "mt-1 block text-[11px] text-amber-700"
    }, "Format: 4 letters, 0, then 6 characters") : b(f, "Valid IFSC"))))), e(zt, {''',label='ifsc err')
# countries constant next to Aa
s=rep(s,'''  const Aa = ["Company", "Partnership / LLP", "Individual / HUF", "Proprietorship"],''','''  const nxCountries = ["India", "United Arab Emirates", "Singapore", "United Kingdom", "United States", "Germany", "France", "Italy", "Netherlands", "China", "Japan", "South Korea", "Other"],
    Aa = ["Company", "Partnership / LLP", "Individual / HUF", "Proprietorship"],''',label='countries')
save(s); print('p02 applied')
