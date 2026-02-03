import { useEffect, useState } from "react";

type PromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  is_active: boolean;
};

const STORAGE_KEY = "nodex_admin_promo_codes";

export function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    code: "",
    discount_percent: "10",
    is_active: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCodes(JSON.parse(stored) as PromoCode[]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  }, [codes]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ code: "", discount_percent: "10", is_active: true });
    setShowModal(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditingId(promo.id);
    setForm({
      code: promo.code,
      discount_percent: String(promo.discount_percent),
      is_active: promo.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    const payload: PromoCode = {
      id: editingId ?? crypto.randomUUID(),
      code: form.code.trim(),
      discount_percent: Number(form.discount_percent),
      is_active: form.is_active,
    };

    if (!payload.code) {
      return;
    }

    setCodes((prev) => {
      if (editingId) {
        return prev.map((item) => (item.id === editingId ? payload : item));
      }
      return [payload, ...prev];
    });
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    setCodes((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <section>
      <div className="page-header">
        <h1>Promo Codes</h1>
        <button className="primary" onClick={openCreate}>
          Create Promo Code
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount %</th>
            <th>Active</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {codes.map((promo) => (
            <tr key={promo.id}>
              <td>{promo.code}</td>
              <td>{promo.discount_percent}</td>
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
              <td colSpan={4}>No promo codes yet.</td>
            </tr>
          )}
        </tbody>
      </table>

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
              Discount %
              <input
                type="number"
                value={form.discount_percent}
                onChange={(event) =>
                  setForm({ ...form, discount_percent: event.target.value })
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
