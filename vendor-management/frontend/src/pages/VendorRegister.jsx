import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

// Vendor Registration Form (module 1.1.1) — deliberately minimal: only
// what's needed to create a Prospective record. Full profile (tax ID, bank
// details) is collected later, when promoting to Spend-Authorized.
export default function VendorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    legalName: "",
    vendorType: "GOODS",
    currency: "INR",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const vendor = await api.post("/vendors", {
        legalName: form.legalName,
        vendorType: form.vendorType,
        currency: form.currency,
        contact: form.contactName
          ? { name: form.contactName, email: form.contactEmail, phone: form.contactPhone }
          : undefined,
      });
      navigate(`/vendors/${vendor.id}`);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Register Vendor</h1>
      {error && <div className="error-banner">{error}</div>}
      <form className="card" onSubmit={submit} style={{ maxWidth: 560 }}>
        <div className="field">
          <label>Company / Legal Name *</label>
          <input required value={form.legalName} onChange={update("legalName")} />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Vendor Type *</label>
            <select value={form.vendorType} onChange={update("vendorType")}>
              <option value="GOODS">Goods</option>
              <option value="SERVICES">Services</option>
              <option value="LABOR">Labor</option>
            </select>
          </div>
          <div className="field">
            <label>Currency</label>
            <input value={form.currency} onChange={update("currency")} />
          </div>
        </div>
        <h3>Primary Contact</h3>
        <div className="form-grid">
          <div className="field">
            <label>Name</label>
            <input value={form.contactName} onChange={update("contactName")} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.contactEmail} onChange={update("contactEmail")} />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={form.contactPhone} onChange={update("contactPhone")} />
          </div>
        </div>
        <button className="primary" type="submit" disabled={saving}>
          {saving ? "Saving..." : "Create Vendor (Prospective)"}
        </button>
      </form>
    </div>
  );
}
