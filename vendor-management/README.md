# Vendor Management Module

A standalone vendor management system for an EPC (Engineering, Procurement,
Construction) workforce-management (WFM) platform. Covers the full vendor
lifecycle: registration → qualification/approval → RFQ → quotation →
selection → PO/contracts → delivery → invoicing → payment → performance
scorecard.

This is independent of any other app in this repo — it's a separate
full-stack project with its own backend and frontend.

## Stack

- **Backend**: Node.js + Express + Prisma ORM + PostgreSQL
- **Frontend**: React + Vite + React Router

## Project layout

```
vendor-management/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma   # full data model (12 modules)
│   │   └── seed.js         # realistic EPC sample data
│   └── src/
│       ├── routes/         # one router per module
│       └── server.js
├── frontend/
│   └── src/
│       ├── pages/          # one screen per module
│       └── api.js          # thin fetch client
└── docker-compose.yml       # local Postgres
```

## Data model highlights

- **Vendor master** is the spine — bank accounts, tax settings, hold
  status, and trade tags all live on the `Vendor` record and are read by
  every downstream transaction (RFQ, PO, invoice, payment).
- **One generic approval-workflow engine** (`ApprovalWorkflow` /
  `ApprovalInstance` / `ApprovalAction`) drives vendor onboarding
  approval, PO approval, and invoice hold-release — instead of three
  separate implementations.
- **3-way matching** (PO / Goods Receipt / Invoice) gates invoice
  approval; **insurance/document holds** gate payment release.
- **Labor sourcing** (job postings, rate cards, worker profiles,
  timesheets → auto-invoice) is modeled alongside goods procurement,
  since EPC vendors are a mix of material suppliers and labor
  subcontractors.

See `backend/prisma/schema.prisma` for the full model and inline
comments mapping each entity back to its module.

## Running locally

### 1. Start Postgres

```bash
cd vendor-management
docker compose up -d
```

(Or point `DATABASE_URL` at any Postgres 14+ instance you already have.)

### 2. Backend

```bash
cd backend
cp .env.example .env      # adjust DATABASE_URL if needed
npm install
npx prisma migrate dev    # creates schema
npm run seed              # loads sample EPC vendors/PO/invoice/payment data
npm run dev               # starts on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env       # points at the backend above
npm install
npm run dev                # starts on http://localhost:5173
```

Open `http://localhost:5173` — you'll land on the Vendor directory, seeded
with a cement supplier and an electrical subcontractor taken through a
full PO → delivery → invoice → payment cycle.

## What's implemented vs. stubbed

Implemented end-to-end (data model + API + UI): vendor registration and
two-tier promotion, document/hold management, generic approval workflow,
RFQ → quotation → comparison → PO conversion, PO submission + goods
receipt with accept/reject split, 3-way invoice matching, credit/debit
notes, payment entry with auto bank-account fetch and withholding tax,
batch payment runs, weighted vendor scorecards with auto-block, labor
sourcing (job postings → candidates → shortlist/select), rate cards,
worker profiles + timesheets → auto-invoice, and contracts (master
agreement/SOW/blanket/amendment) with SOW milestones → complete → accept
→ auto-invoice and 90/30-day renewal alerts.

Modeled in the schema and exposed via API, but without a dedicated UI
screen yet: subcontracting orders (raw-material-out/finished-goods-back)
and quality inspection records. These are the natural next screens to
build.

The current screens are functional-first, plain default styling — a
placeholder to validate the flows, not a finished design. Expect this to
be restyled once the intended UI direction is set.
