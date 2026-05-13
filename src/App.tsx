import { NavLink, Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="app-shell">
      <header>
        <div className="header-inner">
          <div className="brand">AI RAG Console</div>
          <nav>
            <NavLink to="/" end>
              Ingest
            </NavLink>
            <NavLink to="/assess">Risk &amp; Similarity</NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
