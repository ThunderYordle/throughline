import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/HomePage";
import { ReplayPage } from "./pages/ReplayPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen flex-col">
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/replay/:gameId" element={<ReplayPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
