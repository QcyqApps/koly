import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedOutlet } from './animated-outlet';
import { MessageCircle, Calendar, Images, BarChart3, Settings, Sparkles, Calculator, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

function useDemoMode() {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('demo_mode') === 'true';
}

const navItems = [
  { path: '/app', icon: BarChart3, label: 'Dashboard' },
  { path: '/app/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/app/visits', icon: Calendar, label: 'Wizyty' },
  { path: '/app/simulator', icon: Calculator, label: 'Symulator' },
  { path: '/app/gallery', icon: Images, label: 'Galeria' },
  { path: '/app/settings', icon: Settings, label: 'Ustawienia' },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDemoMode = useDemoMode();

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex h-full flex-col bg-primary">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 px-6 border-b border-white/10">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Koly</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => navigate(item.path)}
                      className={cn(
                        'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-indicator"
                          className="absolute inset-0 bg-white/20 rounded-xl"
                          transition={{
                            type: 'spring',
                            stiffness: 500,
                            damping: 30,
                          }}
                        />
                      )}
                      <Icon className={cn('h-5 w-5 relative z-10', active && 'stroke-[2.5]')} />
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:pl-64">
        {isDemoMode && (
          <div className="bg-amber-500/90 text-white">
            <div className="mx-auto max-w-6xl px-4 py-2 lg:px-8 flex items-center justify-center gap-2 text-sm">
              <Info className="h-4 w-4" />
              <span>Tryb demonstracyjny - dane przykładowe</span>
            </div>
          </div>
        )}
        <main className="min-h-screen pb-28 lg:pb-8">
          <div className="mx-auto max-w-6xl px-4 py-4 lg:px-8 lg:py-6">
            <AnimatedOutlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 bg-primary/95 backdrop-blur-md rounded-2xl h-14 shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.15)] z-10 border border-white/10">
        <div className="flex h-full items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative flex items-center justify-center w-12 h-12"
              >
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
                <Icon
                  className={cn(
                    'h-5 w-5 relative z-10 transition-colors',
                    active
                      ? 'text-white stroke-[2.5]'
                      : 'text-white/60'
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
