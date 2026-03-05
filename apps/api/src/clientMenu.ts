import type { MenuItem as PrismaMenuItem } from "@prisma/client";

type MenuItem = Pick<PrismaMenuItem, "isAvailable"> & Record<string, unknown>;

export function filterAvailableMenu<T extends MenuItem>(items: T[]) {
  return items.filter((item) => item.isAvailable);
}
