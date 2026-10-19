import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase, type Settings as SettingsType } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type SettingsContextValue = {
  settings: SettingsType;
  loading: boolean;
  refresh: () => Promise<void>;
  update: (patch: Partial<SettingsType>) => Promise<{ error: string | null }>;
};

const defaultSettings: SettingsType = {
  id: '',
  user_id: '',
  business_name: 'Thilak Motors',
  business_tagline: 'Motorbike Repair & Service Center',
  address: null,
  phone: null,
  email: null,
  tax_rate: 0,
  currency_symbol: 'Rs. ',
  footer_note: 'Thank you for your business!',
  created_at: '',
};

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      setLoading(false);
      return;
    }

    if (data) {
      setSettings(data as SettingsType);
    } else {
      // Auto-create default settings row for new user
      const { data: created } = await supabase
        .from('settings')
        .insert({ user_id: user.id })
        .select('*')
        .single();
      if (created) setSettings(created as SettingsType);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) refresh();
    else {
      setSettings(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const update = async (patch: Partial<SettingsType>) => {
    if (!user || !settings) return { error: 'Not ready' };
    const { data, error } = await supabase
      .from('settings')
      .update(patch)
      .eq('user_id', user.id)
      .select('*')
      .single();
    if (error) return { error: error.message };
    setSettings(data as SettingsType);
    return { error: null };
  };

  return (
    <SettingsContext.Provider value={{ settings: settings ?? defaultSettings, loading, refresh, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
