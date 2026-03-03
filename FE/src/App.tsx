import { Routes, Route, NavLink } from "react-router-dom";
import { Lots } from "./pages/Lots";
import { LotDetail } from "./pages/LotDetail";
import { Auth } from "./pages/Auth";
import { Logs } from "./pages/Logs";

function Nav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-volley-accent font-semibold"
      : "text-white hover:text-volley-accent hover:underline";

  return (
    <nav className="flex gap-4 py-4 px-6 bg-volley-ink border-b border-volley-border items-center">
      <NavLink to="/" end className={linkClass}>
        Lots
      </NavLink>
      <NavLink to="/auth" className={linkClass}>
        Auth
      </NavLink>
      <NavLink to="/logs" className={linkClass}>
        Logs
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <div className="bg-volley-bg text-volley-ink min-h-screen font-sans">
      <Nav />
      <Routes>
        <Route path="/" element={<Lots />} />
        <Route path="/lot/:id" element={<LotDetail />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/logs" element={<Logs />} />
      </Routes>
    </div>
  );
}
