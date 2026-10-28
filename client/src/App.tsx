import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider } from './context/I18nContext';
import { Navbar } from './components/Navbar';
import { WelcomeToast } from './components/WelcomeToast';
import { WishlistToast } from './components/WishlistToast';
import { Footer } from './components/Footer';
import { LiveChatWidget } from './components/LiveChatWidget';
import { HomePage } from './pages/HomePage';
import { FleetPage } from './pages/FleetPage';
import { BranchesPage } from './pages/BranchesPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { RbacMatrixPage } from './pages/RbacMatrixPage';
import { AdminCenter } from './pages/AdminCenter';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { VnPayReturnPage } from './pages/VnPayReturnPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { WishlistPage } from './pages/WishlistPage';
import { AdminBannersPage } from './pages/AdminBannersPage';
import { AdminPagesPage } from './pages/AdminPagesPage';
import { StaticPageView } from './pages/StaticPageView';
import { SubmitComplaintPage } from './pages/SubmitComplaintPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { StaffComplaintPage } from './pages/StaffComplaintPage';
import { ManagerComplaintsPage } from './pages/ManagerComplaintsPage';
import { ScrollToTop } from './components/ScrollToTop';
import { RequireRole } from './components/RequireRole';
import { ManagementNav } from './components/ManagementNav';

const VehicleDetailPage = lazy(() =>
  import('./pages/VehicleDetailPage').then((module) => ({ default: module.VehicleDetailPage }))
);
const RentalPolicyPage = lazy(() =>
  import('./pages/RentalPolicyPage').then((module) => ({ default: module.RentalPolicyPage }))
);
const AdminCategoriesPage = lazy(() =>
  import('./pages/AdminCategoriesPage').then((module) => ({ default: module.AdminCategoriesPage }))
);
const ManagerVehiclesPage = lazy(() =>
  import('./pages/ManagerVehiclesPage').then((module) => ({ default: module.ManagerVehiclesPage }))
);
const FleetOperationsPage = lazy(() =>
  import('./pages/FleetOperationsPage').then((module) => ({ default: module.FleetOperationsPage }))
);
const FleetDashboardPage = lazy(() =>
  import('./pages/FleetDashboardPage').then((module) => ({ default: module.FleetDashboardPage }))
);
const CounterDesk = lazy(() =>
  import('./pages/CounterDesk').then((module) => ({ default: module.CounterDesk }))
);
const BookingPage = lazy(() =>
  import('./pages/BookingPage').then((module) => ({ default: module.BookingPage }))
);

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
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
        <BrowserRouter>
          <WishlistProvider>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col bg-[#101010] font-sans text-[#F5F5F5] antialiased selection:bg-[#FFC799] selection:text-[#101010]">
            <Navbar />
            <WelcomeToast />
            <WishlistToast />
            <main className="flex-1">
              <Suspense
                fallback={
                  <div role="status" className="px-4 py-20 text-center text-[#A0A0A0]">
                    Đang tải trang…
                  </div>
                }
              >
                <Routes>
                  <Route path="/" element={<RoleBasedHome />} />
                  <Route path="/bikes" element={<FleetPage />} />
                  <Route path="/bikes/:vehicleId" element={<VehicleDetailPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/rental-policy" element={<RentalPolicyPage />} />
                  <Route path="/branches" element={<BranchesPage />} />

                  {/* Admin & Fleet Management Routes */}
                  <Route
                    path="/admin"
                    element={
                      <RequireRole roles={['SystemAdmin']}>
                        <AdminCenter />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin-center"
                    element={
                      <RequireRole roles={['SystemAdmin']}>
                        <AdminCenter />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/admin/categories"
                    element={
                      <RequireRole roles={['SystemAdmin']}>
                        <>
                          <ManagementNav />
                          <AdminCategoriesPage />
                        </>
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/manager/vehicles"
                    element={
                      <RequireRole roles={['BranchManager', 'SystemAdmin']}>
                        <>
                          <ManagementNav />
                          <ManagerVehiclesPage />
                        </>
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/manager/fleet"
                    element={
                      <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                        <>
                          <ManagementNav />
                          <FleetOperationsPage />
                        </>
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/manager/fleet-operations"
                    element={
                      <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                        <>
                          <ManagementNav />
                          <FleetOperationsPage />
                        </>
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/manager/dashboard"
                    element={
                      <RequireRole roles={['BranchManager', 'SystemAdmin']}>
                        <>
                          <ManagementNav />
                          <FleetDashboardPage />
                        </>
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/fleet-dashboard"
                    element={
                      <RequireRole roles={['BranchManager', 'SystemAdmin']}>
                        <>
                          <ManagementNav />
                          <FleetDashboardPage />
                        </>
                      </RequireRole>
                    }
                  />

                  {/* Operational Counter, Audit & RBAC */}
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
                  <Route
                    path="/admin/rbac"
                    element={
                      <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                        <RbacMatrixPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/rbac"
                    element={
                      <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                        <RbacMatrixPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/rbac-matrix"
                    element={
                      <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                        <RbacMatrixPage />
                      </RequireRole>
                    }
                  />

                  {/* Complaints Management (UC-42, UC-43, UC-65, UC-85) */}
                  <Route path="/complaints" element={<ComplaintsPage />} />
                  <Route path="/complaints/new" element={<SubmitComplaintPage />} />
                  <Route path="/complaints/submit" element={<SubmitComplaintPage />} />
                  <Route
                    path="/staff/complaints"
                    element={
                      <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                        <StaffComplaintPage />
                      </RequireRole>
                    }
                  />
                  <Route
                    path="/manager/complaints"
                    element={
                      <RequireRole roles={['BranchManager', 'SystemAdmin']}>
                        <ManagerComplaintsPage />
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

                  {/* Dedicated Booking Multi-step Flow & Order Details (UC-36) */}
                  <Route path="/booking/:vehicleId" element={<BookingPage />} />
                  <Route path="/booking" element={<BookingPage />} />
                  <Route path="/booking-details/:id" element={<OrderDetailPage />} />
                  <Route path="/vnpay-return" element={<VnPayReturnPage />} />

                  {/* CMS Banners (UC-116, UC-117, UC-118) */}
                  <Route
                    path="/admin/banners"
                    element={
                      <RequireRole roles={['SystemAdmin']}>
                        <AdminBannersPage />
                      </RequireRole>
                    }
                  />

                  {/* CMS Static Pages (UC-119) */}
                  <Route
                    path="/admin/pages"
                    element={
                      <RequireRole roles={['SystemAdmin']}>
                        <AdminPagesPage />
                      </RequireRole>
                    }
                  />
                  <Route path="/faq" element={<StaticPageView />} />
                  <Route path="/terms" element={<StaticPageView />} />
                  <Route path="/privacy" element={<StaticPageView />} />
                  <Route path="/pages/:slug" element={<StaticPageView />} />

                  {/* Fallback route */}
                  <Route path="*" element={<RoleBasedHome />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            {/* UC-44 & UC-66: Real-Time Live Chat Popover */}
            <LiveChatWidget />
          </div>
        </WishlistProvider>
      </BrowserRouter>
    </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}

export default App;
