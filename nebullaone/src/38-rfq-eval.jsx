// Bid evaluation for an RFQ: technical evaluation against criteria with a pass mark (failed bidders can't be awarded),
// compliance evaluation, clarifications, a best-and-final-offer (BAFO) round with price history, a combined
// technical + commercial score and an award recommendation that must be justified when it isn't the top-ranked bidder.
const DEFAULT_TECH = [{ name: "Compliance with specifications", weight: 40 }, { name: "Experience on similar work", weight: 30 }, { name: "Delivery / method plan", weight: 30 }];
const techCriteria = (rfq) => (rfq.techCriteria && rfq.techCriteria.length ? rfq.techCriteria : DEFAULT_TECH);
const techPass = (rfq) => (rfq.techPass != null ? Number(rfq.techPass) : 60);
const techWeight = (rfq) => (rfq.techWeight != null ? Number(rfq.techWeight) : 40);
// technical score 0–100 from 0–10 marks per criterion
function techScore(rfq, vid) {
  const e = (rfq.techEval || {})[vid];
  if (!e || !e.scores) return null;
  const cr = techCriteria(rfq), tw = sum(cr, (c) => Number(c.weight) || 0) || 1;
  return round2(sum(cr, (c, i) => ((Number(e.scores[i]) || 0) / 10) * (Number(c.weight) || 0)) / tw * 100);
}
const techResult = (rfq, vid) => { const s = techScore(rfq, vid); return s == null ? "Not evaluated" : s >= techPass(rfq) ? "Pass" : "Fail"; };
function complianceResult(st, vid) {
  const v = byId(st.vendors, vid); if (!v) return { ok: false, why: "Vendor not found" };
  const c = complianceOf(v), q = qualStatus(v), why = [...c.blocking.slice(0, 2), ...(["Not qualified", "Expired", "Requalification required"].includes(q.status) ? [`Qualification ${q.status.toLowerCase()}`] : []), ...(isBlockedFor(v, "Orders") ? ["On hold for orders"] : [])];
  return { ok: !why.length, why: why.join(" · ") };
}
// Combined ranking: only technically passed, compliant, valid quotes; commercial score from price (lowest = 100)
function combinedRank(st, rfq) {
  const quotes = rfq.quotes.filter((q) => q.review !== "Returned" && q.review !== "Under review" && quotedLines(rfq, q).length > 0);
  const amt = (q) => quoteTotal(rfq, q) / (quotedLines(rfq, q).length / rfq.items.length || 1);
  const ok = quotes.filter((q) => techResult(rfq, q.vendorId) === "Pass" && complianceResult(st, q.vendorId).ok && daysUntil(q.validUntil) >= 0);
  const minAmt = Math.min(...ok.map(amt));
  const tw = techWeight(rfq);
  return quotes.map((q) => {
    const t = techScore(rfq, q.vendorId), qualified = ok.includes(q);
    const commercial = qualified ? (minAmt / amt(q)) * 100 : null;
    return { q, tech: t, techRes: techResult(rfq, q.vendorId), comp: complianceResult(st, q.vendorId), qualified, commercial, amount: quoteTotal(rfq, q), total: qualified ? round2((t * tw + commercial * (100 - tw)) / 100) : null };
  }).sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
}
// Vendors the award can go to (technical pass where an evaluation exists)
const techBlocked = (rfq, vid) => Object.keys(rfq.techEval || {}).length > 0 && techResult(rfq, vid) !== "Pass";

