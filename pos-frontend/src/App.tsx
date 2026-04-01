import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import PosPage from "./pages/PosPage";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import CategoriesPage from "./pages/CategoriesPage";
import InventoryPage from "./pages/InventoryPage";
import SuppliersPage from "./pages/SuppliersPage";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage";
import GRNPage from "./pages/GRNPage";
import BatchesPage from "./pages/BatchesPage";
import CustomersPage from "./pages/CustomersPage";
import ReturnsPage from "./pages/ReturnsPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import UnitsPage from "./pages/UnitsPage";
import LoyaltyPage from "./pages/LoyaltyPage";
import TablesPage from "./pages/TablesPage";
import KitchenPage from "./pages/KitchenPage";
import ReservationsPage from "./pages/ReservationsPage";
import ShiftsPage from "./pages/ShiftsPage";
import CouponsPage from "./pages/CouponsPage";
import RolesPage from "./pages/RolesPage";
import UsersPage from "./pages/UsersPage";
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pos" element={<PosPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
        <Route path="/grn" element={<GRNPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/loyalty" element={<LoyaltyPage />} />
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/units" element={<UnitsPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/kitchen" element={<KitchenPage />} />
        <Route path="/reservations" element={<ReservationsPage />} />
        <Route path="/shifts" element={<ShiftsPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/users" element={<UsersPage />} />
      </Routes>
    </BrowserRouter>
  );
}