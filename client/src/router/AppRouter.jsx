import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import ProtectedRoute from "./ProtectedRoute";
import LoginPage from "../pages/LoginPage";
import UploadPage from "../pages/UploadPage";
import HistoryPage from "../pages/HistoryPage";
import SearchPage from "../pages/SearchPage";
import TranscriptionPage from "../pages/TranscriptionPage";
import SummaryPage from "../pages/SummaryPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — share Layout (Header + Footer) */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/upload" replace />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/transcription" element={<TranscriptionPage />} />
          <Route path="/transcription/:id" element={<TranscriptionPage />} />
          <Route path="/summary" element={<SummaryPage />} />
          <Route path="/summary/:id" element={<SummaryPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/upload" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
