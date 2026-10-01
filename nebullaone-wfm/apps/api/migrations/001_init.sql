-- NebullaOne WFM — initial schema.
--
-- Pattern: each business entity has its own table. Columns that are used for
-- joins, filters, permissions or integrity (ids, foreign keys, status) are real
-- columns with constraints; the full record (including nested line items and
-- history) lives in `doc jsonb`. The API keeps the columns in sync with `doc`.

CREATE TABLE app_config (
  key        text PRIMARY KEY,
  doc        jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE id_counters (
  prefix text PRIMARY KEY,
  next   integer NOT NULL
);

CREATE TABLE vendors (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  status     text NOT NULL,
  doc        jsonb NOT NULL,
  version    integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX vendors_gstin_uq ON vendors ((doc->>'gstin')) WHERE coalesce(doc->>'gstin','') <> '';

CREATE TABLE users (
  id            serial PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  name          text NOT NULL,
  role          text NOT NULL CHECK (role IN ('admin','procurement','legal','finance','project','qa_hse','vendor')),
  vendor_id     text REFERENCES vendors(id),
  password_hash text NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CHECK ((role = 'vendor') = (vendor_id IS NOT NULL))
);

CREATE TABLE audit_log (
  id      bigserial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  by_user text NOT NULL,
  entity  text NOT NULL,
  ref_id  text NOT NULL,
  action  text NOT NULL,
  detail  jsonb
);
CREATE INDEX audit_log_ref ON audit_log (entity, ref_id);

CREATE TABLE invites (
  id text PRIMARY KEY, vendor_id text REFERENCES vendors(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE holds (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), status text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('All','RFQ/PO','Invoices','Payments')),
  ref_id text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX holds_active ON holds (vendor_id) WHERE status = 'Active';

CREATE TABLE contracts (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), status text NOT NULL, project text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE work_orders (
  id text PRIMARY KEY, contract_id text NOT NULL REFERENCES contracts(id), vendor_id text NOT NULL REFERENCES vendors(id),
  status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE measurements (
  id text PRIMARY KEY, wo_id text NOT NULL REFERENCES work_orders(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ra_bills (
  id text PRIMARY KEY, wo_id text NOT NULL REFERENCES work_orders(id), contract_id text NOT NULL REFERENCES contracts(id),
  vendor_id text NOT NULL REFERENCES vendors(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE claims (
  id text PRIMARY KEY, wo_id text NOT NULL REFERENCES work_orders(id), vendor_id text NOT NULL REFERENCES vendors(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE retention_releases (
  id text PRIMARY KEY, contract_id text NOT NULL REFERENCES contracts(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), ra_bill_id text REFERENCES ra_bills(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX invoices_vendor_number_uq ON invoices (vendor_id, (doc->>'number'));

CREATE TABLE vendor_advances (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE requisitions (
  id text PRIMARY KEY, status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE rfqs (
  id text PRIMARY KEY, status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE blanket_orders (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE purchase_orders (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), rfq_id text REFERENCES rfqs(id),
  blanket_id text REFERENCES blanket_orders(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE service_receipts (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), po_id text NOT NULL REFERENCES purchase_orders(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vendor_prices (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE labor_rates (
  id text PRIMARY KEY, vendor_id text REFERENCES vendors(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  -- Minimum Wages Act: a rate may never be approved below the statutory minimum (B1).
  CONSTRAINT labor_rate_min_wage CHECK (status <> 'Active' OR (doc->>'rate')::numeric >= (doc->>'minWage')::numeric)
);

CREATE TABLE ratings (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), wo_id text REFERENCES work_orders(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE caps (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tickets (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workers (
  id text PRIMARY KEY, vendor_id text NOT NULL REFERENCES vendors(id), wo_id text REFERENCES work_orders(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE attendance (
  id text PRIMARY KEY, wo_id text NOT NULL REFERENCES work_orders(id), worker_id text NOT NULL REFERENCES workers(id),
  date date NOT NULL, status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, wo_id, worker_id)
);

CREATE TABLE ncrs (
  id text PRIMARY KEY, wo_id text REFERENCES work_orders(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE punch_items (
  id text PRIMARY KEY, contract_id text NOT NULL REFERENCES contracts(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inspections (
  id text PRIMARY KEY, contract_id text NOT NULL REFERENCES contracts(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE material_issues (
  id text PRIMARY KEY, wo_id text NOT NULL REFERENCES work_orders(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE dprs (
  id text PRIMARY KEY, wo_id text NOT NULL REFERENCES work_orders(id), status text,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE safety_incidents (
  id text PRIMARY KEY, vendor_id text REFERENCES vendors(id), wo_id text REFERENCES work_orders(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE kickoffs (
  id text PRIMARY KEY, contract_id text NOT NULL UNIQUE REFERENCES contracts(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE final_settlements (
  id text PRIMARY KEY, contract_id text NOT NULL UNIQUE REFERENCES contracts(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contractor_releases (
  id text PRIMARY KEY, contract_id text NOT NULL UNIQUE REFERENCES contracts(id), status text NOT NULL,
  doc jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
