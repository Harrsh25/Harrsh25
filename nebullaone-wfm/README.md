# NebullaOne WFM — Vendor & Contractor Management

A working rebuild of the NebullaOne prototype (`prototype/NebullaOne-WFM.html`) as real source code with a backend:

- **Web app**: React + TypeScript + Vite + Tailwind. Same screens and look as the prototype.
- **API**: Node + Fastify + TypeScript + PostgreSQL. Real logins, roles, validation, audit log.
- **Shared rules** (`packages/shared`): the calculations (RA bills, compliance, holds, DLP, guarantees, 3-way match, scorecard) used by both the API and the web app, with unit tests.

The prototype was a compiled single HTML file with all data in the browser's local storage. It is kept unchanged in `prototype/` as the reference, and its demo data is loaded into the database by the seed script.

## What's in it

**Vendor Management**: Overview · Vendor Registry (registration wizard with GSTIN/PAN checks, documents, bank verification, qualification) · Vendor Approvals · Compliance Center · **Holds Register (new)** · Purchase Requisitions · RFQ & Quotations (compare, award → PO) · Blanket Orders (call-offs) · Price Lists · Purchase Orders · **Goods Receipts (new)** · **Service Receipts (new)** · Invoices & Payments (3-way match, payments, advances, debit notes) · Vendor Scorecard · Vendor Portal · Procurement Settings

**Contract & Labor**: Overview · Contractor Onboarding · Contracts (approval, guarantees, change orders, financial security) · **Contract Kickoff (new)** · Work Orders · **Change & Variations (new)** · Labour Attendance (muster → measurement book) · Measurement Book (JMS, QC, NCRs) · RA Bills & Certification · Retention & Guarantees (incl. **security deposit**) · Labour Rate Management · Performance & Progress · **Safety Incidents (new)** · Close-out & Handover · **Final Settlement (new)** · **Contractor Release (new)**

**Supplier portal**: vendors sign in and see only their own RFQs (never competitors' prices), POs, work orders to accept, RA claims, bills, documents and queries.

See `docs/GAP-ANALYSIS.md` for how this maps to the master architecture, and `docs/BUGS.md` for the prototype bugs found and fixed.

## Run it locally

Needs Node 20+ and PostgreSQL 16.

```bash
npm install
docker compose up -d                     # or use your own PostgreSQL
cp apps/api/.env.example apps/api/.env   # adjust DATABASE_URL / JWT_SECRET
npm run db:seed                          # creates tables and loads demo data (resets the database!)
npm run dev:api                          # API on http://localhost:4000
npm run dev:web                          # web on http://localhost:5173
```

### Demo accounts (password `nebulla123`, set by `SEED_PASSWORD`)

| Email | Role |
|---|---|
| admin@nebullaone.in | Administrator |
| procurement@nebullaone.in | Procurement |
| legal@nebullaone.in | Legal Counsel |
| finance@nebullaone.in | Finance Controller |
| pm@nebullaone.in | Project / Site Engineer |
| qa@nebullaone.in | QA / HSE |
| ramesh@shreebalaji.in | Vendor portal (Shree Balaji Infra) |

Approvals enforce segregation of duties (the person who prepares a bill, change order, rate or requisition can't approve it), so try workflows with two accounts.

## Tests

```bash
npm test                                  # shared unit tests + API integration tests (uses database nebulla_test)
node e2e/crawl.cjs                        # opens every screen in Chromium, reports errors (needs Playwright + running app)
node e2e/e2e.cjs                          # click-through workflows as vendor, finance and PM (reseed first)
```

## Production

```bash
npm run build -w @nebulla/web             # builds apps/web/dist
NODE_ENV=production JWT_SECRET=... DATABASE_URL=... npm start -w @nebulla/api
```

In production the API also serves the built web app. `JWT_SECRET` is required. Run `npm run db:migrate` (not `db:seed`) against a real database.

## Project layout

```
prototype/        original compiled prototype (reference only)
docs/             gap analysis and bug report
packages/shared/  business rules + unit tests
apps/api/         Fastify API, migrations, seed, integration tests
apps/web/         React app
e2e/              browser checks
```

## Not included yet

- The other prototype modules (Projects, Cost Center, Activity, HRMS) — only Vendor Management and Contract & Labor were rebuilt.
- File upload storage: documents are recorded by file name/reference; there's no file store yet.
- Emails / notifications (RFQ invites, expiry reminders) are recorded but not sent.
- Bank payment files, GST e-invoicing and accounting integration.
