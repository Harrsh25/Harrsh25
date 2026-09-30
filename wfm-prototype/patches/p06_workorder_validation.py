import sys; sys.path.insert(0,'tools'); from patch import *
s=load()
s=rep(s,'''      I = p && o.title && c > 0 && (o.type === "Lump Sum" ? A === 100 && o.milestones.every(f => f.name) : o.items.every(f => f.desc && f.qty > 0 && f.rate > 0)),''','''      woErr = {
        dates: !o.start || !o.end ? "Enter start and finish dates" : o.end <= o.start ? "Finish must be after start" : "",
        window: p && o.start && o.start < p.start ? `Starts before the contract (${_(p.start)})` : p && o.end && o.end > p.end ? `Finishes after the contract completion (${_(p.end)}) \\u2014 extend the contract first` : "",
        weights: o.type === "Lump Sum" && A !== 100 ? `Milestone weights total ${A}% \\u2014 must be 100%` : "",
        codes: o.type !== "Lump Sum" && new Set(o.items.map(f => (f.code || "").trim()).filter(Boolean)).size !== o.items.map(f => (f.code || "").trim()).filter(Boolean).length ? "Duplicate BOQ item codes" : "",
        lines: o.type !== "Lump Sum" && o.items.some(f => f.qty !== "" && !(Number(f.qty) > 0) || f.rate !== "" && !(Number(f.rate) > 0)) ? "Quantities and rates must be greater than 0" : ""
      },
      I = p && o.title && c > 0 && !VX.any(woErr) && (o.type === "Lump Sum" ? A === 100 && o.milestones.every(f => f.name) : o.items.every(f => f.desc && f.qty > 0 && f.rate > 0)),''',label='wo errs')
s=rep(s,'''      className: K("ml-3", c > b ? "text-red-600" : "text-ink-mute")
      }, "\\xB7 contract headroom ", J(b))), e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        disabled: !I,
        onClick: () => w(!1)
      }, "Save draft"), e(M, {''','''      className: K("ml-3", c > b ? "text-red-600" : "text-ink-mute")
      }, "\\xB7 contract headroom ", J(b)), VX.any(woErr) && e("span", {
        role: "alert",
        className: "ml-3 text-red-600"
      }, Object.values(woErr).filter(Boolean).join(" \\xB7 "))), e(M, {
        onClick: s
      }, "Cancel"), e(M, {
        disabled: !I,
        onClick: () => w(!1)
      }, "Save draft"), e(M, {''',label='wo footer')
save(s); print('p06 applied')
