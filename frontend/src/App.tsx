import { Route, BrowserRouter, Routes } from "react-router-dom";
import { Nav } from "./components/Nav";
import { HomePage } from "./pages/HomePage";
import { InvestorsPage } from "./pages/InvestorsPage";
import { StartupDetailPage } from "./pages/StartupDetailPage";
import { InvestorDetailPage } from "./pages/InvestorDetailPage";

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Nav />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/startups/:id" element={<StartupDetailPage />} />
          <Route path="/investors" element={<InvestorsPage />} />
          <Route path="/investors/:id" element={<InvestorDetailPage />} />
        </Routes>
        <div className="footer-note">
          IntroGraph — a take-home demo backed by CognoDB, a managed graph database.
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
