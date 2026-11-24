import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { DraftPage } from "./pages/DraftPage";
import { HomePage } from "./pages/HomePage";
import { PlanFromGamePage } from "./pages/PlanFromGamePage";
import { PlanPage } from "./pages/PlanPage";
import { ReplayPage } from "./pages/ReplayPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/replay/:gameId" element={<ReplayPage />} />
            <Route path="/plan/new" element={<DraftPage />} />
            <Route path="/plan/from-game/:gameId" element={<PlanFromGamePage />} />
            <Route path="/plan/:id" element={<PlanPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
