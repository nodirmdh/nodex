import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
    name: "",
    owner_full_name: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    inn: "",
    category: "RESTAURANTS",
    supports_pickup: false,
    address_text: "",
    is_active: true,
    opening_hours: "",
    payout_details: "",
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
    if (!form.name.trim()) {
      setError("Vendor name is required.");
      return;
    }
    if (!form.phone1.trim()) {
      setError("Phone 1 is required.");
      return;
    }
    if (!form.lat || !form.lng) {
      setError("Latitude and longitude are required.");
      return;
    }
    if (form.payout_details.trim()) {
      try {
        JSON.parse(form.payout_details);
      } catch {
        setError("Payout details must be valid JSON.");
        return;
      }
    }
    try {
      await client.createVendor({
        name: form.name.trim(),
        owner_full_name: form.owner_full_name.trim() || undefined,
        phone1: form.phone1.trim() || undefined,
        phone2: form.phone2.trim() || undefined,
        phone3: form.phone3.trim() || undefined,
        email: form.email.trim() || undefined,
        inn: form.inn.trim() || undefined,
        category: form.category,
        supports_pickup: form.supports_pickup,
        address_text: form.address_text || undefined,
        is_active: form.is_active,
        opening_hours: form.opening_hours.trim() || undefined,
        payout_details: form.payout_details.trim()
          ? JSON.parse(form.payout_details)
          : undefined,
        geo: { lat: Number(form.lat), lng: Number(form.lng) },
      });
      setShowModal(false);
      setForm({
        name: "",
        owner_full_name: "",
        phone1: "",
        phone2: "",
        phone3: "",
        email: "",
        inn: "",
        category: "RESTAURANTS",
        supports_pickup: false,
        address_text: "",
        is_active: true,
        opening_hours: "",
        payout_details: "",
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
              <th>Name</th>
              <th>Category</th>
              <th>Active</th>
              <th>Pickup</th>
              <th>Address</th>
              <th>Phone</th>
              <th>INN</th>
              <th>Geo</th>
              <th>Rating</th>
              <th>Promos</th>
              <th>Weekly stats</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.vendor_id}>
                <td>{vendor.vendor_id}</td>
                <td>{vendor.name}</td>
                <td>{vendor.category}</td>
                <td>{vendor.is_active ? "Yes" : "No"}</td>
                <td>{vendor.supports_pickup ? "Yes" : "No"}</td>
                <td>{vendor.address_text ?? "-"}</td>
                <td>{vendor.phone1 ?? vendor.phone ?? "-"}</td>
                <td>{vendor.inn ?? "-"}</td>
                <td>
                  {vendor.geo.lat}, {vendor.geo.lng}
                </td>
                <td>
                  {vendor.rating_avg !== undefined && vendor.rating_count !== undefined
                    ? `${vendor.rating_avg.toFixed(1)} (${vendor.rating_count})`
                    : "-"}
                </td>
                <td>{vendor.active_promotions_count ?? 0}</td>
                <td>
                  {vendor.weekly_stats
                    ? `${vendor.weekly_stats.revenue} / ${vendor.weekly_stats.completed_count} / ${vendor.weekly_stats.average_check}`
                    : "-"}
                </td>
                <td>{new Date(vendor.created_at).toLocaleString()}</td>
                <td>
                  <Link to={`/vendors/${vendor.vendor_id}`}>Edit</Link>
                </td>
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
              Name
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
            </label>
            <label>
              Owner full name
              <input
                type="text"
                value={form.owner_full_name}
                onChange={(event) =>
                  setForm({ ...form, owner_full_name: event.target.value })
                }
              />
            </label>
            <label>
              Phone 1
              <input
                type="text"
                value={form.phone1}
                onChange={(event) =>
                  setForm({ ...form, phone1: event.target.value })
                }
              />
            </label>
            <label>
              Phone 2
              <input
                type="text"
                value={form.phone2}
                onChange={(event) =>
                  setForm({ ...form, phone2: event.target.value })
                }
              />
            </label>
            <label>
              Phone 3
              <input
                type="text"
                value={form.phone3}
                onChange={(event) =>
                  setForm({ ...form, phone3: event.target.value })
                }
              />
            </label>
            <label>
              Email
              <input
                type="text"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
            </label>
            <label>
              INN
              <input
                type="text"
                value={form.inn}
                onChange={(event) =>
                  setForm({ ...form, inn: event.target.value })
                }
              />
            </label>
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
                checked={form.is_active}
                onChange={(event) =>
                  setForm({ ...form, is_active: event.target.checked })
                }
              />
              Active
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
            <label>
              Opening hours
              <input
                type="text"
                value={form.opening_hours}
                onChange={(event) =>
                  setForm({ ...form, opening_hours: event.target.value })
                }
              />
            </label>
            <label>
              Payout details (JSON)
              <textarea
                value={form.payout_details}
                onChange={(event) =>
                  setForm({ ...form, payout_details: event.target.value })
                }
                rows={4}
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
