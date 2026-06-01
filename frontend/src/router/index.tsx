import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import AdminShell from '../components/admin/AdminShell'
import ProtectedRoute from '../components/ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import JoinPage from '../pages/JoinPage'
import RegisterFarmPage from '../pages/RegisterFarmPage'
import AdminOverviewPage from '../pages/admin/AdminOverviewPage'
import AdminCropsPage from '../pages/admin/AdminCropsPage'
import AdminDiseasesPage from '../pages/admin/AdminDiseasesPage'
import AdminProductsPage from '../pages/admin/AdminProductsPage'
import AdminUsersPage from '../pages/admin/AdminUsersPage'
import MapPage from '../pages/MapPage'
import DashboardPage from '../pages/DashboardPage'
import NdviMonitoringPage from '../pages/NdviMonitoringPage'
import FieldsManagementPage from '../pages/FieldsManagementPage'
import FieldWizardPage from '../pages/FieldWizardPage'
import FieldDetailPage from '../pages/FieldDetailPage'
import CropRotationPage from '../pages/CropRotationPage'
import PhenologyPage from '../pages/PhenologyPage'
import DiseasesPage from '../pages/DiseasesPage'
import RecommendationsPage from '../pages/RecommendationsPage'
import PriceHistoryPage from '../pages/PriceHistoryPage'
import FieldProtectionPage from '../pages/FieldProtectionPage'
import SoilPage from '../pages/SoilPage'
import OperationsPage from '../pages/OperationsPage'
import CropsReferencePage from '../pages/CropsReferencePage'
import DiseasePredictionPage from '../pages/DiseasePredictionPage'
import MarketPage from '../pages/MarketPage'
import FarmProfilePage from '../pages/FarmProfilePage'
import FieldEconomicsPage from '../pages/FieldEconomicsPage'
import AdminPage from '../pages/AdminPage'
import FieldReportPage from '../pages/FieldReportPage'
import PlanApprovalPage from '../pages/PlanApprovalPage'
import AuditLogPage from '../pages/AuditLogPage'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/register-farm" element={<RegisterFarmPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<Navigate to="/map" replace />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/ndvi" element={<NdviMonitoringPage />} />
            <Route path="/fields" element={<FieldsManagementPage />} />
            <Route path="/fields/new" element={<FieldWizardPage />} />
            <Route path="/fields/:id" element={<FieldDetailPage />} />
            <Route path="/crop-rotation" element={<CropRotationPage />} />
            <Route path="/phenology" element={<PhenologyPage />} />
            <Route path="/diseases" element={<DiseasesPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/economics" element={<FieldEconomicsPage />} />
            <Route path="/field-protection" element={<FieldProtectionPage />} />
            <Route path="/disease-prediction" element={<DiseasePredictionPage />} />
            <Route path="/market" element={<MarketPage />} />

            {/* Объединённые страницы */}
            <Route path="/soil" element={<SoilPage />} />
            <Route path="/operations" element={<OperationsPage />} />
            <Route path="/crops" element={<CropsReferencePage />} />
            <Route path="/profile" element={<FarmProfilePage />} />
            <Route path="/reports" element={<FieldReportPage />} />
            <Route path="/plans" element={<PlanApprovalPage />} />
            <Route path="/audit" element={<AuditLogPage />} />

            {/* Legacy-редиректы */}
            <Route path="/crop-history" element={<Navigate to="/fields" replace />} />
            <Route path="/trader" element={<Navigate to="/market?tab=table" replace />} />
            <Route path="/region-forecast" element={<Navigate to="/market" replace />} />
            <Route path="/price-history" element={<PriceHistoryPage />} />
            <Route path="/soil-analysis" element={<Navigate to="/soil" replace />} />
            <Route path="/soil-horizons" element={<Navigate to="/soil?tab=lab" replace />} />
            <Route path="/disease-risk" element={<Navigate to="/field-protection" replace />} />
            <Route path="/fertilizer-applications" element={<Navigate to="/operations" replace />} />
            <Route path="/plant-protection-ops" element={<Navigate to="/operations?tab=protection" replace />} />
            <Route path="/crop-types" element={<Navigate to="/crops" replace />} />
            <Route path="/crop-varieties" element={<Navigate to="/crops?tab=varieties" replace />} />
            <Route path="/disease-resistance" element={<Navigate to="/diseases?tab=resistance" replace />} />
          </Route>
          <Route path="/sysadmin" element={<AdminPage />} />
          {/* Admin panel */}
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="crops" element={<AdminCropsPage />} />
            <Route path="diseases" element={<AdminDiseasesPage />} />
            <Route path="products" element={<AdminProductsPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}