import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { ParkingSpotLog, ParkingSpot } from "../api/types";

export function Logs() {
  const [logs, setLogs] = useState<ParkingSpotLog[]>([]);
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [spotId, setSpotId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ParkingSpot[]>("/api/parking-spots").then(setSpots).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = spotId
      ? `/api/parking-spot-logs?parkingSpotId=${encodeURIComponent(spotId)}`
      : "/api/parking-spot-logs";
    api
      .get<ParkingSpotLog[]>(url)
      .then(setLogs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [spotId]);

  if (loading && logs.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="skeleton h-10 w-48 mb-4" />
        <div className="skeleton h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="page-header">Parking spot logs</h1>
      <div className="mb-4 max-w-md">
        <label className="block text-volley-muted text-sm mb-1">
          Filter by spot (optional)
        </label>
        <select
          value={spotId}
          onChange={(e) => setSpotId(e.target.value)}
          className="w-full px-3 py-2 rounded border border-volley-border bg-white text-volley-ink"
        >
          <option value="">All logs</option>
          {spots.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label} ({s.currentStatus})
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-volley-occupied mb-4">{error}</p>}
      <div className="card-volley overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-volley-border">
                <th className="text-left py-2 px-3 text-white">Time</th>
                <th className="text-left py-2 px-3 text-white">Spot ID</th>
                <th className="text-left py-2 px-3 text-white">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {logs.slice(0, 100).map((log) => (
                <tr key={log.id} className="border-b border-volley-border">
                  <td className="py-2 px-3 text-sm">
                    {new Date(log.recordedAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-3 font-mono text-sm">
                    {log.parkingSpotId.slice(0, 8)}…
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${
                        log.status === "occupied"
                          ? "bg-volley-occupied text-white"
                          : "bg-volley-empty text-white"
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && (
          <p className="p-4 text-volley-muted text-sm">
            No logs yet. Change spot status on a lot to generate logs.
          </p>
        )}
        {logs.length > 100 && (
          <p className="p-2 text-volley-muted text-sm">Showing latest 100.</p>
        )}
      </div>
    </div>
  );
}
