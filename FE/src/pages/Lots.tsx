import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { ParkingLot } from "../api/types";

export function Lots() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ParkingLot[]>("/api/parking-lots")
      .then(setLots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="skeleton h-10 w-64 mb-4" />
        <div className="skeleton h-20 w-full mb-2" />
        <div className="skeleton h-20 w-full mb-2" />
        <div className="skeleton h-20 w-full" />
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

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="page-header">Parking lots</h1>
      <div className="flex flex-col gap-2">
        {lots.map((lot) => (
          <Link
            key={lot.id}
            to={`/lot/${lot.id}`}
            className="card-volley block p-4 text-white hover:text-volley-accent"
          >
            <span className="font-bold">{lot.name}</span>
            <span className="opacity-90"> — {lot.campus} · capacity {lot.capacity}</span>
          </Link>
        ))}
      </div>
      {lots.length === 0 && (
        <p className="text-volley-muted mt-4">
          No lots. Run <code className="bg-gray-200 px-1 rounded">npm run seed</code> in BE.
        </p>
      )}
    </div>
  );
}
