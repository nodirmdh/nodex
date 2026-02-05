import { OrderStatus } from "./orderState";

export function isRateableStatus(status: string) {
  return status === OrderStatus.DELIVERED || status === OrderStatus.COMPLETED;
}

export function assertRateableStatus(status: string) {
  if (!isRateableStatus(status)) {
    const error = new Error("order not completed");
    (error as { code?: string }).code = "ORDER_NOT_COMPLETED";
    throw error;
  }
}

export function applyRatingAggregate(avg: number, count: number, stars: number) {
  const nextCount = count + 1;
  const nextAvg = (avg * count + stars) / nextCount;
  return { ratingAvg: nextAvg, ratingCount: nextCount };
}

export function validateStars(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    const error = new Error("stars must be between 1 and 5");
    (error as { code?: string }).code = "INVALID_STARS";
    throw error;
  }
}
