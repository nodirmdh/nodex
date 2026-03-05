import { Badge } from "./primitives";
import { translateStatus } from "@nodex/i18n";

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "info"> = {
  NEW: "info",
  ACCEPTED: "info",
  COOKING: "warning",
  READY: "success",
  HANDOFF_CONFIRMED: "info",
  READY_FOR_PICKUP: "success",
  COURIER_ACCEPTED: "info",
  PICKED_UP: "warning",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "default",
  CANCELLED_BY_VENDOR: "default",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANTS[status] ?? "default"}>
      {translateStatus(status)}
    </Badge>
  );
}
