import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import type { LatLng } from "../utils/geo";
import {
  DEFAULT_CENTER_QONIRAT,
  DEFAULT_ZOOM,
  estimateEtaMinutes,
  formatEtaMinutes,
  formatKm,
  haversineKm,
  SPEED_KMH_COURIER,
  straightLineRoute,
} from "../utils/geo";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export type NavigationMode = "preview" | "navigate" | "track";

export type NavigationPoint = LatLng & { label?: string };

type Props = {
  mode: NavigationMode;
  pickup?: NavigationPoint | null;
  dropoff?: NavigationPoint | null;
  courier?: LatLng | null;
  user?: LatLng | null;
  route?: LatLng[];
  onCenterToCourier?: () => void;
  onCenterToPickup?: () => void;
  onCenterToDropoff?: () => void;
};

function CenterTo({ target }: { target: LatLng | null }) {
  const map = useMap();
  if (target) {
    map.setView([target.lat, target.lng], map.getZoom(), { animate: true });
  }
  return null;
}

export function NavigationMap({
  mode,
  pickup,
  dropoff,
  courier,
  user,
  route,
  onCenterToCourier,
  onCenterToPickup,
  onCenterToDropoff,
}: Props) {
  const fallbackCenter = pickup ?? dropoff ?? user ?? DEFAULT_CENTER_QONIRAT;
  const [centerTarget, setCenterTarget] = useState<LatLng | null>(null);
  const [animatedCourier, setAnimatedCourier] = useState<LatLng | null>(courier ?? null);
  const rafRef = useRef<number | null>(null);
  const polyline = useMemo(() => {
    if (route && route.length > 1) {
      return route;
    }
    return straightLineRoute(pickup ?? null, dropoff ?? null);
  }, [route, pickup, dropoff]);

  const distanceKm = useMemo(() => {
    if (pickup && dropoff) {
      return haversineKm(pickup, dropoff);
    }
    return 0;
  }, [pickup, dropoff]);
  const etaMinutes = estimateEtaMinutes(distanceKm, SPEED_KMH_COURIER);

  useEffect(() => {
    if (!courier) {
      setAnimatedCourier(null);
      return;
    }
    const start = animatedCourier ?? courier;
    const end = courier;
    const startTime = performance.now();
    const duration = 1200;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const next = {
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t,
      };
      setAnimatedCourier(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [courier]);

  return (
    <div className="nav-map">
      <div className="nav-summary">
        <div>
          <strong>Distance:</strong> {formatKm(distanceKm)}
        </div>
        <div>
          <strong>ETA:</strong> {formatEtaMinutes(etaMinutes)}
        </div>
        <div className="nav-legend">
          <span className="nav-dot pickup" /> Pickup
          <span className="nav-dot dropoff" /> Dropoff
          <span className="nav-dot courier" /> Courier
        </div>
      </div>

      <div className="nav-controls">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (courier) {
              setCenterTarget(courier);
              onCenterToCourier?.();
            }
          }}
          disabled={!courier}
        >
          Курьер
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (pickup) {
              setCenterTarget(pickup);
              onCenterToPickup?.();
            }
          }}
          disabled={!pickup}
        >
          Ресторан
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            if (dropoff) {
              setCenterTarget(dropoff);
              onCenterToDropoff?.();
            }
          }}
          disabled={!dropoff}
        >
          Ко мне
        </button>
      </div>

      <MapContainer
        center={[fallbackCenter.lat, fallbackCenter.lng]}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className={`map-container mode-${mode}`}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {centerTarget && <CenterTo target={centerTarget} />}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]}>
          </Marker>
        )}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]}>
          </Marker>
        )}
        {animatedCourier && (
          <Marker position={[animatedCourier.lat, animatedCourier.lng]}>
          </Marker>
        )}
        {polyline.length > 1 && (
          <Polyline
            positions={polyline.map((point) => [point.lat, point.lng])}
            pathOptions={{ color: "#2563eb", weight: 4 }}
          />
        )}
      </MapContainer>
    </div>
  );
}
