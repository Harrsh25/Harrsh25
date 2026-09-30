import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''      onClick: () => I({
        name: "",
        trade: "Mason",
        skill: "Skilled",
        gatePass: ""
      })
    }, "Add worker")''','''      onClick: () => I({
        name: "",
        trade: "Mason",
        skill: "Skilled",
        gatePass: "",
        dob: "",
        mobile: ""
      })
    }, "Add worker")''',label='wk init')
s=rep(s,'''"No accepted work order to record attendance against."), v && e(we, {
      open: !0,
      onClose: () => I(null),
      width: 520,
      title: "Add worker",
      footer: e(z, null, e(M, {
        onClick: () => I(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: !v.name,''','''"No accepted work order to record attendance against."), v && (() => {
      const nxAge = v.dob ? Math.floor((Date.now() - new Date(v.dob).getTime()) / 315576e5) : null,
        wkErr = {
          name: VX.blank(v.name) ? "Required" : String(v.name).trim().length < 3 ? "Enter the full name" : "",
          trade: VX.req(v.trade),
          dob: !v.dob ? "Required" : nxAge < 18 ? "Worker must be at least 18 (Child & Adolescent Labour Act / BOCW)" : nxAge > 70 ? "Check the date of birth \\u2014 age over 70" : "",
          mobile: VX.phone(v.mobile),
          gatePass: v.gatePass && r.workers.some(P => String(P.gatePass).toUpperCase() === String(v.gatePass).trim().toUpperCase()) ? "Gate pass already issued to another worker" : ""
        },
        nxDup = v.name && r.workers.find(P => P.vendorId === a && P.active && P.name.trim().toLowerCase() === String(v.name).trim().toLowerCase());
      return e(we, {
      open: !0,
      onClose: () => I(null),
      width: 520,
      title: "Add worker",
      footer: e(z, null, nxFix(wkErr), e(M, {
        onClick: () => I(null)
      }, "Cancel"), e(M, {
        variant: "primary",
        disabled: VX.any(wkErr),''',label='wk wrap')
s=rep(s,'''            gatePass: v.gatePass || `GP-${4300+P.workers.length}`,''','''            name: String(v.name).trim(),
            gatePass: String(v.gatePass || `GP-${4300+P.workers.length}`).trim().toUpperCase(),''',label='wk save')
s=rep(s,'''    }, e(L, {
      label: "Name",
      span: 2
    }, e(ee, {
      value: v.name,''','''    }, e(L, {
      label: "Name",
      required: !0,
      span: 2,
      error: nxE(wkErr, "name")
    }, e(ee, {
      value: v.name,''',label='wk name')
s=rep(s,'''      placeholder: "Auto"
    })))))
  }''','''      placeholder: "Auto"
    })), e(L, {
      label: "Date of birth",
      required: !0,
      error: nxE(wkErr, "dob")
    }, e(Re, {
      value: v.dob,
      max: Ne(-18 * 365),
      onChange: C => I({
        ...v,
        dob: C
      })
    })), e(L, {
      label: "Mobile",
      error: nxE(wkErr, "mobile")
    }, e(ee, {
      value: v.mobile,
      inputMode: "tel",
      onChange: C => I({
        ...v,
        mobile: C
      }),
      placeholder: "+91 98xxxxxxxx"
    }))), nxDup && e("div", {
      className: "mt-3"
    }, e(re, {
      tone: "amber"
    }, `${nxDup.name} (${nxDup.gatePass}) is already on this contractor's roll \\u2014 check this is not a duplicate.`)))
    })())
  }''',label='wk end')
save(s); print('p09 applied')
s=load()
s=rep(s,'''      label: "Gate pass no."
    }, e(ee, {
      value: v.gatePass,''','''      label: "Gate pass no.",
      error: nxE(wkErr, "gatePass")
    }, e(ee, {
      value: v.gatePass,''',label='wk gp')
save(s); print('p09b applied')
