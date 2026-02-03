import { useEffect, useState } from "react";

import { ApiClient, Vendor } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

const categories = ["RESTAURANTS", "PRODUCTS", "PHARMACY", "MARKET"];

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    category: "RESTAURANTS",
    supports_pickup: false,
    address_text: "",
    lat: "",
    lng: "",
  });

  const loadVendors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listVendors();
      setVendors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vendors");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVendors();
  }, []);

  const handleSubmit = async () => {
    if (!form.lat || !form.lng) {
      setError("Latitude and longitude are required.");
      return;
    }
    try {
      await client.createVendor({
        category: form.category,
        supports_pickup: form.supports_pickup,
        address_text: form.address_text || undefined,
        geo: { lat: Number(form.lat), lng: Number(form.lng) },
      });
      setShowModal(false);
      setForm({
        category: "RESTAURANTS",
        supports_pickup: false,
        address_text: "",
        lat: "",
        lng: "",
      });
      await loadVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vendor");
    }
  };

  return (
    <section>
      <div className="page-header">
        <h1>Vendors</h1>
        <button className="primary" onClick={() => setShowModal(true)}>
          Create Vendor
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>Loading vendors…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Category</th>
              <th>Pickup</th>
              <th>Address</th>
              <th>Geo</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.vendor_id}>
                <td>{vendor.vendor_id}</td>
                <td>{vendor.category}</td>
                <td>{vendor.supports_pickup ? "Yes" : "No"}</td>
                <td>{vendor.address_text ?? "-"}</td>
                <td>
                  {vendor.geo.lat}, {vendor.geo.lng}
                </td>
                <td>{new Date(vendor.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>Create Vendor</h2>
            <label>
              Category
              <select
                value={form.category}
                onChange={(event) =>
                  setForm({ ...form, category: event.target.value })
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={form.supports_pickup}
                onChange={(event) =>
                  setForm({ ...form, supports_pickup: event.target.checked })
                }
              />
              Supports pickup
            </label>
            <label>
              Address
              <input
                type="text"
                value={form.address_text}
                onChange={(event) =>
                  setForm({ ...form, address_text: event.target.value })
                }
              />
            </label>
            <div className="grid">
              <label>
                Latitude
                <input
                  type="number"
                  value={form.lat}
                  onChange={(event) => setForm({ ...form, lat: event.target.value })}
                />
              </label>
              <label>
                Longitude
                <input
                  type="number"
                  value={form.lng}
                  onChange={(event) => setForm({ ...form, lng: event.target.value })}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="primary" onClick={handleSubmit}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
