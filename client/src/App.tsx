import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { WelcomeToast } from './components/WelcomeToast';
import { Footer } from './components/Footer';
import { LiveChatWidget } from './components/LiveChatWidget';
import { HomePage } from './pages/HomePage';
import { FleetPage } from './pages/FleetPage';
import { BranchesPage } from './pages/BranchesPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { VnPayReturnPage } from './pages/VnPayReturnPage';
import { ScrollToTop } from './components/ScrollToTop';
import { RequireRole } from './components/RequireRole';
import { ManagementNav } from './components/ManagementNav';
const VehicleDetailPage = lazy(() => import('./pages/VehicleDetailPage').then((module) => ({ default: module.VehicleDetailPage })));
const RentalPolicyPage = lazy(() => import('./pages/RentalPolicyPage').then((module) => ({ default: module.RentalPolicyPage })));
const AdminCategoriesPage = lazy(() => import('./pages/AdminCategoriesPage').then((module) => ({ default: module.AdminCategoriesPage })));
const ManagerVehiclesPage = lazy(() => import('./pages/ManagerVehiclesPage').then((module) => ({ default: module.ManagerVehiclesPage })));
const FleetOperationsPage = lazy(() => import('./pages/FleetOperationsPage').then((module) => ({ default: module.FleetOperationsPage })));
const FleetDashboardPage = lazy(() => import('./pages/FleetDashboardPage').then((module) => ({ default: module.FleetDashboardPage })));
const CounterDesk = lazy(() => import('./pages/CounterDesk').then((module) => ({ default: module.CounterDesk })));
const BookingPage = lazy(() => import('./pages/BookingPage').then((module) => ({ default: module.BookingPage })));

function RoleBasedHome() {
  const { user, isAuthenticated } = useAuth();
  if (
    isAuthenticated &&
    user &&
    ['Staff', 'BranchManager', 'SystemAdmin'].includes(user.roles)
  ) {
    return <Navigate to="/counter" replace />;
  }
  return <HomePage />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-[#101010] font-sans text-[#F5F5F5] antialiased selection:bg-[#FFC799] selection:text-[#101010]">
          <Navbar />
          <WelcomeToast />
          <main className="flex-1">
            <Suspense fallback={<div role="status" className="px-4 py-20 text-center text-[#A0A0A0]">Đang tải trang…</div>}>
            <Routes>
              <Route path="/" element={<RoleBasedHome />} />
              <Route path="/bikes" element={<FleetPage />} />
              <Route path="/bikes/:vehicleId" element={<VehicleDetailPage />} />
              <Route path="/rental-policy" element={<RentalPolicyPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/admin/categories" element={<RequireRole roles={['SystemAdmin']}><><ManagementNav /><AdminCategoriesPage /></></RequireRole>} />
              <Route path="/manager/vehicles" element={<RequireRole roles={['BranchManager', 'SystemAdmin']}><><ManagementNav /><ManagerVehiclesPage /></></RequireRole>} />
              <Route path="/manager/fleet" element={<RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}><><ManagementNav /><FleetOperationsPage /></></RequireRole>} />
              <Route path="/manager/dashboard" element={<RequireRole roles={['BranchManager', 'SystemAdmin']}><><ManagementNav /><FleetDashboardPage /></></RequireRole>} />
              <Route
                path="/counter"
                element={
                  <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                    <CounterDesk />
                  </RequireRole>
                }
              />
              <Route
                path="/audit"
                element={
                  <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                    <AuditLogPage />
                  </RequireRole>
                }
              />

              {/* Auth & Profile Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Dedicated Booking Multi-step Flow */}
              <Route path="/booking/:vehicleId" element={<BookingPage />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/vnpay-return" element={<VnPayReturnPage />} />

              {/* Fallback route */}
              <Route path="*" element={<RoleBasedHome />} />
            </Routes>
            </Suspense>
          </main>
          <Footer />
          {/* UC-44 & UC-66: Real-Time Live Chat Popover */}
          <LiveChatWidget />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

