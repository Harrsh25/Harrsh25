import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''      u = l && n.lineId && n.location && (l.type === "Lump Sum" ? n.pct !== "" && !A : m > 0);''','''      mbErr = {
        date: !n.date ? "Required" : VX.notFuture(n.date, "Measurement date can't be in the future") || (l && l.start && n.date < l.start ? `Before the work order start (${_(l.start)})` : ""),
        nos: p ? VX.num(n.nos, {
          min: 1,
          int: !0,
          label: "Nos"
        }) : "",
        l: n.l !== "" && n.l != null && !(Number(n.l) > 0) ? "Must be greater than 0" : "",
        b: n.b !== "" && n.b != null && !(Number(n.b) > 0) ? "Must be greater than 0" : "",
        d: n.d !== "" && n.d != null && !(Number(n.d) > 0) ? "Must be greater than 0" : "",
        direct: !p && n.direct !== "" && !(Number(n.direct) > 0) ? "Must be greater than 0" : ""
      },
      u = l && n.lineId && n.location && !VX.any(mbErr) && (l.type === "Lump Sum" ? n.pct !== "" && !A : m > 0);''',label='mb errs')
s=rep(s,'''      subtitle: "Entry goes to the Measurement Book and waits for joint (JMS) sign-off",
      footer: e(z, null, e(M, {
        onClick: s
      }, "Cancel"), e(M, {''','''      subtitle: "Entry goes to the Measurement Book and waits for joint (JMS) sign-off",
      footer: e(z, null, nxFix(mbErr), e(M, {
        onClick: s
      }, "Cancel"), e(M, {''',label='mb footer')
s=rep(s,'''    })), e(L, {
      label: "Date"
    }, e(Re, {
      value: n.date,
      onChange: v => a({
        ...n,
        date: v
      })
    })), e(L, {
      label: "Location / grid / chainage",''','''    })), e(L, {
      label: "Date",
      error: nxE(mbErr, "date")
    }, e(Re, {
      value: n.date,
      max: ke(),
      onChange: v => a({
        ...n,
        date: v
      })
    })), e(L, {
      label: "Location / grid / chainage",''',label='mb date')
for lab,k in [('Nos','nos'),('Length (m)','l'),('Breadth (m)','b'),('Depth / height (m)','d')]:
    s=rep(s,f'''    }}, e(L, {{
      label: "{lab}"
    }}, e(ge, {{''',f'''    }}, e(L, {{
      label: "{lab}",
      error: nxE(mbErr, "{k}")
    }}, e(ge, {{
      min: 0,''',label='mb '+k) if s.count(f'''    }}, e(L, {{
      label: "{lab}"
    }}, e(ge, {{''')==1 else s
save(s); print('p07 applied')
