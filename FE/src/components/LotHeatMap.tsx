import { useMemo, useCallback, useEffect, useRef } from "react";
import type { ParkingSpot } from "../api/types";

export interface LotHeatMapProps {
  /** Spots for this lot; elements with matching data-spot-label are colored by currentStatus. */
  spots: ParkingSpot[];
  /** SVG markup. Each spot shape must have data-spot-label="<spot.label>". */
  svgMarkup: string | null;
  /** Optional: callback when a spot is clicked (e.g. toggle occupied/empty). */
  onSpotClick?: (spot: ParkingSpot) => void;
  /** Show a short legend (free / taken). */
  showLegend?: boolean;
  /** Extra class for the container. */
  className?: string;
}

const EMPTY_COLOR = "#10b981"; // emerald-500
const OCCUPIED_COLOR = "#ef4444"; // red-500

/**
 * Lot heat map: custom SVG with data-spot-label on each spot element.
 * Spots are colored by occupancy (green = free, red = taken). Click to toggle if onSpotClick provided.
 */
export function LotHeatMap({
  spots,
  svgMarkup,
  onSpotClick,
  showLegend = true,
  className = "",
}: LotHeatMapProps) {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  // Match by full label (TI1-A-001) or short label from SVG (A-001)
  const spotMap = useMemo(() => {
    const byFull = new Map(spots.map((s) => [s.label, s]));
    const byShort = new Map<string, ParkingSpot>();
    spots.forEach((s) => {
      const parts = s.label.split("-");
      if (parts.length >= 2) byShort.set(parts.slice(1).join("-"), s);
    });
    return (label: string) => byFull.get(label) ?? byShort.get(label);
  }, [spots]);

  useEffect(() => {
    if (!svgMarkup || !svgContainerRef.current) return;
    const root = svgContainerRef.current.querySelector("svg");
    if (!root) return;
    root.querySelectorAll("[data-spot-label]").forEach((el) => {
      const label = el.getAttribute("data-spot-label");
      if (!label) return;
      const spot = spotMap(label);
      const elHtml = el as SVGElement;
      if (spot) {
        elHtml.style.fill = spot.currentStatus === "occupied" ? OCCUPIED_COLOR : EMPTY_COLOR;
        elHtml.style.cursor = onSpotClick ? "pointer" : "default";
        elHtml.setAttribute("aria-label", `${spot.label}: ${spot.currentStatus}`);
      }
    });
  }, [svgMarkup, spotMap, onSpotClick]);

  const handleSvgClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSpotClick) return;
      const target = (e.target as Element).closest("[data-spot-label]");
      if (!target) return;
      const label = target.getAttribute("data-spot-label");
      if (!label) return;
      const spot = spotMap(label);
      if (spot) onSpotClick(spot);
    },
    [onSpotClick, spotMap]
  );

  if (!svgMarkup || svgMarkup.trim() === "") {
    return (
      <div
        className={`rounded-lg border border-slate-200 border-dashed bg-slate-50 min-h-[240px] flex items-center justify-center text-slate-500 text-sm px-4 ${className}`}
      >
        <p className="text-center max-w-sm">
          No lot map for this lot. Add an SVG with <code className="bg-slate-200 px-1 rounded text-xs">data-spot-label</code> on each spot shape (matching spot labels e.g. GE-A-001).
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={svgContainerRef}
        className="rounded-lg border border-slate-200 bg-white overflow-hidden [&_svg]:w-full [&_svg]:h-auto [&_svg]:block"
        onClick={handleSvgClick}
        role="img"
        aria-label="Lot heat map"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      {showLegend && (
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" aria-hidden /> Free
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500" aria-hidden /> Taken
          </span>
        </div>
      )}
    </div>
  );
}
