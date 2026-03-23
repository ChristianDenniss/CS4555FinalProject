import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

const SPEC_URL = "/api/openapi.yaml";

/** Full URL for the OpenAPI spec so Swagger UI can fetch it (same origin, so proxy works in dev). */
function getSpecUrl(): string {
  if (typeof window === "undefined") return SPEC_URL;
  return `${window.location.origin}${SPEC_URL}`;
}

export function Api() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">API</h1>
        <p className="text-slate-600 text-sm mt-1">
          OpenAPI 3.0 specification for the UNB Parking Digital Twin backend, rendered with Swagger UI. The document is
          served live from{" "}
          <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">GET /api/openapi.yaml</code> (same origin as this
          app), so it always matches the running server.
        </p>
        <p className="text-slate-600 text-sm mt-2">
          Documented areas include Earth Engine tiles and section GeoJSON, parking lots/spots and occupancy apply
          endpoints, simulator state, auth and user profile routes, class schedule, full-day arrival recommendations
          (with per-segment scenario clocks for the map), building and lot–distance data, and optional Redis cache
          health.
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden [&_.swagger-ui]:font-sans">
        <SwaggerUI url={getSpecUrl()} docExpansion="none" defaultModelsExpandDepth={0} />
      </div>
    </div>
  );
}