function RfqEvaluation({ rfq }) {
  const st = useStore(), id = rfq.id, open = !["Awarded", "Closed", "Cancelled"].includes(rfq.status);
  const cr = techCriteria(rfq), rank = combinedRank(st, rfq);
  const [ev, setEv] = y.useState(null), [cfg, setCfg] = y.useState(null), [cl, setCl] = y.useState(null), [ans, setAns] = y.useState(null), [bafo, setBafo] = y.useState(null), [offer, setOffer] = y.useState(null), [rec, setRec] = y.useState(null);
  const log = (fn, action) => setState((s) => fn(byId(s.rfqs, id)), { entity: "RFQ", id, action });
  const accepted = rfq.quotes.filter((q) => q.review !== "Returned" && q.review !== "Under review");
  const clar = rfq.clarifications || [];
  const top = rank.find((r) => r.qualified);
  return (
    <>
      <Section title={`Technical evaluation - pass mark ${techPass(rfq)} / 100`} icon={Icon.clipboardCheck} actions={open && <Btn size="sm" icon={Icon.sliders} onClick={() => setCfg({ criteria: cr.map((c) => ({ ...c })), pass: techPass(rfq), tw: techWeight(rfq) })}>Criteria & weights</Btn>}>
        <DataTable dense plain rows={accepted} rowKey={(q) => q.vendorId} empty={<p className="p-4 text-[13px] text-ink-mute">Accept quotations first - then score them here.</p>} columns={[
          { key: "v", label: "Bidder", className: "font-medium", render: (q) => vendorName(st, q.vendorId) },
          ...cr.map((c, i) => ({ key: `c${i}`, label: `${c.name} (${c.weight}%)`, align: "right", render: (q) => { const e = (rfq.techEval || {})[q.vendorId]; return e ? <span className="num">{e.scores[i]}/10</span> : <span className="text-ink-faint">-</span>; } })),
          { key: "t", label: "Technical", align: "right", render: (q) => { const s = techScore(rfq, q.vendorId); return s == null ? "-" : <span className="flex flex-col items-end"><b className="num">{s.toFixed(0)}</b><Status tone={s >= techPass(rfq) ? "green" : "red"}>{s >= techPass(rfq) ? "Pass" : "Fail"}</Status></span>; } },
          { key: "cmp", label: "Compliance", render: (q) => { const c = complianceResult(st, q.vendorId); return c.ok ? <Status tone="green">Pass</Status> : <span title={c.why}><Status tone="red">Fail</Status><span className="block text-[11px] text-red-600">{c.why}</span></span>; } },
          { key: "a", label: "", align: "right", render: (q) => open && <Btn size="sm" onClick={() => setEv({ vid: q.vendorId, scores: (rfq.techEval || {})[q.vendorId]?.scores?.slice() || cr.map(() => ""), remark: (rfq.techEval || {})[q.vendorId]?.remark || "" })}>{(rfq.techEval || {})[q.vendorId] ? "Re-score" : "Score"}</Btn> },
        ]} />
      </Section>

      <Section title="Clarifications" icon={Icon.message} actions={open && accepted.length > 0 && <Btn size="sm" icon={Icon.plus} onClick={() => setCl({ vid: "", text: "" })}>Ask a clarification</Btn>}>
        <DataTable dense plain rows={clar} empty={<p className="p-4 text-[13px] text-ink-mute">No clarifications asked.</p>} columns={[
          { key: "v", label: "Bidder", className: "font-medium", render: (c) => vendorName(st, c.vendorId) },
          { key: "q", label: "Question", render: (c) => <span className="flex flex-col"><span>{c.question}</span><span className="text-[11px] text-ink-mute">{c.askedBy} · {fmtDate(c.askedAt)}</span></span> },
          { key: "a", label: "Answer", render: (c) => (c.answer ? <span className="flex flex-col"><span>{c.answer}</span><span className="text-[11px] text-ink-mute">{fmtDate(c.answeredAt)}</span></span> : <Status tone="amber">Waiting</Status>) },
          { key: "x", label: "", align: "right", render: (c) => open && !c.answer && <Btn size="sm" onClick={() => setAns({ id: c.id, text: "" })}>Record answer</Btn> },
        ]} />
      </Section>

      <Section title="Best and final offer (BAFO)" icon={Icon.trending} actions={open && rank.some((r) => r.qualified) && !(rfq.bafo && rfq.bafo.status === "Open") && <Btn size="sm" variant="primary" onClick={() => setBafo({ due: shiftDays(3) })}>Request final offers</Btn>}>
        {!rfq.bafo ? <p className="p-4 text-[13px] text-ink-mute">After the technical evaluation, ask the qualified bidders for a final price. Each final offer is kept in the price history.</p> : (
          <DataTable dense plain rows={rfq.bafo.vendors.map((vid) => ({ vid, q: rfq.quotes.find((x) => x.vendorId === vid) }))} rowKey={(r) => r.vid} columns={[
            { key: "v", label: "Bidder", className: "font-medium", render: (r) => vendorName(st, r.vid) },
            { key: "h", label: "Price history", render: (r) => <span className="text-[12.5px]">{(r.q.priceHistory || []).map((p0) => `${p0.label} ${inrShort(p0.amount)}`).join(" → ") || "-"}{" → "}<b>Now {inrShort(quoteTotal(rfq, r.q))}</b></span> },
            { key: "s", label: "Final offer", render: (r) => ((r.q.priceHistory || []).some((p0) => p0.round === rfq.bafo.round) ? <Status tone="green">Received</Status> : <Status tone="amber">{`Due ${fmtDate(rfq.bafo.due)}`}</Status>) },
            { key: "a", label: "", align: "right", render: (r) => open && rfq.bafo.status === "Open" && !(r.q.priceHistory || []).some((x) => x.round === rfq.bafo.round) && <Btn size="sm" onClick={() => setOffer({ vid: r.vid, amount: String(Math.round(quoteTotal(rfq, r.q))) })}>Record final offer</Btn> },
          ]} />
        )}
        {rfq.bafo && <p className="border-t border-line px-4 py-2 text-[12px] text-ink-mute">Round {rfq.bafo.round} requested {fmtDate(rfq.bafo.requestedAt)} by {rfq.bafo.by} · {rfq.bafo.status}{rfq.bafo.status === "Open" && open && <> · <button className="font-medium text-brand" onClick={() => log((r) => { r.bafo.status = "Closed"; }, `BAFO round ${rfq.bafo.round} closed`)}>Close round</button></>}</p>}
      </Section>

      <Section title={`Technical + commercial ranking - technical ${techWeight(rfq)}% · price ${100 - techWeight(rfq)}%`} icon={Icon.target}
        actions={open && top && <Btn size="sm" variant="primary" icon={Icon.sparkles} onClick={() => setRec({ vid: top.q.vendorId, text: rfq.recommend?.justification || "" })}>Recommend award</Btn>}>
        <DataTable dense plain rows={rank} rowKey={(r) => r.q.vendorId} empty={<p className="p-4 text-[13px] text-ink-mute">No quotations to rank yet.</p>} columns={[
          { key: "n", label: "#", render: (r, i) => (r.qualified ? i + 1 : "-") },
          { key: "v", label: "Bidder", className: "font-medium", render: (r) => vendorName(st, r.q.vendorId) },
          { key: "a", label: "Price", align: "right", render: (r) => <span className="num">{inrShort(r.amount)}</span> },
          { key: "t", label: "Technical", align: "right", render: (r) => (r.tech == null ? "-" : <span className="num">{r.tech.toFixed(0)}</span>) },
          { key: "c", label: "Commercial", align: "right", render: (r) => (r.commercial == null ? "-" : <span className="num">{r.commercial.toFixed(0)}</span>) },
          { key: "s", label: "Combined", align: "right", render: (r) => (r.total == null ? <span className="text-[12px] text-red-600">{r.techRes !== "Pass" ? `Technical ${r.techRes.toLowerCase()}` : !r.comp.ok ? "Compliance fail" : "Quote expired"}</span> : <b className="num">{r.total.toFixed(1)}</b>) },
          { key: "r", label: "", render: (r) => rfq.recommend?.vendorId === r.q.vendorId && <Status tone="purple">Recommended</Status> },
        ]} />
        {rfq.recommend && <p className="border-t border-line px-4 py-3 text-[13px] text-ink-soft"><b>Recommendation:</b> award to {vendorName(st, rfq.recommend.vendorId)} - {rfq.recommend.justification} <span className="text-ink-mute">({rfq.recommend.by}, {fmtDate(rfq.recommend.at)})</span></p>}
        {clar.some((c) => !c.answer) && <p className="border-t border-line px-4 py-2 text-[12px] text-amber-700">{clar.filter((c) => !c.answer).length} clarification(s) still unanswered - close them before recommending.</p>}
      </Section>

      {ev && (() => {
        const bad = ev.scores.some((x) => x === "" || !(Number(x) >= 0 && Number(x) <= 10));
        const s = bad ? null : round2(sum(cr, (c, i) => (Number(ev.scores[i]) / 10) * (Number(c.weight) || 0)) / (sum(cr, (c) => Number(c.weight) || 0) || 1) * 100);
        return (
          <Modal open width={560} onClose={() => setEv(null)} title={`Technical evaluation - ${vendorName(st, ev.vid)}`} footer={<><Btn onClick={() => setEv(null)}>Cancel</Btn><Btn variant="primary" disabled={bad || (s < techPass(rfq) && ev.remark.trim().length < 5)} title={bad ? "Mark every criterion 0–10" : s < techPass(rfq) && ev.remark.trim().length < 5 ? "Say why the bid fails" : ""} onClick={() => {
            log((r) => { r.techEval = { ...(r.techEval || {}), [ev.vid]: { scores: ev.scores.map(Number), remark: ev.remark.trim(), by: currentUser(), at: new Date().toISOString() } }; }, `Technical evaluation - ${vendorName(st, ev.vid)} ${s.toFixed(0)}/100 (${s >= techPass(rfq) ? "pass" : "fail"})${ev.remark.trim() ? ` - ${ev.remark.trim()}` : ""}`);
            toast(`Scored ${s.toFixed(0)} - ${s >= techPass(rfq) ? "technically qualified" : "below the pass mark"}`, s >= techPass(rfq) ? "green" : "red"); setEv(null);
          }}>Save</Btn></>}>
            <div className="space-y-2">
              {cr.map((c, i) => <div key={i} className="grid grid-cols-[1fr_110px] items-center gap-3"><span className="text-[13px]">{c.name} <span className="text-ink-mute">({c.weight}%)</span></span><NumInput value={ev.scores[i]} onChange={(x) => setEv({ ...ev, scores: ev.scores.map((v0, j) => (j === i ? x : v0)) })} placeholder="0–10" /></div>)}
              <p className="text-[12.5px]">Technical score: <b>{s == null ? "-" : `${s.toFixed(0)} / 100`}</b> {s != null && <Status tone={s >= techPass(rfq) ? "green" : "red"}>{s >= techPass(rfq) ? "Pass" : "Fail"}</Status>}</p>
              <Field label={s != null && s < techPass(rfq) ? "Why it fails (required)" : "Evaluator remark"}><TextInput value={ev.remark} onChange={(x) => setEv({ ...ev, remark: x })} /></Field>
            </div>
          </Modal>
        );
      })()}
      {cfg && (() => {
        const tw = sum(cfg.criteria, (c) => Number(c.weight) || 0);
        const err = cfg.criteria.some((c) => !c.name.trim()) ? "Every criterion needs a name" : tw !== 100 ? `Weights add up to ${tw}% - they must total 100%` : !(Number(cfg.pass) > 0 && Number(cfg.pass) <= 100) ? "Pass mark must be 1–100" : !(Number(cfg.tw) >= 0 && Number(cfg.tw) <= 100) ? "Technical weight must be 0–100" : "";
        return (
          <Modal open width={600} onClose={() => setCfg(null)} title="Evaluation criteria" footer={<><Btn onClick={() => setCfg(null)}>Cancel</Btn><Btn variant="primary" disabled={!!err} title={err} onClick={() => { log((r) => { r.techCriteria = cfg.criteria.map((c) => ({ name: c.name.trim(), weight: Number(c.weight) })); r.techPass = Number(cfg.pass); r.techWeight = Number(cfg.tw); }, `Evaluation criteria set - pass mark ${cfg.pass}, technical weight ${cfg.tw}%`); setCfg(null); }}>Save</Btn></>}>
            <div className="space-y-2">
              {cfg.criteria.map((c, i) => <div key={i} className="grid grid-cols-[1fr_100px_auto] items-center gap-2"><TextInput value={c.name} onChange={(x) => setCfg({ ...cfg, criteria: cfg.criteria.map((z, j) => (j === i ? { ...z, name: x } : z)) })} /><NumInput value={c.weight} onChange={(x) => setCfg({ ...cfg, criteria: cfg.criteria.map((z, j) => (j === i ? { ...z, weight: x } : z)) })} placeholder="Weight %" /><IconBtn icon={Icon.trash} title="Remove" onClick={() => setCfg({ ...cfg, criteria: cfg.criteria.filter((_, j) => j !== i) })} /></div>)}
              <Btn size="sm" icon={Icon.plus} onClick={() => setCfg({ ...cfg, criteria: [...cfg.criteria, { name: "", weight: 0 }] })}>Add criterion</Btn>
              <div className="grid grid-cols-2 gap-3 pt-2"><Field label="Technical pass mark (of 100)"><NumInput value={cfg.pass} onChange={(x) => setCfg({ ...cfg, pass: x })} /></Field><Field label="Technical weight in ranking (%)"><NumInput value={cfg.tw} onChange={(x) => setCfg({ ...cfg, tw: x })} /></Field></div>
              {err && <FieldErr m={err} />}
            </div>
          </Modal>
        );
      })()}
      {cl && (
        <Modal open width={520} onClose={() => setCl(null)} title="Ask a clarification" footer={<><Btn onClick={() => setCl(null)}>Cancel</Btn><Btn variant="primary" disabled={!cl.vid || cl.text.trim().length < 5} onClick={() => { log((r) => { r.clarifications = [...(r.clarifications || []), { id: Date.now(), vendorId: cl.vid, question: cl.text.trim(), askedBy: currentUser(), askedAt: new Date().toISOString() }]; }, `Clarification asked to ${vendorName(st, cl.vid)} - ${cl.text.trim()}`); toast("Clarification e-mailed to the bidder"); setCl(null); }}>Send</Btn></>}>
          <div className="space-y-3"><Field label="Bidder"><Select value={cl.vid} placeholder="Select" onChange={(x) => setCl({ ...cl, vid: x })} options={accepted.map((q) => ({ value: q.vendorId, label: vendorName(st, q.vendorId) }))} /></Field>
            <Field label="Question"><TextArea rows={3} value={cl.text} onChange={(x) => setCl({ ...cl, text: x })} placeholder="e.g. Confirm the rate includes unloading at site" /></Field></div>
        </Modal>
      )}
      {ans && (
        <Modal open width={520} onClose={() => setAns(null)} title="Record the bidder's answer" footer={<><Btn onClick={() => setAns(null)}>Cancel</Btn><Btn variant="primary" disabled={ans.text.trim().length < 2} onClick={() => { log((r) => Object.assign(r.clarifications.find((c) => c.id === ans.id), { answer: ans.text.trim(), answeredAt: new Date().toISOString() }), "Clarification answered"); setAns(null); }}>Save</Btn></>}>
          <Field label="Answer"><TextArea rows={3} value={ans.text} onChange={(x) => setAns({ ...ans, text: x })} /></Field>
        </Modal>
      )}
      {bafo && (
        <Modal open width={460} onClose={() => setBafo(null)} title="Request best and final offers" footer={<><Btn onClick={() => setBafo(null)}>Cancel</Btn><Btn variant="primary" disabled={!bafo.due || bafo.due < todayISO()} onClick={() => {
          const vids = rank.filter((r) => r.qualified).map((r) => r.q.vendorId);
          log((r) => { r.bafo = { round: (r.bafo?.round || 0) + 1, due: bafo.due, vendors: vids, requestedAt: new Date().toISOString(), by: currentUser(), status: "Open" }; }, `BAFO round ${(rfq.bafo?.round || 0) + 1} requested from ${vids.map((v) => vendorName(st, v)).join(", ")} - due ${fmtDate(bafo.due)}`);
          toast(`Final offers requested from ${vids.length} bidder(s)`); setBafo(null);
        }}>Send request</Btn></>}>
          <p className="mb-3 text-[13px] text-ink-soft">Goes to the {rank.filter((r) => r.qualified).length} technically qualified, compliant bidder(s): {rank.filter((r) => r.qualified).map((r) => vendorName(st, r.q.vendorId)).join(", ")}.</p>
          <Field label="Final offers due"><DateInput value={bafo.due} onChange={(x) => setBafo({ ...bafo, due: x })} /></Field>
        </Modal>
      )}
      {offer && (() => {
        const q = rfq.quotes.find((x) => x.vendorId === offer.vid), cur = quoteTotal(rfq, q), n = Number(offer.amount);
        const err = !(n > 0) ? "Enter the final offer" : n > cur + 0.5 ? `A final offer can't be above the current price (${inrShort(cur)})` : "";
        return (
          <Modal open width={460} onClose={() => setOffer(null)} title={`Final offer - ${vendorName(st, offer.vid)}`} footer={<><Btn onClick={() => setOffer(null)}>Cancel</Btn><Btn variant="primary" disabled={!!err} title={err} onClick={() => {
            const f = n / cur;
            log((r) => { const x = r.quotes.find((z) => z.vendorId === offer.vid); x.priceHistory = [...(x.priceHistory || []), ...(!(x.priceHistory || []).length ? [{ label: "Original", amount: cur, at: x.submittedOn, round: 0 }] : []), { label: `BAFO ${r.bafo.round}`, amount: n, at: new Date().toISOString(), round: r.bafo.round }]; x.rates = x.rates.map((v0) => (v0 == null || v0 === "" ? v0 : round2(Number(v0) * f))); }, `Final offer from ${vendorName(st, offer.vid)} - ${inrShort(cur)} → ${inrShort(n)} (${((1 - f) * 100).toFixed(1)}% lower)`);
            toast("Final offer recorded - line rates updated"); setOffer(null);
          }}>Save</Btn></>}>
            <Field label="Final total (taxable, ₹)" info={`Current ${inrShort(cur)}`}><NumInput value={offer.amount} onChange={(x) => setOffer({ ...offer, amount: x })} /><FieldErr m={err} /></Field>
          </Modal>
        );
      })()}
      {rec && (() => {
        const isTop = top && rec.vid === top.q.vendorId;
        const err = clar.some((c) => !c.answer) ? "Unanswered clarifications" : !isTop && rec.text.trim().length < 20 ? "Not the top-ranked bidder - justify the choice (at least 20 characters)" : rec.text.trim().length < 5 ? "Write the recommendation" : "";
        return (
          <Modal open width={560} onClose={() => setRec(null)} title="Award recommendation" footer={<><Btn onClick={() => setRec(null)}>Cancel</Btn><Btn variant="primary" disabled={!!err} title={err} onClick={() => { log((r) => { r.recommend = { vendorId: rec.vid, justification: rec.text.trim(), by: currentUser(), at: new Date().toISOString(), topRanked: isTop }; r.recommendation = `${vendorName(st, rec.vid)} - ${rec.text.trim()}`; }, `Award recommended to ${vendorName(st, rec.vid)}${isTop ? "" : " (not top-ranked)"} - ${rec.text.trim()}`); toast("Recommendation recorded - award by line next"); setRec(null); }}>Save</Btn></>}>
            <div className="space-y-3">
              <Field label="Recommend"><Select value={rec.vid} onChange={(x) => setRec({ ...rec, vid: x })} options={rank.filter((r) => r.qualified).map((r) => ({ value: r.q.vendorId, label: `${vendorName(st, r.q.vendorId)} - combined ${r.total.toFixed(1)}` }))} /></Field>
              {!isTop && <Note tone="amber">{vendorName(st, top.q.vendorId)} ranks first - explain why another bidder is recommended.</Note>}
              <Field label="Justification"><TextArea rows={3} value={rec.text} onChange={(x) => setRec({ ...rec, text: x })} placeholder="e.g. Best combined score; final offer 4% lower; delivery fits the pour schedule" /></Field>
              {err && <FieldErr m={err} />}
            </div>
          </Modal>
        );
      })()}
    </>
  );
}
