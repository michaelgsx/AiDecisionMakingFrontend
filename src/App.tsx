import { NavLink, Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="app-shell">
      <header>
        <div className="header-inner">
          <div className="brand">AI RAG 控制台</div>
          <nav>
            <NavLink to="/" end>
              写入数据
            </NavLink>
            <NavLink to="/assess">风险与相似检索</NavLink>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
