import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import ErrorBoundary from '@/components/ErrorBoundary'

import LandingPage from '@/pages/landing/LandingPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import PendingVerificationPage from '@/pages/auth/PendingVerificationPage'
import AppShell from '@/components/layout/AppShell'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import POSAccountsPage from '@/pages/pos-accounts/POSAccountsPage'
import TransactionsPage from '@/pages/transactions/TransactionsPage'
import PaymentLinksPage from '@/pages/payment-links/PaymentLinksPage'
import WidgetsPage from '@/pages/widgets/WidgetsPage'
import AnalyticsPage from '@/pages/analytics/AnalyticsPage'
import { ApiKeysPage } from '@/pages/api-keys/ApiKeysPage'
import SettingsPage from '@/pages/settings/SettingsPage'
import WebhookLogsPage from '@/pages/webhooks/WebhookLogsPage'
import PaymentLinkPage from '@/pages/public/PaymentLinkPage'
import { EmbedPage } from '@/pages/public/EmbedPage'
import AdminLayout from '@/components/layout/AdminLayout'
import AdminMerchantsPage from '@/pages/admin/AdminMerchantsPage'
import AdminMerchantDetailPage from '@/pages/admin/AdminMerchantDetailPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSuperuser = useAuthStore((s) => s.isSuperuser)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isSuperuser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function HomeRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isSuperuser = useAuthStore((s) => s.isSuperuser)
  if (isAuthenticated) return <Navigate to={isSuperuser ? '/admin' : '/dashboard'} replace />
  return <LandingPage />
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<HomeRoute />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pending-verification" element={
          <ProtectedRoute><PendingVerificationPage /></ProtectedRoute>
        } />

        {/* Public */}
        <Route path="/pay/:shortCode" element={<PaymentLinkPage />} />
        <Route path="/embed/:widgetId" element={<EmbedPage />} />

        {/* Dashboard (korumalı) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="pos-accounts" element={<POSAccountsPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="payment-links" element={<PaymentLinksPage />} />
          <Route path="widgets" element={<WidgetsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="api-keys" element={<ApiKeysPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="webhook-logs" element={<WebhookLogsPage />} />
        </Route>

        {/* Admin (korumalı, sadece superuser) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/merchants" replace />} />
          <Route path="merchants" element={<AdminMerchantsPage />} />
          <Route path="merchants/:id" element={<AdminMerchantDetailPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
