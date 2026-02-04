import { useEffect, useState } from "react";

import { ApiClient, PromoCode } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    type: "PERCENT",
    value: "10",
    is_active: true,
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.listPromoCodes();
        setCodes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load promo codes");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ code: "", type: "PERCENT", value: "10", is_active: true });
    setShowModal(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      type: promo.type,
      value: String(promo.value),
      is_active: promo.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    const code = form.code.trim();
    const value = Number(form.value);
    if (!code || !Number.isFinite(value)) {
      setError("Code and value are required.");
      return;
    }

    try {
      setError(null);
      if (editingId) {
        const updated = await client.updatePromoCode(editingId, {
          code,
          type: form.type as "PERCENT" | "FIXED",
          value,
          is_active: form.is_active,
        });
        setCodes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      } else {
        const created = await client.createPromoCode({
          code,
          type: form.type as "PERCENT" | "FIXED",
          value,
          is_active: form.is_active,
        });
        setCodes((prev) => [created, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save promo code");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await client.deletePromoCode(id);
      setCodes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete promo code");
    }
  };

  return (
    <section>
      <div className="page-header">
        <h1>Promo Codes</h1>
        <button className="primary" onClick={openCreate}>
          Create Promo Code
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>Loading promo codes...</p>
      ) : (
      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Type</th>
            <th>Value</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {codes.map((promo) => (
            <tr key={promo.id}>
              <td>{promo.code}</td>
              <td>{promo.type}</td>
              <td>{promo.value}</td>
              <td>{promo.is_active ? "Yes" : "No"}</td>
              <td>
                <button className="link" onClick={() => openEdit(promo)}>
                  Edit
                </button>
                <button className="link danger" onClick={() => handleDelete(promo.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {codes.length === 0 && (
            <tr>
              <td colSpan={5}>No promo codes yet.</td>
            </tr>
          )}
        </tbody>
      </table>
      )}

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>{editingId ? "Edit Promo Code" : "Create Promo Code"}</h2>
            <label>
              Code
              <input
                type="text"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            </label>
            <label>
              Type
              <select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="PERCENT">PERCENT</option>
                <option value="FIXED">FIXED</option>
              </select>
            </label>
            <label>
              Value
              <input
                type="number"
                value={form.value}
                onChange={(event) =>
                  setForm({ ...form, value: event.target.value })
                }
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              Active
            </label>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="primary" onClick={handleSubmit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
