import { useCallback, useEffect, useState } from 'react';
import { Bike, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthScreen } from '@/components/AuthScreen';
import { AppLayout, type Page } from '@/components/AppLayout';
import { ToastContainer } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { Dashboard } from '@/pages/Dashboard';
import { POS } from '@/pages/POS';
import { Customers } from '@/pages/Customers';
import { Services } from '@/pages/Services';
import { Inventory } from '@/pages/Inventory';
import { Invoices } from '@/pages/Invoices';
import { SettingsPage } from '@/pages/SettingsPage';

function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-lg shadow-sky-500/30">
        <Bike className="w-8 h-8 text-white" />
      </div>
      <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
    </div>
  );
}

function Shell() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');
  const [lowStockCount, setLowStockCount] = useState(0);

  const refreshLowStock = useCallback(async () => {
    const { data } = await supabase.from('spare_parts').select('quantity, low_stock_threshold');
    if (data) {
      setLowStockCount(data.filter((p) => p.quantity <= p.low_stock_threshold).length);
    }
  }, []);

  // Re-check low stock whenever the user navigates (stock changes after sales / edits)
  useEffect(() => {
    if (user) refreshLowStock();
  }, [user, page, refreshLowStock]);

  if (loading) return <Splash />;
  if (!user) return <AuthScreen />;

  return (
    <AppLayout page={page} onPageChange={setPage} lowStockCount={lowStockCount}>
      {page === 'dashboard' && <Dashboard onPageChange={setPage} />}
      {page === 'pos' && <POS onPageChange={setPage} />}
      {page === 'customers' && <Customers />}
      {page === 'services' && <Services />}
      {page === 'inventory' && <Inventory />}
      {page === 'invoices' && <Invoices />}
      {page === 'settings' && <SettingsPage />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <Shell />
          <ToastContainer />
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
