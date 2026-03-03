import { MapContainer, TileLayer } from "react-leaflet";
import type { ReactNode } from "react";

/** UNBSJ image center from GEE: ee.Geometry.Point([-66.08556199592792, 45.3065]) → [lat, lng]. */
const CENTER: [number, number] = [45.3065, -66.08556199592792];
const MIN_ZOOM = 17;
const MAX_ZOOM = 22;
const DEFAULT_ZOOM = 17;

/** Bounds: tighter north–south (less vertical scroll), same horizontal. */
const MAX_BOUNDS: [[number, number], [number, number]] = [
  [45.303, -66.092], // southwest
  [45.31, -66.079],  // northeast
];

interface ParkingMapProps {
  /** Tile URL template from /api/earth-engine/tiles (e.g. /api/earth-engine/tiles/{z}/{x}/{y}?asset=unbsj) */
  earthEngineTileUrl: string | null;
  /** Optional overlay (e.g. stats card) rendered on top of the map */
  children?: ReactNode;
  className?: string;
}

export function ParkingMap({
  earthEngineTileUrl,
  children,
  className = "",
}: ParkingMapProps) {
  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        maxBounds={MAX_BOUNDS}
        maxBoundsViscosity={1}
        className="h-full w-full min-h-[400px] rounded-lg border border-slate-200"
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
          <TileLayer url={earthEngineTileUrl} zIndex={1} />
        )}
      </MapContainer>
      {children && (
        <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:max-w-sm z-[1000]">
          {children}
        </div>
      )}
    </div>
  );
}
