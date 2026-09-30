import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''        ["Phone", t.contact.phone],
        ["Address", [t.address, t.city, t.state].filter(Boolean).join(", ")]
      ]''','''        ["Phone", t.contact.phone],
        ["Address", [t.address, t.city, t.state, t.pin].filter(Boolean).join(", ")],
        ["Country", t.country || "India"],
        ["Website", t.website ? e("a", {
          href: /^https?:/.test(t.website) ? t.website : "https://" + t.website,
          target: "_blank",
          rel: "noreferrer",
          className: "text-brand hover:underline"
        }, t.website) : "\\u2014"]
      ]''',label='contact display')
s=rep(s,'''        ["GSTIN", e("span", {
          className: "mono"
        }, t.gstin)],
        ["PAN", e("span", {
          className: "mono"
        }, t.pan)],
        ["Currency", t.currency],''','''        ...((t.country || "India") === "India" ? [
          ["GSTIN", e("span", {
            className: "mono"
          }, t.gstin)],
          ["PAN", e("span", {
            className: "mono"
          }, t.pan)]
        ] : [
          ["Tax / VAT no.", e("span", {
            className: "mono"
          }, t.taxId || "\\u2014")]
        ]),
        ["Currency", t.currency],''',label='tax display')
save(s); print('p03 applied')
