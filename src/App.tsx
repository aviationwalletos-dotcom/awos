import React, { Suspense, lazy } from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { RequireUserType } from './components/RequireUserType'
import { Hero } from './components/sections/Hero'
import { Problem } from './components/sections/Problem'
import { Features } from './components/sections/Features'
import { FinalCta } from './components/sections/FinalCta'
const LogbookPage = lazy(() => import('./pages/LogbookPage').then((m) => ({ default: m.LogbookPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
const InquiryPage = lazy(() => import('./pages/InquiryPage').then((m) => ({ default: m.InquiryPage })))
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { VerifyEmailPage } from './pages/VerifyEmailPage'
import { SignupPage } from './pages/SignupPage'
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })))
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ConfirmProvider } from './components/ConfirmDialog'

const queryClient = new QueryClient()

function NotFoundPage() {
  return (
    <div data-mbaas-oid="cf5qfe1" className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 data-mbaas-oid="3pkshcf" className="mb-4 text-6xl font-bold text-slate-300">404</h1>
      <p data-mbaas-oid="l7fhm0t" className="mb-6 text-slate-400">페이지를 찾을 수 없습니다.</p>
      <Link data-mbaas-oid="bu7fq3f" to="/" className="text-sky-600 hover:underline">
        홈으로 돌아가기
      </Link>
    </div>
  )
}

function LandingPage() {
  return (
    <>
      <Nav />
      <main data-mbaas-oid="jtf29w6">
        <Hero />
        <Problem />
        <Features />
        <FinalCta />
      </main>
      <Footer />
    </>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
        <ConfirmProvider>
        <ErrorBoundary>
          <div data-mbaas-oid="nc8cen2" className="min-h-screen bg-surface font-body text-ink">
            <Suspense
              fallback={
                <div data-mbaas-oid="lazyfb" className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400" role="status">
                  불러오는 중…
                </div>
              }
            >
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/inquiry" element={<InquiryPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route
                path="/logbook"
                element={
                  <RequireUserType userType="individual">
                    <LogbookPage />
                  </RequireUserType>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RequireUserType userType="organization">
                    <DashboardPage />
                  </RequireUserType>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
            </Suspense>
          </div>
        </ErrorBoundary>
        </ConfirmProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
