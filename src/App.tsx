import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { RequireUserType } from './components/RequireUserType'
import { Hero } from './components/sections/Hero'
import { Problem } from './components/sections/Problem'
import { Features } from './components/sections/Features'
import { FinalCta } from './components/sections/FinalCta'
import { LogbookPage } from './pages/LogbookPage'
import { DashboardPage } from './pages/DashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { InquiryPage } from './pages/InquiryPage'
import { LoginPage } from './pages/LoginPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SignupPage } from './pages/SignupPage'
import { AccountPage } from './pages/AccountPage'
import { AuthProvider } from './contexts/AuthContext'

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
          <div data-mbaas-oid="nc8cen2" className="min-h-screen bg-surface font-body text-ink">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/inquiry" element={<InquiryPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
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
          </div>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
