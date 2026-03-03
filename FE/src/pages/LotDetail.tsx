import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";
import type { ParkingLot, ParkingSpot } from "../api/types";

export function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const [lot, setLot] = useState<ParkingLot | null>(null);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get<ParkingLot>(`/api/parking-lots/${id}`),
      api.get<ParkingSpot[]>(
        `/api/parking-lots/${id}/spots${section ? `?section=${encodeURIComponent(section)}` : ""}`
      ),
    ])
      .then(([lotData, spotsData]) => {
        setLot(lotData);
        setSpots(spotsData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, section]);

  const refreshSpots = () => {
    if (!id) return;
    api
      .get<ParkingSpot[]>(
        `/api/parking-lots/${id}/spots${section ? `?section=${encodeURIComponent(section)}` : ""}`
      )
      .then(setSpots)
      .catch((e) => setError(e.message));
  };

  const toggleStatus = async (spot: ParkingSpot) => {
    const next = spot.currentStatus === "occupied" ? "empty" : "occupied";
    try {
      await api.patch<ParkingSpot>(`/api/parking-spots/${spot.id}/status`, { status: next });
      refreshSpots();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-volley-occupied">
        Error: {error}
      </div>
    );
  }
  if (!lot) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        Lot not found.
      </div>
    );
  }

  const sections = [...new Set(spots.map((s) => s.section).filter(Boolean))];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <p className="mb-4">
        <Link to="/" className="text-volley-accent hover:underline">
          ← Lots
        </Link>
      </p>
      <h1 className="page-header">{lot.name}</h1>
      <div className="flex flex-wrap justify-center gap-4 mb-6">
        <span className="meta-box">{lot.campus}</span>
        <span className="meta-box">Capacity {lot.capacity}</span>
      </div>

      {sections.length > 0 && (
        <div className="mb-6">
          <label className="block text-volley-muted text-sm mb-1">Section</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full max-w-xs px-3 py-2 rounded border border-volley-border bg-white text-volley-ink"
          >
            <option value="">All</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="text-volley-muted text-sm mb-4">
        Click a spot to toggle occupied/empty (simulator also updates every 5s).
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-2">
        {spots.map((spot) => (
          <button
            key={spot.id}
            type="button"
            className={`spot-tile ${spot.currentStatus}`}
            onClick={() => toggleStatus(spot)}
            title={`${spot.label} — ${spot.currentStatus}`}
          >
            {spot.label}
          </button>
        ))}
      </div>
      {spots.length === 0 && (
        <p className="text-volley-muted mt-4">No spots in this lot.</p>
      )}
    </div>
  );
}
