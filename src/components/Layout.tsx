import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Trophy, ListChecks, Users, Shield, Sun, Moon, Settings } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { OptionsModal } from '@/components/OptionsModal';
import { cn } from '@/lib/cn';

const studentNav = [
  { path: '/', label: 'Home', icon: Trophy, end: true },
  { path: '/tracker', label: 'Tracker', icon: ListChecks, end: false },
];

const adminNav = [
  { path: '/', label: 'Home', icon: Trophy, end: true },
  { path: '/students', label: 'Student Tracker', icon: Users, end: false },
  { path: '/admin', label: 'Admin', icon: Shield, end: false },
];

export function Layout() {
  const profile = useAuthStore((s) => s.profile);
  const { theme, toggleTheme } = useThemeStore();
  const [optionsOpen, setOptionsOpen] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const navItems = isAdmin ? adminNav : studentNav;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4 sm:px-6">
          <div className="mr-4 flex items-center">
            <Link to="/" className="mr-4 sm:mr-6 flex items-center">
              <span className="font-bold">tm-tracker</span>
            </Link>
            <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-1.5 transition-colors hover:text-foreground/80',
                      isActive ? 'text-foreground' : 'text-foreground/60',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden xs:inline sm:inline">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-md hover:bg-muted transition-colors"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <span className="hidden sm:inline text-sm text-muted-foreground max-w-[10rem] truncate">
              {profile?.displayName || 'You'}
            </span>
            <button
              onClick={() => setOptionsOpen(true)}
              title="Options"
              className="p-2 rounded-md hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>

      <OptionsModal open={optionsOpen} onOpenChange={setOptionsOpen} />
    </div>
  );
}
