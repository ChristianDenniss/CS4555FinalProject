import { useEffect, useState } from "react";

const SPEC_URL = "/api/openapi.yaml";
const SWAGGER_EDITOR_URL = "https://editor.swagger.io/";

export function Api() {
  const [spec, setSpec] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ?? "";
    fetch(`${base}${SPEC_URL}`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.text();
      })
      .then(setSpec)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8 text-red-600">
        Failed to load API spec: {error}. Ensure the backend is running and serves <code className="bg-slate-200 px-1 rounded">/api/openapi.yaml</code>.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h1 className="text-2xl font-bold text-slate-900">OpenAPI spec</h1>
        <a
          href={`${SWAGGER_EDITOR_URL}?url=${encodeURIComponent(window.location.origin + SPEC_URL)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-unb-red font-medium hover:underline"
        >
          Open in Swagger Editor →
        </a>
      </div>
      <p className="text-slate-600 text-sm mb-4">
        UNB Parking Digital Twin API (OpenAPI 3.0). Paste the spec URL into Swagger Editor or Redoc to explore.
      </p>
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <pre className="p-4 overflow-auto max-h-[70vh] text-sm text-slate-800 font-mono whitespace-pre">
          <code>{spec}</code>
        </pre>
      </div>
    </div>
  );
}
