import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingLayout from '@/layouts/LandingLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import { ProtectedRoute, RoleGuard } from '@/features/auth/ProtectedRoute';
import { PageLoader } from '@/components/shared/LoadingSpinner';

const Landing = lazy(() => import('@/pages/Landing'));
const Register = lazy(() => import('@/pages/Register'));
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CommandCenter = lazy(() => import('@/pages/CommandCenter'));
const Events = lazy(() => import('@/pages/Events'));
const Committees = lazy(() => import('@/pages/Committees'));
const CommitteeDetail = lazy(() => import('@/pages/CommitteeDetail'));
const Delegates = lazy(() => import('@/pages/Delegates'));
const CountryAllocation = lazy(() => import('@/pages/CountryAllocation'));
const DelegatePass = lazy(() => import('@/pages/DelegatePass'));
const CheckInScanner = lazy(() => import('@/pages/CheckInScanner'));
const CertificateVault = lazy(() => import('@/pages/CertificateVault'));
const Payments = lazy(() => import('@/pages/Payments'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));
const Monitoring = lazy(() => import('@/pages/Monitoring'));
const NotFound = lazy(() => import('@/pages/NotFound'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<LandingLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<Register />} />
        </Route>

        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/events" element={<Events />} />
            <Route path="/committees" element={<Committees />} />
            <Route path="/committees/:id" element={<CommitteeDetail />} />
            <Route path="/delegates" element={<Delegates />} />
            <Route path="/delegate-pass" element={<DelegatePass />} />
            <Route path="/check-in" element={<CheckInScanner />} />
            <Route path="/certificate-vault" element={<CertificateVault />} />
            <Route path="/payments" element={<Payments />} />

            <Route element={<RoleGuard roles={['organizer', 'admin', 'super_admin']} />}>
              <Route path="/command-center" element={<CommandCenter />} />
              <Route path="/country-allocation" element={<CountryAllocation />} />
              <Route path="/reports" element={<Reports />} />
            </Route>

            <Route element={<RoleGuard roles={['admin', 'super_admin']} />}>
              <Route path="/settings" element={<Settings />} />
              <Route path="/monitoring" element={<Monitoring />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
