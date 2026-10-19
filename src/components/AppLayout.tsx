import { useState, type ReactNode } from 'react';
import {
  Bike,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Wrench,
  Package,
  Receipt,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';

export type Page = 'dashboard' | 'pos' | 'customers' | 'services' | 'inventory' | 'invoices' | 'settings';

const navItems: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'New Sale', icon: ShoppingCart },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function AppLayout({
  page,
  onPageChange,
  children,
  lowStockCount = 0,
}: {
  page: Page;
  onPageChange: (p: Page) => void;
  children: ReactNode;
  lowStockCount?: number;
}) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavList = () => (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const active = page === item.id;
        const Icon = item.icon;
        const showBadge = item.id === 'inventory' && lowStockCount > 0;
        return (
          <button
            key={item.id}
            onClick={() => {
              onPageChange(item.id);
              setMobileOpen(false);
            }}
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? 'bg-sky-600 text-white shadow-sm shadow-sky-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? '' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
            <span className="flex-1 text-left">{item.label}</span>
            {showBadge && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                {lowStockCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-3 px-2">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
        <Bike className="w-6 h-6 text-white" />
      </div>
      <div className="min-w-0">
        <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
          {settings.business_name}
        </h1>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{settings.business_tagline}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 fixed h-screen">
        <Brand />
        <div className="mt-8 flex-1 overflow-y-auto">
          <NavList />
        </div>
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
              {(user?.email ?? 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{user?.email}</p>
              <p className="text-[10px] text-slate-400">Staff account</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 no-print">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-900 p-4 flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <NavList />
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <LogOut className="w-5 h-5 text-slate-400" />
              Sign out
            </button>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 no-print">
          <div className="flex items-center justify-between px-4 lg:px-8 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {navItems.find((n) => n.id === page)?.label}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange('inventory')}
                className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Low stock alerts"
              >
                <Bell className="w-5 h-5" />
                {lowStockCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
                )}
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
