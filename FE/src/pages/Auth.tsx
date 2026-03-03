import { useState } from "react";
import { api } from "../api/client";
import type { AuthResponse, MeResponse } from "../api/types";

const tokenKey = "parking_twin_token";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem(tokenKey)
  );

  const setToken = (t: string | null) => {
    if (t) localStorage.setItem(tokenKey, t);
    else localStorage.removeItem(tokenKey);
    setTokenState(t);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (mode === "register") {
        const res = await api.post<AuthResponse>("/api/auth/register", {
          email,
          password,
          name: name || undefined,
        });
        setToken(res.token);
        setMessage(`Registered. Logged in as ${res.user.email}`);
      } else {
        const res = await api.post<AuthResponse>("/api/auth/login", {
          email,
          password,
        });
        setToken(res.token);
        setMessage(`Logged in as ${res.user.email}`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  };

  const loadMe = () => {
    if (!token) return;
    api
      .get<MeResponse>("/api/users/me", token)
      .then(setMe)
      .catch(() => setMessage("Not authenticated or token expired"));
  };

  const logout = () => {
    setToken(null);
    setMe(null);
    setMessage("Logged out");
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="page-header">Auth</h1>

      {token ? (
        <div className="card-volley p-6 text-white">
          <p className="mb-4">
            <button
              type="button"
              className="px-4 py-2 rounded border border-volley-accent bg-volley-ink text-white hover:bg-volley-border mr-2"
              onClick={loadMe}
            >
              Load profile
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded border border-gray-500 text-white hover:bg-volley-border"
              onClick={logout}
            >
              Log out
            </button>
          </p>
          {me && (
            <pre className="mt-4 text-sm overflow-auto p-4 bg-black/30 rounded">
              {JSON.stringify(me, null, 2)}
            </pre>
          )}
        </div>
      ) : (
        <div className="card-volley max-w-md p-6 text-white">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded border border-volley-border bg-volley-ink text-white"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded border border-volley-border bg-volley-ink text-white"
                required
                minLength={mode === "register" ? 8 : 1}
              />
            </div>
            {mode === "register" && (
              <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1">
                  Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-volley-border bg-volley-ink text-white"
                />
              </div>
            )}
            <button
              type="submit"
              className="px-4 py-2 rounded bg-volley-accent text-volley-ink font-medium hover:brightness-110"
            >
              {mode === "login" ? "Log in" : "Register"}
            </button>
            <button
              type="button"
              className="ml-2 px-4 py-2 rounded border border-volley-border text-white hover:bg-volley-border"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Register instead" : "Log in instead"}
            </button>
          </form>
        </div>
      )}

      {message && (
        <p
          className={`mt-4 ${message.startsWith("Error") || message.includes("expired") ? "text-volley-occupied" : ""}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
