import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { FullPageSpinner } from '@/components/Spinner';
import { Layout } from '@/components/Layout';
import { MarqueeBackground } from '@/components/MarqueeBackground';
import { SignInGate } from '@/components/SignInGate';
import { AdminAccessPage } from '@/pages/OnboardingPage';
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

  const isAuthed = firebaseUser !== null;
  const isAdmin = profile?.role === 'admin';

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
      {/* The sign-in gate lives above the router so it survives the loading
          flash between a popup sign-in and the profile resolving. */}
      <SignInGate />

      {loading ? (
        <FullPageSpinner label="Loading tm-tracker…" />
      ) : (
        <Routes>
          {/* Login is now a modal, not a page — keep the old path working. */}
          <Route path="/login" element={<Navigate to="/" replace />} />

          {/* Hidden path for a co-admin to enter the shared token. Students never
              come here; the bootstrap admin is promoted automatically. */}
          <Route
            path="/admin-access"
            element={isAuthed ? <AdminAccessPage /> : <Navigate to="/" replace />}
          />

          {/* The app shell — open to everyone. Guests browse; server-backed
              features prompt sign-in via <SignInGate>. */}
          <Route path="/" element={<Layout />}>
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
      )}
    </>
  );
}

export default App;
