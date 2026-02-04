export type LatLng = { lat: number; lng: number };

export const DEFAULT_CENTER_QONIRAT: LatLng = { lat: 42.842, lng: 59.012 };
export const DEFAULT_ZOOM = 13;
export const SPEED_KMH_COURIER = 22;

export function haversineKm(a: LatLng, b: LatLng): number {
  const radiusKm = 6371.0;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;

  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return radiusKm * c;
}

export function formatKm(km: number): string {
  if (!Number.isFinite(km)) {
    return "-";
  }
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(1)} km`;
}

export function formatEtaMinutes(minutes: number): string {
  if (!Number.isFinite(minutes)) {
    return "-";
  }
  if (minutes < 1) {
    return "<1 min";
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return `${hours}h ${rest}m`;
}

export function estimateEtaMinutes(distanceKm: number, speedKmH = SPEED_KMH_COURIER): number {
  if (!Number.isFinite(distanceKm) || speedKmH <= 0) {
    return 0;
  }
  return (distanceKm / speedKmH) * 60;
}

export function straightLineRoute(pickup?: LatLng | null, dropoff?: LatLng | null): LatLng[] {
  if (!pickup || !dropoff) {
    return [];
  }
  return [pickup, dropoff];
}
