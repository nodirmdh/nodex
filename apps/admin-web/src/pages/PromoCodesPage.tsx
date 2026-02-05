import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
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
} from "@nodex/ui";
import { formatNumber } from "@nodex/i18n";
import { ApiClient, PromoCode } from "../api/client";

const client = new ApiClient({
  onUnauthorized: () => {
    window.location.href = "/login";
  },
});

export function PromoCodesPage() {
  const { t } = useTranslation();
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
        setError(err instanceof Error ? err.message : t("admin.promoCodes.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [t]);

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
      setError(t("admin.promoCodes.form.required"));
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
      setError(err instanceof Error ? err.message : t("admin.promoCodes.saveFailed"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await client.deletePromoCode(id);
      setCodes((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.promoCodes.deleteFailed"));
    }
  };

  return (
    <PageShell
      title={t("admin.promoCodes.title")}
      subtitle={t("admin.promoCodes.subtitle")}
      actions={
        <Button onClick={openCreate}>{t("admin.promoCodes.create")}</Button>
      }
    >
      {error && <div className="error-banner">{error}</div>}
      {isLoading ? (
        <p>{t("admin.promoCodes.loading")}</p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{t("admin.promoCodes.table.code")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.promoCodes.table.type")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.promoCodes.table.value")}</TableHeaderCell>
              <TableHeaderCell>{t("admin.promoCodes.table.active")}</TableHeaderCell>
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <tbody>
            {codes.map((promo) => (
              <TableRow key={promo.id}>
                <TableCell>{promo.code}</TableCell>
                <TableCell>{promo.type}</TableCell>
                <TableCell>{formatNumber(promo.value)}</TableCell>
                <TableCell>{promo.is_active ? t("common.yes") : t("common.no")}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => openEdit(promo)}>
                      {t("common.edit")}
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(promo.id)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {codes.length === 0 && (
              <TableRow>
                <TableCell className="text-center" colSpan={5}>
                  {t("admin.promoCodes.empty")}
                </TableCell>
              </TableRow>
            )}
          </tbody>
        </Table>
      )}

      <DialogRoot open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogTitle>
            {editingId ? t("admin.promoCodes.editTitle") : t("admin.promoCodes.createTitle")}
          </DialogTitle>
          <div className="grid gap-3">
            <label>
              {t("admin.promoCodes.form.code")}
              <Input
                type="text"
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            </label>
            <label>
              {t("admin.promoCodes.form.type")}
              <Select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="PERCENT">PERCENT</option>
                <option value="FIXED">FIXED</option>
              </Select>
            </label>
            <label>
              {t("admin.promoCodes.form.value")}
              <Input
                type="number"
                value={form.value}
                onChange={(event) =>
                  setForm({ ...form, value: event.target.value })
                }
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
              {t("admin.promoCodes.form.active")}
            </label>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSubmit}>{t("common.save")}</Button>
          </div>
        </DialogContent>
      </DialogRoot>
    </PageShell>
  );
}
