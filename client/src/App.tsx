import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { WelcomeToast } from './components/WelcomeToast';
import { Footer } from './components/Footer';
import { LiveChatWidget } from './components/LiveChatWidget';
import { HomePage } from './pages/HomePage';
import { FleetPage } from './pages/FleetPage';
import { BranchesPage } from './pages/BranchesPage';
import { CounterDesk } from './pages/CounterDesk';
import { AuditLogPage } from './pages/AuditLogPage';
import { AdminCenter } from './pages/AdminCenter';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { BookingPage } from './pages/BookingPage';
import { VnPayReturnPage } from './pages/VnPayReturnPage';
import { ScrollToTop } from './components/ScrollToTop';
import { RequireRole } from './components/RequireRole';
import { AdminPagesPage } from './pages/AdminPagesPage';
import { StaticPageView } from './pages/StaticPageView';

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
            <Routes>
              <Route path="/" element={<RoleBasedHome />} />
              <Route path="/bikes" element={<FleetPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route
                path="/admin"
                element={
                  <RequireRole roles={['SystemAdmin']}>
                    <AdminCenter />
                  </RequireRole>
                }
              />
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
