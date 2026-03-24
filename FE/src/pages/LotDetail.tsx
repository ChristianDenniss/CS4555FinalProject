import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { LotHeatMap } from "../components/LotHeatMap";
import type {
  Building,
  LotBuildingDistance,
  ParkingLot,
  ParkingSpot,
} from "../api/types";

function formatMeters(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value)} m`;
}

function formatMinutes(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value)} min`;
}

function safeCategoryLabel(category?: string) {
  if (!category) return "Uncategorized";
  return category.replaceAll("_", " ");
}

function sortSpotsForDisplay(spots: ParkingSpot[]) {
  return [...spots].sort((a, b) => {
    const sectionCompare = (a.section ?? "").localeCompare(b.section ?? "");
    if (sectionCompare !== 0) return sectionCompare;

    const rowCompare = (a.row ?? "").localeCompare(b.row ?? "");
    if (rowCompare !== 0) return rowCompare;

    return (a.index ?? 0) - (b.index ?? 0);
  });
}

function getBestRecommendedSpot(spots: ParkingSpot[]) {
  const emptySpots = spots.filter((spot) => spot.currentStatus === "empty");
  if (emptySpots.length === 0) return null;

  const scored = [...emptySpots].sort((a, b) => {
    const aAccessibleBoost = a.category === "accessible" ? 1 : 0;
    const bAccessibleBoost = b.category === "accessible" ? 1 : 0;

    const aFreeSoonBoost = a.predictedFreeSoon ? 1 : 0;
    const bFreeSoonBoost = b.predictedFreeSoon ? 1 : 0;

    const aDistance = a.walkingDistanceToExitMeters ?? Number.MAX_SAFE_INTEGER;
    const bDistance = b.walkingDistanceToExitMeters ?? Number.MAX_SAFE_INTEGER;

    if (bFreeSoonBoost !== aFreeSoonBoost) {
      return bFreeSoonBoost - aFreeSoonBoost;
    }

    if (aAccessibleBoost !== bAccessibleBoost) {
      return aAccessibleBoost - bAccessibleBoost;
    }

    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }

    const rowCompare = (a.row ?? "").localeCompare(b.row ?? "");
    if (rowCompare !== 0) return rowCompare;

    return (a.index ?? 0) - (b.index ?? 0);
  });

  return scored[0] ?? null;
}

