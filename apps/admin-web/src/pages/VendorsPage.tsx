import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  Badge,
  Button,
  DialogContent,
  DialogRoot,
  DialogTitle,
  Input,
  PageShell,
  Select,
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  toast,
} from "@nodex/ui";
import { useTranslation } from "react-i18next";
import { formatDateTime, formatNumber } from "@nodex/i18n";
import { ApiClient, Vendor } from "../api/client";
import { resolveAssetUrl } from "../utils/resolveAssetUrl";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

const categories = ["RESTAURANTS", "PRODUCTS", "PHARMACY", "MARKET"];

export function VendorsPage() {
  const { t } = useTranslation();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    login: "",
    password: "",
    owner_full_name: "",
    phone1: "",
    phone2: "",
    phone3: "",
    email: "",
    inn: "",
    category: "RESTAURANTS",
    supports_pickup: false,
    delivers_self: false,
    address_text: "",
    is_active: true,
    is_blocked: false,
    opening_hours: "",
    payout_details: "",
    main_image_url: "",
    gallery_images: [] as string[],
    lat: "",
    lng: "",
  });
  const [isUploading, setIsUploading] = useState(false);

  const loadVendors = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await client.listVendors();
      setVendors(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.loadVendors");
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadVendors();
  }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError(t("errors.vendorNameRequired"));
      return;
    }
    if (!form.phone1.trim()) {
      setError(t("errors.vendorPhoneRequired"));
      return;
    }
    if (!form.lat || !form.lng) {
      setError(t("errors.vendorGeoRequired"));
      return;
    }
    if (form.payout_details.trim()) {
      try {
        JSON.parse(form.payout_details);
      } catch {
        setError(t("errors.payoutJson"));
        return;
      }
    }
    try {
      await client.createVendor({
        name: form.name.trim(),
        login: form.login.trim() || null,
        password: form.password || null,
        owner_full_name: form.owner_full_name.trim() || undefined,
        phone1: form.phone1.trim() || undefined,
        phone2: form.phone2.trim() || undefined,
        phone3: form.phone3.trim() || undefined,
        email: form.email.trim() || undefined,
        inn: form.inn.trim() || undefined,
        category: form.category,
        supports_pickup: form.supports_pickup,
        delivers_self: form.delivers_self,
        address_text: form.address_text || undefined,
        is_active: form.is_active,
        is_blocked: form.is_blocked,
        opening_hours: form.opening_hours.trim() || undefined,
        payout_details: form.payout_details.trim()
          ? JSON.parse(form.payout_details)
          : undefined,
        main_image_url: form.main_image_url.trim() || undefined,
        gallery_images: form.gallery_images,
        geo: { lat: Number(form.lat), lng: Number(form.lng) },
      });
      setShowModal(false);
      setForm({
        name: "",
        login: "",
        password: "",
        owner_full_name: "",
        phone1: "",
        phone2: "",
        phone3: "",
        email: "",
        inn: "",
        category: "RESTAURANTS",
        supports_pickup: false,
        delivers_self: false,
        address_text: "",
        is_active: true,
        is_blocked: false,
        opening_hours: "",
        payout_details: "",
        main_image_url: "",
        gallery_images: [],
        lat: "",
        lng: "",
      });
      await loadVendors();
      toast.success(t("vendor.vendorCreated"));
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.createVendor");
      setError(message);
      toast.error(message);
    }
  };

  return (
    <PageShell
      title={t("nav.vendors")}
      subtitle={t("admin.vendorsSubtitle")}
      actions={<Button onClick={() => setShowModal(true)}>{t("admin.createVendor")}</Button>}
    >
      {isLoading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("fields.id")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.name")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.category")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.active")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.blocked")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.pickup")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.rating")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.promotions")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.weeklyStats")}</TableHeaderCell>
              <TableHeaderCell>{t("fields.createdAt")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <tbody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.vendor_id}>
                <TableCell>{vendor.vendor_id}</TableCell>
                <TableCell>
                  <div className="font-semibold text-slate-900">{vendor.name}</div>
                  <div className="text-xs text-slate-400">{vendor.address_text ?? "-"}</div>
                </TableCell>
                <TableCell>{t(`category.${vendor.category}`)}</TableCell>
                <TableCell>
                  <Badge variant={vendor.is_active ? "success" : "default"}>
                    {vendor.is_active ? t("common.yes") : t("common.no")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={vendor.is_blocked ? "danger" : "success"}>
                    {vendor.is_blocked ? t("common.blocked") : t("common.no")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={vendor.supports_pickup ? "info" : "default"}>
                    {vendor.supports_pickup ? t("common.yes") : t("common.no")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {vendor.rating_avg !== undefined && vendor.rating_count !== undefined
                    ? `${vendor.rating_avg.toFixed(1)} (${formatNumber(vendor.rating_count)})`
                    : "-"}
                </TableCell>
                <TableCell>{formatNumber(vendor.active_promotions_count ?? 0)}</TableCell>
                <TableCell>
                  {vendor.weekly_stats
                    ? `${formatNumber(vendor.weekly_stats.revenue)} / ${formatNumber(
                        vendor.weekly_stats.completed_count,
                      )} / ${formatNumber(vendor.weekly_stats.average_check)}`
                    : "-"}
                </TableCell>
                <TableCell>{formatDateTime(vendor.created_at)}</TableCell>
                <TableCell>
                  <Link className="text-sky-600" to={`/vendors/${vendor.vendor_id}`}>
                    {t("common.edit")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      )}

      <DialogRoot open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogTitle>{t("admin.createVendor")}</DialogTitle>
          {error && <div className="text-sm text-rose-500">{error}</div>}
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              {t("admin.vendors.form.login")}
              <Input
                value={form.login}
                onChange={(event) => setForm({ ...form, login: event.target.value })}
              />
            </label>
            <label>
              {t("admin.vendors.form.password")}
              <Input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </label>
            <label>
              {t("fields.name")}
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              {t("fields.ownerFullName")}
              <Input
                value={form.owner_full_name}
                onChange={(event) =>
                  setForm({ ...form, owner_full_name: event.target.value })
                }
              />
            </label>
            <label>
              {t("fields.phone1")}
              <Input
                value={form.phone1}
                onChange={(event) => setForm({ ...form, phone1: event.target.value })}
              />
            </label>
            <label>
              {t("fields.phone2")}
              <Input
                value={form.phone2}
                onChange={(event) => setForm({ ...form, phone2: event.target.value })}
              />
            </label>
            <label>
              {t("fields.phone3")}
              <Input
                value={form.phone3}
                onChange={(event) => setForm({ ...form, phone3: event.target.value })}
              />
            </label>
            <label>
              {t("fields.email")}
              <Input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              {t("fields.inn")}
              <Input
                value={form.inn}
                onChange={(event) => setForm({ ...form, inn: event.target.value })}
              />
            </label>
            <label>
              {t("fields.category")}
              <Select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {t(`category.${category}`)}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              {t("fields.address")}
              <Input
                value={form.address_text}
                onChange={(event) => setForm({ ...form, address_text: event.target.value })}
              />
            </label>
            <label>
              {t("fields.openingHours")}
              <Input
                value={form.opening_hours}
                onChange={(event) =>
                  setForm({ ...form, opening_hours: event.target.value })
                }
              />
            </label>
            <div className="md:col-span-2">
              <div className="field-header">
                <span>{t("fields.mainImage")}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setIsUploading(true);
                    try {
                      const result = await client.uploadFile(file);
                      setForm((prev) => ({ ...prev, main_image_url: result.public_url }));
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : t("errors.uploadFailed");
                      setError(message);
                      toast.error(message);
                    } finally {
                      setIsUploading(false);
                      event.target.value = "";
                    }
                  }}
                  disabled={isUploading}
                />
              </div>
              {form.main_image_url ? (
                <div className="image-preview">
                  <img src={resolveAssetUrl(form.main_image_url)} alt={t("fields.mainImage")} />
                  <button
                    type="button"
                    className="link danger"
                    onClick={() => setForm((prev) => ({ ...prev, main_image_url: "" }))}
                  >
                    {t("common.remove")}
                  </button>
                </div>
              ) : (
                <div className="muted">{t("empty.noImage")}</div>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="field-header">
                <span>{t("fields.gallery")}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={async (event) => {
                    const files = Array.from(event.target.files ?? []);
                    if (files.length === 0) return;
                    setIsUploading(true);
                    try {
                      const uploaded: string[] = [];
                      for (const file of files) {
                        const result = await client.uploadFile(file);
                        uploaded.push(result.public_url);
                      }
                      setForm((prev) => ({
                        ...prev,
                        gallery_images: [...prev.gallery_images, ...uploaded],
                      }));
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : t("errors.uploadFailed");
                      setError(message);
                      toast.error(message);
                    } finally {
                      setIsUploading(false);
                      event.target.value = "";
                    }
                  }}
                  disabled={isUploading}
                />
              </div>
              {form.gallery_images.length === 0 ? (
                <div className="muted">{t("empty.noGallery")}</div>
              ) : (
                <div className="image-grid">
                  {form.gallery_images.map((url) => (
                    <div key={url} className="image-item">
                      <img src={resolveAssetUrl(url)} alt={t("fields.gallery")} />
                      <button
                        type="button"
                        className="link danger"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            gallery_images: prev.gallery_images.filter((item) => item !== url),
                          }))
                        }
                      >
                        {t("common.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <label>
              {t("fields.latitude")}
              <Input
                type="number"
                value={form.lat}
                onChange={(event) => setForm({ ...form, lat: event.target.value })}
              />
            </label>
            <label>
              {t("fields.longitude")}
              <Input
                type="number"
                value={form.lng}
                onChange={(event) => setForm({ ...form, lng: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.supports_pickup}
                onChange={(event) => setForm({ ...form, supports_pickup: event.target.checked })}
              />
              {t("fields.pickup")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.delivers_self}
                onChange={(event) => setForm({ ...form, delivers_self: event.target.checked })}
              />
              {t("fields.deliversSelf")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              {t("fields.active")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_blocked}
                onChange={(event) => setForm({ ...form, is_blocked: event.target.checked })}
              />
              {t("fields.blocked")}
            </label>
            <label className="col-span-2">
              {t("fields.payoutDetails")}
              <textarea
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                rows={4}
                value={form.payout_details}
                onChange={(event) =>
                  setForm({ ...form, payout_details: event.target.value })
                }
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit}>{t("common.create")}</Button>
          </div>
        </DialogContent>
      </DialogRoot>
    </PageShell>
  );
}
