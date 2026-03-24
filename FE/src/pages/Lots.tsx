import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type {
  Building,
  ParkingLotWithDistance,
  PredictionMode,
} from "../api/types";

function todayLocalYmd() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeNowHHmm() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function formatPercent(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value)}%`;
}

function formatMeters(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${Math.round(value)} m`;
}

function safeCategoryLabel(category?: string) {
  if (!category) return "Uncategorized";
  return category.replaceAll("_", " ");
}

type SortMode =
  | "distance_asc"
  | "free_desc"
  | "occupancy_asc"
  | "capacity_desc"
  | "name_asc";

export function Lots() {
  const navigate = useNavigate();

  const [lots, setLots] = useState<ParkingLotWithDistance[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);

  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [predictionMode, setPredictionMode] =
    useState<PredictionMode>("live");
  const [scenarioDate, setScenarioDate] = useState(todayLocalYmd());
  const [scenarioTime, setScenarioTime] = useState(timeNowHHmm());

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("distance_asc");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadBuildings() {
    try {
      const data = await api.getBuildings();
      setBuildings(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadLots() {
    try {
      setLoading(true);
      setError("");

      const buildingId = selectedBuildingId || undefined;

      const data =
        predictionMode === "live"
          ? await api.getLots(buildingId)
          : await api.getPredictedLots({
              buildingId,
              predictionMode,
              date: scenarioDate,
              time: scenarioTime,
            });

      setLots(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof ApiError ? err.message : "Failed to load parking lots."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBuildings();
  }, []);

  useEffect(() => {
    loadLots();
  }, [selectedBuildingId, predictionMode]);

  const filteredLots = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    let result = lots.filter((lot) => {
      const matchesSearch =
        q.length === 0 ||
        lot.name.toLowerCase().includes(q) ||
        (lot.sectionName ?? "").toLowerCase().includes(q) ||
        (lot.category ?? "").toLowerCase().includes(q);

      const matchesCategory =
        selectedCategory === "all" || lot.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    result = [...result].sort((a, b) => {
      switch (sortMode) {
        case "distance_asc":
          return (a.distanceMeters ?? Number.MAX_SAFE_INTEGER) -
            (b.distanceMeters ?? Number.MAX_SAFE_INTEGER);

        case "free_desc":
          return (b.freeSpots ?? -1) - (a.freeSpots ?? -1);

        case "occupancy_asc":
          return (a.occupancyPercent ?? Number.MAX_SAFE_INTEGER) -
            (b.occupancyPercent ?? Number.MAX_SAFE_INTEGER);

        case "capacity_desc":
          return b.capacity - a.capacity;

        case "name_asc":
          return a.name.localeCompare(b.name);

        default:
          return 0;
      }
    });

    return result;
  }, [lots, searchTerm, selectedCategory, sortMode]);

  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(lots.map((lot) => lot.category).filter(Boolean))
    ) as string[];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [lots]);

  return (
    <main className="px-[clamp(1.5rem,6vw,5rem)] py-8 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Campus Parking Lots
            </h1>
            <p className="mt-2 max-w-3xl text-slate-600 leading-7">
              Compare lots by distance, free spots, capacity, and predicted
              demand. Use scenario mode to explore weekday, weekend, and event
              conditions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadLots}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={() => navigate("/what-if")}
              className="rounded-full bg-unb-red px-4 py-2 text-sm font-medium text-white hover:opacity-95"
            >
              Open What-If Planner
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search lot name, category, section..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-unb-red"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Destination building
            </span>
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-unb-red"
            >
              <option value="">All buildings</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                  {building.code ? ` (${building.code})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Mode
            </span>
            <select
              value={predictionMode}
              onChange={(e) =>
                setPredictionMode(e.target.value as PredictionMode)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-unb-red"
            >
              <option value="live">Live</option>
              <option value="weekday">Weekday prediction</option>
              <option value="weekend">Weekend prediction</option>
              <option value="small_event">Small event</option>
              <option value="medium_event">Medium event</option>
              <option value="large_event">Large event</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Category
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-unb-red"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {safeCategoryLabel(category)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Sort by
            </span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-unb-red"
            >
              <option value="distance_asc">Closest distance</option>
              <option value="free_desc">Most free spots</option>
              <option value="occupancy_asc">Lowest occupancy</option>
              <option value="capacity_desc">Largest capacity</option>
              <option value="name_asc">Name A-Z</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Scenario date
              </span>
              <input
                type="date"
                value={scenarioDate}
                onChange={(e) => setScenarioDate(e.target.value)}
                disabled={predictionMode === "live"}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-unb-red disabled:bg-slate-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Scenario time
              </span>
              <input
                type="time"
                value={scenarioTime}
                onChange={(e) => setScenarioTime(e.target.value)}
                disabled={predictionMode === "live"}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-unb-red disabled:bg-slate-100"
              />
            </label>
          </div>
        </div>

        {predictionMode !== "live" ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadLots}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Apply scenario filters
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Lots shown
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading ? "..." : filteredLots.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total free spots
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900">
            {loading
              ? "..."
              : filteredLots.reduce(
                  (sum, lot) => sum + (lot.freeSpots ?? 0),
                  0
                )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Mode
          </p>
          <p className="mt-2 text-2xl font-bold capitalize text-slate-900">
            {predictionMode.replaceAll("_", " ")}
          </p>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-slate-500 shadow-sm">
            Loading parking lots...
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-slate-500 shadow-sm">
            No parking lots match the current filters.
          </div>
        ) : (
          filteredLots.map((lot) => (
            <button
              key={lot.id}
              type="button"
              onClick={() => navigate(`/lot/${lot.id}`)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {lot.name}
                    </h2>

                    {lot.category ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">
                        {safeCategoryLabel(lot.category)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>Capacity: {lot.capacity}</p>
                    <p>Distance: {formatMeters(lot.distanceMeters)}</p>
                    <p>
                      Free spots:{" "}
                      {typeof lot.freeSpots === "number" ? lot.freeSpots : "—"}
                    </p>
                    <p>
                      Occupancy: {formatPercent(lot.occupancyPercent)}
                    </p>
                  </div>

                  {lot.sectionName ? (
                    <p className="mt-2 text-sm text-slate-500">
                      Section: {lot.sectionName}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-2 text-sm lg:min-w-[210px]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current status
                    </p>
                    <p className="mt-1 font-medium text-slate-900">
                      {typeof lot.freeSpots === "number"
                        ? `${lot.freeSpots} free / ${lot.capacity}`
                        : "Unavailable"}
                    </p>
                  </div>

                  {(typeof lot.predictedFreeSpots === "number" ||
                    typeof lot.predictedOccupancyPercent === "number") && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Predicted
                      </p>
                      <p className="mt-1 font-medium text-slate-900">
                        {typeof lot.predictedFreeSpots === "number"
                          ? `${lot.predictedFreeSpots} free`
                          : formatPercent(lot.predictedOccupancyPercent)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </section>
    </main>
  );
}
