import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PosPage from "./pages/PosPage";
import { useAuthStore } from "./store/auth.store";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/pos"
          element={
            <PrivateRoute>
              <PosPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}