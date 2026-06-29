import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { FullPageSpinner } from '@/components/Spinner';
import { Layout } from '@/components/Layout';
import { MarqueeBackground } from '@/components/MarqueeBackground';
import { LoginPage } from '@/pages/LoginPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { HomePage } from '@/pages/HomePage';
import { TrackerPage } from '@/pages/TrackerPage';
import { BountiesPage } from '@/pages/BountiesPage';
import { AdminPage } from '@/pages/AdminPage';
import { StudentTrackerPage } from '@/pages/StudentTrackerPage';

function App() {
  const loading = useAuthStore((s) => s.loading);
  const firebaseUser = useAuthStore((s) => s.firebaseUser);
  const profile = useAuthStore((s) => s.profile);
  const theme = useThemeStore((s) => s.theme);

  if (loading) return <FullPageSpinner label="Loading tm-tracker…" />;

  const isAuthed = firebaseUser !== null;
  const isAdmin = profile?.role === 'admin';
  // Students must set name + class before entering; admins skip onboarding.
  const needsOnboarding = isAuthed && profile !== null && !profile.onboarded;

  return (
    <>
      <MarqueeBackground />
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        theme={theme}
        toastOptions={{ duration: 4000 }}
      />
      <Routes>
        {/* Public landing / sign-in */}
        <Route
          path="/login"
          element={isAuthed ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* First-run profile setup */}
        <Route
          path="/onboarding"
          element={
            !isAuthed ? (
              <Navigate to="/login" replace />
            ) : needsOnboarding ? (
              <OnboardingPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Authenticated app */}
        <Route
          path="/"
          element={
            !isAuthed ? (
              <Navigate to="/login" replace />
            ) : needsOnboarding ? (
              <Navigate to="/onboarding" replace />
            ) : (
              <Layout />
            )
          }
        >
          <Route index element={<HomePage />} />
          <Route path="tracker" element={<TrackerPage />} />
          <Route path="bounties" element={<BountiesPage />} />
          {/* Admin-only */}
          <Route
            path="admin"
            element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />}
          />
          <Route
            path="students"
            element={isAdmin ? <StudentTrackerPage /> : <Navigate to="/" replace />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