export function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [lot, setLot] = useState<ParkingLot | null>(null);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [distances, setDistances] = useState<LotBuildingDistance[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState("");

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId]
  );

  const selectedDistance = useMemo(
    () =>
      distances.find((d) => d.buildingId === selectedBuildingId) ?? null,
    [distances, selectedBuildingId]
  );

  const orderedSpots = useMemo(() => sortSpotsForDisplay(spots), [spots]);

  const selectedSpot = useMemo(
    () => orderedSpots.find((spot) => spot.id === selectedSpotId) ?? null,
    [orderedSpots, selectedSpotId]
  );

  const recommendedSpot = useMemo(
    () => getBestRecommendedSpot(orderedSpots),
    [orderedSpots]
  );

  const freeSpotsCount = useMemo(
    () => orderedSpots.filter((spot) => spot.currentStatus === "empty").length,
    [orderedSpots]
  );

  const occupiedSpotsCount = useMemo(
    () => orderedSpots.filter((spot) => spot.currentStatus === "occupied").length,
    [orderedSpots]
  );

  const occupancyPercent = useMemo(() => {
    if (!lot || lot.capacity <= 0) return 0;
    return Math.round((occupiedSpotsCount / lot.capacity) * 100);
  }, [occupiedSpotsCount, lot]);

  async function loadLotDetail() {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const [lotData, spotsData, buildingsData, distanceData] = await Promise.all([
        api.getLotById(id),
        api.getLotSpots(id),
        api.getBuildings(),
        api.getLotBuildingDistances(id).catch(() => []),
      ]);

      setLot(lotData);
      setSpots(spotsData);
      setBuildings(buildingsData);
      setDistances(distanceData);

      if (distanceData.length > 0) {
        setSelectedBuildingId(distanceData[0].buildingId);
      }

      if (spotsData.length > 0) {
        const bestSpot = getBestRecommendedSpot(spotsData);
        setSelectedSpotId(bestSpot?.id ?? spotsData[0].id);
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof ApiError ? err.message : "Failed to load lot details."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadWalkingRoute() {
    if (!id || !selectedBuildingId) return;

    try {
      setLoadingRoute(true);

      const route = await api.getWalkingRoute(id, selectedBuildingId);

      setDistances((prev) => {
        const others = prev.filter((d) => d.buildingId !== selectedBuildingId);
        return [...others, route];
      });
    } catch (err) {
      console.warn("Walking route not available:", err);
    } finally {
      setLoadingRoute(false);
    }
  }

  async function loadLotSvg() {
    if (!id) return;

    try {
      const svg = await api.get<string>(`/api/parking-lots/${encodeURIComponent(id)}/map-svg`);
      setSvgMarkup(svg);
    } catch {
      setSvgMarkup(null);
    }
  }

  useEffect(() => {
    loadLotDetail();
    loadLotSvg();
  }, [id]);

  useEffect(() => {
    if (selectedBuildingId) {
      loadWalkingRoute();
    }
  }, [selectedBuildingId]);

  if (loading) {
    return (
      <main className="px-[clamp(1.5rem,6vw,5rem)] py-8">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-slate-500 shadow-sm">
          Loading lot details...
        </div>
      </main>
    );
  }

  if (!lot) {
    return (
      <main className="px-[clamp(1.5rem,6vw,5rem)] py-8">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-red-700 shadow-sm">
          Lot not found.
        </div>
      </main>
    );
  }

  return (
    <main className="px-[clamp(1.5rem,6vw,5rem)] py-8 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate("/lots")}
              className="mb-3 text-sm font-medium text-unb-red hover:underline"
            >
              ← Back to lots
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-900">{lot.name}</h1>

              {lot.category ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                  {safeCategoryLabel(lot.category)}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-slate-600 leading-7">
              View current stall availability, compare building distances, and
              highlight a better suggested spot instead of choosing randomly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate("/what-if")}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Open What-If Planner
            </button>

            <button
              type="button"
              onClick={loadLotDetail}
              className="rounded-full bg-unb-red px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Refresh lot
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Capacity
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{lot.capacity}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Free spots
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{freeSpotsCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Occupied
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{occupiedSpotsCount}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Occupancy
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{occupancyPercent}%</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Lot map</h2>
              <p className="mt-1 text-sm text-slate-600">
                Green means free, red means occupied, and the highlighted stall is
                the current recommended spot.
              </p>
            </div>

            <div className="min-w-[240px]">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Destination building
                </span>
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-unb-red"
                >
                  <option value="">Select building</option>
                  {distances.length > 0
                    ? distances.map((d) => {
                        const building =
                          d.building ??
                          buildings.find((b) => b.id === d.buildingId);

                        return (
                          <option key={d.buildingId} value={d.buildingId}>
                            {building?.name ?? d.buildingId}
                            {building?.code ? ` (${building.code})` : ""}
                          </option>
                        );
                      })
                    : buildings.map((building) => (
                        <option key={building.id} value={building.id}>
                          {building.name}
                          {building.code ? ` (${building.code})` : ""}
                        </option>
                      ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5">
            <LotHeatMap
              spots={orderedSpots}
              svgMarkup={svgMarkup}
              highlightSpotId={recommendedSpot?.id ?? null}
              onSpotClick={(spot) => setSelectedSpotId(spot.id)}
              className="min-h-[300px]"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Recommendation summary
            </h2>

            {recommendedSpot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Suggested spot
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {recommendedSpot.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">
                    Section {recommendedSpot.section}, Row {recommendedSpot.row}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Building
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {selectedBuilding
                        ? `${selectedBuilding.name}${
                            selectedBuilding.code ? ` (${selectedBuilding.code})` : ""
                          }`
                        : "Not selected"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Walking distance
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {formatMeters(selectedDistance?.distanceMeters)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Walking time
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {loadingRoute
                        ? "Loading..."
                        : formatMinutes(selectedDistance?.walkingTimeMinutes)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                No empty spots are currently available in this lot.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Selected spot
            </h2>

            {selectedSpot ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Label
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {selectedSpot.label}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </p>
                    <p className="mt-1 font-medium text-slate-900 capitalize">
                      {selectedSpot.currentStatus}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Section / Row
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {selectedSpot.section} / {selectedSpot.row}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Spot type
                    </p>
                    <p className="mt-1 font-medium text-slate-900 capitalize">
                      {selectedSpot.category ?? "general"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Exit distance
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {formatMeters(selectedSpot.walkingDistanceToExitMeters)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Click a stall on the map or choose one from the list below.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-900">Spot list</h2>
          <p className="text-sm text-slate-500">
            Click a spot to inspect it and compare against the recommendation.
          </p>
        </div>

        {orderedSpots.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No parking spots were returned for this lot.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {orderedSpots.map((spot) => {
              const isSelected = selectedSpotId === spot.id;
              const isRecommended = recommendedSpot?.id === spot.id;

              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => setSelectedSpotId(spot.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    isSelected
                      ? "border-unb-red bg-red-50"
                      : isRecommended
                      ? "border-amber-300 bg-amber-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{spot.label}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Section {spot.section}, Row {spot.row}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        spot.currentStatus === "empty"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {spot.currentStatus}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 capitalize">
                      {spot.category ?? "general"}
                    </span>

                    {isRecommended ? (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
