import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { WelcomeToast } from './components/WelcomeToast';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { FleetPage } from './pages/FleetPage';
import { BranchesPage } from './pages/BranchesPage';
import { CounterDesk } from './pages/CounterDesk';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ProfilePage } from './pages/ProfilePage';
import { BookingPage } from './pages/BookingPage';
import { VehicleDetailPage } from './pages/VehicleDetailPage';
import { RentalPolicyPage } from './pages/RentalPolicyPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { ScrollToTop } from './components/ScrollToTop';
import { RequireRole } from './components/RequireRole';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-[#060B0A] font-sans text-slate-100 antialiased selection:bg-emerald-500 selection:text-[#060B0A]">
          <Navbar />
          <WelcomeToast />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/bikes" element={<FleetPage />} />
              <Route path="/bikes/:vehicleId" element={<VehicleDetailPage />} />
              <Route path="/rental-policy" element={<RentalPolicyPage />} />
              <Route
                path="/admin/categories"
                element={
                  <RequireRole roles={['SystemAdmin']}>
                    <AdminCategoriesPage />
                  </RequireRole>
                }
              />
              <Route path="/branches" element={<BranchesPage />} />
              <Route
                path="/counter"
                element={
                  <RequireRole roles={['Staff', 'BranchManager', 'SystemAdmin']}>
                    <CounterDesk />
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

              {/* Fallback route */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

