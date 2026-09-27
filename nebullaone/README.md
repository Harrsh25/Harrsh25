# NebullaOne — Vendor Management and Contract & Labor modules

`../NebullaOne-WFM.html` is a single-file React build. Its original source isn't in this repo, so the new
modules are kept here as readable JSX and injected into that file.

```bash
cd nebullaone
npm install
npm run build   # compiles src/*.jsx and injects JS + CSS into ../NebullaOne-WFM.html
```

The build can be re-run safely: it replaces its own injected code between `/*NXV:...*/` markers each time.
The new code reuses the host bundle's components (card, header, table cells, badges, stat tiles) and adds only
Tailwind classes the bundle doesn't already contain. Demo data lives in the browser's localStorage
(`nxv-store-v1`); use **⋯ → Reset demo data** on any page to start over.

| File | What's in it |
|---|---|
| `src/00-core.jsx` | aliases to host components, store, helpers, UI kit (modal, drawer, fields, tables) |
| `src/01-logic.jsx` | compliance engine, RA bill maths, ledgers, 3-way match, scorecard |
| `src/02-seed.jsx` | demo data |
| `src/10`–`13` | Vendor Management pages |
| `src/14-public-approvals.jsx` | public self-registration and vendor quotation pages, Approval Management |
| `src/20`–`23` | Contract & Labor pages |
| `src/90-nav.jsx` | sidebar groups and routes |
