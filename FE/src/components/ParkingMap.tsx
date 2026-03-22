import { useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import type { PathOptions, Layer } from "leaflet";
import type { ReactNode } from "react";
import type { ParkingLot } from "../api/types";

/** UNBSJ image center from GEE: ee.Geometry.Point([-66.08556199592792, 45.3065]) → [lat, lng]. */
const CENTER: [number, number] = [45.3065, -66.08556199592792];
const MIN_ZOOM = 17;
const MAX_ZOOM = 22;
const DEFAULT_ZOOM = 17;

/** Bounds: tighter north-south (less vertical scroll), same horizontal. */
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [45.303, -66.092], // southwest
  [45.31, -66.079],  // northeast
];

export type ParkingMapDataMode = "live" | "pick-time";

interface ParkingMapProps {
  /** Tile URL template from /api/earth-engine/tiles (e.g. /api/earth-engine/tiles/{z}/{x}/{y}?asset=unbsj) */
  earthEngineTileUrl: string | null;
  /** Parking section polygons for hover tooltip + click to lot */
  sectionsGeoJSON?: GeoJsonObject | null;
  /** Lots to resolve section name → lot id on click */
  lots?: ParkingLot[];
  /** Called when a section polygon is clicked; pass lot id to navigate */
  onSectionClick?: (lotId: string) => void;
  /** Live = current data; pick-time = scenario (time + day on parent). */
  mapDataMode?: ParkingMapDataMode;
  /** ISO `YYYY-MM-DD` for the scenario day when `mapDataMode` is `pick-time`. */
  scenarioDate?: string;
  /** Local `HH:mm` scenario clock time when `mapDataMode` is `pick-time`. */
  scenarioTimeHHmm?: string;
  /** Optional overlay (e.g. stats card) rendered on top of the map */
  children?: ReactNode;
  className?: string;
}

/** Transparent overlay so polygons are hoverable/clickable but not drawn on top of tiles */
const sectionsStyle: PathOptions = {
  color: "transparent",
  fillColor: "transparent",
  fillOpacity: 0,
  weight: 0,
};

function formatScenarioDateLabel(isoDate: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatScenarioTimeLabel(hhmm: string): string {
  const parts = hhmm.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ParkingMap({
  earthEngineTileUrl,
  sectionsGeoJSON,
  lots = [],
  onSectionClick,
  mapDataMode = "live",
  scenarioDate = "",
  scenarioTimeHHmm = "12:00",
  children,
  className = "",
}: ParkingMapProps) {
  const onEachSection = useCallback(
    (feature: GeoJsonObject, layer: Layer) => {
      const props = (feature as Feature).properties as Record<string, unknown> | undefined;
      const featureName = (props?.name as string) ?? "Section";
      // 1) Try strict match (including number) between section name and lot name.
      // 2) As a fallback, only special-case PHDParking → PHDParking1 so we don't collapse other lots.
      const normalize = (name: string) => name.replace(/\s+/g, "").toLowerCase();
      const normFeature = normalize(featureName);
      let lot =
        lots.find((l) => normalize(l.name) === normFeature) ??
        (normFeature === "phdparking"
          ? lots.find((l) => normalize(l.name).startsWith("phdparking1"))
          : undefined);
      // Prettify the label a bit (e.g. "StaffParking1" -> "Staff Parking 1") but keep
      // the original featureName (from GEE / backend) so numbering stays distinct.
      const prettify = (name: string) =>
        name
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/([A-Za-z])(\d+)/g, "$1 $2")
          .trim();
      const displayName = prettify(featureName);
      layer.bindTooltip(displayName, {
        permanent: false,
        direction: "top",
        className: "font-medium text-slate-800",
      });
      layer.on("click", () => {
        if (lot && onSectionClick) onSectionClick(lot.id);
      });
    },
    [lots, onSectionClick]
  );

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1}
        className="h-full w-full min-h-[400px] rounded-lg border-4 border-unb-red"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          zIndex={0}
          maxNativeZoom={19}
          maxZoom={22}
        />
        {earthEngineTileUrl && (
          <TileLayer
            url={earthEngineTileUrl}
            zIndex={1}
            maxNativeZoom={18}
            maxZoom={22}
          />
        )}
        {sectionsGeoJSON && (
          <GeoJSON
            data={sectionsGeoJSON}
            style={sectionsStyle}
            onEachFeature={onEachSection}
          />
        )}
      </MapContainer>
      {mapDataMode === "live" ? (
        <div
          className="pointer-events-none absolute top-3 right-3 z-[1000] flex items-center gap-1.5 rounded-md bg-unb-red px-2.5 py-1 shadow-lg"
          role="status"
          aria-label="Live updating data"
        >
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          <span className="text-[10px] font-extrabold tracking-[0.2em] text-white drop-shadow-sm">
            LIVE
          </span>
        </div>
      ) : (
        <div
          className="pointer-events-none absolute top-3 right-3 z-[1000] max-w-[min(100%,9.5rem)] rounded-md bg-unb-red px-2 py-1 text-center shadow-lg"
          role="status"
          aria-label={`Scenario ${formatScenarioTimeLabel(scenarioTimeHHmm)} on ${formatScenarioDateLabel(scenarioDate)}`}
        >
          <p className="text-[8px] font-semibold uppercase tracking-wider text-white/90">
            Plan time
          </p>
          <p className="text-sm font-extrabold tabular-nums leading-tight text-white drop-shadow-sm">
            {formatScenarioTimeLabel(scenarioTimeHHmm)}
          </p>
          <p className="text-[9px] font-medium leading-tight text-white/85">
            {formatScenarioDateLabel(scenarioDate)}
          </p>
        </div>
      )}
      {children && (
        <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:max-w-sm z-[1000]">
          {children}
        </div>
      )}
    </div>
  );
}
