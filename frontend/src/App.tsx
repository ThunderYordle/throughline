import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./design-system";
import { DraftPage } from "./pages/DraftPage";
import { HomePage } from "./pages/HomePage";
import { PlanFromGamePage } from "./pages/PlanFromGamePage";
import { PlanPage } from "./pages/PlanPage";
import { ReplayPage } from "./pages/ReplayPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ValidationPage } from "./pages/ValidationPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/replay/:gameId" element={<ReplayPage />} />
          <Route path="/plan/new" element={<DraftPage />} />
          <Route path="/plan/from-game/:gameId" element={<PlanFromGamePage />} />
          <Route path="/plan/:id" element={<PlanPage />} />
          <Route path="/review/:id" element={<ReviewPage />} />
          <Route path="/validation" element={<ValidationPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
